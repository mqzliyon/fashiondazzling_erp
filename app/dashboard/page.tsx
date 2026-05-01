"use client";

import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  Factory,
  LogOut,
  Menu,
  PackageMinus,
  Plane,
  Scissors,
  ShieldCheck,
  Store,
  Warehouse,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type FabricLot = {
  _id: string;
  fabricType: string;
  quantityKg: number;
  availableKg: number;
  transferredKg: number;
  status: string;
  receiveDate: string;
};

type MovementItem = {
  _id: string;
  fromStage: string;
  toStage: string;
  lot?: {
    fabricType?: string;
  };
  quantity: number;
  unit: string;
  date: string;
  user: string;
};

type AnalyticsDashboard = {
  productionYield: number;
  rejectRate: number;
  monthlyProduction: Array<{
    year: number;
    month: number;
    totalOutputPieces: number;
  }>;
  shipmentTotals: {
    totalQuantity: number;
    totalShipments: number;
  };
  officeDispatchTotals: {
    totalQuantity: number;
    totalDispatches: number;
  };
};

type FactoryBalanceItem = {
  availablePieces: number;
};

type StageTrendPoint = {
  label: string;
  value: number;
};

type StageTrendChart = {
  key: string;
  value: number;
  color: string;
  series: StageTrendPoint[];
};

function StageLineChartCard({
  chart,
  siteName,
  periodLabel,
}: {
  chart: StageTrendChart;
  siteName: string;
  periodLabel: string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const max = Math.max(...chart.series.map((item) => item.value), 1);
  const points = chart.series
    .map((item, index) => {
      const x = (index / Math.max(chart.series.length - 1, 1)) * 100;
      const y = 100 - (item.value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const tooltipStyle = hoveredPoint
    ? {
        left:
          hoveredPoint.x > 80
            ? `calc(${hoveredPoint.x}% - 190px)`
            : `calc(${hoveredPoint.x}% + 10px)`,
        top: hoveredPoint.y < 20 ? `calc(${hoveredPoint.y}% + 12px)` : `calc(${hoveredPoint.y}% - 44px)`,
      }
    : undefined;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="rounded-full bg-cyan-50 p-1.5 text-cyan-700">
              <BarChart3 className="size-4" />
            </span>
            {chart.key} - {periodLabel}
          </CardTitle>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="h-0.5 w-3 bg-[#86b9dd]" />
              {siteName}
            </span>
            <Menu className="size-3.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-white p-4">
          <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{(max * 0.25).toFixed(0)}</span>
            <span>{(max * 0.5).toFixed(0)}</span>
            <span>{(max * 0.75).toFixed(0)}</span>
            <span>{max.toFixed(0)}</span>
          </div>
          <div className="relative h-64">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <line x1="0" y1="100" x2="100" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#e2e8f0" strokeWidth="0.4" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e2e8f0" strokeWidth="0.4" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#e2e8f0" strokeWidth="0.4" />
              <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#e2e8f0" strokeWidth="0.4" />
              <polyline
                fill="none"
                stroke={chart.color}
                strokeWidth="0.7"
                points={points}
                vectorEffect="non-scaling-stroke"
              />
              {chart.series.map((item, index) => {
                const x = (index / Math.max(chart.series.length - 1, 1)) * 100;
                const y = 100 - (item.value / max) * 100;
                return (
                  <g key={`${chart.key}-${index}`}>
                    <circle cx={x} cy={y} r="0.7" fill={chart.color} />
                    <circle
                      cx={x}
                      cy={y}
                      r="2.6"
                      fill="transparent"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          x,
                          y,
                          label: item.label,
                          value: item.value,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-20 min-w-44 rounded border border-sky-300 bg-white px-3 py-2 text-xs shadow"
                style={tooltipStyle}
              >
                <p>{hoveredPoint.label}</p>
                <p className="font-semibold text-slate-700">
                  {chart.key}: {hoveredPoint.value.toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1 text-[9px] text-muted-foreground">
            {chart.series.filter((_, idx) => idx % 5 === 0).map((item) => (
              <span key={`${chart.key}-${item.label}`} className="-rotate-45 truncate origin-top-left">
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{chart.series[0]?.label}</span>
            <span>Current: {chart.value.toFixed(0)}</span>
            <span>{chart.series[chart.series.length - 1]?.label}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [fabricLots, setFabricLots] = useState<FabricLot[]>([]);
  const [movementTimeline, setMovementTimeline] = useState<MovementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("today");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [summary, setSummary] = useState({
    totalFabricStockKg: 0,
    cuttingStockKg: 0,
    embroideryStockPieces: 0,
    rejectPieces: 0,
    factoryBalancePieces: 0,
    officeDispatchPieces: 0,
    exportPieces: 0,
  });

  useAuthGuard({ requireAuth: true });
  const siteName =
    process.env.NEXT_PUBLIC_SITE_NAME ||
    (user?.organizationId ? `Fashion Dazzling BD (${user.organizationId})` : "Fashion Dazzling BD");
  const dateFilterOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "this_month_last_year", label: "This month last year" },
    { value: "this_year", label: "This Year" },
    { value: "last_year", label: "Last Year" },
    { value: "current_financial_year", label: "Current financial year" },
    { value: "last_financial_year", label: "Last financial year" },
    { value: "custom_range", label: "Custom Range" },
  ];

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfDay = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const endOfDay = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    const financialYearStart = (year: number) => new Date(year, 6, 1, 0, 0, 0, 0);
    const financialYearEnd = (year: number) => new Date(year + 1, 5, 30, 23, 59, 59, 999);

    switch (dateFilter) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y), label: "Yesterday" };
      }
      case "last_7_days": {
        const from = new Date(now);
        from.setDate(from.getDate() - 6);
        return { from: startOfDay(from), to: endOfDay(now), label: "Last 7 Days" };
      }
      case "last_30_days": {
        const from = new Date(now);
        from.setDate(from.getDate() - 29);
        return { from: startOfDay(from), to: endOfDay(now), label: "Last 30 Days" };
      }
      case "this_month":
        return { from: startOfMonth(now), to: endOfDay(now), label: "This Month" };
      case "last_month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth), label: "Last Month" };
      }
      case "this_month_last_year": {
        const dt = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        return { from: startOfMonth(dt), to: endOfMonth(dt), label: "This month last year" };
      }
      case "this_year":
        return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: endOfDay(now), label: "This Year" };
      case "last_year":
        return {
          from: new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0),
          to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
          label: "Last Year",
        };
      case "current_financial_year": {
        const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        return { from: financialYearStart(fyStartYear), to: endOfDay(now), label: "Current financial year" };
      }
      case "last_financial_year": {
        const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() - 1 : now.getFullYear() - 2;
        return {
          from: financialYearStart(fyStartYear),
          to: financialYearEnd(fyStartYear),
          label: "Last financial year",
        };
      }
      case "custom_range": {
        const from = customFromDate ? new Date(`${customFromDate}T00:00:00`) : startOfDay(now);
        const to = customToDate ? new Date(`${customToDate}T23:59:59`) : endOfDay(now);
        return { from, to, label: "Custom Range" };
      }
      default:
        return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
    }
  }, [dateFilter, customFromDate, customToDate]);

  const filteredMovementTimeline = useMemo(() => {
    const fromTs = dateRange.from.getTime();
    const toTs = dateRange.to.getTime();
    return movementTimeline.filter((item) => {
      const ts = new Date(item.date).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }, [movementTimeline, dateRange]);

  const stageTrendCharts = useMemo<StageTrendChart[]>(() => {
    const dayKeys: string[] = [];
    const cursor = new Date(dateRange.from);
    while (cursor.getTime() <= dateRange.to.getTime()) {
      dayKeys.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    const dayLabels = dayKeys.map((key) =>
      new Date(`${key}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    );

    const buildSeries = (matcher: (item: MovementItem) => boolean) => {
      const totals = new Map<string, number>();
      for (const item of filteredMovementTimeline) {
        if (!matcher(item)) continue;
        const key = new Date(item.date).toISOString().slice(0, 10);
        totals.set(key, (totals.get(key) || 0) + Number(item.quantity || 0));
      }
      return dayKeys.map((day, idx) => ({
        label: dayLabels[idx],
        value: totals.get(day) || 0,
      }));
    };

    return [
      {
        key: "Cutting",
        value: summary.cuttingStockKg,
        color: "#86b9dd",
        series: buildSeries((item) => item.toStage.toLowerCase().includes("cutting")),
      },
      {
        key: "Embroidery",
        value: summary.embroideryStockPieces,
        color: "#86b9dd",
        series: buildSeries((item) => item.toStage.toLowerCase().includes("embroidery")),
      },
      {
        key: "Rejects",
        value: summary.rejectPieces,
        color: "#86b9dd",
        series: buildSeries((item) => item.toStage.toLowerCase().includes("reject")),
      },
      {
        key: "Office",
        value: summary.officeDispatchPieces,
        color: "#86b9dd",
        series: buildSeries((item) => item.toStage.toLowerCase().includes("office")),
      },
      {
        key: "Export",
        value: summary.exportPieces,
        color: "#86b9dd",
        series: buildSeries((item) => item.toStage.toLowerCase().includes("export")),
      },
    ];
  }, [filteredMovementTimeline, summary, dateRange.from, dateRange.to]);

  const fetchDashboardData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsAutoRefreshing(true);
    }
    setError(null);

    try {
      const [
        fabricRes,
        cuttingSummaryRes,
        embroiderySummaryRes,
        rejectSummaryRes,
        factoryBalanceRes,
        analyticsRes,
        movementRes,
      ] = await Promise.all([
        api.get<{ data: FabricLot[] }>("/fabric-lots"),
        api.get<{ data: { totalCurrentKg: number } }>("/cutting/stock/summary"),
        api.get<{ data: { availablePieces: number } }>("/embroidery/stock/summary"),
        api.get<{ data: { overall?: { totalRejected: number } } }>("/reject-management/summary"),
        api.get<{ data: FactoryBalanceItem[] }>("/embroidery/factory-warehouse/current"),
        api.get<{ data: AnalyticsDashboard }>("/analytics/dashboard"),
        api.get<{ data: MovementItem[] }>("/movement-logs"),
      ]);

      const lots = fabricRes.data.data || [];
      const totalFabricStockKg = lots.reduce((sum, lot) => sum + lot.availableKg, 0);
      const officeDispatchPieces =
        analyticsRes.data.data?.officeDispatchTotals?.totalQuantity || 0;
      const exportPieces = analyticsRes.data.data?.shipmentTotals?.totalQuantity || 0;
      const factoryBalancePieces = (factoryBalanceRes.data.data || []).reduce(
        (sum, item) => sum + Number(item.availablePieces || 0),
        0
      );

      setFabricLots(lots);
      setSummary({
        totalFabricStockKg,
        cuttingStockKg: cuttingSummaryRes.data.data?.totalCurrentKg || 0,
        embroideryStockPieces: embroiderySummaryRes.data.data?.availablePieces || 0,
        rejectPieces: rejectSummaryRes.data.data?.overall?.totalRejected || 0,
        factoryBalancePieces,
        officeDispatchPieces,
        exportPieces,
      });
      setMovementTimeline(movementRes.data.data || []);
    } catch {
      setError("Failed to load dashboard metrics.");
    } finally {
      if (!silent) {
        setIsLoading(false);
      } else {
        setIsAutoRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const run = async () => {
      await fetchDashboardData();
    };

    void run();
  }, [fetchDashboardData, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    const refreshDashboard = () => {
      void fetchDashboardData({ silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };

    const intervalId = window.setInterval(refreshDashboard, 30000);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDashboardData, hydrated]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!hydrated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 p-6 md:p-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-semibold">{user?.name ? `${user.name}'s ERP Dashboard` : "ERP Dashboard"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1">
              <CalendarDays className="size-4 text-muted-foreground" />
              <select
                className="bg-transparent text-sm outline-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                {dateFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {dateFilter === "custom_range" && (
              <>
                <input
                  type="date"
                  className="h-9 rounded-md border px-2 text-sm"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                />
                <input
                  type="date"
                  className="h-9 rounded-md border px-2 text-sm"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                />
              </>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </header>
        {isAutoRefreshing && (
          <div className="relative -mt-3 w-full overflow-hidden rounded-full bg-blue-100/80">
            <div className="dashboard-reload-strip absolute inset-y-0 h-1 w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600" />
            <div className="h-1 w-full" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Boxes className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Fabric Stock</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.totalFabricStockKg.toFixed(2)} kg</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Scissors className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Cutting Stock</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.cuttingStockKg.toFixed(2)} kg</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Factory className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Embroidery</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.embroideryStockPieces.toFixed(0)} pcs</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <PackageMinus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Rejects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold text-rose-700">{summary.rejectPieces.toFixed(0)} pcs</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Warehouse className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Factory Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.factoryBalancePieces.toFixed(0)} pcs</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Store className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Office Dispatch</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.officeDispatchPieces.toFixed(0)} pcs</CardContent>
          </Card>
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                <Plane className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">Exports</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto text-xl font-semibold">{summary.exportPieces.toFixed(0)} pcs</CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {stageTrendCharts.map((chart) => (
            <StageLineChartCard
              key={chart.key}
              chart={chart}
              siteName={siteName}
              periodLabel={dateRange.label}
            />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <Building2 className="mb-3 size-5 text-primary" />
            <h2 className="font-medium">Organization</h2>
            <p className="text-sm text-muted-foreground">{user?.organizationId ?? "Not set"}</p>
          </article>
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <ShieldCheck className="mb-3 size-5 text-primary" />
            <h2 className="font-medium">Access Role</h2>
            <p className="text-sm text-muted-foreground">{user?.role ?? "Admin"}</p>
          </article>
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-medium">Signed In Email</h2>
            <p className="text-sm text-muted-foreground">{user?.email ?? "N/A"}</p>
          </article>
        </div>
      </section>
      <style jsx>{`
        .dashboard-reload-strip {
          animation: dashboard-reload-slide 1.1s linear infinite;
        }
        @keyframes dashboard-reload-slide {
          0% {
            transform: translateX(-130%);
          }
          100% {
            transform: translateX(340%);
          }
        }
      `}</style>
    </main>
  );
}
