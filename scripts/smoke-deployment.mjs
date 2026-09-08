const targets = [
  {
    expectedApp: "vendor",
    healthPath: "/api/health",
    name: "vendor dashboard",
    origin: process.env.VENDOR_DASHBOARD_ORIGIN,
  },
  {
    expectedApp: "admin",
    healthPath: "/api/health",
    name: "admin dashboard",
    origin: process.env.ADMIN_DASHBOARD_ORIGIN,
  },
  {
    expectedStatus: "ready",
    healthPath: "/api/health/ready",
    name: "backend",
    origin: process.env.BACKEND_ORIGIN,
  },
];

const expectedEnvironment = process.env.EXPECTED_ENVIRONMENT?.trim();
const expectedReleaseSha = process.env.EXPECTED_RELEASE_SHA?.trim().toLowerCase();

if (!new Set(["staging", "production"]).has(expectedEnvironment)) {
  throw new Error("EXPECTED_ENVIRONMENT must be staging or production");
}
if (!expectedReleaseSha || !/^[0-9a-f]{40}$/.test(expectedReleaseSha)) {
  throw new Error("EXPECTED_RELEASE_SHA must be a full Git commit SHA");
}

function exactHttpsOrigin(name, value) {
  if (!value) throw new Error(`${name} origin is required`);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.origin !== value
  ) {
    throw new Error(`${name} must be an exact HTTPS origin`);
  }
  return url.origin;
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
}

async function checkHealth(target) {
  const response = await fetchWithTimeout(`${target.origin}${target.healthPath}`);
  if (!response.ok) throw new Error(`${target.name} health returned HTTP ${response.status}`);
  const payload = await response.json();
  const metadata = payload.data ?? payload;
  if (target.expectedApp && metadata.app !== target.expectedApp) {
    throw new Error(`${target.name} returned an unexpected app identity`);
  }
  const status = metadata.status;
  if (target.expectedStatus && status !== target.expectedStatus) {
    throw new Error(`${target.name} returned status ${String(status)}`);
  }
  if (metadata.environment !== expectedEnvironment) {
    throw new Error(
      `${target.name} returned environment ${String(metadata.environment)} instead of ${expectedEnvironment}`,
    );
  }
  if (String(metadata.release).toLowerCase() !== expectedReleaseSha) {
    throw new Error(`${target.name} is not serving release ${expectedReleaseSha}`);
  }
  if (!response.headers.get("cache-control")?.includes("no-store")) {
    throw new Error(`${target.name} health response must not be cached`);
  }
  console.log(`ok ${target.name} ${target.healthPath}`);
}

async function checkCors(origin) {
  const response = await fetchWithTimeout(`${targets[2].origin}/api/v1/auth/logout`, {
    headers: {
      Origin: origin,
      "Access-Control-Request-Headers": "content-type,x-csrf-token",
      "Access-Control-Request-Method": "POST",
    },
    method: "OPTIONS",
  });
  if (response.status !== 204) throw new Error(`CORS preflight failed for ${origin}`);
  if (response.headers.get("access-control-allow-origin") !== origin) {
    throw new Error(`Backend did not return the exact CORS origin ${origin}`);
  }
  if (response.headers.get("access-control-allow-credentials") !== "true") {
    throw new Error(`Backend did not enable credentials for ${origin}`);
  }
  console.log(`ok backend CORS ${origin}`);
}

for (const target of targets) target.origin = exactHttpsOrigin(target.name, target.origin);
if (new Set(targets.map(({ origin }) => origin)).size !== targets.length) {
  throw new Error("Dashboard and backend origins must be distinct");
}

for (const target of targets) await checkHealth(target);
await checkCors(targets[0].origin);
await checkCors(targets[1].origin);
