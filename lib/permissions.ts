import type { AuthUser } from "@/store/auth-store";

type NavChild = {
  label: string;
  href: string;
};

const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/fabric-inventory": "fabric_inventory",
  "/cutting": "cutting",
  "/cutting/available": "cutting",
  "/cutting/complete": "cutting",
  "/piece-lots": "lots",
  "/embroidery": "embroidery",
  "/reject": "reject",
  "/factory-balance": "factory_shipment",
  "/office-dispatch": "office_shipment",
  "/foreign-shipment": "foreign_shipment",
  "/reports": "reports",
  "/reports/all": "reports",
  "/reports/fabric": "reports",
  "/reports/cutting": "reports",
  "/reports/lots": "reports",
  "/reports/embroidery": "reports",
  "/reports/reject": "reports",
  "/reports/office-shipment": "reports",
  "/reports/factory-shipment": "reports",
  "/reports/foreign-shipment": "reports",
  "/settings": "settings",
  "/settings/business": "settings",
  "/settings/users": "settings",
};

export function isAdminUser(user?: AuthUser | null) {
  return String(user?.role || "").toLowerCase() === "admin";
}

export function canAccessRoute(user: AuthUser | null | undefined, route: string) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const requiredPermission =
    ROUTE_PERMISSION_MAP[route] ||
    Object.entries(ROUTE_PERMISSION_MAP).find(([key]) => route.startsWith(`${key}/`))?.[1];
  if (!requiredPermission) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(requiredPermission);
}

export function filterNavChildrenByPermission(
  user: AuthUser | null | undefined,
  children: NavChild[]
) {
  return children.filter((child) => canAccessRoute(user, child.href));
}
