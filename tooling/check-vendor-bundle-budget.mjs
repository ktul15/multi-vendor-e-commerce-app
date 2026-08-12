import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const buildDirectory = path.resolve(process.cwd(), ".next");
const staticDirectory = path.join(buildDirectory, "static");
const serverAppDirectory = path.join(buildDirectory, "server", "app");
const budgets = {
  cssTotal: 50_000,
  javascriptLargestChunk: 350_000,
  javascriptRoute: 850_000,
  javascriptTotal: 1_250_000,
};

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? files(target) : Promise.resolve([target]);
      }),
    )
  ).flat();
}

async function bytes(targets) {
  return (await Promise.all(targets.map((target) => stat(target)))).reduce(
    (total, entry) => total + entry.size,
    0,
  );
}

function manifestPayload(source) {
  const assignment = source.indexOf("] = ");
  if (assignment === -1) throw new Error("Unrecognized client reference manifest");
  return JSON.parse(source.slice(assignment + 4).replace(/;\s*$/, ""));
}

async function routeSizes() {
  const manifests = (await files(serverAppDirectory)).filter((file) =>
    file.endsWith("page_client-reference-manifest.js"),
  );
  const routes = [];
  for (const manifest of manifests) {
    const payload = manifestPayload(await readFile(manifest, "utf8"));
    const chunks = new Set(
      Object.values(payload.clientModules).flatMap((module) =>
        module.chunks.filter((chunk) => chunk.endsWith(".js")),
      ),
    );
    const size = await bytes(
      [...chunks].map((chunk) => path.join(buildDirectory, chunk.replace(/^\/_next\//, ""))),
    );
    routes.push({ route: Object.keys(payload)[0] ?? manifest, size });
  }
  return routes.sort((left, right) => right.size - left.size);
}

const staticFiles = await files(staticDirectory);
const javascript = staticFiles.filter((file) => file.endsWith(".js"));
const css = staticFiles.filter((file) => file.endsWith(".css"));
const javascriptSizes = await Promise.all(
  javascript.map((file) => stat(file).then(({ size }) => size)),
);
const results = {
  cssTotal: await bytes(css),
  javascriptLargestChunk: Math.max(0, ...javascriptSizes),
  javascriptRoute: (await routeSizes())[0]?.size ?? 0,
  javascriptTotal: javascriptSizes.reduce((total, size) => total + size, 0),
};

for (const [metric, value] of Object.entries(results)) {
  const budget = budgets[metric];
  console.log(`${metric}: ${value.toLocaleString()} bytes (budget ${budget.toLocaleString()})`);
  if (value > budget) process.exitCode = 1;
}

if (process.exitCode) throw new Error("Vendor dashboard bundle budget exceeded");
