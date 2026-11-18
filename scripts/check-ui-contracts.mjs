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

assert.match(registry, /useState<'table' \| 'cards'>\('cards'\)/, 'Registry should open in cards view by default');
assert.match(registry, /setBuildingView\('table'\)/, 'Manual table toggle must remain available');
const operatingStatusOptions = registry.match(/<Field label="الحالة التشغيلية">([\s\S]*?)<\/Field>/)?.[1] || '';
assert.ok(operatingStatusOptions.includes('<option value="not_existing">غير قائم</option>'),
  'The operating status selector must contain "غير قائم"');
assert.ok(operatingStatusOptions.includes('<option value="not_existing">غير قائم</option>\n                <option value="other">أخرى</option>'),
  '"غير قائم" must come immediately before "أخرى"');
assert.match(registry, /adminRegistrationAt/,
  'Only administrator should send edited registration date and time');
assert.match(registry, /type="datetime-local"/,
  'Admin editing form should display a registration date/time field');
assert.match(registry, /readOnly=\{!isAdmin\}/,
  'Standard user must see the timestamp as read-only');
const printReportSource = await read('src/app/utils/centralBuildingPrintReport.ts');
assert.match(printReportSource, /تاريخ ووقت تسجيل المبنى/,
  'The building print/PDF card should display registration date/time');
const centralReportsSource = await read('src/app/components/CentralBuildingsReports.tsx');
assert.match(centralReportsSource, /registrationAt/,
  'Central building Excel/PDF report table should offer registration date/time');

const dateHelperSource = await read('src/app/utils/buildingRegistrationTime.ts');
const dateHelperCompiled = await transform(dateHelperSource, { loader: 'ts', format: 'esm' });
const dateHelper = await import(
  `data:text/javascript;base64,${Buffer.from(dateHelperCompiled.code).toString('base64')}`
);
assert.equal(dateHelper.toRiyadhDateTimeInput('2026-11-18T09:15:00.000Z'), '2026-11-18T12:15');
assert.equal(dateHelper.riyadhDateTimeInputToIso('2026-11-18T12:15'), '2026-11-18T09:15:00.000Z');
assert.equal(dateHelper.riyadhDateTimeInputToIso('2026-02-31T12:15'), null);
assert.equal(dateHelper.riyadhDateTimeInputToIso(''), null);
const registrationRange = dateHelper.getBuildingRegistrationRange('2026-11-18T12:15', '2026-11-18T12:15');
assert.equal(registrationRange.fromMs, Date.parse('2026-11-18T09:15:00.000Z'));
assert.equal(registrationRange.toExclusiveMs, Date.parse('2026-11-18T09:16:00.000Z'));
assert.equal(registrationRange.valid, true);
assert.equal(dateHelper.matchesBuildingRegistrationRange({ registrationAt: '2026-11-18T09:15:59.999Z' }, registrationRange), true);
assert.equal(dateHelper.matchesBuildingRegistrationRange({ registrationAt: '2026-11-18T09:16:00.000Z' }, registrationRange), false);
assert.equal(dateHelper.matchesBuildingRegistrationRange({ registrationAt: '2026-11-18T09:14:59.999Z' }, registrationRange), false);
assert.equal(dateHelper.matchesBuildingRegistrationRange({ createdAt: '2026-11-18T09:15:00Z', registrationAt: null }, registrationRange), true,
  'Legacy rows should fall back to immutable creation time');
assert.equal(dateHelper.matchesBuildingRegistrationRange({}, registrationRange), false);
assert.equal(dateHelper.matchesBuildingRegistrationRange({}, dateHelper.getBuildingRegistrationRange('', '')), true,
  'Without an active date filter, unknown timestamps must not hide historical rows');
assert.equal(dateHelper.getBuildingRegistrationRange('2026-11-18T12:16', '2026-11-18T12:15').valid, false);
assert.equal(dateHelper.getBuildingRegistrationRange('2026-02-31T12:00', '').valid, false);
assert.equal(dateHelper.getBuildingRegistrationRange('', '2026-02-31T12:00').valid, false);
const older = { registrationAt: '2026-11-18T09:15:20.000Z' };
const newer = { registrationAt: '2026-11-18T09:15:40.000Z' };
assert.ok(dateHelper.compareBuildingRegistrationTime(older, newer, 'asc') < 0);
assert.ok(dateHelper.compareBuildingRegistrationTime(older, newer, 'desc') > 0);
assert.ok(dateHelper.compareBuildingRegistrationTime({}, older, 'desc') > 0, 'Missing timestamp is always last');
assert.match(centralReportsSource, /matchesBuildingRegistrationRange\(building, registrationRange\)/);
assert.match(centralReportsSource, /compareBuildingRegistrationTime\(first, second, sort.direction\)/);
assert.match(centralReportsSource, /type="datetime-local" step=\{60\}/);
assert.match(centralReportsSource, /registrationFrom\.replace\('T', ' '\)/);
console.log('✓ Riyadh registration date/time filters, inclusive minute, legacy fallback and chronological sort');
assert.match(registry, /data-deed-linked=\{Boolean\(/);
assert.match(registry, /mosqueApi\.buildingNumberUsage\(number\)/,
  'Live number lookup must use the database, not the displayed cards');
assert.match(registry, /mosqueApi\.buildingNumberUsage\(buildingNumber\)/,
  'Save must verify current database records before changing a building');
assert.match(registry, /item\.deedId === form\.deedId/,
  'A registered number is conflicting only within the selected deed');
assert.match(registry, /السجلات الموجودة بهذا الرقم في قاعدة البيانات/,
  'The form must explain existing registrations and their deeds');
assert.match(registry, /يمكن تكرار رقم المبنى أو اسمه عند اختلاف الصك/,
  'The add/edit form must explain that building numbers may repeat across deeds');
assert.match(registry, /disabled=\{saving \|\| Boolean\(selectedDeedConflict\)\}/,
  'Cannot submit a building number already registered under selected deed');
assert.match(registry, /تنبيه مهم: المسافات وتغيير شكل الأحرف لا تجعل رقم المبنى مختلفًا/,
  'Form must strongly warn about formatting-based duplicates');
assert.match(registry, /role=\{selectedDeedConflict \? 'alert' : 'status'\}/,
  'The duplicate warning must be announced accessibly');

const numberUtility = await read('src/app/utils/normalizeBuildingNumber.ts');
const numberCompiled = await transform(numberUtility, { loader: 'ts', format: 'esm' });
const { normalizeBuildingNumber } = await import(
  `data:text/javascript;base64,${Buffer.from(numberCompiled.code).toString('base64')}`
);
for (const example of ['A70', 'a70', 'A 70', 'a  70', 'A٧٠', 'Ａ７０', ' A  70 ']) {
  assert.equal(normalizeBuildingNumber(example), 'A70',
    `Alternate formatting must not generate a new identifier: ${example}`);
}
assert.equal(normalizeBuildingNumber('A-70'), 'A-70',
  'Meaningful punctuation is not silently removed');
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
