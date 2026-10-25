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
