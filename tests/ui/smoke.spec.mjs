import { test, expect } from '@playwright/test';

test('login view shows inputs without connecting to production data', async ({ page }) => {
  await page.goto('/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('PDF frames load only after a click and can be released again', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const grid = page.getByTestId('attachment-grid');
  await expect(grid.locator('iframe')).toHaveCount(0);

  await grid.getByRole('button', { name: 'معاينة ملف PDF داخل البطاقة: مخطط تجريبي.pdf' }).click();
  await expect(grid.locator('iframe[title="مخطط تجريبي.pdf"]')).toHaveCount(1);

  await grid.getByRole('button', { name: 'إغلاق معاينة PDF: مخطط تجريبي.pdf' }).click();
  await expect(grid.locator('iframe')).toHaveCount(0);
  await expect(grid.getByRole('button', { name: 'معاينة ملف PDF داخل البطاقة: مخطط تجريبي.pdf' })).toBeVisible();

  const image = grid.getByRole('img', { name: 'صورة موقع تجريبية.png' });
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(image).toHaveAttribute('decoding', 'async');
});

test('attachments show 12 at first; report preview caps at 60 but full data stays available', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const grid = page.getByTestId('attachment-grid');
  await expect(grid.getByText(/معاينة .* من .* مرفق/)).toBeVisible();
  await grid.getByRole('button', { name: 'عرض المزيد من المرفقات' }).click();
  await expect(grid.getByText('مرفق تجريبي 14.pdf')).toBeVisible();

  const report = page.getByTestId('report-pagination');
  await expect(report.locator('tbody tr')).toHaveCount(60);
  await expect(report.getByTestId('report-count')).toContainText('عرض 60 من 135 سجل');

  await report.getByRole('button', { name: 'عرض المزيد من سجلات التقرير' }).click();
  await expect(report.locator('tbody tr')).toHaveCount(120);
  await report.getByRole('button', { name: 'عرض المزيد من سجلات التقرير' }).click();
  await expect(report.locator('tbody tr')).toHaveCount(135);
  await expect(report.getByRole('button', { name: 'عرض المزيد من سجلات التقرير' })).toHaveCount(0);

  await report.getByRole('button', { name: 'فحص نطاق التقرير الكامل' }).click();
  await expect(report.getByTestId('report-export-count')).toContainText('135');
});

test('central building cards expose distinct linked and unlinked accents', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const section = page.getByTestId('building-card-styles');
  const linked = section.locator('article[data-deed-linked="true"]');
  const unlinked = section.locator('article[data-deed-linked="false"]');
  await expect(linked).toBeVisible();
  await expect(unlinked).toBeVisible();
  const styles = await page.evaluate(() => {
    const linkedCard = document.querySelector('article[data-deed-linked="true"]');
    const unlinkedCard = document.querySelector('article[data-deed-linked="false"]');
    const read = (element) => ({
      accent: getComputedStyle(element).getPropertyValue('--iau-building-accent').trim(),
      stripHeight: getComputedStyle(element, '::before').height,
    });
    return { linked: read(linkedCard), unlinked: read(unlinkedCard) };
  });
  expect(styles.linked.accent).not.toBe(styles.unlinked.accent);
  expect(styles.linked.stripHeight).toBe('4px');
  expect(styles.unlinked.stripHeight).toBe('4px');
});

test('release verifier distinguishes up-to-date, newer version and offline errors', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const release = page.getByTestId('release-status');
  const button = release.getByRole('button', { name: 'التحقق من التحديثات' });
  await expect(button).toBeVisible();

  await page.route('**/build-info.json?check=*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: 'build-a-newer-test-release', builtAt: '2026-11-14T09:40:00Z', commit: 'test-only' }),
    });
  });
  await button.click();
  await expect(release.getByText('يتوفر تحديث أحدث')).toBeVisible();
  await expect(release.getByRole('button', { name: 'تحديث المنصة الآن' })).toBeVisible();

  await page.unrouteAll();
  const current = await page.evaluate(() => window.__IAU_UI_TEST_BUILD_INFO__);
  expect(current).toMatchObject({ id: expect.any(String), builtAt: expect.any(String) });
  await page.route('**/build-info.json?check=*', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(current) }));
  await button.click();
  await expect(release.getByText('لديك أحدث إصدار متاح')).toBeVisible();

  // Deliberately check network-error reporting without changing account/session state.
  await page.unrouteAll();
  await page.route('**/build-info.json?check=*', (route) => route.abort());
  await button.click();
  await expect(release.getByText(/تعذر التحقق/)).toBeVisible();
});

test('real PDF merger preserves source pages and includes deed, plan and site documents', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const fixture = page.getByTestId('real-pdf-merge');
  const event = page.waitForEvent('download');
  await fixture.getByRole('button', { name: 'إنشاء PDF تجريبي متعدد الصفحات' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('synthetic-deed-test.pdf');
  const { PDFDocument } = await import('pdf-lib');
  const { readFile } = await import('node:fs/promises');
  const pdf = await PDFDocument.load(await readFile(await download.path()));
  expect(pdf.getPageCount()).toBe(6);
  const sizes = pdf.getPages().map((item) => ({
    width: Math.round(item.getWidth()),
    height: Math.round(item.getHeight()),
  }));
  expect(sizes).toEqual([
    { width: 400, height: 600 },
    { width: 600, height: 800 },
    { width: 400, height: 600 },
    { width: 600, height: 800 },
    { width: 400, height: 600 },
    { width: 600, height: 800 },
  ]);
  await expect(fixture.getByTestId('real-pdf-result')).toContainText('3 مستندات PDF، 6 صفحات');
});

test('report chart renders with representative, synthetic counts', async ({ page }) => {
  await page.goto('/tests/ui/harness.html');
  const chart = page.getByTestId('report-charts');
  await expect(chart.locator('svg').first()).toBeVisible();
});
