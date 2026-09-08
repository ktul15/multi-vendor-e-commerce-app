export type DashboardKind = "admin" | "vendor";

export const dashboardPorts: Readonly<Record<DashboardKind, number>> = {
  vendor: 3001,
  admin: 3002,
};

function exactHttpOrigin(value: string, requireHttps: boolean): string | undefined {
  try {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !["http:", "https:"].includes(url.protocol) ||
      (requireHttps && url.protocol !== "https:")
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveDashboardAppOrigin({
  configuredOrigin,
  deploymentEnvironment,
  production,
  vercelUrl,
}: Readonly<{
  configuredOrigin?: string;
  deploymentEnvironment?: string;
  production: boolean;
  vercelUrl?: string;
}>): string | undefined {
  const configured = configuredOrigin?.trim();
  if (configured) return exactHttpOrigin(configured, production);

  if (deploymentEnvironment?.trim() !== "preview") return undefined;

  const deploymentHost = vercelUrl?.trim();
  if (!deploymentHost || deploymentHost.includes(":")) return undefined;
  return exactHttpOrigin(`https://${deploymentHost}`, true);
}
