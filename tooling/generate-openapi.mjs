import fs from "node:fs";
import openapiTS, { astToString } from "openapi-typescript";
import ts from "typescript";

const inputPath = new URL("../backend/openapi.json", import.meta.url);
const outputPath = new URL("../packages/api-client/src/generated/schema.ts", import.meta.url);
const schema = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const ast = await openapiTS(schema, {
  alphabetize: true,
  immutable: true,
  transform(schemaObject) {
    if (schemaObject.type === "string" && schemaObject.format === "binary") {
      return ts.factory.createTypeReferenceNode("Blob");
    }
  },
});
const generated = astToString(ast);

if (process.argv.includes("--check")) {
  const committed = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (committed !== generated) {
    console.error("Generated API types are stale. Run pnpm api:types:generate.");
    process.exitCode = 1;
  }
} else {
  fs.mkdirSync(new URL("../packages/api-client/src/generated/", import.meta.url), {
    recursive: true,
  });
  fs.writeFileSync(outputPath, generated);
  console.info("Generated packages/api-client/src/generated/schema.ts");
}
