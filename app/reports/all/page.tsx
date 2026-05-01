"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { buildReportPdfHeaderHtml, reportPdfHeaderStyles } from "@/lib/report-pdf";

type FabricLot = {
  _id: string;
  fabricType: string;
  availableKg: number;
  quantityKg?: number;
};

type CuttingBatch = {
  _id: string;
  fabricType: string;
  receivedKg?: number;
  convertedKg?: number;
  remainingKg?: number;
};

type PieceLot = {
  _id: string;
  lotNumber: string;
  outputPieces: number;
  availablePieces?: number;
  status: string;
};

type EmbroideryStock = {
  _id: string;
  lotNumber: string;
  availablePieces: number;
  totalRejectedPieces: number;
};

type RejectEntry = {
  _id: string;
  quantity: number;
  stage: string;
  lot?: { lotNumber?: string };
};

type OfficeDispatch = {
  _id: string;
  office: string;
  lot?: { lotNumber?: string };
  quantity: number;
  dispatchDate: string;
};

type FactoryItem = {
  _id: string;
  grade?: string;
  lot?: { lotNumber?: string };
  availablePieces: number;
};

type Shipment = {
  _id: string;
  buyerName?: string;
  country: string;
  lot?: { lotNumber?: string };
  quantity: number;
  shipmentDate: string;
};

type SystemSettings = {
  businessName?: string;
  businessAddress?: string;
  businessNumber?: string;
  businessLogoUrl?: string;
};

const DATE_KEYS = [
  "dispatchDate",
  "shipmentDate",
  "createdAt",
  "updatedAt",
  "date",
  "entryDate",
  "receivedDate",
] as const;

const parsePossibleDate = (row: Record<string, unknown>): Date | null => {
  for (const key of DATE_KEYS) {
    const value = row[key];
    if (!value) continue;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const toDateBoundary = (value: string, endOfDay = false): Date | null => {
  if (!value) return null;
  const boundary = new Date(`${value}T00:00:00`);
  if (Number.isNaN(boundary.getTime())) return null;
  if (endOfDay) boundary.setHours(23, 59, 59, 999);
  return boundary;
};

export default function AllReportsPage() {
  useAuthGuard({ requireAuth: true });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fabricRows, setFabricRows] = useState<FabricLot[]>([]);
  const [cuttingRows, setCuttingRows] = useState<CuttingBatch[]>([]);
  const [lotsRows, setLotsRows] = useState<PieceLot[]>([]);
  const [embroideryRows, setEmbroideryRows] = useState<EmbroideryStock[]>([]);
  const [rejectRows, setRejectRows] = useState<RejectEntry[]>([]);
  const [officeRows, setOfficeRows] = useState<OfficeDispatch[]>([]);
  const [factoryRows, setFactoryRows] = useState<FactoryItem[]>([]);
  const [foreignRows, setForeignRows] = useState<Shipment[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const hasDateFilter = Boolean(fromDate || toDate);
  const fromBoundary = useMemo(() => toDateBoundary(fromDate, false), [fromDate]);
  const toBoundary = useMemo(() => toDateBoundary(toDate, true), [toDate]);

  const filterByDateRange = <T extends Record<string, unknown>>(rows: T[]) => {
    if (!hasDateFilter) return rows;
    return rows.filter((row) => {
      const rowDate = parsePossibleDate(row);
      if (!rowDate) return false;
      if (fromBoundary && rowDate < fromBoundary) return false;
      if (toBoundary && rowDate > toBoundary) return false;
      return true;
    });
  };

  const filteredFabricRows = useMemo(() => filterByDateRange(fabricRows), [fabricRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredCuttingRows = useMemo(() => filterByDateRange(cuttingRows), [cuttingRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredLotsRows = useMemo(() => filterByDateRange(lotsRows), [lotsRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredEmbroideryRows = useMemo(
    () => filterByDateRange(embroideryRows),
    [embroideryRows, fromBoundary, toBoundary, hasDateFilter]
  );
  const filteredRejectRows = useMemo(() => filterByDateRange(rejectRows), [rejectRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredOfficeRows = useMemo(() => filterByDateRange(officeRows), [officeRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredFactoryRows = useMemo(() => filterByDateRange(factoryRows), [factoryRows, fromBoundary, toBoundary, hasDateFilter]);
  const filteredForeignRows = useMemo(() => filterByDateRange(foreignRows), [foreignRows, fromBoundary, toBoundary, hasDateFilter]);

  const totals = useMemo(
    () => ({
      fabricKg: filteredFabricRows.reduce((sum, row) => sum + Number(row.availableKg || 0), 0),
      cuttingKg: filteredCuttingRows.reduce((sum, row) => sum + Number(row.convertedKg || 0), 0),
      lotsPcs: filteredLotsRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0),
      embroideryPcs: filteredEmbroideryRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0),
      rejectPcs: filteredRejectRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      officePcs: filteredOfficeRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
      factoryPcs: filteredFactoryRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0),
      foreignPcs: filteredForeignRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    }),
    [
      filteredFabricRows,
      filteredCuttingRows,
      filteredLotsRows,
      filteredEmbroideryRows,
      filteredRejectRows,
      filteredOfficeRows,
      filteredFactoryRows,
      filteredForeignRows,
    ]
  );

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fabric, cutting, lots, embroidery, reject, office, factory, foreign, settings] = await Promise.all([
        api.get<{ data: FabricLot[] }>("/fabric-lots"),
        api.get<{ data: CuttingBatch[] }>("/cutting/batches/history"),
        api.get<{ data: PieceLot[] }>("/piece-lots"),
        api.get<{ data: EmbroideryStock[] }>("/embroidery/stock/current"),
        api.get<{ data: RejectEntry[] }>("/reject-management"),
        api.get<{ data: OfficeDispatch[] }>("/office-dispatch"),
        api.get<{ data: FactoryItem[] }>("/embroidery/factory-warehouse/current"),
        api.get<{ data: Shipment[] }>("/foreign-shipments"),
        api.get<{ data: SystemSettings }>("/system-settings"),
      ]);
      setFabricRows(fabric.data.data || []);
      setCuttingRows(cutting.data.data || []);
      setLotsRows(lots.data.data || []);
      setEmbroideryRows(embroidery.data.data || []);
      setRejectRows(reject.data.data || []);
      setOfficeRows(office.data.data || []);
      setFactoryRows(factory.data.data || []);
      setForeignRows(foreign.data.data || []);
      setSystemSettings(settings.data.data || null);
    } catch {
      setError("Failed to load all reports data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const exportAllAsPdf = () => {
    const generatedAt = new Date();
    const generatedDate = generatedAt.toLocaleDateString();
    const generatedTime = generatedAt.toLocaleTimeString();
    const businessName = systemSettings?.businessName?.trim() || "Fashion Dazzling BD ERP";
    const businessAddress = systemSettings?.businessAddress?.trim() || "";
    const businessNumber = systemSettings?.businessNumber?.trim() || "";
    const businessLogo = systemSettings?.businessLogoUrl?.trim() || "";
    const lotNumbers = Array.from(
      new Set([
        ...filteredLotsRows.map((r) => r.lotNumber),
        ...filteredEmbroideryRows.map((r) => r.lotNumber),
        ...filteredRejectRows.map((r) => r.lot?.lotNumber || ""),
        ...filteredOfficeRows.map((r) => r.lot?.lotNumber || ""),
        ...filteredFactoryRows.map((r) => r.lot?.lotNumber || ""),
        ...filteredForeignRows.map((r) => r.lot?.lotNumber || ""),
      ].filter(Boolean))
    );

    const fabricCards = filteredFabricRows
      .map((fabric) => {
        const inputKg = Number(fabric.quantityKg || 0).toFixed(2);
        const availableKgValue = Number(fabric.availableKg || 0);
        const availableKg = availableKgValue.toFixed(2);
        const stockLevel =
          availableKgValue <= 10 ? "Low Stock" : availableKgValue <= 40 ? "Medium Stock" : "High Stock";
        const stockClass =
          stockLevel === "Low Stock" ? "stock-low" : stockLevel === "Medium Stock" ? "stock-medium" : "stock-high";
        return `
          <div class="fabric-tag-card">
            <div class="fabric-tag-head">
              <p class="fabric-tag-title">${fabric.fabricType || "Unknown Fabric"}</p>
              <span class="stock-badge ${stockClass}">${stockLevel}</span>
            </div>
            <p class="fabric-tag-meta">Input: ${inputKg} KG</p>
            <p class="fabric-tag-meta">Available: ${availableKg} KG</p>
          </div>
        `;
      })
      .join("");

    const summaryRows = `
      <tr><th>Fabric Input (KG)</th><td>${filteredFabricRows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0).toFixed(2)}</td></tr>
      <tr><th>Fabric Available (KG)</th><td>${filteredFabricRows.reduce((sum, row) => sum + Number(row.availableKg || 0), 0).toFixed(2)}</td></tr>
      <tr><th>Cutting Received (KG)</th><td>${filteredCuttingRows.reduce((sum, row) => sum + Number(row.receivedKg || 0), 0).toFixed(2)}</td></tr>
      <tr><th>Cutting Converted (KG)</th><td>${filteredCuttingRows.reduce((sum, row) => sum + Number(row.convertedKg || 0), 0).toFixed(2)}</td></tr>
      <tr><th>Cutting Remaining (KG)</th><td>${filteredCuttingRows.reduce((sum, row) => sum + Number(row.remainingKg || 0), 0).toFixed(2)}</td></tr>
      <tr><th>Lot Output (PCS)</th><td>${filteredLotsRows.reduce((sum, row) => sum + Number(row.outputPieces || 0), 0)}</td></tr>
      <tr><th>Lot Available (PCS)</th><td>${filteredLotsRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0)}</td></tr>
      <tr><th>Embroidery Available (PCS)</th><td>${filteredEmbroideryRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0)}</td></tr>
      <tr><th>Reject Quantity (PCS)</th><td>${filteredRejectRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)}</td></tr>
      <tr><th>Office Shipment (PCS)</th><td>${filteredOfficeRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)}</td></tr>
      <tr><th>Factory Balance (PCS)</th><td>${filteredFactoryRows.reduce((sum, row) => sum + Number(row.availablePieces || 0), 0)}</td></tr>
      <tr><th>Foreign Shipment (PCS)</th><td>${filteredForeignRows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)}</td></tr>
    `;

    const cuttingRowsHtml = filteredCuttingRows
      .map(
        (row) => `
          <tr>
            <td>${row.fabricType || "-"}</td>
            <td>${Number(row.receivedKg || 0).toFixed(2)}</td>
            <td>${Number(row.convertedKg || 0).toFixed(2)}</td>
            <td>${Number(row.remainingKg || 0).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const totalPages = lotNumbers.length + 1;
    const reportHeaderHtml = buildReportPdfHeaderHtml({
      generatedDate,
      generatedTime,
      fromDate,
      toDate,
      totalItem: lotNumbers.length,
      pages: totalPages,
      businessName,
      businessAddress,
      businessNumber,
      businessLogoUrl: businessLogo,
    });
    const lotSections = lotNumbers
      .map((lotNumber, index) => {
        const pageNumber = index + 1;
        const embroidery = filteredEmbroideryRows.find((r) => r.lotNumber === lotNumber);
        const rejectQty = filteredRejectRows
          .filter((r) => (r.lot?.lotNumber || "") === lotNumber)
          .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
        const officeQty = filteredOfficeRows
          .filter((r) => (r.lot?.lotNumber || "") === lotNumber)
          .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
        const exportQty = filteredForeignRows
          .filter((r) => (r.lot?.lotNumber || "") === lotNumber)
          .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
        const factoryForLot = filteredFactoryRows.filter((r) => (r.lot?.lotNumber || "") === lotNumber);
        const factoryTotal = factoryForLot.reduce((sum, r) => sum + Number(r.availablePieces || 0), 0);
        const aGradeQty = factoryForLot
          .filter((r) => String(r.grade || "").toLowerCase().includes("a"))
          .reduce((sum, r) => sum + Number(r.availablePieces || 0), 0);
        const bGradeQty = factoryForLot
          .filter((r) => String(r.grade || "").toLowerCase().includes("b"))
          .reduce((sum, r) => sum + Number(r.availablePieces || 0), 0);
        return `
          <section class="report-card">
            <h1>Lot ${index + 1}: ${lotNumber} Full Details</h1>
            <div class="header-row">
              <p><strong>Lot number:</strong> ${lotNumber}</p>
              <p><strong>Date:</strong> ${generatedDate} | <strong>Time:</strong> ${generatedTime}</p>
            </div>

            <h2>Quantity Details</h2>
            <table>
              <tr><th>Embroidery Receive (PCS)</th><td>${Number(embroidery?.availablePieces || 0)}</td></tr>
              <tr><th>Embroidery Reject (PCS)</th><td>${rejectQty}</td></tr>
              <tr><th>Office Quantity (PCS)</th><td>${officeQty}</td></tr>
              <tr><th>Export Quantity (PCS)</th><td>${exportQty}</td></tr>
            </table>

            <h2>Factory Details</h2>
            <table>
              <tr><th>Total Balance (PCS)</th><td>${factoryTotal}</td></tr>
              <tr><th>A Grade Quantity (PCS)</th><td>${aGradeQty}</td></tr>
              <tr><th>B Grade Quantity (PCS)</th><td>${bGradeQty}</td></tr>
            </table>
            <p class="page-no">Page ${pageNumber} of ${totalPages}</p>
          </section>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>All ERP Reports</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ${reportPdfHeaderStyles}
            .fabric-section { background: #ffffff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; margin: 0; }
            .summary-section,
            .cutting-section { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 0 0 14px 0; }
            .fabric-section h2 { margin-top: 0; }
            .summary-section h2,
            .cutting-section h2 { margin-top: 0; }
            .fabric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
            .fabric-tag-card { background: linear-gradient(180deg, #eff6ff, #f8fafc); border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; }
            .fabric-tag-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
            .fabric-tag-title { margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #1d4ed8; }
            .fabric-tag-meta { margin: 0; font-size: 11px; color: #334155; }
            .stock-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 0.2px; border: 1px solid; }
            .stock-low { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
            .stock-medium { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }
            .stock-high { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
            .report-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 0 0 14px 0; page-break-inside: avoid; }
            h1 { font-size: 18px; margin: 0 0 10px 0; color: #0f172a; }
            h2 { font-size: 13px; margin: 12px 0 7px 0; color: #0f3a7a; text-transform: uppercase; letter-spacing: 0.4px; }
            .header-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; font-size: 12px; }
            p { margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; width: 75%; }
            .page-no { margin-top: 10px; text-align: right; font-size: 11px; color: #64748b; font-weight: 600; }
            .footer { margin-top: 12px; text-align: center; font-size: 11px; color: #64748b; }
            @media print {
              body { font-size: 13px; line-height: 1.35; }
              .top-banner h1 { font-size: 24px; }
              .top-banner p { font-size: 13px; }
              .business-subtext { font-size: 12px; }
              .meta-pill { font-size: 12px; padding: 5px 11px; }
              h1 { font-size: 22px; }
              h2 { font-size: 15px; }
              .header-row { font-size: 13px; margin-bottom: 12px; }
              th, td { font-size: 13px; padding: 8px; }
              .fabric-tag-title { font-size: 13px; }
              .fabric-tag-meta { font-size: 12px; }
              .stock-badge { font-size: 11px; }
              .footer { font-size: 12px; margin-top: 14px; }
            }
          </style>
        </head>
        <body>
          ${reportHeaderHtml}
          <section class="summary-section">
            <h2>Overall Summary</h2>
            <table>
              ${summaryRows}
            </table>
          </section>
          <section class="fabric-section">
            <h2>Fabric Inventory Card Tagging</h2>
            <div class="fabric-grid">
              ${fabricCards || "<p>No fabric inventory data found.</p>"}
            </div>
          </section>
          <section class="cutting-section">
            <h2>Cutting Details</h2>
            <table>
              <tr>
                <th>Fabric Type</th>
                <th>Received KG</th>
                <th>Converted KG</th>
                <th>Remaining KG</th>
              </tr>
              ${cuttingRowsHtml || '<tr><td colspan="4">No cutting details found.</td></tr>'}
            </table>
          </section>
          ${lotSections || "<p>No lot data found.</p>"}
          <div class="footer">Developed by Mushfiquzzaman Liyon</div>
        </body>
      </html>
    `;
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
          <div>
            <h1 className="text-2xl font-semibold">All Reports</h1>
            <p className="text-sm text-muted-foreground">
              View all report modules together and export one-click PDF.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAll} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button onClick={exportAllAsPdf}>Download All Reports PDF</Button>
          </div>
        </header>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">From Date</p>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">To Date</p>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            disabled={!hasDateFilter}
          >
            Clear Date Filter
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Fabric</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.fabricKg.toFixed(2)} KG</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cutting</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.cuttingKg.toFixed(2)} KG</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lots</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.lotsPcs} PCS</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Embroidery</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.embroideryPcs} PCS</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reject</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.rejectPcs} PCS</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Office Shipment</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.officePcs} PCS</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Factory Balance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.factoryPcs} PCS</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Foreign Shipment</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{totals.foreignPcs} PCS</CardContent></Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Fabric Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Fabric Type</th><th className="py-2 pr-4">Input KG</th><th className="py-2 pr-0">Available KG</th></tr></thead>
                  <tbody>{filteredFabricRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.fabricType}</td><td className="py-2 pr-4">{Number(r.quantityKg || 0).toFixed(2)}</td><td className="py-2 pr-0">{Number(r.availableKg || 0).toFixed(2)}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Cutting Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Fabric</th><th className="py-2 pr-4">Received</th><th className="py-2 pr-4">Converted</th><th className="py-2 pr-0">Remaining</th></tr></thead>
                  <tbody>{filteredCuttingRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.fabricType}</td><td className="py-2 pr-4">{Number(r.receivedKg || 0).toFixed(2)}</td><td className="py-2 pr-4">{Number(r.convertedKg || 0).toFixed(2)}</td><td className="py-2 pr-0">{Number(r.remainingKg || 0).toFixed(2)}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Lots Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Output</th><th className="py-2 pr-4">Available</th><th className="py-2 pr-0">Status</th></tr></thead>
                  <tbody>{filteredLotsRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.lotNumber}</td><td className="py-2 pr-4">{r.outputPieces}</td><td className="py-2 pr-4">{Number(r.availablePieces || 0)}</td><td className="py-2 pr-0">{r.status}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Embroidery Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Available</th><th className="py-2 pr-0">Rejected</th></tr></thead>
                  <tbody>{filteredEmbroideryRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.lotNumber}</td><td className="py-2 pr-4">{r.availablePieces}</td><td className="py-2 pr-0">{r.totalRejectedPieces}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Reject Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Stage</th><th className="py-2 pr-0">Qty</th></tr></thead>
                  <tbody>{filteredRejectRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.lot?.lotNumber || "N/A"}</td><td className="py-2 pr-4">{r.stage}</td><td className="py-2 pr-0">{r.quantity}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Office Shipment Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Office</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-0">Qty</th></tr></thead>
                  <tbody>{filteredOfficeRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{new Date(r.dispatchDate).toLocaleDateString()}</td><td className="py-2 pr-4">{r.office}</td><td className="py-2 pr-4">{r.lot?.lotNumber || "N/A"}</td><td className="py-2 pr-0">{r.quantity}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Factory Balance Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Grade</th><th className="py-2 pr-0">Available</th></tr></thead>
                  <tbody>{filteredFactoryRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{r.lot?.lotNumber || "N/A"}</td><td className="py-2 pr-4">{r.grade || "-"}</td><td className="py-2 pr-0">{r.availablePieces}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Foreign Shipment Report</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Buyer</th><th className="py-2 pr-4">Country</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-0">Qty</th></tr></thead>
                  <tbody>{filteredForeignRows.map((r) => <tr key={r._id} className="border-b"><td className="py-2 pr-4">{new Date(r.shipmentDate).toLocaleDateString()}</td><td className="py-2 pr-4">{r.buyerName || "-"}</td><td className="py-2 pr-4">{r.country}</td><td className="py-2 pr-4">{r.lot?.lotNumber || "N/A"}</td><td className="py-2 pr-0">{r.quantity}</td></tr>)}</tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
