"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { buildStyledReportHtml } from "@/lib/report-pdf";

type CuttingBatch = {
  _id: string;
  fabricType: string;
  receivedKg?: number;
  convertedKg?: number;
  remainingKg?: number;
  status?: string;
};

type SystemSettings = {
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
};

export default function CuttingReportPage() {
  useAuthGuard({ requireAuth: true });
  const [rows, setRows] = useState<CuttingBatch[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const run = async () => {
      const res = await api.get<{ data: CuttingBatch[] }>("/cutting/batches/history");
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
      `${row.fabricType} ${row.status || ""}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (!hasDateFilter) return true;
    const raw = (row as CuttingBatch & { createdAt?: string; updatedAt?: string; date?: string });
    const rowDate = new Date(raw.date || raw.updatedAt || raw.createdAt || "");
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
            <td>${row.fabricType}</td>
            <td>${Number(row.receivedKg || 0).toFixed(2)}</td>
            <td>${Number(row.convertedKg || 0).toFixed(2)}</td>
            <td>${Number(row.remainingKg || 0).toFixed(2)}</td>
            <td>${row.status || "-"}</td>
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
      title: "Cutting Report",
      fromDate,
      toDate,
      totalItem: filteredRows.length,
      pages: 1,
      businessName: settings?.businessName,
      businessAddress: settings?.businessAddress,
      businessNumber: settings?.businessNumber,
      businessLogoUrl: settings?.businessLogoUrl,
      columnsHtml: "<th>Fabric</th><th>Received KG</th><th>Converted KG</th><th>Remaining KG</th><th>Status</th>",
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
          <h1 className="text-2xl font-semibold">Cutting Report</h1>
          <Button onClick={exportPdf}>Download PDF</Button>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Search</p>
            <Input
              placeholder="Search fabric / status"
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
          <CardHeader><CardTitle>Cutting Batches Report</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Fabric</th>
                    <th className="py-2 pr-4">Received KG</th>
                    <th className="py-2 pr-4">Converted KG</th>
                    <th className="py-2 pr-4">Remaining KG</th>
                    <th className="py-2 pr-0">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="border-b">
                      <td className="py-2 pr-4">{row.fabricType}</td>
                      <td className="py-2 pr-4">{Number(row.receivedKg || 0).toFixed(2)}</td>
                      <td className="py-2 pr-4">{Number(row.convertedKg || 0).toFixed(2)}</td>
                      <td className="py-2 pr-4">{Number(row.remainingKg || 0).toFixed(2)}</td>
                      <td className="py-2 pr-0">{row.status || "-"}</td>
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
