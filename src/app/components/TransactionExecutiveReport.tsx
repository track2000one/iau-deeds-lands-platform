import React from 'react';
import type {
  TransactionFollowUpExecutiveReport,
  TransactionFollowUpPriority,
  TransactionFollowUpStatus,
  TransactionFollowUpType,
  TransactionFollowUpOrganizationalUnit,
} from '../api/transactionFollowUp';

export type FlexibleReportCategory =
  | 'completed'
  | 'overdue'
  | 'waiting_response'
  | 'needs_follow_up';

export type FlexibleReportColumnKey =
  | 'transactionNumber'
  | 'transactionDate'
  | 'subject'
  | 'transactionType'
  | 'organizationalUnit'
  | 'currentAssigneeName'
  | 'category'
  | 'priority'
  | 'dueDate'
  | 'requiredAction';

export type FlexibleReportSortKey =
  | 'transactionDate'
  | 'transactionNumber'
  | 'priority'
  | 'currentAssigneeName'
  | 'dueDate'
  | 'category';

export type FlexibleReportOptions = {
  title: string;
  categories: FlexibleReportCategory[];
  search: string;
  priority: TransactionFollowUpPriority | '';
  organizationalUnit: TransactionFollowUpOrganizationalUnit | '';
  sortBy: FlexibleReportSortKey;
  sortDirection: 'asc' | 'desc';
  visibleColumns: FlexibleReportColumnKey[];
  excludedIds: string[];
};

export const FLEXIBLE_REPORT_CATEGORIES: Array<{
  key: FlexibleReportCategory;
  label: string;
}> = [
  { key: 'completed', label: 'المنجزة' },
  { key: 'overdue', label: 'المتأخرة القائمة' },
  { key: 'waiting_response', label: 'بانتظار رد' },
  { key: 'needs_follow_up', label: 'تحتاج متابعة' },
];

export const FLEXIBLE_REPORT_COLUMNS: Array<{
  key: FlexibleReportColumnKey;
  label: string;
}> = [
  { key: 'transactionNumber', label: 'رقم المعاملة' },
  { key: 'transactionDate', label: 'التاريخ' },
  { key: 'subject', label: 'الموضوع' },
  { key: 'transactionType', label: 'النوع' },
  { key: 'organizationalUnit', label: 'الإدارة / الوحدة' },
  { key: 'currentAssigneeName', label: 'الموظف' },
  { key: 'category', label: 'الفئة' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'dueDate', label: 'الاستحقاق' },
  { key: 'requiredAction', label: 'الإجراء المطلوب' },
];

export const DEFAULT_FLEXIBLE_REPORT_COLUMNS: FlexibleReportColumnKey[] = [
  'transactionNumber',
  'transactionDate',
  'subject',
  'organizationalUnit',
  'currentAssigneeName',
  'category',
  'priority',
  'dueDate',
];

const priorityLabels: Record<TransactionFollowUpPriority, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

const typeLabels: Record<TransactionFollowUpType, string> = {
  incoming_internal: 'وارد داخلي',
  incoming_external: 'وارد خارجي',
  outgoing_internal: 'صادر داخلي',
  outgoing_external: 'صادر خارجي',
  other: 'أخرى',
  incoming: 'وارد',
  outgoing: 'صادر',
  internal: 'داخلي',
};

const organizationalUnitLabels: Record<TransactionFollowUpOrganizationalUnit, string> = {
  endowments_properties: 'إدارة أوقاف وأملاك الجامعة',
  mosques_prayer_rooms: 'وحدة العناية بالمساجد والمصليات الجامعية',
};

const categoryLabels: Record<FlexibleReportCategory, string> = {
  completed: 'منجزة',
  overdue: 'متأخرة قائمة',
  waiting_response: 'بانتظار رد',
  needs_follow_up: 'تحتاج متابعة',
};

const categoryRank: Record<FlexibleReportCategory, number> = {
  overdue: 1,
  needs_follow_up: 2,
  waiting_response: 3,
  completed: 4,
};

const priorityRank: Record<TransactionFollowUpPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

type FlexibleRow = {
  id: string;
  transactionNumber: string;
  transactionDate?: string | null;
  subject: string;
  transactionType?: TransactionFollowUpType | null;
  organizationalUnit?: TransactionFollowUpOrganizationalUnit | null;
  currentAssigneeName?: string | null;
  category: FlexibleReportCategory;
  priority: TransactionFollowUpPriority;
  dueDate?: string | null;
  requiredAction?: string | null;
  overdueDays?: number | null;
};

type Props = {
  report: TransactionFollowUpExecutiveReport;
  assigneeLabel?: string | null;
  options?: FlexibleReportOptions;
  onExclude?: (id: string) => void;
};

const fallbackOptions: FlexibleReportOptions = {
  title: 'التقرير المرن لمتابعة المعاملات',
  categories: ['completed', 'overdue', 'waiting_response', 'needs_follow_up'],
  search: '',
  priority: '',
  organizationalUnit: '',
  sortBy: 'transactionDate',
  sortDirection: 'desc',
  visibleColumns: DEFAULT_FLEXIBLE_REPORT_COLUMNS,
  excludedIds: [],
};

const categoryForStatus = (
  status: TransactionFollowUpStatus,
): FlexibleReportCategory | null => {
  if (status === 'completed') return 'completed';
  if (status === 'waiting_response') return 'waiting_response';
  if (status === 'needs_follow_up') return 'needs_follow_up';
  return null;
};

export const TransactionExecutiveReport = React.forwardRef<HTMLDivElement, Props>(
  ({ report, assigneeLabel, options = fallbackOptions, onExclude }, ref) => {
    const rows = React.useMemo(() => {
      const transactionById = new Map(report.transactions.map((row) => [row.id, row]));
      const overdueIds = new Set(report.overdueSnapshot.map((row) => row.id));

      const overdueRows: FlexibleRow[] = report.overdueSnapshot.map((row) => {
        const source = transactionById.get(row.id);
        return {
          id: row.id,
          transactionNumber: row.transactionNumber,
          transactionDate: source?.transactionDate || null,
          subject: row.subject,
          transactionType: source?.transactionType || null,
          organizationalUnit: source?.organizationalUnit || null,
          currentAssigneeName: row.currentAssigneeName || source?.currentAssigneeName || null,
          category: 'overdue',
          priority: row.priority,
          dueDate: row.dueDate,
          requiredAction: source?.requiredAction || null,
          overdueDays: row.overdueDays,
        };
      });

      const statusRows: FlexibleRow[] = report.transactions
        .filter((row) => !overdueIds.has(row.id))
        .map((row): FlexibleRow | null => {
          const category = categoryForStatus(row.status);
          if (!category) return null;
          return {
            id: row.id,
            transactionNumber: row.transactionNumber,
            transactionDate: row.transactionDate,
            subject: row.subject,
            transactionType: row.transactionType,
            organizationalUnit: row.organizationalUnit || null,
            currentAssigneeName: row.currentAssigneeName || null,
            category,
            priority: row.priority,
            dueDate: row.dueDate || null,
            requiredAction: row.requiredAction || null,
            overdueDays: null,
          };
        })
        .filter((row): row is FlexibleRow => row !== null);

      const excluded = new Set(options.excludedIds);
      const selectedCategories = new Set(options.categories);
      const search = options.search.trim().toLocaleLowerCase('ar');

      const filtered = [...overdueRows, ...statusRows].filter((row) => {
        if (excluded.has(row.id)) return false;
        if (!selectedCategories.has(row.category)) return false;
        if (options.priority && row.priority !== options.priority) return false;
        if (
          options.organizationalUnit
          && row.organizationalUnit !== options.organizationalUnit
        ) return false;

        if (search) {
          const haystack = [
            row.transactionNumber,
            row.subject,
            row.currentAssigneeName || '',
            row.requiredAction || '',
            row.organizationalUnit
              ? organizationalUnitLabels[row.organizationalUnit]
              : '',
            categoryLabels[row.category],
          ]
            .join(' ')
            .toLocaleLowerCase('ar');
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

      const valueForSort = (row: FlexibleRow) => {
        switch (options.sortBy) {
          case 'transactionNumber':
            return row.transactionNumber;
          case 'priority':
            return priorityRank[row.priority];
          case 'currentAssigneeName':
            return row.currentAssigneeName || '';
          case 'dueDate':
            return row.dueDate ? new Date(row.dueDate).getTime() : 0;
          case 'category':
            return categoryRank[row.category];
          case 'transactionDate':
          default:
            return row.transactionDate ? new Date(row.transactionDate).getTime() : 0;
        }
      };

      return filtered.sort((left, right) => {
        const a = valueForSort(left);
        const b = valueForSort(right);
        const comparison =
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b), 'ar', { numeric: true });
        return options.sortDirection === 'asc' ? comparison : -comparison;
      });
    }, [options, report.overdueSnapshot, report.transactions]);

    const counts = React.useMemo(
      () => ({
        completed: rows.filter((row) => row.category === 'completed').length,
        overdue: rows.filter((row) => row.category === 'overdue').length,
        waiting_response: rows.filter((row) => row.category === 'waiting_response').length,
        needs_follow_up: rows.filter((row) => row.category === 'needs_follow_up').length,
      }),
      [rows],
    );

    const visibleColumns = FLEXIBLE_REPORT_COLUMNS.filter((column) =>
      options.visibleColumns.includes(column.key),
    );

    const renderCell = (row: FlexibleRow, key: FlexibleReportColumnKey) => {
      switch (key) {
        case 'transactionNumber':
          return <span className="font-black">{row.transactionNumber}</span>;
        case 'transactionDate':
          return formatDate(row.transactionDate);
        case 'subject':
          return row.subject;
        case 'transactionType':
          return row.transactionType ? typeLabels[row.transactionType] : '—';
        case 'organizationalUnit':
          return row.organizationalUnit
            ? organizationalUnitLabels[row.organizationalUnit]
            : 'غير محددة';
        case 'currentAssigneeName':
          return row.currentAssigneeName || 'غير مسندة';
        case 'category':
          return (
            <span
              className={
                row.category === 'overdue'
                  ? 'font-black text-red-700'
                  : row.category === 'needs_follow_up'
                    ? 'font-black text-amber-700'
                    : row.category === 'completed'
                      ? 'font-black text-emerald-700'
                      : 'font-black text-sky-700'
              }
            >
              {categoryLabels[row.category]}
              {row.category === 'overdue' && row.overdueDays
                ? ` (${row.overdueDays.toLocaleString('ar-SA')} يوم)`
                : ''}
            </span>
          );
        case 'priority':
          return priorityLabels[row.priority];
        case 'dueDate':
          return formatDate(row.dueDate);
        case 'requiredAction':
          return row.requiredAction || '—';
        default:
          return '—';
      }
    };

    const activeFilters = [
      options.priority ? `الأولوية: ${priorityLabels[options.priority]}` : null,
      options.organizationalUnit
        ? `الإدارة/الوحدة: ${organizationalUnitLabels[options.organizationalUnit]}`
        : null,
      options.search.trim() ? `بحث: ${options.search.trim()}` : null,
      options.excludedIds.length
        ? `مستبعد يدويًا: ${options.excludedIds.length.toLocaleString('ar-SA')}`
        : null,
    ].filter(Boolean);

    return (
      <div
        ref={ref}
        className="report-sheet mx-auto w-full max-w-[1180px] bg-white p-5 text-slate-900 sm:p-8"
        dir="rtl"
      >
        <header className="border-b-2 border-[#0b4a3f] pb-5 text-center">
          <div className="text-sm font-black text-[#0b4a3f]">جامعة الإمام عبدالرحمن بن فيصل</div>
          <div className="mt-1 text-xs font-bold text-slate-600">إدارة أوقاف وأملاك الجامعة</div>
          <h1 className="mt-4 text-2xl font-black">
            {options.title.trim() || 'التقرير المرن لمتابعة المعاملات'}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            الفترة من {formatDate(report.period.from)} إلى {formatDate(report.period.to)}
            {assigneeLabel ? <> · الموظف: {assigneeLabel}</> : null}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            تاريخ إعداد التقرير: {formatDateTime(report.generatedAt)}
          </p>
          <p className="mt-2 text-[10px] font-bold text-slate-500">
            الفئات المعروضة: {options.categories.map((category) => categoryLabels[category]).join('، ') || 'لا توجد فئات محددة'}
          </p>
          {activeFilters.length > 0 && (
            <p className="mt-1 text-[10px] text-slate-400">{activeFilters.join(' · ')}</p>
          )}
        </header>

        <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReportMetric title="المنجزة" value={counts.completed} tone="success" />
          <ReportMetric title="المتأخرة القائمة" value={counts.overdue} tone="danger" />
          <ReportMetric title="بانتظار رد" value={counts.waiting_response} tone="info" />
          <ReportMetric title="تحتاج متابعة" value={counts.needs_follow_up} tone="warning" />
        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-[#0b4a3f]">تفاصيل التقرير</h2>
            <span className="text-[10px] font-bold text-slate-500">
              عدد النتائج: {rows.length.toLocaleString('ar-SA')}
            </span>
          </div>

          {rows.length && visibleColumns.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-[8.5px]">
                <thead className="bg-slate-100">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        className="border border-slate-200 px-1.5 py-2 text-right font-black"
                      >
                        {column.label}
                      </th>
                    ))}
                    {onExclude && (
                      <th className="no-print border border-slate-200 px-1.5 py-2 text-center">
                        استبعاد
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {visibleColumns.map((column) => (
                        <td
                          key={column.key}
                          className="border border-slate-200 px-1.5 py-2 align-top"
                        >
                          {renderCell(row, column.key)}
                        </td>
                      ))}
                      {onExclude && (
                        <td className="no-print border border-slate-200 px-1.5 py-2 text-center">
                          <button
                            type="button"
                            className="min-h-0 min-w-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700 hover:bg-red-100"
                            onClick={() => onExclude(row.id)}
                          >
                            استبعاد
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 py-10 text-center text-xs text-slate-500">
              لا توجد نتائج مطابقة لمعايير التقرير الحالية.
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-4 text-center text-[9px] leading-5 text-slate-400">
          تقرير مرن مولد من نظام متابعة المعاملات. لا يعرض إلا: المنجزة، المتأخرة القائمة، بانتظار رد، وتحتاج متابعة،
          مع تطبيق التصفية والفرز والاستبعاد واختيار الأعمدة المحددة وقت الطباعة.
        </footer>
      </div>
    );
  },
);

TransactionExecutiveReport.displayName = 'TransactionExecutiveReport';

const ReportMetric = ({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: 'success' | 'danger' | 'warning' | 'info';
}) => {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className={`break-inside-avoid rounded-lg border px-3 py-3 text-center ${toneClass}`}>
      <div className="text-[10px] font-bold">{title}</div>
      <div className="mt-1 text-xl font-black">{value.toLocaleString('ar-SA')}</div>
    </div>
  );
};

export default TransactionExecutiveReport;
