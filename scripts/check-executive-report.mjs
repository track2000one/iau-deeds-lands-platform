import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const utilityPath = new URL('../src/app/utils/executiveReportMetrics.ts', import.meta.url);
const source = await readFile(utilityPath, 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm' });
const metrics = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));

const data = metrics.emptyReportData();
data.buildings = [
  { id: 'b1', campusLocation: 'الحرم أ', deedId: 'd1', latitude: 26.1, longitude: 50.1, operationalStatus: 'active' },
  { id: 'b2', campusLocation: 'الحرم أ', deedId: null, latitude: null, longitude: null, operationalStatus: 'not_existing' },
  { id: 'b3', campusLocation: 'الحرم ب', deedId: 'd2', latitude: 26.2, longitude: 50.2, operationalStatus: 'active' },
];
data.deeds = [
  { id: 'd1', deedNumber: '100', area: 250, coordinates: '26.1,50.1', createdAt: '2026-11-18T10:00:00Z' },
  { id: 'd2', deedNumber: '101', area: 300, coordinates: '', createdAt: '2026-01-01T10:00:00Z' },
];
data.vacant = [
  { id: 'v1', campus: 'الحرم أ', status: 'VERIFIED_VACANT', approximateArea: '250', verifiedVacantArea: '200' },
  { id: 'v2', campus: 'الحرم أ', status: 'DRAFT', approximateArea: '100', verifiedVacantArea: null },
  { id: 'v3', campus: 'الحرم ب', status: 'VERIFIED_VACANT', approximateArea: 100, verifiedVacantArea: 90 },
];
data.inspections = [
  { id: 'i1', visitDate: '2026-11-18T10:00:00Z', workflowStatus: 'new', priority: 'urgent' },
  { id: 'i2', visitDate: '2026-01-01T10:00:00Z', workflowStatus: 'closed', priority: 'normal' },
];
data.followUp = { total: 7, open: 5, waiting: 2, overdue: 1, completed: 2, unassigned: 1, needsAction: 2 };
const enabled = Object.fromEntries(Object.keys(data).map((key) => [key, true]));
const asOf = new Date('2026-11-20T10:00:00Z').getTime();
const sections = metrics.buildExecutiveSections(data, enabled, 'الحرم أ', 30, asOf);
const value = (key) => sections.flatMap((section) => section.metrics).find((metric) => metric.key === key)?.value;

assert.equal(value('buildings.total'), 2, 'Only selected campus buildings are counted');
assert.equal(value('buildings.linked'), 1, 'Linked building count is scoped');
assert.equal(value('buildings.unlinked'), 1, 'Unlinked building count is scoped');
assert.equal(value('buildings.linkage_rate'), 50, 'Linkage percentage is computed correctly');
assert.equal(value('deeds.total'), 1, 'Date filter affects deed creation dates');
assert.equal(value('deeds.area_sqm'), 250, 'Only selected period deed areas are counted');
assert.equal(value('vacant.total_loaded'), 2, 'Vacant land campus filtering is applied');
assert.equal(value('vacant.approximate_sqm'), 350, 'Indicative site area uses all scoped sites');
assert.equal(value('vacant.verified_sqm'), 200, 'Verified area excludes unverified sites');
assert.equal(value('inspections.total'), 1, 'Visit period applies to inspections');
assert.equal(value('inspections.high_priority_open'), 1, 'Urgent open inspections are counted');
assert.equal(value('followup.overdue'), 1, 'Follow-up dashboard values are preserved');
assert.equal(metrics.positiveNumber(null), 0, 'Missing area is not NaN');
assert.equal(metrics.coordinatePairPresent({ latitude: null, longitude: 0 }), false, 'Null latitude is invalid');
assert.equal(metrics.coordinatePairPresent({ latitude: 0, longitude: 0 }), true, 'Valid zero coordinates do not count as missing');
assert.equal(metrics.safeSpreadsheetLabel(' =SUM(1,1)'), "' =SUM(1,1)", 'Formula-prefixed labels must be escaped');

const limited = { ...enabled, deeds: false, followUp: false };
const limitedSections = metrics.buildExecutiveSections(data, limited, '', null, asOf);
assert.equal(limitedSections.some((section) => section.key === 'deeds' || section.key === 'followUp'), false,
  'Forbidden modules never appear in executive report');
const failed = { ...data, vacant: null };
const unavailable = metrics.buildExecutiveSections(failed, enabled, '', null, asOf).find((section) => section.key === 'vacant');
assert.equal(unavailable.available, false, 'Failed source is explicitly unavailable');
assert.equal(unavailable.metrics.length, 0, 'Failed sources must not become zero metrics');

const route = await readFile(new URL('../src/app/routes.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/app/pages/HomePage.tsx', import.meta.url), 'utf8');
const report = await readFile(new URL('../src/app/pages/ExecutiveSummaryReportPage.tsx', import.meta.url), 'utf8');
assert.match(route, /path: 'reports\/executive'.*PermissionGuard module="reports" action="canView"/);
assert.match(home, /path: '\/reports\/executive'/);
assert.match(report, /hasPermission\('reports', 'canPrint'\)/);
assert.match(report, /PowerBI_Data/);
assert.match(report, /safeSpreadsheetLabel/);
assert.match(report, /window\.print\(\)/);

console.log('✓ Executive report calculations, data scoping, Excel safety, and guarded navigation');
