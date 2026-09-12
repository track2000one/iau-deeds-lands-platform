import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const sourcePath = 'scripts/apply-accounting-property-evidence-checklist.mjs';
const fixedPath = 'scripts/.apply-accounting-property-evidence-checklist.fixed.mjs';
let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace(
  'style={{ width: `${evidenceCompletionPercent}%` }}',
  "style={{ width: evidenceCompletionPercent + '%' }}"
);
fs.writeFileSync(fixedPath, source);
try {
  await import(pathToFileURL(`${process.cwd()}/${fixedPath}`).href);
} finally {
  if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath);
}
