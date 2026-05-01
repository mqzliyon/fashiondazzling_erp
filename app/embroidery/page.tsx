"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { CalendarDays, Funnel } from "lucide-react";

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

type EmbroideryStock = {
  _id: string;
  lot: string;
  lotNumber: string;
  fabricType: string;
  availablePieces: number;
  totalReceivedPieces: number;
  totalRejectedPieces: number;
  totalSentOfficePieces: number;
  totalSentExportPieces: number;
  totalSentFactoryPieces?: number;
  lastUpdatedDate: string;
};

type EmbroiderySummary = {
  totalLots: number;
  availablePieces: number;
  totalReceivedPieces: number;
  totalRejectedPieces: number;
  totalSentOfficePieces: number;
  totalSentExportPieces: number;
};

type EmbroideryHistory = {
  _id: string;
  actionType:
    | "receive_from_cutting"
    | "reject"
    | "send_to_office"
    | "send_to_export"
    | "send_to_factory_warehouse";
  fromStage: string;
  toStage: string;
  pieces: number;
  reason?: string;
  date: string;
  operatorName?: string;
  lot?: {
    lotNumber?: string;
  };
};

export default function EmbroideryPage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);

  const [stocks, setStocks] = useState<EmbroideryStock[]>([]);
  const [summary, setSummary] = useState<EmbroiderySummary>({
    totalLots: 0,
    availablePieces: 0,
    totalReceivedPieces: 0,
    totalRejectedPieces: 0,
    totalSentOfficePieces: 0,
    totalSentExportPieces: 0,
  });
  const [history, setHistory] = useState<EmbroideryHistory[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeLotId, setActiveLotId] = useState("");
  const [activeLotDetails, setActiveLotDetails] = useState<EmbroideryStock | null>(null);
  const [activeLotHistory, setActiveLotHistory] = useState<EmbroideryHistory[]>([]);
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [officeSubmitting, setOfficeSubmitting] = useState(false);
  const [exportSubmitting, setExportSubmitting] = useState(false);
  const [factorySubmitting, setFactorySubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);

  const [rejectForm, setRejectForm] = useState({
    pieces: "",
    reason: "",
    date: "",
  });
  const [officeForm, setOfficeForm] = useState({
    office: "",
    pieces: "",
    date: "",
  });
  const [exportForm, setExportForm] = useState({
    buyerName: "",
    buyerCountry: "",
    buyerPhone: "",
    pieces: "",
    date: "",
  });
  const [factoryForm, setFactoryForm] = useState({
    grade: "A Grade",
    pieces: "",
    notes: "",
    date: "",
  });

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
      const msg = (error.response?.data as { message?: string } | undefined)?.message;
      if (msg) return msg;
    }
    return fallback;
  };

  const activeStock = useMemo(
    () => stocks.find((stock) => stock.lot === activeLotId) || null,
    [stocks, activeLotId]
  );

  useEffect(() => {
    const range = resolveDateFilterRange(dateFilter, customFromDate, customToDate);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [dateFilter, customFromDate, customToDate]);

  const filteredStocks = stocks.filter((stock) => {
    const matchesLot = lotSearch
      ? String(stock.lotNumber || "").toLowerCase().includes(lotSearch.toLowerCase())
      : true;
    const dateTs = new Date(stock.lastUpdatedDate).getTime();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const matchesFrom = fromTs !== null ? dateTs >= fromTs : true;
    const matchesTo = toTs !== null ? dateTs <= toTs : true;
    return matchesLot && matchesFrom && matchesTo;
  });
  const totalFactoryBalance = stocks.reduce(
    (sum, stock) => sum + Number(stock.totalSentFactoryPieces || 0),
    0
  );

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stockRes, summaryRes, historyRes] = await Promise.all([
        api.get<{ data: EmbroideryStock[] }>("/embroidery/stock/current"),
        api.get<{ data: EmbroiderySummary }>("/embroidery/stock/summary"),
        api.get<{ data: EmbroideryHistory[] }>("/embroidery/history"),
      ]);

      setStocks(stockRes.data.data || []);
      setSummary(summaryRes.data.data || summary);
      setHistory(historyRes.data.data || []);
    } catch {
      setError("Failed to load embroidery data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    const run = async () => {
      await loadData();
    };
    void run();
  }, [hydrated]);

  const openRejectModal = (lotId: string) => {
    setActiveLotId(lotId);
    const today = new Date().toISOString().slice(0, 10);
    setRejectForm({ pieces: "", reason: "", date: today });
    setShowRejectModal(true);
  };

  const openOfficeModal = (lotId: string) => {
    setActiveLotId(lotId);
    const today = new Date().toISOString().slice(0, 10);
    const stock = stocks.find((item) => item.lot === lotId);
    setOfficeForm({ office: "", pieces: String(stock?.availablePieces || ""), date: today });
    setShowOfficeModal(true);
  };

  const openExportModal = (lotId: string) => {
    setActiveLotId(lotId);
    const today = new Date().toISOString().slice(0, 10);
    const stock = stocks.find((item) => item.lot === lotId);
    setExportForm({
      buyerName: "",
      buyerCountry: "",
      buyerPhone: "",
      pieces: String(stock?.availablePieces || ""),
      date: today,
    });
    setShowExportModal(true);
  };

  const openFactoryModal = (lotId: string) => {
    setActiveLotId(lotId);
    const today = new Date().toISOString().slice(0, 10);
    setFactoryForm({
      grade: "A Grade",
      pieces: "",
      notes: "",
      date: today,
    });
    setShowFactoryModal(true);
  };

  const openDetailsModal = async (lotId: string) => {
    setActiveLotId(lotId);
    setShowDetailsModal(true);
    try {
      const res = await api.get<{ data: { stock: EmbroideryStock; history: EmbroideryHistory[] } }>(
        `/embroidery/stock/${lotId}/details`
      );
      setActiveLotDetails(res.data.data?.stock || null);
      setActiveLotHistory(res.data.data?.history || []);
    } catch {
      setActiveLotDetails(null);
      setActiveLotHistory([]);
    }
  };

  const submitReject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) return;
    setRejectSubmitting(true);
    setError(null);
    try {
      await api.post("/embroidery/reject", {
        lotId: activeLotId,
        pieces: Number(rejectForm.pieces),
        reason: rejectForm.reason || undefined,
        date: rejectForm.date || undefined,
      });
      setShowRejectModal(false);
      await loadData();
    } catch {
      setError("Reject transfer failed. Check available pieces.");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const submitOfficeDispatch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) return;
    if (!officeForm.office.trim()) {
      setError("Office name is required.");
      return;
    }
    setOfficeSubmitting(true);
    setError(null);
    try {
      const referenceNo = `OFF-EMB-${activeStock?.lotNumber || "LOT"}-${Date.now()}`;
      await api.post("/office-dispatch", {
        office: officeForm.office,
        lot: activeLotId,
        quantity: Number(officeForm.pieces),
        dispatchDate: officeForm.date || undefined,
        referenceNo,
        status: "dispatched",
        source: "embroidery",
      });
      setShowOfficeModal(false);
      await loadData();
    } catch {
      setError("Office dispatch failed. Check available pieces.");
    } finally {
      setOfficeSubmitting(false);
    }
  };

  const submitExportDispatch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) return;
    if (!exportForm.buyerName.trim() || !exportForm.buyerCountry.trim() || !exportForm.buyerPhone.trim()) {
      setError("Buyer name, country, and phone are required.");
      return;
    }
    if (Number(exportForm.pieces || 0) > Number(activeStock?.availablePieces || 0)) {
      setError("Export quantity cannot exceed available pieces.");
      return;
    }
    setExportSubmitting(true);
    setError(null);
    try {
      const shipmentNumber = `SHP-EMB-${activeStock?.lotNumber || "LOT"}-${Date.now()}`;
      await api.post("/foreign-shipments", {
        country: exportForm.buyerCountry,
        buyerName: exportForm.buyerName,
        buyerPhone: exportForm.buyerPhone,
        shipmentNumber,
        lot: activeLotId,
        quantity: Number(exportForm.pieces),
        shipmentDate: exportForm.date || undefined,
        status: "Packed",
        source: "embroidery",
      });
      setShowExportModal(false);
      await loadData();
    } catch {
      setError("Export dispatch failed. Check available pieces.");
    } finally {
      setExportSubmitting(false);
    }
  };

  const submitFactoryTransfer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLotId) return;
    setFactorySubmitting(true);
    setError(null);
    try {
      await api.post("/embroidery/factory-warehouse-transfer", {
        lotId: activeLotId,
        pieces: Number(factoryForm.pieces),
        grade: factoryForm.grade,
        notes: factoryForm.notes || undefined,
        date: factoryForm.date || undefined,
      });
      setShowFactoryModal(false);
      await loadData();
    } catch {
      setError("Factory warehouse transfer failed. Check available pieces.");
    } finally {
      setFactorySubmitting(false);
    }
  };

  const submitDeleteLot = async () => {
    if (!activeLotId) return;
    setDeleteSubmitting(true);
    setError(null);
    try {
      await api.delete(`/embroidery/stock/${activeLotId}`);
      setShowDeleteModal(false);
      setShowDetailsModal(false);
      await loadData();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to delete embroidery lot."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const submitArchiveLot = async (lotId: string) => {
    if (!lotId) return;
    setArchiveSubmitting(true);
    setError(null);
    try {
      await api.patch(`/embroidery/stock/${lotId}/archive`);
      setShowDeleteModal(false);
      setShowDetailsModal(false);
      await loadData();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to archive embroidery lot."));
    } finally {
      setArchiveSubmitting(false);
    }
  };

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Embroidery Module</h1>
          <p className="text-sm text-muted-foreground">
            Receive lots, manage rejects, and dispatch to office/export.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lots</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{summary.totalLots}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Available</CardTitle></CardHeader><CardContent className="text-xl font-semibold text-emerald-700">{summary.availablePieces}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Received</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{summary.totalReceivedPieces}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rejected</CardTitle></CardHeader><CardContent className="text-xl font-semibold text-rose-700">{summary.totalRejectedPieces}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Factory Balance</CardTitle></CardHeader><CardContent className="text-xl font-semibold text-indigo-700">{totalFactoryBalance}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Sent Office</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{summary.totalSentOfficePieces}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Sent Export</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{summary.totalSentExportPieces}</CardContent></Card>
        </div>

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
            <CardTitle>Received Lots Table</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Lot</th>
                      <th className="py-2 pr-4">Fabric</th>
                      <th className="py-2 pr-4">Available</th>
                      <th className="py-2 pr-4">Received</th>
                      <th className="py-2 pr-4">Updated</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.map((stock) => (
                      <tr
                        key={stock._id}
                        className="cursor-pointer border-b hover:bg-muted/40"
                        onClick={() => openDetailsModal(stock.lot)}
                      >
                        <td className="py-2 pr-4 font-medium">{stock.lotNumber}</td>
                        <td className="py-2 pr-4">{stock.fabricType}</td>
                        <td className="py-2 pr-4">{stock.availablePieces} pcs</td>
                        <td className="py-2 pr-4">{stock.totalReceivedPieces} pcs</td>
                        <td className="py-2 pr-4">{new Date(stock.lastUpdatedDate).toLocaleString()}</td>
                        <td className="py-2 pr-0">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openDetailsModal(stock.lot)}>
                              Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openRejectModal(stock.lot)}>
                              Reject
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openOfficeModal(stock.lot)}>
                              Send Office
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openFactoryModal(stock.lot)}
                            >
                              Send Factory Warehouse
                            </Button>
                            <Button size="sm" onClick={() => openExportModal(stock.lot)}>
                              Send Export
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={archiveSubmitting}
                              className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                              onClick={() => void submitArchiveLot(stock.lot)}
                              title="Archive lot (keeps history, hides from current list)"
                            >
                              Archive
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              disabled={
                                archiveSubmitting ||
                                Number(stock.totalRejectedPieces || 0) > 0 ||
                                Number(stock.totalSentOfficePieces || 0) > 0 ||
                                Number(stock.totalSentExportPieces || 0) > 0 ||
                                Number(stock.totalSentFactoryPieces || 0) > 0
                              }
                              title={
                                Number(stock.totalRejectedPieces || 0) > 0 ||
                                Number(stock.totalSentOfficePieces || 0) > 0 ||
                                Number(stock.totalSentExportPieces || 0) > 0 ||
                                Number(stock.totalSentFactoryPieces || 0) > 0
                                  ? "Cannot delete after reject/dispatch/factory transfer operations"
                                  : "Delete lot"
                              }
                              onClick={() => {
                                setActiveLotId(stock.lot);
                                setShowDeleteModal(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStocks.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No embroidery lots available.
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

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Reject Transfer</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitReject}>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p><span className="font-medium">Lot:</span> {activeStock?.lotNumber || "N/A"}</p>
                  <p><span className="font-medium">Available:</span> {activeStock ? `${activeStock.availablePieces} pcs` : "N/A"}</p>
                </div>
                <div className="space-y-2"><Label>Reject Pieces</Label><Input type="number" min="1" step="1" value={rejectForm.pieces} onChange={(e) => setRejectForm((p) => ({ ...p, pieces: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Reject Date</Label><Input type="date" value={rejectForm.date} onChange={(e) => setRejectForm((p) => ({ ...p, date: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Reason (Optional)</Label><Input value={rejectForm.reason} onChange={(e) => setRejectForm((p) => ({ ...p, reason: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={rejectSubmitting}>{rejectSubmitting ? "Saving..." : "Confirm Reject"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Send to Office</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitOfficeDispatch}>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p><span className="font-medium">Lot:</span> {activeStock?.lotNumber || "N/A"}</p>
                  <p><span className="font-medium">Available:</span> {activeStock ? `${activeStock.availablePieces} pcs` : "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Office Name *</Label>
                  <Input
                    value={officeForm.office}
                    onChange={(e) => setOfficeForm((p) => ({ ...p, office: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pieces to Send</Label>
                  <Input
                    type="number"
                    min="1"
                    max={activeStock?.availablePieces || 1}
                    step="1"
                    value={officeForm.pieces}
                    onChange={(e) => setOfficeForm((p) => ({ ...p, pieces: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Available pieces: {activeStock?.availablePieces || 0}
                  </p>
                </div>
                <div className="space-y-2"><Label>Dispatch Date</Label><Input type="date" value={officeForm.date} onChange={(e) => setOfficeForm((p) => ({ ...p, date: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowOfficeModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={officeSubmitting}>{officeSubmitting ? "Sending..." : "Send to Office"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Send to Export</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitExportDispatch}>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p><span className="font-medium">Lot:</span> {activeStock?.lotNumber || "N/A"}</p>
                  <p><span className="font-medium">Available:</span> {activeStock ? `${activeStock.availablePieces} pcs` : "N/A"}</p>
                </div>
                <div className="space-y-2"><Label>Buyer Name *</Label><Input value={exportForm.buyerName} onChange={(e) => setExportForm((p) => ({ ...p, buyerName: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Buyer Country *</Label><Input value={exportForm.buyerCountry} onChange={(e) => setExportForm((p) => ({ ...p, buyerCountry: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Buyer Phone *</Label><Input value={exportForm.buyerPhone} onChange={(e) => setExportForm((p) => ({ ...p, buyerPhone: e.target.value }))} required /></div>
                <div className="space-y-2">
                  <Label>Transfer Pieces</Label>
                  <Input type="number" min="1" max={activeStock?.availablePieces || 1} step="1" value={exportForm.pieces} onChange={(e) => setExportForm((p) => ({ ...p, pieces: e.target.value }))} required />
                  <p className="text-xs text-muted-foreground">Available pieces: {activeStock?.availablePieces || 0}</p>
                </div>
                <div className="space-y-2"><Label>Dispatch Date</Label><Input type="date" value={exportForm.date} onChange={(e) => setExportForm((p) => ({ ...p, date: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={exportSubmitting}>{exportSubmitting ? "Sending..." : "Send to Export"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showFactoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Send to Factory Warehouse</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submitFactoryTransfer}>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p><span className="font-medium">Lot:</span> {activeStock?.lotNumber || "N/A"}</p>
                  <p><span className="font-medium">Available Balance:</span> {activeStock ? `${activeStock.availablePieces} pcs` : "N/A"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={factoryForm.grade}
                    onChange={(e) => setFactoryForm((p) => ({ ...p, grade: e.target.value }))}
                    required
                  >
                    <option value="A Grade">A Grade</option>
                    <option value="B Grade">B Grade</option>
                  </select>
                </div>
                <div className="space-y-2"><Label>Transfer Quantity</Label><Input type="number" min="1" step="1" value={factoryForm.pieces} onChange={(e) => setFactoryForm((p) => ({ ...p, pieces: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Notes</Label><Input value={factoryForm.notes} onChange={(e) => setFactoryForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Transfer Date</Label><Input type="date" value={factoryForm.date} onChange={(e) => setFactoryForm((p) => ({ ...p, date: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowFactoryModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={factorySubmitting}>{factorySubmitting ? "Sending..." : "Send Factory Warehouse"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embroidery Item Details</DialogTitle>
          </DialogHeader>
          {activeLotDetails && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Lot:</span> {activeLotDetails.lotNumber}</p>
                <p><span className="font-medium">Fabric:</span> {activeLotDetails.fabricType}</p>
                <p><span className="font-medium">Available:</span> {activeLotDetails.availablePieces} pcs</p>
                <p><span className="font-medium">Received:</span> {activeLotDetails.totalReceivedPieces} pcs</p>
                <p><span className="font-medium">Rejected:</span> {activeLotDetails.totalRejectedPieces} pcs</p>
                <p><span className="font-medium">Updated:</span> {new Date(activeLotDetails.lastUpdatedDate).toLocaleString()}</p>
              </div>
              <div>
                <p className="mb-2 font-medium">History</p>
                <div className="max-h-48 space-y-2 overflow-auto rounded border p-2">
                  {activeLotHistory.length === 0 && <p className="text-muted-foreground">No history.</p>}
                  {activeLotHistory.map((item) => (
                    <div key={item._id} className="rounded border bg-muted/20 px-2 py-1">
                      {new Date(item.date).toLocaleString()} | {item.actionType} | {item.pieces} pcs
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Embroidery Lot?</DialogTitle>
            <DialogDescription>
              Deleting will return this lot quantity to All Lots for the same lot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={submitDeleteLot}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
