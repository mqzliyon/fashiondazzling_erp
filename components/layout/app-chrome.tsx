"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PackageCheck,
  Scissors,
  Send,
  Settings,
  Shirt,
  Users,
  Sparkles,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canAccessRoute,
  filterNavChildrenByPermission,
} from "@/lib/permissions";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type AppChromeProps = {
  children: React.ReactNode;
};

type NavChild = {
  label: string;
  href: string;
};

type NavItem =
  | { label: string; href: string }
  | { label: string; children: NavChild[] };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Fabric Inventory", href: "/fabric-inventory" },
  {
    label: "Cutting",
    children: [
      { label: "Available Cutting", href: "/cutting/available" },
      { label: "Complete Cutting", href: "/cutting/complete" },
    ],
  },
  {
    label: "Lots",
    children: [
      { label: "All Lots", href: "/piece-lots" },
      { label: "Embroidery", href: "/embroidery" },
      { label: "Reject", href: "/reject" },
      { label: "Factory Balance", href: "/factory-balance" },
      { label: "Office Shipment", href: "/office-dispatch" },
      { label: "Foreign Shipment", href: "/foreign-shipment" },
    ],
  },
  {
    label: "Reports",
    children: [
      { label: "All Reports", href: "/reports/all" },
      { label: "Fabric Report", href: "/reports/fabric" },
      { label: "Cutting Report", href: "/reports/cutting" },
      { label: "Lots Report", href: "/reports/lots" },
      { label: "Embroidery Report", href: "/reports/embroidery" },
      { label: "Reject Report", href: "/reports/reject" },
      { label: "Office Shipment Report", href: "/reports/office-shipment" },
      { label: "Factory Balance Report", href: "/reports/factory-shipment" },
      { label: "Foreign Shipment Report", href: "/reports/foreign-shipment" },
    ],
  },
  {
    label: "Settings",
    children: [
      { label: "Business Settings", href: "/settings/business" },
      { label: "User Management", href: "/settings/users" },
    ],
  },
];

function getPageTitle(pathname: string) {
  for (const item of NAV_ITEMS) {
    if ("href" in item && item.href === pathname) return item.label;
    if ("children" in item) {
      const child = item.children?.find((c) => c.href === pathname);
      if (child) return child.label;
    }
  }
  return pathname.startsWith("/cutting") ? "Cutting" : "ERP";
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const syncCurrentUser = useAuthStore((state) => state.syncCurrentUser);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cuttingOpen, setCuttingOpen] = useState(pathname.startsWith("/cutting"));
  const [lotsOpen, setLotsOpen] = useState(
    ["/piece-lots", "/embroidery", "/reject", "/factory-balance", "/office-dispatch", "/foreign-shipment"].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );
  const [settingsOpen, setSettingsOpen] = useState(
    ["/settings", "/settings/business", "/settings/users"].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );
  const [reportsOpen, setReportsOpen] = useState(
    ["/reports", "/reports/all", "/reports/fabric", "/reports/cutting", "/reports/lots", "/reports/embroidery", "/reports/reject", "/reports/office-shipment", "/reports/factory-shipment", "/reports/foreign-shipment"].some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  );
  const token = useAuthStore((state) => state.token);
  const [businessName, setBusinessName] = useState("Fashion Dazzling ERP");

  const authRoutes = useMemo(() => ["/", "/login", "/register"], []);
  const showAdminShell = useMemo(() => {
    return !authRoutes.includes(pathname);
  }, [authRoutes, pathname]);
  const filteredNavItems = useMemo<NavItem[]>(() => {
    return NAV_ITEMS.flatMap<NavItem>((item) => {
      if ("children" in item) {
        const filteredChildren = filterNavChildrenByPermission(user, item.children);
        if (filteredChildren.length === 0) return [];
        return [{ ...item, children: filteredChildren }];
      }
      if ("href" in item && canAccessRoute(user, item.href)) {
        return [item];
      }
      return [];
    });
  }, [user]);

  useEffect(() => {
    if (!showAdminShell) return;
    if (!hydrated) return;
    if (!isAuthenticated()) return;
    const publicRoutes = ["/dashboard"];
    if (publicRoutes.includes(pathname)) return;
    if (!canAccessRoute(user, pathname)) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, pathname, router, showAdminShell, user]);

  useEffect(() => {
    if (!hydrated) return;

    let mounted = true;
    const fallback = "Fashion Dazzling ERP";

    const loadBusinessName = async () => {
      if (!token) {
        if (mounted) setBusinessName(fallback);
        return;
      }
      try {
        const res = await api.get<{ data?: { businessName?: string } }>("/system-settings");
        const nextName = String(res.data?.data?.businessName || "").trim();
        if (mounted) {
          setBusinessName(nextName || fallback);
        }
      } catch {
        if (mounted) setBusinessName(fallback);
      }
    };

    const onBusinessNameUpdated = () => {
      void loadBusinessName();
    };

    void loadBusinessName();
    window.addEventListener("business-name-updated", onBusinessNameUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("business-name-updated", onBusinessNameUpdated);
    };
  }, [hydrated, token]);

  useEffect(() => {
    if (!showAdminShell) return;
    if (!user?._id) return;

    const runSync = () => {
      void syncCurrentUser();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    };

    const intervalId = window.setInterval(runSync, 30000);
    window.addEventListener("focus", runSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", runSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showAdminShell, syncCurrentUser, user?._id]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (!showAdminShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-30 bg-black/35 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 border-r bg-white shadow-sm transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex h-14 items-center justify-between border-b px-3">
          {!collapsed && <p className="text-sm font-semibold">{businessName}</p>}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              {collapsed ? ">>" : "<<"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {filteredNavItems.map((item) => {
            if ("children" in item) {
              const isParentActive = item.children.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              );
              const isOpen =
                item.label === "Cutting"
                  ? cuttingOpen
                  : item.label === "Lots"
                    ? lotsOpen
                    : item.label === "Settings"
                      ? settingsOpen
                      : reportsOpen;
              const toggleOpen = () => {
                if (item.label === "Cutting") {
                  setCuttingOpen((prev) => !prev);
                  return;
                }
                if (item.label === "Lots") {
                  setLotsOpen((prev) => !prev);
                  return;
                }
                if (item.label === "Settings") {
                  setSettingsOpen((prev) => !prev);
                  return;
                }
                setReportsOpen((prev) => !prev);
              };
              const shortLabel =
                item.label === "Cutting"
                  ? "CU"
                  : item.label === "Lots"
                    ? "LO"
                    : item.label === "Settings"
                      ? "SE"
                      : "RE";
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      isParentActive
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={toggleOpen}
                    title={item.label}
                  >
                    <span className="flex items-center gap-2">
                      {item.label === "Cutting" ? (
                        <Scissors className="size-4" />
                      ) : item.label === "Lots" ? (
                        <PackageCheck className="size-4" />
                      ) : item.label === "Settings" ? (
                        <Settings className="size-4" />
                      ) : (
                        <BarChart3 className="size-4" />
                      )}
                      {collapsed ? shortLabel : `${item.label} ${isOpen ? "-" : "+"}`}
                    </span>
                  </button>
                  {!collapsed && isOpen && (
                    <div className="ml-3 space-y-1 border-l pl-3">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-md px-3 py-2 text-sm transition ${
                              isChildActive
                                ? "bg-primary text-primary-foreground"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                            title={child.label}
                          >
                            <span className="flex items-center gap-2">
                              {child.href === "/cutting/available" && <Shirt className="size-4" />}
                              {child.href === "/cutting/complete" && <PackageCheck className="size-4" />}
                              {child.href === "/piece-lots" && <FileText className="size-4" />}
                              {child.href === "/embroidery" && <Sparkles className="size-4" />}
                              {child.href === "/reject" && <XCircle className="size-4" />}
                              {child.href === "/factory-balance" && <Factory className="size-4" />}
                              {child.href === "/office-dispatch" && <Warehouse className="size-4" />}
                              {child.href === "/foreign-shipment" && <Send className="size-4" />}
                              {child.href === "/settings/business" && <LockKeyhole className="size-4" />}
                              {child.href === "/settings/users" && <Users className="size-4" />}
                              {child.href.startsWith("/reports/") && <ClipboardList className="size-4" />}
                              {child.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title={item.label}
              >
                <span className="flex items-center gap-2">
                  {item.href === "/dashboard" && <LayoutDashboard className="size-4" />}
                  {item.href === "/fabric-inventory" && <Shirt className="size-4" />}
                  {collapsed ? item.label.slice(0, 2).toUpperCase() : item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>
            <h1 className="text-sm font-semibold md:text-base">{getPageTitle(pathname)}</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground md:block">
              {user?.email || "Admin"}
            </p>
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
