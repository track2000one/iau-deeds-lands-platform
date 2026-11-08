import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, FileSpreadsheet, Filter, Printer, RotateCcw, Search, UserRound } from 'lucide-react';
import { apiJson } from '../../lib/http';
import type {
  AuditListResponse, AuditStats, AuditUserActivitySummary,
} from '../../types/audit';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

type ReportFilters = {
  action: string;
  module: string;
  status: string;
  search: string;
  from: string;
  to: string;
  sortBy: 'createdAt' | 'username' | 'action' | 'module' | 'status';
  sortDir: 'asc' | 'desc';
};

type Props = {
  user: AuditUserActivitySummary | null;
  actions: string[];
  modules: string[];
  labels: { actions: Record<string, string>; modules: Record<string, string> };
  initialFilters: ReportFilters;
  busy: boolean;
  onClose: () => void;
  onPrint: (query: string) => void;
  onExport: (query: string, format: 'xlsx' | 'csv') => void;
};

const DEFAULT_FILTERS: ReportFilters = {
  action: '', module: '', status: '', search: '', from: '', to: '',
  sortBy: 'createdAt', sortDir: 'desc',
};

const timeInRiyadh = (value: string) =>
  new Date(value).toLocaleString('ar-SA-u-nu-latn', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });

export const AuditUserReportDialog: React.FC<Props> = ({
  user, actions, modules, labels, initialFilters, busy, onClose, onPrint, onExport,
}) => {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditListResponse | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setFilters({ ...initialFilters });
    setPage(1);
    setItems(null);
    setStats(null);
    setError('');
    // Initialize only when opening a different user's dedicated report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  const badDates = Boolean(filters.from && filters.to && filters.from > filters.to);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      userId: user?.userId || '',
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      page: String(page),
      limit: '30',
    });
    if (filters.action) params.set('action', filters.action);
    if (filters.module) params.set('module', filters.module);
    if (filters.status) params.set('status', filters.status);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return params.toString();
  }, [user?.userId, filters, page]);

  useEffect(() => {
    if (!user || badDates) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const [list, summary] = await Promise.all([
          apiJson<AuditListResponse>(`/api/audit?${query}`, { signal: controller.signal }),
          apiJson<AuditStats>(`/api/audit/stats?${query}`, { signal: controller.signal }),
        ]);
        if (!cancelled) {
          setItems(list);
          setStats(summary);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر جلب سجل المستخدم');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [user?.userId, query, badDates]);

  const update = (next: Partial<ReportFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const ready = Boolean(user && !badDates && !loading && items && items.total > 0 && !error);

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        dir="rtl"
        className="flex h-[min(92dvh,900px)] w-[calc(100vw-1rem)] max-w-[min(97vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[min(97vw,1200px)]"
      >
        <DialogHeader className="shrink-0 border-b bg-background px-5 py-4 text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5" />
            التقرير الرقابي التفصيلي: {user?.username || 'المستخدم'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {user?.userEmail || 'دون بريد ظاهر'} — تصفية وفرز مستقلان لهذا المستخدم قبل الطباعة أو التصدير.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-gutter:stable]">
          <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <Filter className="h-4 w-4" /> تصفية تقرير الموظف
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }}
              >
                <RotateCcw className="ml-1 h-4 w-4" /> مسح تصفية هذا المستخدم
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.search}
                  onChange={(event) => update({ search: event.target.value })}
                  placeholder="بحث في سجلات وأوصاف عمليات المستخدم"
                  aria-label="بحث في عمليات المستخدم"
                  className="pr-9"
                />
              </div>
              <NativeSelect
                value={filters.action}
                aria-label="تصفية نوع العملية"
                onChange={(event) => update({ action: event.target.value })}
              >
                <option value="">جميع أنواع العمليات</option>
                {actions.map((value) => <option key={value} value={value}>{labels.actions[value] || value}</option>)}
              </NativeSelect>
              <NativeSelect
                value={filters.module}
                aria-label="تصفية قسم المنصة"
                onChange={(event) => update({ module: event.target.value })}
              >
                <option value="">جميع الأقسام</option>
                {modules.map((value) => <option key={value} value={value}>{labels.modules[value] || value}</option>)}
              </NativeSelect>
              <NativeSelect
                value={filters.status}
                aria-label="تصفية حالة العملية"
                onChange={(event) => update({ status: event.target.value })}
              >
                <option value="">جميع الحالات</option>
                <option value="success">ناجحة</option>
                <option value="failed">فاشلة</option>
              </NativeSelect>
              <NativeSelect
                value={filters.sortBy}
                aria-label="حقل ترتيب التقرير"
                onChange={(event) => update({ sortBy: event.target.value as ReportFilters['sortBy'] })}
              >
                <option value="createdAt">الترتيب حسب التاريخ والوقت</option>
                <option value="action">الترتيب حسب العملية</option>
                <option value="module">الترتيب حسب القسم</option>
                <option value="status">الترتيب حسب الحالة</option>
              </NativeSelect>
              <NativeSelect
                value={filters.sortDir}
                aria-label="اتجاه ترتيب التقرير"
                onChange={(event) => update({ sortDir: event.target.value as ReportFilters['sortDir'] })}
              >
                <option value="desc">تنازلي</option>
                <option value="asc">تصاعدي</option>
              </NativeSelect>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.from}
                  aria-label="من تاريخ"
                  onChange={(event) => update({ from: event.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.to}
                  aria-label="إلى تاريخ"
                  onChange={(event) => update({ to: event.target.value })}
                />
              </div>
            </div>
            {badDates && (
              <p className="text-sm font-semibold text-destructive">
                تاريخ البداية يجب ألا يكون بعد تاريخ النهاية.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              تشمل النتائج جميع صفحات سجل الموظف ضمن التصفية المحددة. الوقت حسب توقيت الرياض.
            </p>
          </section>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {([
              ['إجمالي العمليات', stats?.total],
              ['إضافات', stats?.create],
              ['تعديلات', stats?.update],
              ['حذف', stats?.delete],
              ['عمليات فاشلة', stats?.failed],
              ['عمليات اليوم', stats?.today],
            ] as Array<[string, number | undefined]>).map(([title, value]) => (
              <Card key={title} className="border-muted">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{title}</p>
                  <p className="mt-2 text-xl font-bold tabular-nums">{loading ? '…' : value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">معاينة عمليات المستخدم ({items?.total ?? 0})</h3>
              <span className="text-xs text-muted-foreground">
                المعاينة: 30 سجلًا في الصفحة، والطباعة تشمل كامل نتائج التصفية حتى 3000 سجل.
              </span>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>العملية</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>السجل</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center">جارٍ تحميل السجل...</TableCell></TableRow>
                  ) : !items?.items.length ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center">لا توجد عمليات مطابقة لمعايير التصفية.</TableCell></TableRow>
                  ) : items.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-xs">{timeInRiyadh(item.createdAt)}</TableCell>
                      <TableCell>{labels.actions[item.action] || item.action}</TableCell>
                      <TableCell>{labels.modules[item.module] || item.module}</TableCell>
                      <TableCell className="max-w-64 break-words">{item.entityLabel || item.entityId || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'success' ? 'secondary' : 'destructive'}>
                          {item.status === 'success' ? 'ناجحة' : 'فاشلة'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                الصفحة {items?.page || 1} من {items?.totalPages || 1}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}>السابق</Button>
                <Button type="button" size="sm" variant="outline"
                  disabled={loading || page >= (items?.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}>التالي</Button>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 flex-wrap border-t bg-background px-5 py-3 sm:justify-start">
          <Button
            type="button"
            disabled={!ready || busy}
            onClick={() => onPrint(query)}
          >
            <Printer className="ml-2 h-4 w-4" />
            طباعة / PDF للمستخدم
          </Button>
          <Button type="button" variant="outline" disabled={!ready || busy}
            onClick={() => onExport(query, 'xlsx')}>
            <FileSpreadsheet className="ml-2 h-4 w-4" /> Excel للمستخدم
          </Button>
          <Button type="button" variant="outline" disabled={!ready || busy}
            onClick={() => onExport(query, 'csv')}>
            <Download className="ml-2 h-4 w-4" /> CSV للمستخدم
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
