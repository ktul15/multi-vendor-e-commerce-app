import fs from 'node:fs';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { buildSwaggerSpec } from '../config/swagger';

async function main(): Promise<void> {
  const outputPath = path.resolve(process.cwd(), 'openapi.json');
  const spec = buildSwaggerSpec();
  const generated = `${JSON.stringify(spec, null, 2)}\n`;
  await SwaggerParser.validate(
    JSON.parse(generated) as Parameters<typeof SwaggerParser.validate>[0]
  );

  if (process.argv.includes('--check')) {
    const committed = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf8')
      : '';
    if (committed !== generated) {
      console.error(
        'backend/openapi.json is stale. Run npm run openapi:generate.'
      );
      process.exitCode = 1;
    }
  } else {
    fs.writeFileSync(outputPath, generated);
    console.info(`Wrote ${outputPath}`);
  }
}

void main();
