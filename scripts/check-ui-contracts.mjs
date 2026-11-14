/**
 * Node-only checks run after Vite build on every PR and main push.
 * Uses no credentials, browser sessions, real API calls, or university records.
 */
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { transform } from 'esbuild';

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const report = await read('src/app/pages/ReportsPage.tsx');
const attachments = await read('src/app/components/AttachmentPreview.tsx');
const registry = await read('src/app/pages/CentralBuildingsRegistryPage.tsx');
const css = await read('src/styles/interactive-cards.css');
const router = await read('src/app/routes.tsx');
const caddy = await read('Caddyfile');

const paginationTs = await read('src/app/utils/reportPreviewPagination.ts');
const compiled = await transform(paginationTs, { loader: 'ts', format: 'esm' });
const pagination = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);
const rows = Array.from({ length: 135 }, (_, id) => ({ id }));
const first = pagination.getVisibleReportRows(rows, pagination.REPORT_PREVIEW_BATCH_SIZE);
assert.equal(first.length, 60, 'First report preview renders only 60 rows');
assert.deepEqual(first[0], rows[0]);
assert.equal(pagination.nextReportPreviewCount(60, 135), 120);
assert.equal(pagination.nextReportPreviewCount(120, 135), 135);
assert.equal(pagination.nextReportPreviewCount(135, 135), 135);
assert.equal(pagination.nextReportPreviewCount(0, 0), 0);
assert.equal(rows.length, 135, 'Preview pagination must not mutate full dataset');
assert.match(report, /getVisibleReportRows\(sortedData, previewRowCount\)/);
assert.match(report, /visiblePreviewRows\.map\(\(item, index\)/);
assert.match(report, /exportToExcel\(sortedData, columns/);
assert.match(report, /exportToPDF\(sortedData, columns/);
assert.match(report, /handlePrint\(\s*sortedData,/);
console.log('✓ Full reports retain every record while the on-screen preview is paged');

assert.match(attachments, /pdfPreviewActive\s*\?\s*\(/);
assert.match(attachments, /setPdfPreviewActive\(false\)/);
assert.match(attachments, /attachments\.slice\(0, visibleCount\)/);
assert.match(attachments, /loading="lazy"/);
assert.match(attachments, /decoding="async"/);
console.log('✓ Attachment previews remain lazy and closeable');

assert.match(registry, /data-deed-linked=\{Boolean\(/);
assert.match(css, /article\.iau-interactive-card\.iau-card--building::before/);
assert.match(css, /\[data-deed-linked="false"\]/);
console.log('✓ Building cards keep visible linked/unlinked accents');

assert.match(caddy, /Cache-Control "no-store, max-age=0, must-revalidate"/);
assert.match(caddy, /Cache-Control "public, max-age=31536000, immutable"/);
assert.doesNotMatch(router, /tests\/ui\/harness/);
console.log('✓ Release caching is explicit; test fixtures are not in app routes');

const release = JSON.parse(await read('dist/build-info.json'));
assert.match(release.id, /^build-\d{14,}$/);
assert.ok(Number.isFinite(Date.parse(release.builtAt)), 'Release timestamp must be parseable');
assert.equal(typeof release.commit, 'string');
const html = await read('dist/index.html');
const scriptPath = html.match(/(?:\.\/|\/)assets\/[^" ]+\.js/);
assert.ok(scriptPath, 'Build must reference a fingerprinted JS entrypoint');
const filenames = await readdir(new URL('../dist/assets/', import.meta.url));
assert.ok(filenames.some((name) => /\.css$/.test(name)), 'Build must include CSS');
const bundles = await Promise.all(
  filenames.filter((name) => name.endsWith('.js')).map((name) => read(`dist/assets/${name}`)),
);
assert.ok(bundles.some((source) => source.includes(release.id)), 'Bundle and public build manifest must embed same release id');
console.log(`✓ Release manifest matches bundled application (${release.id})`);
console.log('All UI and report build contracts passed.');
