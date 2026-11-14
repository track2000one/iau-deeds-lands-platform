/**
 * DEV-ONLY, isolated browser fixture. It is intentionally not imported by App
 * or the Vite production entrypoint. It never reads the university database.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { AttachmentPreviewGrid } from '../../src/app/components/AttachmentPreview';
import { ReleaseStatus } from '../../src/app/components/ReleaseStatus';
import { BUILD_INFO } from '../../src/app/utils/buildInfo';
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

/**
 * Exercises the same PDF merge function used by the live deed report screen,
 * but exclusively with an in-memory, two-page synthetic PDF.
 */
function SyntheticDeedPdfExport() {
  const [status, setStatus] = React.useState('');
  const [generating, setGenerating] = React.useState(false);

  const run = async () => {
    if (generating) return;
    setGenerating(true);
    setStatus('جاري اختبار الدمج');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const { generateDeedImagesPdf } = await import('../../src/app/utils/deedBatchPdf');

      const original = await PDFDocument.create();
      original.addPage([400, 600]);
      original.addPage([600, 800]);
      const bytes = await original.save();
      const encoded = btoa(String.fromCharCode(...bytes));
      const attachmentUrl = `data:application/pdf;base64,${encoded}`;

      const documentTypes = [
        { id: 'synthetic-deed', attachmentType: 'deed_image' },
        { id: 'synthetic-plan', attachmentType: 'plan_image' },
        { id: 'synthetic-location', attachmentType: 'location_image' },
      ];
      const deed = {
        id: 'synthetic-ci-deed',
        deedNumber: 'CI-DEED-TEST-001',
        attachments: documentTypes.map(({ id, attachmentType }) => ({
          id,
          title: `${attachmentType}.pdf`,
          attachmentType,
          mimeType: 'application/pdf',
          fileUrl: attachmentUrl,
        })),
      } as Parameters<typeof generateDeedImagesPdf>[0][number];

      const result = await generateDeedImagesPdf([deed], {
        includeCover: false,
        includeHeaders: false,
        includeIndex: false,
        includePlanImages: true,
        includeLocationImages: true,
        fileName: 'synthetic-deed-test',
        compression: 'high',
        maxFileSizeMb: 0,
      });
      setStatus(`${result.pdfCount} مستندات PDF، ${result.pageCount} صفحات؛ ${result.deedCount} صك`);
    } catch (error) {
      setStatus(`فشل: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section data-testid="real-pdf-merge">
      <h2>اختبار التجميع الفعلي لمستندات الصك والمخطط والموقع</h2>
      <button type="button" disabled={generating} onClick={() => void run()}>
        {generating ? 'جارٍ إنشاء PDF التجريبي' : 'إنشاء PDF تجريبي متعدد الصفحات'}
      </button>
      <p data-testid="real-pdf-result" aria-live="polite">{status}</p>
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
        <SyntheticDeedPdfExport />
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

// Public test metadata only; no credentials or backend responses.
(window as Window & { __IAU_UI_TEST_BUILD_INFO__?: typeof BUILD_INFO }).__IAU_UI_TEST_BUILD_INFO__ = BUILD_INFO;

createRoot(document.getElementById('root')!).render(<Harness />);
