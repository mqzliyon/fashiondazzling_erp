"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { buildStyledReportHtml } from "@/lib/report-pdf";

type EmbroideryStock = {
  _id: string;
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

type SystemSettings = {
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
};

export default function EmbroideryReportPage() {
  useAuthGuard({ requireAuth: true });
  const [rows, setRows] = useState<EmbroideryStock[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const run = async () => {
      const res = await api.get<{ data: EmbroideryStock[] }>("/embroidery/stock/current");
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
      `${row.lotNumber} ${row.fabricType}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (!hasDateFilter) return true;
    const rowDate = new Date(row.lastUpdatedDate || "");
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
            <td>${row.lotNumber}</td>
            <td>${row.fabricType}</td>
            <td>${row.availablePieces}</td>
            <td>${row.totalReceivedPieces}</td>
            <td>${row.totalRejectedPieces}</td>
            <td>${Number(row.totalSentFactoryPieces || 0)}</td>
            <td>${new Date(row.lastUpdatedDate).toLocaleString()}</td>
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
      title: "Embroidery Report",
      fromDate,
      toDate,
      totalItem: filteredRows.length,
      pages: 1,
      businessName: settings?.businessName,
      businessAddress: settings?.businessAddress,
      businessNumber: settings?.businessNumber,
      businessLogoUrl: settings?.businessLogoUrl,
      columnsHtml: "<th>Lot</th><th>Fabric</th><th>Available</th><th>Received</th><th>Rejected</th><th>Sent Factory</th><th>Updated</th>",
      rowsHtml: htmlRows,
      emptyColspan: 7,
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
          <h1 className="text-2xl font-semibold">Embroidery Report</h1>
          <Button onClick={exportPdf}>Download PDF</Button>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Search</p>
            <Input
              placeholder="Search lot / fabric"
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
          <CardHeader><CardTitle>Embroidery Stock Report</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Lot</th>
                    <th className="py-2 pr-4">Fabric</th>
                    <th className="py-2 pr-4">Available</th>
                    <th className="py-2 pr-4">Received</th>
                    <th className="py-2 pr-4">Rejected</th>
                    <th className="py-2 pr-4">Sent Factory</th>
                    <th className="py-2 pr-0">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="border-b">
                      <td className="py-2 pr-4">{row.lotNumber}</td>
                      <td className="py-2 pr-4">{row.fabricType}</td>
                      <td className="py-2 pr-4">{row.availablePieces}</td>
                      <td className="py-2 pr-4">{row.totalReceivedPieces}</td>
                      <td className="py-2 pr-4">{row.totalRejectedPieces}</td>
                      <td className="py-2 pr-4">{Number(row.totalSentFactoryPieces || 0)}</td>
                      <td className="py-2 pr-0">{new Date(row.lastUpdatedDate).toLocaleString()}</td>
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
