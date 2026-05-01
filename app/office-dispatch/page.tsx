"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Funnel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { DATE_FILTER_OPTIONS, resolveDateFilterRange, type DateFilterValue } from "@/lib/date-filter";

type OfficeDispatchItem = {
  _id: string;
  office: string;
  quantity: number;
  dispatchDate: string;
  referenceNo: string;
  status: "dispatched" | "received" | "cancelled";
  source?: "embroidery" | "factory_warehouse";
  grade?: "A Grade" | "B Grade" | "";
  lot?: {
    _id?: string;
    lotNumber?: string;
  };
};

export default function OfficeDispatchPage() {
  useAuthGuard({ requireAuth: true });
  const [items, setItems] = useState<OfficeDispatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<OfficeDispatchItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lotSearch, setLotSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadDispatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: OfficeDispatchItem[] }>("/office-dispatch");
      setItems(res.data.data || []);
    } catch {
      setError("Failed to load office shipment list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDispatches();
  }, []);

  const openDetailsModal = (item: OfficeDispatchItem) => {
    setActiveItem(item);
    setShowDetailsModal(true);
  };

  const deleteDispatch = async (item: OfficeDispatchItem) => {
    setDeletingId(item._id);
    setError(null);
    try {
      await api.delete(`/office-dispatch/${item._id}`);
      setShowDetailsModal(false);
      await loadDispatches();
    } catch {
      setError("Failed to delete office shipment.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const range = resolveDateFilterRange(dateFilter, customFromDate, customToDate);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, [dateFilter, customFromDate, customToDate]);

  const filteredItems = items.filter((item) => {
    const matchesLot = lotSearch
      ? String(item.lot?.lotNumber || "").toLowerCase().includes(lotSearch.toLowerCase())
      : true;
    const dateTs = new Date(item.dispatchDate).getTime();
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    const matchesFrom = fromTs !== null ? dateTs >= fromTs : true;
    const matchesTo = toTs !== null ? dateTs <= toTs : true;
    return matchesLot && matchesFrom && matchesTo;
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Office Shipment</h1>
          <p className="text-sm text-muted-foreground">
            Track office shipments, view details, and rollback by delete.
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
            <CardTitle>Shipment List</CardTitle>
            <Button variant="outline" size="sm" onClick={loadDispatches} disabled={isLoading}>
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
                      <th className="py-2 pr-4">Office</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Quantity</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item._id}
                        className="cursor-pointer border-b hover:bg-muted/30"
                        onClick={() => openDetailsModal(item)}
                      >
                        <td className="py-2 pr-4 font-medium">{item.lot?.lotNumber || "N/A"}</td>
                        <td className="py-2 pr-4">{item.office}</td>
                        <td className="py-2 pr-4">{item.source || "embroidery"}</td>
                        <td className="py-2 pr-4">{item.quantity} pcs</td>
                        <td className="py-2 pr-4">{new Date(item.dispatchDate).toLocaleDateString()}</td>
                        <td className="py-2 pr-0">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetailsModal(item)}>
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteDispatch(item);
                              }}
                              disabled={deletingId === item._id}
                            >
                              {deletingId === item._id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No office shipment entries found.
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

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Office Shipment Details</DialogTitle>
          </DialogHeader>
          {activeItem && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Lot Number:</span> {activeItem.lot?.lotNumber || "N/A"}</p>
                <p><span className="font-medium">Office:</span> {activeItem.office}</p>
                <p><span className="font-medium">Source:</span> {activeItem.source || "embroidery"}</p>
                <p><span className="font-medium">Grade:</span> {activeItem.grade || "-"}</p>
                <p><span className="font-medium">Quantity:</span> {activeItem.quantity} pcs</p>
                <p><span className="font-medium">Status:</span> {activeItem.status}</p>
                <p><span className="font-medium">Reference:</span> {activeItem.referenceNo}</p>
                <p><span className="font-medium">Date:</span> {new Date(activeItem.dispatchDate).toLocaleString()}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteDispatch(activeItem)}
                  disabled={deletingId === activeItem._id}
                >
                  {deletingId === activeItem._id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
