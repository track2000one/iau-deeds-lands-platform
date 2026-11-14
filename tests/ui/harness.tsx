/**
 * DEV-ONLY, isolated browser fixture. It is intentionally not imported by App
 * or the Vite production entrypoint. It never reads the university database.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { AttachmentPreviewGrid } from '../../src/app/components/AttachmentPreview';
import { ReleaseStatus } from '../../src/app/components/ReleaseStatus';
import { ReportCharts } from '../../src/app/components/ReportCharts';
import {
  getVisibleReportRows,
  nextReportPreviewCount,
  REPORT_PREVIEW_BATCH_SIZE,
} from '../../src/app/utils/reportPreviewPagination';

const attachments = Array.from({ length: 14 }, (_, index) => ({
  id: String(index + 1),
  title: index === 0
    ? 'مخطط تجريبي.pdf'
    : index === 1
      ? 'صورة موقع تجريبية.png'
      : `مرفق تجريبي ${index + 1}.pdf`,
  fileUrl: index === 1
    ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9U1QprIAAAAASUVORK5CYII='
    : `data:application/pdf,This%20is%20a%20test%20fixture%20${index + 1}`,
  mimeType: index === 1 ? 'image/png' : 'application/pdf',
}));

const sampleReport = Array.from({ length: 135 }, (_, index) => ({
  id: `TEST-${index + 1}`,
  name: `مبنى تجريبي ${index + 1}`,
}));

function SampleReportPagination() {
  const [count, setCount] = React.useState(REPORT_PREVIEW_BATCH_SIZE);
  const [exportCount, setExportCount] = React.useState<number | null>(null);
  const previewRows = getVisibleReportRows(sampleReport, count);

  return (
    <section data-testid="report-pagination">
      <h2>معاينة التقرير التجريبية</h2>
      <p data-testid="report-count">
        عرض {previewRows.length} من {sampleReport.length} سجل
      </p>
      <table aria-label="جدول التقرير التجريبي">
        <tbody>
          {previewRows.map((row) => (
            <tr key={row.id}><td>{row.name}</td></tr>
          ))}
        </tbody>
      </table>
      {previewRows.length < sampleReport.length && (
        <button
          type="button"
          onClick={() => setCount((current) => nextReportPreviewCount(current, sampleReport.length))}
        >
          عرض المزيد من سجلات التقرير
        </button>
      )}
      <button type="button" onClick={() => setExportCount(sampleReport.length)}>
        فحص نطاق التقرير الكامل
      </button>
      {exportCount !== null && <p data-testid="report-export-count">عدد سجلات التصدير: {exportCount}</p>}
    </section>
  );
}

function Harness() {
  return (
    <div className="neo-platform-shell min-h-screen p-4">
      <main className="mx-auto max-w-5xl space-y-10">
        <h1>اختبارات واجهة IAU Deeds – بيانات اصطناعية فقط</h1>
        <div data-testid="release-status"><ReleaseStatus compact /></div>
        <section data-testid="building-card-styles">
          <h2>تمييز الارتباط بالصك</h2>
          <article className="iau-interactive-card iau-card--building rounded-2xl border p-4" data-deed-linked="true">
            <span className="iau-card-spotlight" aria-hidden="true" />
            <h3>مبنى تجريبي مرتبط بصك</h3>
          </article>
          <article className="iau-interactive-card iau-card--building rounded-2xl border p-4" data-deed-linked="false">
            <span className="iau-card-spotlight" aria-hidden="true" />
            <h3>مبنى تجريبي غير مرتبط بصك</h3>
          </article>
        </section>
        <section data-testid="attachment-grid">
          <h2>المرفقات التجريبية</h2>
          <AttachmentPreviewGrid attachments={attachments} compact />
        </section>
        <SampleReportPagination />
        <section data-testid="report-charts">
          <h2>رسوم التقرير التجريبية</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ReportCharts variant="overview" data={[
              { name: 'صكوك', value: 12 },
              { name: 'مبانٍ', value: 20 },
            ]} />
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
