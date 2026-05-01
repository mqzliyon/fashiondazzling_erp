"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { buildStyledReportHtml } from "@/lib/report-pdf";

type RejectEntry = {
  _id: string;
  stage: string;
  quantity: number;
  reason?: string;
  date: string;
  lot?: { lotNumber?: string };
};

type SystemSettings = {
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
};

export default function RejectReportPage() {
  useAuthGuard({ requireAuth: true });
  const [rows, setRows] = useState<RejectEntry[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const run = async () => {
      const res = await api.get<{ data: RejectEntry[] }>("/reject-management");
      setRows(res.data.data || []);
    };
    void run();
  }, []);

  const fromBoundary = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const toBoundary = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
  const hasDateFilter = Boolean(fromDate || toDate);
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      `${row.lot?.lotNumber || ""} ${row.stage} ${row.reason || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (!hasDateFilter) return true;
    const rowDate = new Date(row.date || "");
    if (Number.isNaN(rowDate.getTime())) return false;
    if (fromBoundary && rowDate < fromBoundary) return false;
    if (toBoundary && rowDate > toBoundary) return false;
    return true;
  });

  const exportPdf = async () => {
    const htmlRows = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${row.lot?.lotNumber || "N/A"}</td>
            <td>${row.stage}</td>
            <td>${row.quantity}</td>
            <td>${row.reason || "-"}</td>
            <td>${new Date(row.date).toLocaleString()}</td>
          </tr>
        `
      )
      .join("");
    let settings: SystemSettings | null = null;
    try {
      const settingsRes = await api.get<{ data?: SystemSettings }>("/system-settings");
      settings = settingsRes.data?.data || null;
    } catch {}
    const html = buildStyledReportHtml({
      title: "Reject Report",
      fromDate,
      toDate,
      totalItem: filteredRows.length,
      pages: 1,
      businessName: settings?.businessName,
      businessAddress: settings?.businessAddress,
      businessNumber: settings?.businessNumber,
      businessLogoUrl: settings?.businessLogoUrl,
      columnsHtml: "<th>Lot</th><th>Stage</th><th>Quantity</th><th>Reason</th><th>Date</th>",
      rowsHtml: htmlRows,
      emptyColspan: 5,
    });
    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Reject Report</h1>
          <Button onClick={exportPdf}>Download PDF</Button>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Search</p>
            <Input
              placeholder="Search lot / stage / reason"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From Date</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To Date</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => { setFromDate(""); setToDate(""); }} disabled={!hasDateFilter}>
            Clear Date Filter
          </Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Reject Entries Report</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Lot</th>
                    <th className="py-2 pr-4">Stage</th>
                    <th className="py-2 pr-4">Quantity</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-0">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="border-b">
                      <td className="py-2 pr-4">{row.lot?.lotNumber || "N/A"}</td>
                      <td className="py-2 pr-4">{row.stage}</td>
                      <td className="py-2 pr-4">{row.quantity}</td>
                      <td className="py-2 pr-4">{row.reason || "-"}</td>
                      <td className="py-2 pr-0">{new Date(row.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
