export type DashboardKind = "admin" | "vendor";

export const dashboardPorts: Readonly<Record<DashboardKind, number>> = {
  vendor: 3001,
  admin: 3002,
};
