"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { buildStyledReportHtml } from "@/lib/report-pdf";

type FabricLot = {
  _id: string;
  fabricType: string;
  availableKg: number;
  quantityKg?: number;
  transferredKg?: number;
  receiveDate: string;
  status: string;
};

type SystemSettings = {
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
};

export default function FabricReportPage() {
  useAuthGuard({ requireAuth: true });
  const [rows, setRows] = useState<FabricLot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<{ data: FabricLot[] }>("/fabric-lots");
        setRows(res.data.data || []);
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const fromBoundary = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const toBoundary = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
  const hasDateFilter = Boolean(fromDate || toDate);

  const filteredRows = rows.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      `${item.fabricType} ${item.status} ${new Date(item.receiveDate).toLocaleDateString()}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (!hasDateFilter) return true;
    const rowDate = new Date(
      (item as FabricLot & { createdAt?: string }).receiveDate ||
        (item as FabricLot & { createdAt?: string }).createdAt ||
        ""
    );
    if (Number.isNaN(rowDate.getTime())) return false;
    if (fromBoundary && rowDate < fromBoundary) return false;
    if (toBoundary && rowDate > toBoundary) return false;
    return true;
  });

  const exportPdf = async () => {
    const htmlRows = filteredRows
      .map(
        (item) => `
          <tr>
            <td>${item.fabricType}</td>
            <td>${Number(item.quantityKg || 0).toFixed(2)}</td>
            <td>${Number(item.availableKg || 0).toFixed(2)}</td>
            <td>${Number(item.transferredKg || 0).toFixed(2)}</td>
            <td>${item.status}</td>
            <td>${new Date(item.receiveDate).toLocaleDateString()}</td>
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
      title: "Fabric Report",
      fromDate,
      toDate,
      totalItem: filteredRows.length,
      pages: 1,
      businessName: settings?.businessName,
      businessAddress: settings?.businessAddress,
      businessNumber: settings?.businessNumber,
      businessLogoUrl: settings?.businessLogoUrl,
      columnsHtml: "<th>Fabric Type</th><th>Input KG</th><th>Available KG</th><th>Transferred KG</th><th>Status</th><th>Date</th>",
      rowsHtml: htmlRows,
      emptyColspan: 6,
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
          <h1 className="text-2xl font-semibold">Fabric Report</h1>
          <Button onClick={exportPdf}>Download PDF</Button>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Search</p>
            <Input
              placeholder="Search fabric type / status"
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
          <CardHeader><CardTitle>Fabric Inventory Report</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Fabric Type</th>
                      <th className="py-2 pr-4">Input KG</th>
                      <th className="py-2 pr-4">Available KG</th>
                      <th className="py-2 pr-4">Transferred KG</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-0">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((item) => (
                      <tr key={item._id} className="border-b">
                        <td className="py-2 pr-4">{item.fabricType}</td>
                        <td className="py-2 pr-4">{Number(item.quantityKg || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{Number(item.availableKg || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{Number(item.transferredKg || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{item.status}</td>
                        <td className="py-2 pr-0">{new Date(item.receiveDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
