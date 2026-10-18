import React from 'react';
import type {
  TransactionFollowUpExecutiveReport,
  TransactionFollowUpPriority,
  TransactionFollowUpStatus,
  TransactionFollowUpType,
} from '../api/transactionFollowUp';

const statusLabels: Record<TransactionFollowUpStatus, string> = {
  new: 'جديدة',
  assigned: 'مسندة',
  in_progress: 'تحت الإجراء',
  waiting_response: 'بانتظار رد',
  needs_follow_up: 'تحتاج متابعة',
  completed: 'منجزة',
  closed: 'مغلقة',
};

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

type Props = {
  report: TransactionFollowUpExecutiveReport;
  assigneeLabel?: string | null;
};

export const TransactionExecutiveReport = React.forwardRef<HTMLDivElement, Props>(
  ({ report, assigneeLabel }, ref) => {
    const transactionRows = report.transactions.slice(0, 100);
    const hiddenTransactions = Math.max(0, report.transactions.length - transactionRows.length);
    const overdueRows = report.overdueSnapshot.slice(0, 50);
    const hiddenOverdue = Math.max(0, report.overdueSnapshot.length - overdueRows.length);

    return (
      <div
        ref={ref}
        className="report-sheet mx-auto w-full max-w-[980px] bg-white p-5 text-slate-900 sm:p-8"
        dir="rtl"
      >
        <header className="border-b-2 border-[#0b4a3f] pb-5 text-center">
          <div className="text-sm font-black text-[#0b4a3f]">جامعة الإمام عبدالرحمن بن فيصل</div>
          <div className="mt-1 text-xs font-bold text-slate-600">إدارة أوقاف وأملاك الجامعة</div>
          <h1 className="mt-4 text-2xl font-black">التقرير التنفيذي لمتابعة المعاملات</h1>
          <p className="mt-2 text-xs text-slate-500">
            الفترة من {formatDate(report.period.from)} إلى {formatDate(report.period.to)}
            {assigneeLabel ? <> · الموظف: {assigneeLabel}</> : null}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">تاريخ إعداد التقرير: {formatDateTime(report.generatedAt)}</p>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReportMetric title="المعاملات المشمولة" value={report.summary.totalIncluded} />
          <ReportMetric title="المفتوحة" value={report.summary.open} />
          <ReportMetric title="المنجزة" value={report.summary.completed} />
          <ReportMetric title="المتأخرة القائمة" value={report.summary.overdueSnapshot} danger />
          <ReportMetric title="بانتظار رد" value={report.summary.waiting} />
          <ReportMetric title="تحتاج متابعة" value={report.summary.needsFollowUp} warning />
          <ReportMetric
            title="الإنجاز في الموعد"
            value={report.summary.onTimeRate == null ? '—' : `${report.summary.onTimeRate}%`}
          />
          <ReportMetric
            title="متوسط مدة الإنجاز"
            value={report.summary.avgCompletionDays == null ? '—' : `${report.summary.avgCompletionDays} يوم`}
          />
        </section>

        <section className="break-inside-avoid mt-6">
          <h2 className="mb-2 text-sm font-black text-[#0b4a3f]">توزيع الحالات</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-black">
                  {(report.statusCounts[status as TransactionFollowUpStatus] || 0).toLocaleString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        </section>

        {report.employees.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-black text-[#0b4a3f]">أداء وحمل الموظفين خلال الفترة</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-2 py-2 text-right">الموظف</th>
                    <th className="border border-slate-200 px-2 py-2 text-center">إجمالي</th>
                    <th className="border border-slate-200 px-2 py-2 text-center">مفتوحة</th>
                    <th className="border border-slate-200 px-2 py-2 text-center">منجزة</th>
                    <th className="border border-slate-200 px-2 py-2 text-center">متأخرة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.employees.map((employee, index) => (
                    <tr key={employee.userId || `unassigned-${index}`}>
                      <td className="border border-slate-200 px-2 py-2 font-bold">{employee.username}</td>
                      <td className="border border-slate-200 px-2 py-2 text-center">{employee.total.toLocaleString('ar-SA')}</td>
                      <td className="border border-slate-200 px-2 py-2 text-center">{employee.open.toLocaleString('ar-SA')}</td>
                      <td className="border border-slate-200 px-2 py-2 text-center">{employee.completed.toLocaleString('ar-SA')}</td>
                      <td className={`border border-slate-200 px-2 py-2 text-center font-bold ${employee.overdue ? 'text-red-700' : ''}`}>
                        {employee.overdue.toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {overdueRows.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-black text-red-800">المعاملات المتأخرة القائمة حتى نهاية الفترة</h2>
            <div className="overflow-hidden rounded-lg border border-red-200">
              <table className="w-full border-collapse text-[9px]">
                <thead className="bg-red-50">
                  <tr>
                    <th className="border border-red-100 px-2 py-2 text-right">رقم المعاملة</th>
                    <th className="border border-red-100 px-2 py-2 text-right">الموضوع</th>
                    <th className="border border-red-100 px-2 py-2 text-right">الموظف</th>
                    <th className="border border-red-100 px-2 py-2 text-center">الاستحقاق</th>
                    <th className="border border-red-100 px-2 py-2 text-center">التأخير</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-red-100 px-2 py-2 font-bold">{row.transactionNumber}</td>
                      <td className="border border-red-100 px-2 py-2">{row.subject}</td>
                      <td className="border border-red-100 px-2 py-2">{row.currentAssigneeName || 'غير مسندة'}</td>
                      <td className="border border-red-100 px-2 py-2 text-center">{formatDate(row.dueDate)}</td>
                      <td className="border border-red-100 px-2 py-2 text-center font-black text-red-700">
                        {row.overdueDays.toLocaleString('ar-SA')} يوم
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hiddenOverdue > 0 && (
              <p className="mt-2 text-[10px] text-slate-500">يوجد {hiddenOverdue.toLocaleString('ar-SA')} معاملة متأخرة إضافية غير معروضة في النسخة المختصرة.</p>
            )}
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-black text-[#0b4a3f]">تفاصيل المعاملات المشمولة بالتقرير</h2>
          {transactionRows.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-[8.5px]">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-200 px-1.5 py-2 text-right">رقم المعاملة</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-center">التاريخ</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-right">الموضوع</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-center">النوع</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-right">الموظف</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-center">الحالة</th>
                    <th className="border border-slate-200 px-1.5 py-2 text-center">الاستحقاق</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map((row) => (
                    <tr key={row.id}>
                      <td className="border border-slate-200 px-1.5 py-2 font-bold">{row.transactionNumber}</td>
                      <td className="border border-slate-200 px-1.5 py-2 text-center">{formatDate(row.transactionDate)}</td>
                      <td className="border border-slate-200 px-1.5 py-2">{row.subject}</td>
                      <td className="border border-slate-200 px-1.5 py-2 text-center">{typeLabels[row.transactionType]}</td>
                      <td className="border border-slate-200 px-1.5 py-2">{row.currentAssigneeName || 'غير مسندة'}</td>
                      <td className="border border-slate-200 px-1.5 py-2 text-center">{statusLabels[row.status]}</td>
                      <td className="border border-slate-200 px-1.5 py-2 text-center">{formatDate(row.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-xs text-slate-500">
              لا توجد معاملات ضمن الفترة المحددة.
            </div>
          )}
          {hiddenTransactions > 0 && (
            <p className="mt-2 text-[10px] text-slate-500">
              التقرير التنفيذي يعرض أول 100 معاملة تفصيليًا، ويوجد {hiddenTransactions.toLocaleString('ar-SA')} معاملة إضافية مشمولة في المؤشرات الإجمالية.
            </p>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-4 text-center text-[9px] leading-5 text-slate-400">
          تقرير مولد آليًا من نظام متابعة المعاملات بمنصة IAU-Deeds. المؤشرات مبنية على البيانات المسجلة في النظام وقت إعداد التقرير.
        </footer>
      </div>
    );
  },
);

TransactionExecutiveReport.displayName = 'TransactionExecutiveReport';

const ReportMetric = ({
  title,
  value,
  danger = false,
  warning = false,
}: {
  title: string;
  value: string | number;
  danger?: boolean;
  warning?: boolean;
}) => (
  <div className={`break-inside-avoid rounded-lg border px-3 py-3 text-center ${
    danger
      ? 'border-red-200 bg-red-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-slate-50'
  }`}>
    <div className="text-[10px] text-slate-500">{title}</div>
    <div className={`mt-1 text-xl font-black ${danger ? 'text-red-700' : 'text-slate-900'}`}>
      {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
    </div>
  </div>
);

export default TransactionExecutiveReport;
