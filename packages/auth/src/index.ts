export type DashboardRole = "ADMIN" | "VENDOR";

export type SessionSummary = Readonly<{
  userId: string;
  role: DashboardRole;
}>;
