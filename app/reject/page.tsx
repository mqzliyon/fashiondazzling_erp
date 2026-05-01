"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Funnel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { DATE_FILTER_OPTIONS, resolveDateFilterRange, type DateFilterValue } from "@/lib/date-filter";

type RejectEntry = {
  _id: string;
  stage: "cutting" | "embroidery";
  quantity: number;
  reason?: string;
  date: string;
  lot?: {
    _id?: string;
    lotNumber?: string;
  };
};

export default function RejectPage() {
  useAuthGuard({ requireAuth: true });
  const [entries, setEntries] = useState<RejectEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeLotId, setActiveLotId] = useState<string | null>(null);
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const groupedEntries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        lotId: string;
        lotNumber: string;
        quantity: number;
        latestDate: string;
        reasons: string[];
        stages: Set<"cutting" | "embroidery">;
        rows: RejectEntry[];
      }
    >();

    for (const entry of entries) {
      const lotId = entry.lot?._id || "unknown";
      const lotNumber = entry.lot?.lotNumber || "N/A";
      const existing = grouped.get(lotId);
      if (!existing) {
        grouped.set(lotId, {
          lotId,
          lotNumber,
          quantity: entry.quantity,
          latestDate: entry.date,
          reasons: entry.reason ? [entry.reason] : [],
          stages: new Set([entry.stage]),
          rows: [entry],
        });
        continue;
      }

      existing.quantity += entry.quantity;
      if (new Date(entry.date).getTime() > new Date(existing.latestDate).getTime()) {
        existing.latestDate = entry.date;
      }
      if (entry.reason) {
        existing.reasons.push(entry.reason);
      }
      existing.stages.add(entry.stage);
      existing.rows.push(entry);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [entries]);

  const activeGroup = useMemo(
    () => groupedEntries.find((item) => item.lotId === activeLotId) || null,
    [groupedEntries, activeLotId]
  );

  useEffect(() => {
    const range = resolveDateFilterRange(dateFilter, customFromDate, customToDate);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [dateFilter, customFromDate, customToDate]);

  const filteredGroupedEntries = useMemo(() => {
    return groupedEntries.filter((entry) => {
      const matchesLot = lotSearch
        ? String(entry.lotNumber || "").toLowerCase().includes(lotSearch.toLowerCase())
        : true;
      const dateTs = new Date(entry.latestDate).getTime();
      const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
      const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
      const matchesFrom = fromTs !== null ? dateTs >= fromTs : true;
      const matchesTo = toTs !== null ? dateTs <= toTs : true;
      return matchesLot && matchesFrom && matchesTo;
    });
  }, [groupedEntries, lotSearch, fromDate, toDate]);

  const loadRejects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: RejectEntry[] }>("/reject-management");
      setEntries(res.data.data || []);
    } catch {
      setError("Failed to load reject list.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    const group = groupedEntries.find((item) => item.lotId === lotId);
    if (!group) return;
    const embroideryRows = group.rows.filter((row) => row.stage === "embroidery");
    if (embroideryRows.length === 0) {
      setError("Only embroidery reject entries can be deleted.");
      return;
    }
    setDeletingId(lotId);
    setError(null);
    try {
      await Promise.all(embroideryRows.map((row) => api.delete(`/reject-management/${row._id}`)));
      await loadRejects();
    } catch {
      setError("Failed to delete reject entry.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    void loadRejects();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Reject List</h1>
          <p className="text-sm text-muted-foreground">
            Manage reject quantities and restore embroidery stock when needed.
          </p>
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reject Entries</CardTitle>
            <Button variant="outline" size="sm" onClick={loadRejects} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
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
                      <th className="py-2 pr-4">Reject Quantity</th>
                      <th className="py-2 pr-4">Stage</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Reason</th>
                      <th className="py-2 pr-0">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroupedEntries.map((entry) => (
                      <tr
                        key={entry.lotId}
                        className="cursor-pointer border-b hover:bg-muted/40"
                        onClick={() => setActiveLotId(entry.lotId)}
                      >
                        <td className="py-2 pr-4 font-medium">{entry.lotNumber}</td>
                        <td className="py-2 pr-4">{entry.quantity} pcs</td>
                        <td className="py-2 pr-4">
                          {entry.stages.size > 1 ? "Mixed" : Array.from(entry.stages)[0]}
                        </td>
                        <td className="py-2 pr-4">{new Date(entry.latestDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{entry.reasons[0] || "-"}</td>
                        <td className="py-2 pr-0">
                          {entry.rows.some((row) => row.stage === "embroidery") ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteLot(entry.lotId);
                              }}
                              disabled={deletingId === entry.lotId}
                            >
                              {deletingId === entry.lotId ? "Deleting..." : "Delete"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not allowed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredGroupedEntries.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No reject entries found.
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

      <Dialog
        open={Boolean(activeGroup)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveLotId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Lot Details</DialogTitle>
          </DialogHeader>
          {activeGroup && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Lot Number:</span> {activeGroup.lotNumber}</p>
                <p><span className="font-medium">Total Reject:</span> {activeGroup.quantity} pcs</p>
                <p><span className="font-medium">Latest Date:</span> {new Date(activeGroup.latestDate).toLocaleString()}</p>
                <p><span className="font-medium">Entries:</span> {activeGroup.rows.length}</p>
              </div>
              <div>
                <p className="mb-2 font-medium">History</p>
                <div className="max-h-56 overflow-auto rounded border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-left">
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">Stage</th>
                        <th className="px-2 py-2">Quantity</th>
                        <th className="px-2 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroup.rows
                        .slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((row) => (
                          <tr key={row._id} className="border-b">
                            <td className="px-2 py-2">{new Date(row.date).toLocaleString()}</td>
                            <td className="px-2 py-2 capitalize">{row.stage}</td>
                            <td className="px-2 py-2">{row.quantity} pcs</td>
                            <td className="px-2 py-2">{row.reason || "-"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
