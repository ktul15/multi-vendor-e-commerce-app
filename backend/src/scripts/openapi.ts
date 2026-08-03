import fs from 'node:fs';
import path from 'node:path';
import { buildSwaggerSpec } from '../config/swagger';

const outputPath = path.resolve(process.cwd(), 'openapi.json');
const generated = `${JSON.stringify(buildSwaggerSpec(), null, 2)}\n`;

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
