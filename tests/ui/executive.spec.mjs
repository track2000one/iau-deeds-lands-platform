/**
 * Fully offline, synthetic UI verification for the real executive report screen.
 * The browser's API base is localhost and every /api/ request is intercepted here.
 * No Railway services, production users, production data, or real credentials are involved.
 */
import { test, expect } from '@playwright/test';
import XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';

const clock = '2026-11-20T15:00:00.000Z';
const sampleBuildings = [
  { id: 'b1', buildingNumber: 'B-01', campusLocation: 'الحرم الشرقي', deedId: 'd1', deed: { id: 'd1' }, latitude: 26.4, longitude: 50.1, operationalStatus: 'active' },
  { id: 'b2', buildingNumber: 'B-02', campusLocation: 'الحرم الشرقي', deedId: null, deed: null, latitude: null, longitude: null, operationalStatus: 'not_existing' },
  { id: 'b3', buildingNumber: 'B-03', campusLocation: 'الحرم الغربي', deedId: 'd2', deed: { id: 'd2' }, latitude: 26.45, longitude: 50.02, operationalStatus: 'active' },
];
const sampleDeeds = [
  { id: 'd1', deedNumber: '100', area: 450, city: 'الدمام', coordinates: '26.4,50.1', createdAt: '2026-11-16T10:00:00Z' },
  { id: 'd2', deedNumber: '101', area: 550, city: 'الخبر', coordinates: '', createdAt: '2025-01-01T10:00:00Z' },
];
const sampleVacant = [
  { id: 'v1', campus: 'الحرم الشرقي', approximateArea: 180, verifiedVacantArea: 120, status: 'VERIFIED_VACANT' },
  { id: 'v2', campus: 'الحرم الغربي', approximateArea: 95, verifiedVacantArea: null, status: 'UNDER_REVIEW' },
];
const sampleInspections = [
  { id: 'i1', visitDate: '2026-11-19T09:00:00Z', workflowStatus: 'in_progress', priority: 'urgent' },
  { id: 'i2', visitDate: '2025-01-01T09:00:00Z', workflowStatus: 'closed', priority: 'normal' },
];
const followUp = { total: 6, open: 3, overdue: 1, waiting: 1, completed: 3, unassigned: 1, needsAction: 2 };
const routes = new Map([
  ['/api/deeds', sampleDeeds],
  ['/api/mosques/buildings', sampleBuildings],
  ['/api/vacant-lands', sampleVacant],
  ['/api/site-inspections', sampleInspections],
  ['/api/transaction-follow-up/dashboard', followUp],
]);
const profile = (role, permissions = {}) => ({
  uid: 'synthetic-test-account', email: 'fixture@example.invalid', username: 'موظف تجريبي',
  role, isActive: true, permissions,
  createdAt: clock, updatedAt: clock, lastLoginAt: clock,
});
const allow = (canPrint = false) => ({
  reports: { canView: true, canPrint },
  central_buildings: { canView: true },
  deeds: { canView: true },
  vacant_lands: { canView: true },
  site_inspections: { canView: true },
  transaction_follow_up: { canView: true },
});

async function setup(page, { role = 'admin', permissions = {}, failingPath = '' } = {}) {
  const requestLog = [];
  await page.addInitScript(() => {
    localStorage.removeItem('iau_access_token');
    localStorage.removeItem('deeds_data');
  });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    requestLog.push(url.pathname);
    const fulfill = (body, status = 200) => route.fulfill({
      status, contentType: 'application/json', body: JSON.stringify(body),
    });
    if (url.pathname === '/api/auth/me') return fulfill({ user: profile(role, permissions) });
    if (url.pathname === '/api/auth/login') return fulfill({
      token: 'synthetic-test-token-not-real', user: profile(role, permissions),
    });
    if (url.pathname === '/api/users') return fulfill([]);
    if (url.pathname === failingPath) return fulfill({ message: 'Synthetic unavailable' }, 503);
    if (routes.has(url.pathname)) {
      const moduleForPath = {
        '/api/deeds': 'deeds',
        '/api/mosques/buildings': 'central_buildings',
        '/api/vacant-lands': 'vacant_lands',
        '/api/site-inspections': 'site_inspections',
        '/api/transaction-follow-up/dashboard': 'transaction_follow_up',
      }[url.pathname];
      const permitted = role === 'admin' || permissions[moduleForPath]?.canView;
      return permitted ? fulfill(routes.get(url.pathname)) : fulfill({ message: 'Forbidden' }, 403);
    }
    // DataContext and Layout may prefetch unrelated modules; never return privileged data.
    return fulfill({ message: 'Not included in synthetic role scope' }, 403);
  });
  await page.goto('/#/login');
  await page.locator('input[type="email"]').fill('fixture@example.invalid');
  await page.locator('input[type="password"]').fill('only-a-synthetic-password');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/#\/$/);
  // Follow the real dashboard action for users permitted to view reports.
  // A forbidden account navigates directly to verify the route guard itself.
  if (role === 'admin' || permissions.reports?.canView) {
    await page.getByRole('button', { name: 'التقرير التنفيذي', exact: true }).click();
  } else {
    await page.evaluate(() => { window.location.hash = '#/reports/executive'; });
  }
  return requestLog;
}

test('admin sees real executive UI, filters and an analyzable Excel workbook', async ({ page }) => {
  await setup(page);
  const report = page.locator('#executive-report');
  await expect(report.locator('h1')).toContainText('التقرير التنفيذي');
  await expect(report.getByText('السجل المركزي للمباني', { exact: true })).toBeVisible();
  await expect(report.getByText('الأراضي الشاغرة', { exact: true })).toBeVisible();
  await expect(report.getByText('نظام متابعة المعاملات', { exact: true })).toBeVisible();
  await expect(report.locator('html')).toHaveCount(0);

  await page.getByLabel('الحرم / الموقع للمباني والأراضي الشاغرة').selectOption('الحرم الشرقي');
  await page.getByLabel('الفترة للصكوك والمعاينات').selectOption('30');
  await expect(report.locator('tr').filter({ hasText: 'المباني المسجلة' })).toContainText('٢');
  await expect(report.locator('tr').filter({ hasText: 'مبانٍ دون ارتباط بصك' })).toContainText('١');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel + Power BI' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^IAU-DEEDS-Executive-.*\.xlsx$/);
  const workbook = XLSX.readFile(await download.path());
  expect(workbook.SheetNames).toEqual(['Executive_Summary', 'PowerBI_Data', 'Campus_Distribution']);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets.PowerBI_Data);
  const metric = (key) => data.find((row) => row.metric_key === key);
  expect(metric('buildings.total').value).toBe(2);
  expect(metric('buildings.unlinked').value).toBe(1);
  expect(metric('deeds.total').value).toBe(1);
  expect(metric('inspections.total').value).toBe(1);
  expect(metric('vacant.verified_sqm').value).toBe(120);
  expect(metric('followup.overdue').value).toBe(1);
  expect(metric('deeds.total').period_days).toBe(30);
  expect(metric('buildings.total').campus_filter).toBe('الحرم الشرقي');
  const sites = XLSX.utils.sheet_to_json(workbook.Sheets.Campus_Distribution, { header: 1 });
  expect(sites).toHaveLength(2);
  expect(sites[1][0]).toBe('الحرم الشرقي');
  expect(sites[1][1]).toBe(2);
});

test('a limited employee sees authorized building data without export or other modules', async ({ page }) => {
  const requestLog = await setup(page, { role: 'employee', permissions: {
    reports: { canView: true, canPrint: false },
    central_buildings: { canView: true },
  } });
  const report = page.locator('#executive-report');
  await expect(report.locator('h1')).toContainText('التقرير التنفيذي');
  await expect(report.getByText('السجل المركزي للمباني', { exact: true })).toBeVisible();
  await expect(report.getByText('الصكوك العقارية', { exact: true })).toHaveCount(0);
  await expect(report.getByText('نظام متابعة المعاملات', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Excel \+ Power BI/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /طباعة \/ حفظ PDF/ })).toHaveCount(0);
  expect(requestLog.filter((path) => path === '/api/transaction-follow-up/dashboard')).toHaveLength(0);
  expect(requestLog.filter((path) => path === '/api/vacant-lands')).toHaveLength(0);
});

test('report route requires view permission and never reveals data to a forbidden user', async ({ page }) => {
  const requestLog = await setup(page, { role: 'employee', permissions: {
    central_buildings: { canView: true },
    reports: { canView: false, canPrint: false },
  } });
  await expect(page.getByText('ليس لديك صلاحية')).toBeVisible();
  await expect(page.locator('#executive-report')).toHaveCount(0);
  expect(requestLog.filter((path) => path === '/api/mosques/buildings')).toHaveLength(0);
});

test('source failure is shown as unavailable and not misrepresented as zero', async ({ page }) => {
  await setup(page, { role: 'employee', permissions: allow(true),
    failingPath: '/api/vacant-lands' });
  const report = page.locator('#executive-report');
  await expect(report.getByText('ملاحظات اكتمال البيانات')).toBeVisible();
  await expect(report.getByText('تعذر تحميل البيانات؛ لم تُحتسب أصفار افتراضية.')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.getByRole('button', { name: 'Excel + Power BI' }).click(),
  ]);
  const workbook = XLSX.readFile(await download.path());
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.PowerBI_Data);
  expect(rows.some((row) => row.module === 'vacant_lands')).toBe(false);
  expect(rows.some((row) => row.module === 'central_buildings')).toBe(true);
});

test('printing uses report-only CSS and produces a valid PDF document', async ({ page }) => {
  await setup(page);
  const report = page.locator('#executive-report');
  await expect(report.locator('h1')).toContainText('التقرير التنفيذي');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav.no-print')).toBeHidden();
  await expect(report).toBeVisible();
  const buffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
  const document = await PDFDocument.load(buffer);
  expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
  expect(buffer.length).toBeGreaterThan(2500);
});
