"use client";

import { Filter, Plus, Scissors } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type FabricLot = {
  _id: string;
  fabricType: string;
  quantityKg?: number;
  receivedKg?: number;
  availableKg: number;
  transferredKg: number;
  status: "Available" | "Finished" | "Transferred For Cutting";
  receiveDate: string;
  createdBy?: string;
  createdByUser?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type MovementHistoryItem = {
  _id: string;
  fromStage: string;
  toStage: string;
  quantity: number;
  unit: string;
  date: string;
  user: string;
};

type LotsResponse = {
  data: FabricLot[];
};

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInputKg(lot: FabricLot) {
  return lot.quantityKg ?? lot.receivedKg ?? 0;
}

function normalizeStatus(status: FabricLot["status"]) {
  if (status === "Finished") return "Finished";
  if (status === "Transferred For Cutting") return "Finished";
  return "Available";
}

export default function FabricInventoryPage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);

  const [lots, setLots] = useState<FabricLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movementHistory, setMovementHistory] = useState<MovementHistoryItem[]>([]);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [activeLotId, setActiveLotId] = useState<string>("");

  const [addForm, setAddForm] = useState({
    fabricType: "",
    quantityKg: "",
    receiveDate: getTodayDateValue(),
  });
  const [editForm, setEditForm] = useState({
    fabricType: "",
    quantityKg: "",
    receiveDate: getTodayDateValue(),
  });
  const [transferForm, setTransferForm] = useState({
    quantityKg: "",
    cuttingDate: getTodayDateValue(),
    notes: "",
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    fabricType: "",
  });

  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const activeLot = useMemo(
    () => lots.find((lot) => lot._id === activeLotId) || null,
    [activeLotId, lots]
  );

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const searchMatch =
        !filters.search ||
        lot.fabricType.toLowerCase().includes(filters.search.toLowerCase());
      const statusMatch =
        filters.status === "all" || normalizeStatus(lot.status) === filters.status;
      const typeMatch =
        !filters.fabricType ||
        lot.fabricType.toLowerCase().includes(filters.fabricType.toLowerCase());
      return searchMatch && statusMatch && typeMatch;
    });
  }, [filters, lots]);

  const summary = useMemo(() => {
    return filteredLots.reduce(
      (acc, lot) => {
        acc.totalLots += 1;
        acc.totalReceived += getInputKg(lot);
        acc.totalAvailable += lot.availableKg;
        acc.totalTransferred += lot.transferredKg;
        return acc;
      },
      {
        totalLots: 0,
        totalReceived: 0,
        totalAvailable: 0,
        totalTransferred: 0,
      }
    );
  }, [filteredLots]);

  const fetchLots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<LotsResponse>("/fabric-lots");
      setLots(response.data.data || []);
    } catch {
      setError("Failed to load fabric lots.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;

    const run = async () => {
      await fetchLots();
    };

    void run();
  }, [hydrated]);

  const submitAddLot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    setError(null);
    try {
      await api.post("/fabric-lots", {
        fabricType: addForm.fabricType,
        quantityKg: Number(addForm.quantityKg),
        receiveDate: addForm.receiveDate,
      });
      setOpenAddModal(false);
      setAddForm({
        fabricType: "",
        quantityKg: "",
        receiveDate: getTodayDateValue(),
      });
      await fetchLots();
    } catch {
      setError("Failed to add lot. Check your inputs.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openTransfer = (lotId: string) => {
    setActiveLotId(lotId);
    setTransferForm({
      quantityKg: "",
      cuttingDate: getTodayDateValue(),
      notes: "",
    });
    setOpenTransferModal(true);
  };

  const openDetails = async (lot: FabricLot) => {
    setActiveLotId(lot._id);
    setOpenDetailsModal(true);
    try {
      const response = await api.get<{ data: MovementHistoryItem[] }>(
        `/movement-logs?lot=${lot._id}`
      );
      setMovementHistory(response.data.data || []);
    } catch {
      setMovementHistory([]);
    }
  };

  const openEdit = (lot: FabricLot) => {
    setActiveLotId(lot._id);
    setEditForm({
      fabricType: lot.fabricType,
      quantityKg: String(getInputKg(lot)),
      receiveDate: lot.receiveDate.slice(0, 10),
    });
    setOpenEditModal(true);
  };

  const submitTransfer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) {
      return;
    }
    setIsSubmittingTransfer(true);
    setError(null);
    try {
      await api.post(`/fabric-lots/${activeLotId}/transfer-to-cutting`, {
        quantityKg: Number(transferForm.quantityKg),
        cuttingDate: transferForm.cuttingDate || undefined,
        notes: transferForm.notes || undefined,
      });
      setOpenTransferModal(false);
      await fetchLots();
    } catch {
      setError("Transfer failed. Quantity may be higher than available stock.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const submitEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) return;
    setIsSubmittingEdit(true);
    setError(null);
    try {
      await api.put(`/fabric-lots/${activeLotId}`, {
        fabricType: editForm.fabricType,
        quantityKg: Number(editForm.quantityKg),
        receiveDate: editForm.receiveDate,
      });
      setOpenEditModal(false);
      await fetchLots();
    } catch {
      setError("Failed to update fabric item.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const submitDelete = async () => {
    if (!activeLotId) return;
    setIsSubmittingDelete(true);
    setError(null);
    try {
      await api.delete(`/fabric-lots/${activeLotId}`);
      setOpenDeleteModal(false);
      await fetchLots();
    } catch {
      setError("Failed to delete fabric item.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  if (!hydrated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Fabric Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Raw fabric stock entry and transfer flow.
            </p>
          </div>
          <Button onClick={() => setOpenAddModal(true)}>
            <Plus className="mr-2 size-4" />
            Add Fabric
          </Button>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Lots</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.totalLots}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Received (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.totalReceived.toFixed(2)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Available (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700">{summary.totalAvailable.toFixed(2)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Transferred (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-amber-700">{summary.totalTransferred.toFixed(2)}</CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="size-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Search fabric type"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Finished">Finished</option>
            </select>
            <Input
              placeholder="Filter by fabric type"
              value={filters.fabricType}
              onChange={(e) => setFilters((p) => ({ ...p, fabricType: e.target.value }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fabric Lots</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Fabric Type</th>
                      <th className="py-2 pr-4">Input Quantity (KG)</th>
                      <th className="py-2 pr-4">Available Balance</th>
                      <th className="py-2 pr-4">Transferred To Cutting</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLots.map((lot) => (
                      <tr
                        key={lot._id}
                        className="cursor-pointer border-b hover:bg-muted/40"
                        onClick={() => openDetails(lot)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void openDetails(lot);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="py-2 pr-4 font-medium">{lot.fabricType}</td>
                        <td className="py-2 pr-4">{getInputKg(lot).toFixed(2)} kg</td>
                        <td className="py-2 pr-4">{lot.availableKg.toFixed(2)} kg</td>
                        <td className="py-2 pr-4">{lot.transferredKg.toFixed(2)} kg</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              normalizeStatus(lot.status) === "Available"
                                ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                                : "rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                            }
                          >
                            {normalizeStatus(lot.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">{new Date(lot.receiveDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-0">
                          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openDetails(lot)}>
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(lot)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setActiveLotId(lot._id);
                                setOpenDeleteModal(true);
                              }}
                            >
                              Delete
                            </Button>
                            <Button size="sm" onClick={() => openTransfer(lot._id)}>
                              <Scissors className="mr-1 size-3.5" />
                              Transfer To Cutting
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLots.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No lots found for current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fabric Item</DialogTitle>
            <DialogDescription>Raw fabric stock entry.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitAddLot}>
            <div className="space-y-2">
              <Label>Fabric Type</Label>
              <Input
                value={addForm.fabricType}
                onChange={(e) => setAddForm((p) => ({ ...p, fabricType: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fabric Quantity (KG)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={addForm.quantityKg}
                onChange={(e) => setAddForm((p) => ({ ...p, quantityKg: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={addForm.receiveDate}
                onChange={(e) => setAddForm((p) => ({ ...p, receiveDate: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingAdd}>
                {isSubmittingAdd ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openTransferModal} onOpenChange={setOpenTransferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Cutting</DialogTitle>
            <DialogDescription>Move fabric quantity to cutting stock.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitTransfer}>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p>
                <span className="font-medium">Fabric Type:</span> {activeLot?.fabricType || "N/A"}
              </p>
              <p>
                <span className="font-medium">Available:</span>{" "}
                {activeLot ? `${activeLot.availableKg.toFixed(2)} kg` : "N/A"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Quantity Kg</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={transferForm.quantityKg}
                onChange={(e) => setTransferForm((p) => ({ ...p, quantityKg: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cutting Date</Label>
              <Input
                type="date"
                value={transferForm.cuttingDate}
                onChange={(e) => setTransferForm((p) => ({ ...p, cuttingDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={transferForm.notes}
                onChange={(e) => setTransferForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenTransferModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingTransfer}>
                {isSubmittingTransfer ? "Transferring..." : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDetailsModal} onOpenChange={setOpenDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fabric Item</DialogTitle>
            <DialogDescription>Read-only raw stock details.</DialogDescription>
          </DialogHeader>
          {activeLot && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Fabric Type:</span> {activeLot.fabricType}</p>
                <p><span className="font-medium">Input Quantity:</span> {getInputKg(activeLot).toFixed(2)} kg</p>
                <p><span className="font-medium">Available Balance:</span> {activeLot.availableKg.toFixed(2)} kg</p>
                <p><span className="font-medium">Transferred To Cutting:</span> {activeLot.transferredKg.toFixed(2)} kg</p>
                <p><span className="font-medium">Status:</span> {normalizeStatus(activeLot.status)}</p>
                <p><span className="font-medium">Date:</span> {new Date(activeLot.receiveDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Added By Name:</span> {activeLot.createdByUser?.name || "N/A"}</p>
                <p><span className="font-medium">Added By Email:</span> {activeLot.createdByUser?.email || activeLot.createdBy || "N/A"}</p>
                <p><span className="font-medium">Created At:</span> {activeLot.createdAt ? new Date(activeLot.createdAt).toLocaleString() : "N/A"}</p>
              </div>
              <div>
                <p className="mb-2 font-medium">Movement History</p>
                <div className="max-h-48 space-y-2 overflow-auto rounded border p-2">
                  {movementHistory.length === 0 && (
                    <p className="text-muted-foreground">No movement history.</p>
                  )}
                  {movementHistory.map((item) => (
                    <div key={item._id} className="rounded border bg-muted/20 px-2 py-1">
                      {new Date(item.date).toLocaleString()} | {item.fromStage} {"->"} {item.toStage} |{" "}
                      {item.quantity} {item.unit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fabric Item</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="space-y-2">
              <Label>Fabric Type</Label>
              <Input
                value={editForm.fabricType}
                onChange={(e) => setEditForm((p) => ({ ...p, fabricType: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity (KG)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.quantityKg}
                onChange={(e) => setEditForm((p) => ({ ...p, quantityKg: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editForm.receiveDate}
                onChange={(e) => setEditForm((p) => ({ ...p, receiveDate: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fabric Item?</DialogTitle>
            <DialogDescription>
              This will permanently remove the selected raw fabric stock entry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={submitDelete}
              disabled={isSubmittingDelete}
            >
              {isSubmittingDelete ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
