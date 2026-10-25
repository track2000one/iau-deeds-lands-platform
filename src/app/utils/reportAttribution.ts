/**
 * Attribution for generated reports. The active identity comes exclusively from
 * the authenticated account, not from editable report filters or record owners.
 */
let authenticatedPreparer = '';

export const setActiveReportPreparer = (username: string | null | undefined): void => {
  authenticatedPreparer = String(username || '').trim();
};

export const reportPreparerName = (): string => authenticatedPreparer || 'غير محدد';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);

export const reportPreparerHtml = (): string =>
  '<span class="report-preparer">أُعدّ بواسطة: <strong>' + escapeHtml(reportPreparerName()) + '</strong></span>';

/** Add a visible, printable author line to standalone HTML/PDF report documents. */
export const withReportPreparer = (html: string): string => {
  const line = '<div class="report-preparer-banner" style="direction:rtl;text-align:right;font:600 11px Tahoma,Arial,sans-serif;color:#334155;background:#f8fafc;border:1px solid #cbd5e1;padding:7px 10px;margin:0 0 10px;break-inside:avoid">' + reportPreparerHtml() + '</div>';
  return html.replace(/(<body\b[^>]*>)/i, '$1' + line);
};
