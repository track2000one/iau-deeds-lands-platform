import React from 'react';
import {
  CheckCircle2,
  FileDown,
  History,
  PencilLine,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpApprovalHistoryPage,
  type TransactionFollowUpAssignee,
} from '../api/transactionFollowUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

const EMPTY: TransactionFollowUpApprovalHistoryPage = {
  generatedAt: new Date(0).toISOString(),
  periodDays: 90,
  summary: {
    total: 0,
    approved: 0,
    returned: 0,
    modificationRequested: 0,
    uniqueDirectives: 0,
    averageReviewHours: null,
  },
  employees: [],
  reviewers: [],
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const decisionLabels: Record<string, string> = {
  approved: 'اعتماد الإنجاز',
  return_for_completion: 'إعادة للاستكمال',
  request_modification: 'طلب تعديل',
};

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

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  onOpenTransaction: (transactionId: string) => void;
};

export const TransactionApprovalHistoryDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  onOpenTransaction,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpApprovalHistoryPage>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [decision, setDecision] = React.useState('');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');
  const [reviewerUserId, setReviewerUserId] = React.useState('');
  const [periodDays, setPeriodDays] = React.useState<'30' | '90' | '365' | 'all'>('90');

  const load = React.useCallback(async (targetPage = page) => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.approvalHistory({
        page: targetPage,
        pageSize: 20,
        search,
        decision,
        assigneeUserId,
        reviewerUserId,
        periodDays: periodDays === 'all' ? 'all' : Number(periodDays),
      });
      setData(result);
      setPage(result.page || 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل الاعتمادات');
    } finally {
      setLoading(false);
    }
  }, [assigneeUserId, decision, page, periodDays, reviewerUserId, search]);

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void load(1), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [open, search, decision, assigneeUserId, reviewerUserId, periodDays]);

  const loadAllForReport = async () => {
    const first = await transactionFollowUpApi.approvalHistory({
      page: 1,
      pageSize: 50,
      search,
      decision,
      assigneeUserId,
      reviewerUserId,
      periodDays: periodDays === 'all' ? 'all' : Number(periodDays),
    });
    const items = [...first.items];
    const maxPages = Math.min(first.totalPages || 1, 20);
    for (let nextPage = 2; nextPage <= maxPages; nextPage += 1) {
      const result = await transactionFollowUpApi.approvalHistory({
        page: nextPage,
        pageSize: 50,
        search,
        decision,
        assigneeUserId,
        reviewerUserId,
        periodDays: periodDays === 'all' ? 'all' : Number(periodDays),
      });
      items.push(...result.items);
    }
    return { ...first, items };
  };

  const printReport = async () => {
    try {
      setExporting(true);
      const report = await loadAllForReport();
      const popup = window.open('', '_blank', 'width=1180,height=900');
      if (!popup) {
        toast.error('تعذر فتح نافذة التقرير. تحقق من السماح بالنوافذ المنبثقة.');
        return;
      }

      const employeeRows = report.employees.map((employee) => `
        <tr>
          <td>${escapeHtml(employee.username)}</td>
          <td>${employee.reviews}</td>
          <td>${employee.approved}</td>
          <td>${employee.returned}</td>
          <td>${employee.modificationRequested}</td>
          <td>${employee.reworkCount}</td>
          <td>${employee.approvalRate == null ? '—' : `${employee.approvalRate}%`}</td>
        </tr>`).join('');

      const detailRows = report.items.map((item) => `
        <tr>
          <td>${escapeHtml(formatDateTime(item.reviewedAt))}</td>
          <td>${escapeHtml(item.directive.transaction.transactionNumber)}</td>
          <td>${escapeHtml(item.directive.title)}</td>
          <td>${escapeHtml(item.directive.assigneeName)}</td>
          <td>${escapeHtml(item.reviewedByName || '—')}</td>
          <td>${escapeHtml(decisionLabels[item.decision] || item.decision)}</td>
          <td>${escapeHtml(item.reviewNote || '—')}</td>
        </tr>`).join('');

      popup.document.open();
      popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>سجل الاعتمادات والقرارات الإدارية</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Tahoma, sans-serif; color: #17202a; margin: 0; }
h1 { font-size: 20px; margin: 0 0 5px; }
h2 { font-size: 14px; margin: 18px 0 8px; }
.meta { font-size: 11px; color: #64748b; margin-bottom: 14px; }
.cards { display: grid; grid-template-columns: repeat(5,1fr); gap: 6px; margin-bottom: 14px; }
.card { border: 1px solid #d8dee8; border-radius: 8px; padding: 8px; text-align: center; }
.card b { display: block; font-size: 18px; margin-top: 4px; }
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th, td { border: 1px solid #d8dee8; padding: 5px; vertical-align: top; }
th { background: #f1f5f9; }
</style>
</head>
<body>
<h1>سجل الاعتمادات والقرارات الإدارية</h1>
<div class="meta">تاريخ الاستخراج: ${escapeHtml(formatDateTime(new Date().toISOString()))} · عدد السجلات: ${report.summary.total}</div>
<div class="cards">
  <div class="card">إجمالي المراجعات<b>${report.summary.total}</b></div>
  <div class="card">المعتمدة<b>${report.summary.approved}</b></div>
  <div class="card">إعادة للاستكمال<b>${report.summary.returned}</b></div>
  <div class="card">طلبات التعديل<b>${report.summary.modificationRequested}</b></div>
  <div class="card">متوسط زمن المراجعة<b>${report.summary.averageReviewHours == null ? '—' : `${report.summary.averageReviewHours} س`}</b></div>
</div>
<h2>ملخص حسب الموظف</h2>
<table>
<thead><tr><th>الموظف</th><th>المراجعات</th><th>معتمد</th><th>إعادة</th><th>طلب تعديل</th><th>مرات إعادة العمل</th><th>نسبة الاعتماد</th></tr></thead>
<tbody>${employeeRows || '<tr><td colspan="7">لا توجد بيانات.</td></tr>'}</tbody>
</table>
<h2>تفاصيل سجل الاعتمادات</h2>
<table>
<thead><tr><th>تاريخ القرار</th><th>رقم المعاملة</th><th>التوجيه / القرار</th><th>الموظف</th><th>المراجع</th><th>قرار الإدارة</th><th>الملاحظة</th></tr></thead>
<tbody>${detailRows || '<tr><td colspan="7">لا توجد سجلات.</td></tr>'}</tbody>
</table>
</body>
</html>`);
      popup.document.close();
      popup.focus();
      window.setTimeout(() => popup.print(), 600);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إعداد تقرير سجل الاعتمادات');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDecision('');
    setAssigneeUserId('');
    setReviewerUserId('');
    setPeriodDays('90');
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1380px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-700" />
            سجل الاعتمادات والقرارات الإدارية
          </DialogTitle>
          <DialogDescription>
            أرشيف رقابي غير قابل للتعديل يوضح قرارات الاعتماد والإعادة وطلبات التعديل ومن قام بها وتكرار إعادة العمل لكل موظف.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="إجمالي المراجعات" value={data.summary.total} />
            <Metric label="اعتماد الإنجاز" value={data.summary.approved} success />
            <Metric label="إعادة للاستكمال" value={data.summary.returned} warning={data.summary.returned > 0} />
            <Metric label="طلب تعديل" value={data.summary.modificationRequested} warning={data.summary.modificationRequested > 0} />
            <Metric label="توجيهات فريدة" value={data.summary.uniqueDirectives} />
            <Metric
              label="متوسط زمن المراجعة"
              textValue={data.summary.averageReviewHours == null ? '—' : `${data.summary.averageReviewHours} س`}
            />
          </div>

          <Card className="shadow-none">
            <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1.5fr_.8fr_.9fr_.9fr_.8fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pe-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="بحث بالمعاملة، التوجيه، الموظف، المراجع أو الملاحظة..."
                />
              </div>
              <NativeSelect value={periodDays} onChange={(event) => setPeriodDays(event.target.value as typeof periodDays)}>
                <option value="30">آخر 30 يومًا</option>
                <option value="90">آخر 90 يومًا</option>
                <option value="365">آخر سنة</option>
                <option value="all">كل الفترات</option>
              </NativeSelect>
              <NativeSelect value={decision} onChange={(event) => setDecision(event.target.value)}>
                <option value="">كل القرارات</option>
                <option value="approved">اعتماد الإنجاز</option>
                <option value="return_for_completion">إعادة للاستكمال</option>
                <option value="request_modification">طلب تعديل</option>
              </NativeSelect>
              <NativeSelect value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)}>
                <option value="">جميع الموظفين</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </NativeSelect>
              <NativeSelect value={reviewerUserId} onChange={(event) => setReviewerUserId(event.target.value)}>
                <option value="">جميع المراجعين</option>
                {data.reviewers
                  .filter((reviewer) => reviewer.userId)
                  .map((reviewer) => (
                    <option key={reviewer.userId!} value={reviewer.userId!}>{reviewer.username}</option>
                  ))}
              </NativeSelect>
              <Button type="button" variant="outline" onClick={() => void load(1)} disabled={loading}>
                <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button type="button" variant="ghost" onClick={clearFilters}>مسح</Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void printReport()} disabled={exporting}>
              {exporting ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}
              طباعة / حفظ PDF
            </Button>
            <Badge variant="outline" className="px-3 py-2">
              <FileDown className="ml-1 h-3.5 w-3.5" />
              التقرير يطبق المرشحات الحالية
            </Badge>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.8fr_.8fr]">
            <Card className="min-w-0 shadow-none">
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">سجل قرارات الإدارة</CardTitle>
                  <Badge variant="outline">{data.total.toLocaleString('ar-SA')} قرار</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading && !data.items.length ? (
                  <div className="py-20 text-center text-sm text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    جارٍ تحميل السجل...
                  </div>
                ) : data.items.length === 0 ? (
                  <div className="py-20 text-center text-sm text-muted-foreground">لا توجد قرارات اعتماد مطابقة.</div>
                ) : (
                  <div className="max-h-[560px] divide-y overflow-y-auto">
                    {data.items.map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <DecisionBadge decision={item.decision} />
                              <Badge variant="outline">
                                {item.directive.directiveType === 'decision' ? 'قرار إداري' : 'توجيه إداري'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{formatDateTime(item.reviewedAt)}</span>
                            </div>
                            <h4 className="mt-2 text-sm font-black text-slate-900">{item.directive.title}</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              المعاملة <b className="text-foreground">{item.directive.transaction.transactionNumber}</b>
                              {' — '}
                              {item.directive.transaction.subject}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                              <span>الموظف: <b className="text-foreground">{item.directive.assigneeName}</b></span>
                              <span>المراجع: <b className="text-foreground">{item.reviewedByName || '—'}</b></span>
                              <span>رفع الإنجاز: <b className="text-foreground">{formatDateTime(item.submittedAt)}</b></span>
                              <span>الأدلة وقت المراجعة: <b className="text-foreground">{(item.evidenceSnapshot || []).length.toLocaleString('ar-SA')}</b></span>
                            </div>
                            {item.reviewNote && (
                              <div className="mt-3 rounded-lg border bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-700">
                                <b>ملاحظة الإدارة:</b> {item.reviewNote}
                              </div>
                            )}
                            {item.completionResponse && (
                              <details className="mt-2 rounded-lg border bg-white px-3 py-2 text-xs">
                                <summary className="cursor-pointer font-bold text-slate-700">نتيجة التنفيذ التي تمت مراجعتها</summary>
                                <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600">{item.completionResponse}</p>
                              </details>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                              onOpenTransaction(item.directive.transaction.id);
                            }}
                          >
                            فتح المعاملة
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t p-3">
                  <span className="text-xs text-muted-foreground">
                    صفحة {data.page.toLocaleString('ar-SA')} من {Math.max(1, data.totalPages).toLocaleString('ar-SA')}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={data.page <= 1 || loading}
                      onClick={() => void load(data.page - 1)}
                    >
                      السابق
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!data.totalPages || data.page >= data.totalPages || loading}
                      onClick={() => void load(data.page + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="shadow-none">
                <CardHeader className="border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <UserRound className="h-4 w-4" />
                    مؤشرات إعادة العمل حسب الموظف
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[320px] divide-y overflow-y-auto p-0">
                  {data.employees.length ? data.employees.map((employee) => (
                    <button
                      key={employee.userId}
                      type="button"
                      onClick={() => setAssigneeUserId(employee.userId)}
                      className="w-full px-4 py-3 text-right transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">{employee.username}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                            <span>معتمد: <b>{employee.approved.toLocaleString('ar-SA')}</b></span>
                            <span>إعادة: <b>{employee.returned.toLocaleString('ar-SA')}</b></span>
                            <span>تعديل: <b>{employee.modificationRequested.toLocaleString('ar-SA')}</b></span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={employee.reworkCount
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800'}
                        >
                          إعادة العمل: {employee.reworkCount.toLocaleString('ar-SA')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        نسبة الاعتماد: {employee.approvalRate == null ? '—' : `${employee.approvalRate}%`}
                      </p>
                    </button>
                  )) : (
                    <div className="py-12 text-center text-xs text-muted-foreground">لا توجد بيانات موظفين.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    نشاط المراجعين
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[260px] divide-y overflow-y-auto p-0">
                  {data.reviewers.length ? data.reviewers.map((reviewer, index) => (
                    <button
                      key={reviewer.userId || `${reviewer.username}-${index}`}
                      type="button"
                      disabled={!reviewer.userId}
                      onClick={() => reviewer.userId && setReviewerUserId(reviewer.userId)}
                      className="w-full px-4 py-3 text-right transition enabled:hover:bg-slate-50"
                    >
                      <p className="text-xs font-black">{reviewer.username}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        <span>مراجعات: <b>{reviewer.reviews.toLocaleString('ar-SA')}</b></span>
                        <span>اعتماد: <b>{reviewer.approved.toLocaleString('ar-SA')}</b></span>
                        <span>إعادة/تعديل: <b>{(reviewer.returned + reviewer.modificationRequested).toLocaleString('ar-SA')}</b></span>
                      </div>
                    </button>
                  )) : (
                    <div className="py-12 text-center text-xs text-muted-foreground">لا توجد بيانات مراجعين.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DecisionBadge = ({ decision }: { decision: string }) => {
  const config =
    decision === 'approved'
      ? { label: 'اعتماد الإنجاز', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: <CheckCircle2 className="ml-1 h-3 w-3" /> }
      : decision === 'return_for_completion'
        ? { label: 'إعادة للاستكمال', cls: 'border-amber-300 bg-amber-50 text-amber-800', icon: <RotateCcw className="ml-1 h-3 w-3" /> }
        : { label: 'طلب تعديل', cls: 'border-orange-300 bg-orange-50 text-orange-800', icon: <PencilLine className="ml-1 h-3 w-3" /> };

  return <Badge variant="outline" className={config.cls}>{config.icon}{config.label}</Badge>;
};

const Metric = ({
  label,
  value,
  textValue,
  success = false,
  warning = false,
}: {
  label: string;
  value?: number;
  textValue?: string;
  success?: boolean;
  warning?: boolean;
}) => (
  <div className={`rounded-xl border px-3 py-2.5 text-center ${
    success
      ? 'border-emerald-200 bg-emerald-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-white'
  }`}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-0.5 text-xl font-black ${
      success ? 'text-emerald-700' : warning ? 'text-amber-800' : 'text-slate-900'
    }`}>
      {textValue ?? (value || 0).toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionApprovalHistoryDialog;
