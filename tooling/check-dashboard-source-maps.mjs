import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const repositoryRoot = new URL("../", import.meta.url).pathname;
const deployableRoots = [
  "apps/admin-panel/.next/server",
  "apps/admin-panel/.next/static",
  "apps/vendor-dashboard/.next/server",
  "apps/vendor-dashboard/.next/static",
];

async function sourceMaps(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceMaps(path);
      return entry.isFile() && entry.name.endsWith(".map") ? [path] : [];
    }),
  );
  return results.flat();
}

const maps = (
  await Promise.all(deployableRoots.map((root) => sourceMaps(join(repositoryRoot, root))))
).flat();

if (maps.length > 0) {
  console.error("Deployable dashboard source maps must remain private:");
  for (const map of maps) console.error(`- ${relative(repositoryRoot, map)}`);
  process.exitCode = 1;
} else {
  console.log("No deployable dashboard source maps found.");
}
