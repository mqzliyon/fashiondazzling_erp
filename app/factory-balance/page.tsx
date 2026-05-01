"use client";

import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";

import { CalendarDays, Check, Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { DATE_FILTER_OPTIONS, resolveDateFilterRange, type DateFilterValue } from "@/lib/date-filter";
import { useAuthStore } from "@/store/auth-store";

type FactoryTransferEntry = {
  _id: string;
  availablePieces: number;
  totalReceivedPieces: number;
  transferredOfficePieces: number;
  transferredExportPieces: number;
  transferredTotalPieces: number;
  grade?: "A Grade" | "B Grade" | "";
  notes?: string;
  lastUpdatedDate: string;
  operatorName?: string;
  lot?: {
    _id?: string;
    lotNumber?: string;
    fabricType?: string;
  };
};

type GradeFilter = "total" | "a" | "b";

export default function FactoryBalancePage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);
  const [entries, setEntries] = useState<FactoryTransferEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<GradeFilter>("total");
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeEntry, setActiveEntry] = useState<FactoryTransferEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [officeForm, setOfficeForm] = useState({ office: "", quantity: "", date: "" });
  const [exportForm, setExportForm] = useState({
    buyerName: "",
    country: "",
    buyerPhone: "",
    quantity: "",
    date: "",
  });
  const [officeSubmitting, setOfficeSubmitting] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const range = resolveDateFilterRange(dateFilter, customFromDate, customToDate);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [dateFilter, customFromDate, customToDate]);

  const openDetailsModal = (entry: FactoryTransferEntry) => {
    setActiveEntry(entry);
    setShowDetailsModal(true);
  };

  const openOfficeModal = (entry: FactoryTransferEntry) => {
    const today = new Date().toISOString().slice(0, 10);
    setActiveEntry(entry);
    setOfficeForm({
      office: "",
      quantity: String(entry.availablePieces || ""),
      date: today,
    });
    setShowOfficeModal(true);
  };

  const openExportModal = (entry: FactoryTransferEntry) => {
    const today = new Date().toISOString().slice(0, 10);
    setActiveEntry(entry);
    setExportForm({
      buyerName: "",
      country: "",
      buyerPhone: "",
      quantity: String(entry.availablePieces || ""),
      date: today,
    });
    setShowExportModal(true);
  };

  const submitOfficeDispatch = async () => {
    if (!activeEntry?.lot?._id) return;
    if (!officeForm.office.trim()) {
      setError("Office Name is required.");
      return;
    }
    if (Number(officeForm.quantity || 0) > Number(activeEntry.availablePieces || 0)) {
      setError("Dispatch quantity cannot exceed available quantity.");
      return;
    }
    setOfficeSubmitting(true);
    setError(null);
    try {
      const referenceNo = `OFF-${activeEntry.lot.lotNumber || "LOT"}-${Date.now()}`;
      await api.post("/office-dispatch", {
        office: officeForm.office,
        lot: activeEntry.lot._id,
        quantity: Number(officeForm.quantity),
        dispatchDate: officeForm.date || undefined,
        referenceNo,
        status: "dispatched",
        source: "factory_warehouse",
        grade: activeEntry.grade || undefined,
      });
      setShowOfficeModal(false);
      await loadFactoryTransfers();
    } catch {
      setError("Send Office failed. Check stock and required fields.");
    } finally {
      setOfficeSubmitting(false);
    }
  };

  const submitExportDispatch = async () => {
    if (!activeEntry?.lot?._id) return;
    if (!exportForm.buyerName.trim() || !exportForm.country.trim() || !exportForm.buyerPhone.trim()) {
      setError("Buyer name, country, and phone are required.");
      return;
    }
    if (Number(exportForm.quantity || 0) > Number(activeEntry.availablePieces || 0)) {
      setError("Export quantity cannot exceed available quantity.");
      return;
    }
    setExportSubmitting(true);
    setError(null);
    try {
      const shipmentNumber = `SHP-${activeEntry.lot.lotNumber || "LOT"}-${Date.now()}`;
      await api.post("/foreign-shipments", {
        country: exportForm.country,
        buyerName: exportForm.buyerName,
        buyerPhone: exportForm.buyerPhone,
        shipmentNumber,
        lot: activeEntry.lot._id,
        quantity: Number(exportForm.quantity),
        shipmentDate: exportForm.date || undefined,
        status: "Packed",
        source: "factory_warehouse",
        grade: activeEntry.grade || undefined,
      });
      setShowExportModal(false);
      await loadFactoryTransfers();
    } catch {
      setError("Send Export failed. Check stock and required fields.");
    } finally {
      setExportSubmitting(false);
    }
  };

  const submitDeleteAndReturnToEmbroidery = async (entry: FactoryTransferEntry) => {
    if (!entry?._id) return;
    const quantity = Number(entry.availablePieces || 0);
    if (quantity <= 0) {
      setError("No available quantity to return.");
      return;
    }

    const confirmed = window.confirm(
      `Delete this factory balance entry and return ${quantity} pcs to embroidery stock?`
    );
    if (!confirmed) return;

    setDeleteSubmittingId(entry._id);
    setError(null);
    try {
      await api.delete(`/embroidery/factory-warehouse/${entry._id}`);
      await loadFactoryTransfers();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const msg = (error.response?.data as { message?: string } | undefined)?.message;
        setError(msg || "Delete failed. Could not return quantity to embroidery.");
      } else {
        setError("Delete failed. Could not return quantity to embroidery.");
      }
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  const loadFactoryTransfers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: FactoryTransferEntry[] }>(
        "/embroidery/factory-warehouse/current"
      );
      setEntries(res.data.data || []);
    } catch {
      setError("Failed to load factory balance data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    void loadFactoryTransfers();
  }, [hydrated]);

  const aGradeEntries = useMemo(
    () => entries.filter((item) => item.grade === "A Grade"),
    [entries]
  );
  const bGradeEntries = useMemo(
    () => entries.filter((item) => item.grade === "B Grade"),
    [entries]
  );

  const aGradeQuantity = useMemo(
    () => aGradeEntries.reduce((sum, item) => sum + Number(item.availablePieces || 0), 0),
    [aGradeEntries]
  );
  const bGradeQuantity = useMemo(
    () => bGradeEntries.reduce((sum, item) => sum + Number(item.availablePieces || 0), 0),
    [bGradeEntries]
  );
  const totalQuantity = aGradeQuantity + bGradeQuantity;
  const filteredEntries = useMemo(() => {
    const normalizedSearch = lotSearch.trim().toLowerCase();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;

    const baseByGrade = (() => {
      if (activeFilter === "a") return aGradeEntries;
      if (activeFilter === "b") return bGradeEntries;
      return entries.filter((item) => item.grade === "A Grade" || item.grade === "B Grade");
    })();

    return baseByGrade.filter((item) => {
      const lotNumber = (item.lot?.lotNumber || "").toLowerCase();
      const itemDateTs = new Date(item.lastUpdatedDate).getTime();
      const matchesLot = normalizedSearch ? lotNumber.includes(normalizedSearch) : true;
      const matchesFrom = fromTs !== null ? itemDateTs >= fromTs : true;
      const matchesTo = toTs !== null ? itemDateTs <= toTs : true;
      return matchesLot && matchesFrom && matchesTo;
    });
  }, [activeFilter, aGradeEntries, bGradeEntries, entries, lotSearch, fromDate, toDate]);
  const filterBadgeText = useMemo(() => {
    if (activeFilter === "a") return "Showing: A Grade Products";
    if (activeFilter === "b") return "Showing: B Grade Products";
    return "Showing: All Products";
  }, [activeFilter]);

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Factory Balance</h1>
          <p className="text-sm text-muted-foreground">
            Grade-wise quantities from embroidery transfers to factory warehouse.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${
              activeFilter === "total"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/30"
            }`}
            onClick={() => setActiveFilter("total")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                {activeFilter === "total" && <Check className="size-3.5 text-primary" />}
                Total Quantity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totalQuantity} pcs</CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              activeFilter === "a"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/30"
            }`}
            onClick={() => setActiveFilter("a")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                {activeFilter === "a" && <Check className="size-3.5 text-primary" />}
                A Grade Quantity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-emerald-700">
              {aGradeQuantity} pcs
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              activeFilter === "b"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "hover:bg-muted/30"
            }`}
            onClick={() => setActiveFilter("b")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1 text-sm">
                {activeFilter === "b" && <Check className="size-3.5 text-primary" />}
                B Grade Quantity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-amber-700">
              {bGradeQuantity} pcs
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-2">
              <CardTitle>Factory Product List</CardTitle>
              <p className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {filterBadgeText}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Funnel className="mr-1.5 size-3.5" />
                Filter
              </Button>
              <Button
                variant={activeFilter === "total" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("total")}
                className={activeFilter === "total" ? "shadow-sm" : ""}
              >
                Total
              </Button>
              <Button
                variant={activeFilter === "a" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("a")}
                className={activeFilter === "a" ? "shadow-sm" : ""}
              >
                A Grade
              </Button>
              <Button
                variant={activeFilter === "b" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("b")}
                className={activeFilter === "b" ? "shadow-sm" : ""}
              >
                B Grade
              </Button>
              <Button variant="outline" size="sm" onClick={loadFactoryTransfers} disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showFilters && (
              <>
                <div className="mb-4 grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Date Filter</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-background px-2">
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
                    <Input
                      id="lot-search"
                      placeholder="Type lot number..."
                      value={lotSearch}
                      onChange={(e) => setLotSearch(e.target.value)}
                    />
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
                <div className="mb-4 flex justify-end">
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
              </>
            )}
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Lot Number</th>
                      <th className="py-2 pr-4">Grade</th>
                      <th className="py-2 pr-4">Available</th>
                      <th className="py-2 pr-4">Transferred</th>
                      <th className="py-2 pr-4">Transferred To</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((item) => (
                      <tr key={item._id} className="border-b">
                        <td className="py-2 pr-4 font-medium">{item.lot?.lotNumber || "N/A"}</td>
                        <td className="py-2 pr-4">{item.grade || "-"}</td>
                        <td className="py-2 pr-4">{item.availablePieces} pcs</td>
                        <td className="py-2 pr-4">{item.transferredTotalPieces} pcs</td>
                        <td className="py-2 pr-4">
                          Office: {item.transferredOfficePieces} | Export: {item.transferredExportPieces}
                        </td>
                        <td className="py-2 pr-4">{new Date(item.lastUpdatedDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-0">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetailsModal(item)}>
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOfficeModal(item)}
                              disabled={item.availablePieces <= 0}
                            >
                              Send Office
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openExportModal(item)}
                              disabled={item.availablePieces <= 0}
                            >
                              Send Export
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => void submitDeleteAndReturnToEmbroidery(item)}
                              disabled={
                                item.availablePieces <= 0 ||
                                deleteSubmittingId === item._id ||
                                officeSubmitting ||
                                exportSubmitting
                              }
                              title="Delete from factory balance and return quantity to embroidery"
                            >
                              {deleteSubmittingId === item._id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">
                          No products found for selected grade.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Factory Item Details</DialogTitle>
            </DialogHeader>
            {activeEntry && (
              <div className="grid gap-2 text-sm">
                <p><span className="font-medium">Lot Number:</span> {activeEntry.lot?.lotNumber || "N/A"}</p>
                <p><span className="font-medium">Grade:</span> {activeEntry.grade || "-"}</p>
                <p><span className="font-medium">Available:</span> {activeEntry.availablePieces} pcs</p>
                <p><span className="font-medium">Transferred:</span> {activeEntry.transferredTotalPieces} pcs</p>
                <p><span className="font-medium">Office Sent:</span> {activeEntry.transferredOfficePieces} pcs</p>
                <p><span className="font-medium">Export Sent:</span> {activeEntry.transferredExportPieces} pcs</p>
                <p><span className="font-medium">Updated:</span> {new Date(activeEntry.lastUpdatedDate).toLocaleString()}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showOfficeModal} onOpenChange={setShowOfficeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send to Office</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Lot</Label>
                <Input value={activeEntry?.lot?.lotNumber || ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Office Name *</Label>
                <Input
                  value={officeForm.office}
                  onChange={(e) => setOfficeForm((p) => ({ ...p, office: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={activeEntry?.availablePieces || 1}
                  value={officeForm.quantity}
                  onChange={(e) => setOfficeForm((p) => ({ ...p, quantity: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Available Quantity: {activeEntry?.availablePieces || 0} pcs
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={officeForm.date}
                  onChange={(e) => setOfficeForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowOfficeModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitOfficeDispatch}
                  disabled={
                    officeSubmitting ||
                    !officeForm.office.trim() ||
                    Number(officeForm.quantity || 0) <= 0
                  }
                >
                  {officeSubmitting ? "Sending..." : "Confirm Send Office"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send to Export</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Lot</Label>
                <Input value={activeEntry?.lot?.lotNumber || ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Buyer Name *</Label>
                <Input
                  value={exportForm.buyerName}
                  onChange={(e) => setExportForm((p) => ({ ...p, buyerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Buyer Country *</Label>
                <Input
                  value={exportForm.country}
                  onChange={(e) => setExportForm((p) => ({ ...p, country: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Buyer Phone *</Label>
                <Input
                  value={exportForm.buyerPhone}
                  onChange={(e) => setExportForm((p) => ({ ...p, buyerPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={activeEntry?.availablePieces || 1}
                  value={exportForm.quantity}
                  onChange={(e) => setExportForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={exportForm.date}
                  onChange={(e) => setExportForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitExportDispatch}
                  disabled={
                    exportSubmitting ||
                    !exportForm.buyerName.trim() ||
                    !exportForm.country.trim() ||
                    !exportForm.buyerPhone.trim() ||
                    Number(exportForm.quantity || 0) <= 0
                  }
                >
                  {exportSubmitting ? "Sending..." : "Confirm Send Export"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
