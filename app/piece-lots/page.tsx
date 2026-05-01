"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Funnel } from "lucide-react";
import { Plus } from "lucide-react";
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
import { DATE_FILTER_OPTIONS, resolveDateFilterRange, type DateFilterValue } from "@/lib/date-filter";
import { useAuthStore } from "@/store/auth-store";

type PieceLot = {
  _id: string;
  lotNumber: string;
  fabricType?: string;
  outputPieces: number;
  sentToEmbroideryPieces?: number;
  availablePieces?: number;
  status: "Available" | "Sent to Embroidery";
  completionDate: string;
  notes?: string;
  fabricSource?: string;
};

type MovementItem = {
  _id: string;
  fromStage: string;
  toStage: string;
  quantity: number;
  unit: string;
  date: string;
  user: string;
};

export default function PieceLotsPage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);
  const [lots, setLots] = useState<PieceLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSendEmbroidery, setShowSendEmbroidery] = useState(false);
  const [activeLot, setActiveLot] = useState<PieceLot | null>(null);
  const [movementHistory, setMovementHistory] = useState<MovementItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    lotNumber: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [sendForm, setSendForm] = useState({
    pieces: "",
    notes: "",
  });
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const range = resolveDateFilterRange(dateFilter, customFromDate, customToDate);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [dateFilter, customFromDate, customToDate]);

  const loadLots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: PieceLot[] }>("/piece-lots");
      setLots(response.data.data || []);
    } catch {
      setError("Failed to load lots.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    const run = async () => {
      await loadLots();
    };
    void run();
  }, [hydrated]);

  const openDetails = async (lot: PieceLot) => {
    setActiveLot(lot);
    setShowDetails(true);
    try {
      const res = await api.get<{ data: { lot: PieceLot; movementHistory: MovementItem[] } }>(
        `/piece-lots/${lot._id}`
      );
      setActiveLot(res.data.data?.lot || lot);
      setMovementHistory(res.data.data?.movementHistory || []);
    } catch {
      setMovementHistory([]);
    }
  };

  const onAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/piece-lots", {
        lotNumber: form.lotNumber,
        date: form.date,
        notes: form.notes || undefined,
      });
      setShowAdd(false);
      setForm({
        lotNumber: "",
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await loadLots();
    } catch {
      setError("Failed to add lot. Lot number may already exist.");
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLot) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/piece-lots/${activeLot._id}`, {
        lotNumber: form.lotNumber,
        date: form.date,
        notes: form.notes || undefined,
      });
      setShowEdit(false);
      await loadLots();
    } catch {
      setError("Failed to update lot.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!activeLot) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.delete(`/piece-lots/${activeLot._id}`);
      setShowDelete(false);
      setShowDetails(false);
      setActiveLot(null);
      await loadLots();
    } catch {
      setError("Failed to delete lot.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSendToEmbroidery = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLot) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/piece-lots/${activeLot._id}/send-to-embroidery`, {
        pieces: Number(sendForm.pieces),
        notes: sendForm.notes || undefined,
      });
      setShowSendEmbroidery(false);
      setActiveLot(null);
      setSendForm({ pieces: "", notes: "" });
      await loadLots();
    } catch {
      setError("Failed to send lot to embroidery.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (lot: PieceLot) => {
    setActiveLot(lot);
    setForm({
      lotNumber: lot.lotNumber,
      date: new Date(lot.completionDate).toISOString().slice(0, 10),
      notes: lot.notes || "",
    });
    setShowEdit(true);
  };

  const openDelete = (lot: PieceLot) => {
    setActiveLot(lot);
    setShowDelete(true);
  };

  if (!hydrated) return null;

  const filteredLots = lots.filter((lot) => {
    const matchesLot = lotSearch
      ? String(lot.lotNumber || "").toLowerCase().includes(lotSearch.toLowerCase())
      : true;
    const dateTs = new Date(lot.completionDate).getTime();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const matchesFrom = fromTs !== null ? dateTs >= fromTs : true;
    const matchesTo = toTs !== null ? dateTs <= toTs : true;
    return matchesLot && matchesFrom && matchesTo;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">All Lots</h1>
            <p className="text-sm text-muted-foreground">Manage all created lots.</p>
          </div>
          <Button
            onClick={() => {
              setForm({
                lotNumber: "",
                date: new Date().toISOString().slice(0, 10),
                notes: "",
              });
              setShowAdd(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add Lot
          </Button>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Funnel className="mr-1.5 size-3.5" />
              Filter
            </Button>
          </CardHeader>
          <CardContent className={showFilters ? "space-y-3" : "hidden"}>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date Filter</Label>
                <div className="flex items-center gap-2 rounded-md border px-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <select
                    className="h-10 w-full bg-transparent text-sm outline-none"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilterValue)}
                  >
                    {DATE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lot-search">Search by Lot Number</Label>
                <Input id="lot-search" placeholder="Type lot number..." value={lotSearch} onChange={(e) => setLotSearch(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="from-date">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={dateFilter === "custom_range" ? customFromDate : fromDate}
                  onChange={(e) =>
                    dateFilter === "custom_range" ? setCustomFromDate(e.target.value) : setFromDate(e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to-date">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={dateFilter === "custom_range" ? customToDate : toDate}
                  onChange={(e) =>
                    dateFilter === "custom_range" ? setCustomToDate(e.target.value) : setToDate(e.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setLotSearch("");
                  setDateFilter("today");
                  setCustomFromDate("");
                  setCustomToDate("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Lots Table</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Lot Number</th>
                      <th className="py-2 pr-4">Total PCS</th>
                      <th className="py-2 pr-4">Available PCS</th>
                      <th className="py-2 pr-4">Sent Embroidery PCS</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Created Date</th>
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
                        <td className="py-2 pr-4">{lot.lotNumber}</td>
                        <td className="py-2 pr-4">{Number(lot.outputPieces || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{Number(lot.availablePieces || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          {Number(lot.sentToEmbroideryPieces || 0).toFixed(2)}
                        </td>
                        <td className="py-2 pr-4">
                          {lot.status === "Sent to Embroidery" ? (
                            <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                              Sent to Embroidery
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {new Date(lot.completionDate).toLocaleDateString()}
                        </td>
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
                              onClick={() => openDelete(lot)}
                            >
                              Delete
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setActiveLot(lot);
                                setSendForm({ pieces: "", notes: "" });
                                setShowSendEmbroidery(true);
                              }}
                              disabled={submitting || Number(lot.availablePieces || 0) <= 0}
                            >
                              Send to Embroidery
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLots.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No lots found.
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lot</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onAdd}>
            <div className="space-y-2">
              <Label>Lot Number</Label>
              <Input
                value={form.lotNumber}
                onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lot</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onEdit}>
            <div className="space-y-2">
              <Label>Lot Number</Label>
              <Input
                value={form.lotNumber}
                onChange={(e) => setForm((p) => ({ ...p, lotNumber: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lot?</DialogTitle>
            <DialogDescription>This action will remove the lot from active list.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lot Details</DialogTitle>
          </DialogHeader>
          {activeLot && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Lot Number:</span> {activeLot.lotNumber}</p>
                <p><span className="font-medium">Fabric Source:</span> {activeLot.fabricSource || "Manual"}</p>
                <p><span className="font-medium">Pieces Quantity:</span> {Number(activeLot.outputPieces || 0).toFixed(2)}</p>
                <p><span className="font-medium">Created Date:</span> {new Date(activeLot.completionDate).toLocaleDateString()}</p>
                <p className="md:col-span-2"><span className="font-medium">Notes:</span> {activeLot.notes || "-"}</p>
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
                      {Number(item.quantity || 0).toFixed(2)} {item.unit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSendEmbroidery} onOpenChange={setShowSendEmbroidery}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Embroidery</DialogTitle>
            <DialogDescription>
              Enter quantity and notes to transfer pieces to embroidery.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSendToEmbroidery}>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p>
                <span className="font-medium">Available Quantity:</span>{" "}
                {Number(activeLot?.availablePieces || 0).toFixed(2)} pcs
              </p>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={sendForm.pieces}
                onChange={(e) => setSendForm((p) => ({ ...p, pieces: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={sendForm.notes}
                onChange={(e) => setSendForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSendEmbroidery(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "OK"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
