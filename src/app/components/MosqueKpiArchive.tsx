import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Equal,
  Eye,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { NativeSelect } from './ui/native-select';
import {
  mosqueApi,
  type MosqueCompletionKpiResult,
  type MosqueCompletionKpiSnapshot,
  type MosqueCompletionTaskAnalytics,
} from '../api/mosques';

type OfficialSnapshot = MosqueCompletionKpiSnapshot & {
  status: 'approved' | 'archived';
};

const kpiStatusLabel: Record<MosqueCompletionKpiResult['status'], string> = {
  excellent: 'ممتاز',
  good: 'جيد',
  needs_improvement: 'يحتاج تحسين',
  no_data: 'لا توجد بيانات كافية',
};

const kpiStatusClass: Record<MosqueCompletionKpiResult['status'], string> = {
  excellent: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  good: 'border-sky-200 bg-sky-50 text-sky-800',
  needs_improvement: 'border-rose-200 bg-rose-50 text-rose-800',
  no_data: 'border-slate-200 bg-slate-50 text-slate-600',
};

const snapshotStatusClass: Record<OfficialSnapshot['status'], string> = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  archived: 'border-violet-200 bg-violet-50 text-violet-800',
};

const snapshotStatusLabel: Record<OfficialSnapshot['status'], string> = {
  approved: 'معتمد',
  archived: 'مؤرشف',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const monthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const metricValue = (analytics: MosqueCompletionTaskAnalytics, key: 'score' | 'completion' | 'onTime' | 'days' | 'overdue') => {
  if (key === 'score') return analytics.unitKpi.score;
  if (key === 'completion') return analytics.summary.created ? analytics.summary.completionRate : null;
  if (key === 'onTime') return analytics.summary.onTimeRate;
  if (key === 'days') return analytics.summary.avgCompletionDays;
  return analytics.summary.overdueRate;
};

const deltaTone = (
  older: number | null,
  newer: number | null,
  direction: 'higher' | 'lower'
): 'better' | 'worse' | 'same' | 'unknown' => {
  if (older == null || newer == null) return 'unknown';
  if (older === newer) return 'same';
  const improved = direction === 'higher' ? newer > older : newer < older;
  return improved ? 'better' : 'worse';
};

const missingLabels: Record<string, string> = {
  identity: 'اسم الموقع',
  gender: 'فئة المصلى',
  building: 'ربط المبنى',
  location: 'بيانات الموقع',
  coordinates: 'الإحداثيات',
  area: 'المساحة',
  capacity: 'السعة',
  contact: 'التواصل / المسؤول',
  photos: 'الصور',
  documents: 'المستندات',
  women_verification: 'التحقق من مصلى النساء',
  women_details: 'تفاصيل مصلى النساء',
  visit: 'الزيارة الميدانية',
};

const taskPriorityLabel: Record<string, string> = {
  normal: 'عادية',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const taskStatusLabel: Record<string, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export const MosqueKpiArchive: React.FC = () => {
  const [rows, setRows] = useState<MosqueCompletionKpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OfficialSnapshot['status']>('all');
  const [compareBaseId, setCompareBaseId] = useState('');
  const [compareTargetId, setCompareTargetId] = useState('');
  const [detailSnapshot, setDetailSnapshot] = useState<OfficialSnapshot | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await mosqueApi.completionKpiSnapshots();
      setRows(data || []);
    } catch (error) {
      setRows([]);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل أرشيف مؤشرات الأداء');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const officialRows = useMemo<OfficialSnapshot[]>(
    () => rows
      .filter((item): item is OfficialSnapshot => item.status === 'approved' || item.status === 'archived')
      .sort((a, b) => b.month.localeCompare(a.month)),
    [rows]
  );

  useEffect(() => {
    if (officialRows.length >= 2) {
      setCompareTargetId((current) => current || officialRows[0].id);
      setCompareBaseId((current) => current || officialRows[1].id);
    } else if (officialRows.length === 1) {
      setCompareTargetId((current) => current || officialRows[0].id);
      setCompareBaseId('');
    }
  }, [officialRows]);

  const visibleRows = useMemo(
    () => officialRows.filter((row) => statusFilter === 'all' || row.status === statusFilter),
    [officialRows, statusFilter]
  );

  const baseSnapshot = officialRows.find((row) => row.id === compareBaseId) || null;
  const targetSnapshot = officialRows.find((row) => row.id === compareTargetId) || null;

  const comparisonMetrics = useMemo(() => {
    if (!baseSnapshot || !targetSnapshot || baseSnapshot.id === targetSnapshot.id) return [];
    const base = baseSnapshot.payload;
    const target = targetSnapshot.payload;
    return [
      {
        key: 'score',
        label: 'درجة KPI',
        older: metricValue(base, 'score'),
        newer: metricValue(target, 'score'),
        direction: 'higher' as const,
        suffix: '/100',
      },
      {
        key: 'completion',
        label: 'نسبة الإنجاز',
        older: metricValue(base, 'completion'),
        newer: metricValue(target, 'completion'),
        direction: 'higher' as const,
        suffix: '%',
      },
      {
        key: 'onTime',
        label: 'الالتزام بالموعد',
        older: metricValue(base, 'onTime'),
        newer: metricValue(target, 'onTime'),
        direction: 'higher' as const,
        suffix: '%',
      },
      {
        key: 'days',
        label: 'متوسط مدة الإنجاز',
        older: metricValue(base, 'days'),
        newer: metricValue(target, 'days'),
        direction: 'lower' as const,
        suffix: ' يوم',
      },
      {
        key: 'overdue',
        label: 'نسبة التأخير',
        older: metricValue(base, 'overdue'),
        newer: metricValue(target, 'overdue'),
        direction: 'lower' as const,
        suffix: '%',
      },
    ];
  }, [baseSnapshot, targetSnapshot]);

  const overallComparison = useMemo(() => {
    if (!comparisonMetrics.length) return null;
    const tones = comparisonMetrics.map((metric) => deltaTone(metric.older, metric.newer, metric.direction));
    const better = tones.filter((tone) => tone === 'better').length;
    const worse = tones.filter((tone) => tone === 'worse').length;
    if (better > worse) return { label: 'تحسن عام', tone: 'better' as const };
    if (worse > better) return { label: 'تراجع عام', tone: 'worse' as const };
    return { label: 'استقرار نسبي', tone: 'same' as const };
  }, [comparisonMetrics]);

  const exportOfficialReport = (snapshot: OfficialSnapshot) => {
    const analytics = snapshot.payload;
    const executive = [
      ['التقرير', 'التقرير الرسمي المعتمد لمؤشرات أداء استكمال بيانات المساجد والمصليات'],
      ['الشهر', analytics.month],
      ['حالة السجل', snapshotStatusLabel[snapshot.status]],
      ['معيار KPI', snapshot.standardCode],
      ['التقييم العام', kpiStatusLabel[analytics.unitKpi.status]],
      ['درجة KPI', analytics.unitKpi.score == null ? 'غير مقاس' : analytics.unitKpi.score + '/100'],
      ['تاريخ إنشاء اللقطة', formatDate(snapshot.generatedAt)],
      ['تاريخ الاعتماد', formatDate(snapshot.approvedAt)],
      ['اعتمد بواسطة', snapshot.approvedByName || '—'],
      ['تاريخ الأرشفة', formatDate(snapshot.archivedAt)],
      [],
      ['المؤشر', 'القيمة'],
      ['مهام أنشئت', analytics.summary.created],
      ['مهام منجزة', analytics.summary.completed],
      ['نسبة الإنجاز', analytics.summary.created ? analytics.summary.completionRate + '%' : 'غير مقاس'],
      ['الالتزام بالمواعيد', analytics.summary.onTimeRate == null ? 'غير مقاس' : analytics.summary.onTimeRate + '%'],
      ['متوسط مدة الإنجاز', analytics.summary.avgCompletionDays == null ? 'غير مقاس' : analytics.summary.avgCompletionDays + ' يوم'],
      ['المهام النشطة', analytics.summary.active],
      ['المهام المتأخرة', analytics.summary.overdue],
      ['نسبة التأخير', analytics.summary.overdueRate + '%'],
      ['المهام غير المسندة', analytics.summary.unassigned],
    ];

    const assignees = analytics.byAssignee.map((row, index) => ({
      'م': index + 1,
      'المسؤول': row.assigneeName,
      'التقييم': kpiStatusLabel[row.kpi.status],
      'درجة KPI': row.kpi.score ?? '',
      'نسبة الإنجاز': row.completionRate == null ? '' : row.completionRate + '%',
      'الالتزام بالمواعيد': row.onTimeRate == null ? '' : row.onTimeRate + '%',
      'متوسط الإنجاز بالأيام': row.avgCompletionHours == null ? '' : Number((row.avgCompletionHours / 24).toFixed(1)),
      'نشطة': row.active,
      'متأخرة': row.overdue,
      'نسبة التأخير': row.overdueRate + '%',
    }));

    const gaps = analytics.byMissingKey.map((row, index) => ({
      'م': index + 1,
      'نوع النقص': missingLabels[row.missingKey] || row.missingKey,
      'أنشئت خلال الشهر': row.created,
      'أنجزت خلال الشهر': row.completed,
      'نشطة': row.active,
      'متأخرة': row.overdue,
    }));

    const taskMap = new Map<string, any>();
    analytics.periodTasks.created.forEach((task) => taskMap.set(task.id, task));
    analytics.periodTasks.completed.forEach((task) => taskMap.set(task.id, task));
    const tasks = [...taskMap.values()].map((task, index) => ({
      'م': index + 1,
      'رقم المهمة': task.taskNumber,
      'الموقع': task.site?.name || '',
      'بند الاستكمال': missingLabels[task.missingKey] || task.missingKey,
      'الأولوية': taskPriorityLabel[task.priority] || task.priority,
      'الحالة': taskStatusLabel[task.status] || task.status,
      'المسؤول': task.assignedToName || 'غير مسندة',
      'تاريخ الإنشاء': formatDate(task.createdAt),
      'موعد الإنجاز': formatDate(task.dueDate),
      'تاريخ الإكمال': formatDate(task.completedAt),
      'ملاحظة الإنجاز': task.completionNote || '',
    }));

    const workbook = XLSX.utils.book_new();
    const executiveSheet = XLSX.utils.aoa_to_sheet(executive);
    const assigneeSheet = XLSX.utils.json_to_sheet(assignees);
    const gapSheet = XLSX.utils.json_to_sheet(gaps);
    const taskSheet = XLSX.utils.json_to_sheet(tasks);

    for (const sheet of [executiveSheet, assigneeSheet, gapSheet, taskSheet]) {
      (sheet as any)['!views'] = [{ RTL: true }];
    }

    (executiveSheet as any)['!cols'] = [{ wch: 38 }, { wch: 28 }];
    (assigneeSheet as any)['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
    (gapSheet as any)['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    (taskSheet as any)['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 34 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(workbook, executiveSheet, 'الملخص الرسمي');
    XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'تقييم المسؤولين');
    XLSX.utils.book_append_sheet(workbook, gapSheet, 'النواقص المتكررة');
    XLSX.utils.book_append_sheet(workbook, taskSheet, 'تفاصيل المهام');

    XLSX.writeFile(workbook, `IAU_Mosques_KPI_Official_${snapshot.month}.xlsx`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">السجل التاريخي الرسمي</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <Archive className="h-5 w-5" />
                أرشيف مؤشرات الأداء KPI
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                استعراض الأشهر المعتمدة والمؤرشفة، فتح التقرير الرسمي لأي شهر، ومقارنة الأداء التاريخي بين شهرين.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <NativeSelect className="h-10 min-w-[170px] bg-white" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | OfficialSnapshot['status'])}>
                <option value="all">جميع السجلات الرسمية</option>
                <option value="approved">المعتمدة</option>
                <option value="archived">المؤرشفة</option>
              </NativeSelect>
              <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={loading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ArchiveMetric label="إجمالي الأشهر الرسمية" value={officialRows.length} icon={Archive} />
            <ArchiveMetric label="معتمدة" value={officialRows.filter((row) => row.status === 'approved').length} icon={CheckCircle2} />
            <ArchiveMetric label="مؤرشفة" value={officialRows.filter((row) => row.status === 'archived').length} icon={FileSpreadsheet} />
            <ArchiveMetric label="آخر درجة KPI" value={officialRows[0]?.kpiScore ?? '—'} suffix={officialRows[0]?.kpiScore == null ? '' : '/100'} icon={BarChart3} />
          </div>

          <div className="rounded-[24px] border border-[#d9c9a5] bg-gradient-to-l from-[#fffaf0] via-white to-[#f2fbf8] p-4">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-lg font-black text-[#0b4a3f]">مقارنة شهرية مباشرة</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">اختر شهر الأساس ثم الشهر الأحدث لعرض التحسن أو التراجع في المؤشرات الرسمية المقفلة.</p>
              </div>
              {overallComparison && (
                <Badge
                  variant="outline"
                  className={overallComparison.tone === 'better'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : overallComparison.tone === 'worse'
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-white text-slate-700'}
                >
                  {overallComparison.label}
                </Badge>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">شهر الأساس</span>
                <NativeSelect className="h-11 bg-white" value={compareBaseId} onChange={(event) => setCompareBaseId(event.target.value)}>
                  <option value="">اختر الشهر</option>
                  {officialRows.map((row) => <option key={row.id} value={row.id}>{monthLabel(row.month)} — {snapshotStatusLabel[row.status]}</option>)}
                </NativeSelect>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">الشهر المقارن</span>
                <NativeSelect className="h-11 bg-white" value={compareTargetId} onChange={(event) => setCompareTargetId(event.target.value)}>
                  <option value="">اختر الشهر</option>
                  {officialRows.map((row) => <option key={row.id} value={row.id}>{monthLabel(row.month)} — {snapshotStatusLabel[row.status]}</option>)}
                </NativeSelect>
              </label>
            </div>

            {comparisonMetrics.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {comparisonMetrics.map((metric) => (
                  <ComparisonMetric
                    key={metric.key}
                    label={metric.label}
                    older={metric.older}
                    newer={metric.newer}
                    suffix={metric.suffix}
                    tone={deltaTone(metric.older, metric.newer, metric.direction)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[150px_125px_145px_125px_145px_145px_150px_minmax(180px,1fr)_180px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black text-slate-500 xl:grid">
              <span>الشهر</span>
              <span>الحالة</span>
              <span>التقييم</span>
              <span>الدرجة</span>
              <span>الإنجاز</span>
              <span>الالتزام</span>
              <span>التأخير</span>
              <span>الاعتماد</span>
              <span>الإجراء</span>
            </div>

            {loading ? (
              <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-500">
                <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
                جاري تحميل الأرشيف...
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="p-10 text-center text-sm font-bold text-slate-500">
                لا توجد نتائج KPI رسمية ضمن التصفية الحالية.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const analytics = row.payload;
                  return (
                    <div key={row.id} className="grid gap-3 px-4 py-4 xl:grid-cols-[150px_125px_145px_125px_145px_145px_150px_minmax(180px,1fr)_180px] xl:items-center">
                      <div>
                        <p className="font-black text-slate-800">{monthLabel(row.month)}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{row.month}</p>
                      </div>
                      <div><Badge variant="outline" className={snapshotStatusClass[row.status]}>{snapshotStatusLabel[row.status]}</Badge></div>
                      <div><Badge variant="outline" className={kpiStatusClass[analytics.unitKpi.status]}>{kpiStatusLabel[analytics.unitKpi.status]}</Badge></div>
                      <div className="text-lg font-black text-[#0b4a3f]">{analytics.unitKpi.score == null ? '—' : `${analytics.unitKpi.score}/100`}</div>
                      <div className="text-xs font-black text-slate-700">{analytics.summary.created ? `${analytics.summary.completionRate}%` : 'غير مقاس'}</div>
                      <div className="text-xs font-black text-slate-700">{analytics.summary.onTimeRate == null ? 'غير مقاس' : `${analytics.summary.onTimeRate}%`}</div>
                      <div className="text-xs font-black text-slate-700">{analytics.summary.overdueRate}%</div>
                      <div className="text-[11px] leading-5 text-slate-500">
                        <p className="font-black text-slate-700">{row.approvedByName || '—'}</p>
                        <p>{formatDate(row.approvedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => setDetailSnapshot(row)}>
                          <Eye className="ml-1 h-3.5 w-3.5" />
                          فتح
                        </Button>
                        <Button size="sm" variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800" onClick={() => exportOfficialReport(row)}>
                          <FileSpreadsheet className="ml-1 h-3.5 w-3.5" />
                          Excel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(detailSnapshot)} onOpenChange={(open) => !open && setDetailSnapshot(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[980px]" dir="rtl">
          {detailSnapshot && (
            <>
              <DialogHeader className="border-b border-slate-200 bg-[#fffdf8] p-5 text-right">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-black text-[#0b4a3f]">التقرير الرسمي — {monthLabel(detailSnapshot.month)}</DialogTitle>
                  <Badge variant="outline" className={snapshotStatusClass[detailSnapshot.status]}>{snapshotStatusLabel[detailSnapshot.status]}</Badge>
                </div>
                <DialogDescription>
                  لقطة أداء تاريخية ثابتة وفق معيار {detailSnapshot.standardCode}.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(92vh-145px)] space-y-5 overflow-y-auto p-4 md:p-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <DetailMetric label="درجة KPI" value={detailSnapshot.payload.unitKpi.score == null ? '—' : detailSnapshot.payload.unitKpi.score + '/100'} />
                  <DetailMetric label="نسبة الإنجاز" value={detailSnapshot.payload.summary.created ? detailSnapshot.payload.summary.completionRate + '%' : 'غير مقاس'} />
                  <DetailMetric label="الالتزام بالموعد" value={detailSnapshot.payload.summary.onTimeRate == null ? 'غير مقاس' : detailSnapshot.payload.summary.onTimeRate + '%'} />
                  <DetailMetric label="متوسط الإنجاز" value={detailSnapshot.payload.summary.avgCompletionDays == null ? 'غير مقاس' : detailSnapshot.payload.summary.avgCompletionDays + ' يوم'} />
                  <DetailMetric label="نسبة التأخير" value={detailSnapshot.payload.summary.overdueRate + '%'} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <AuditItem label="أنشئت اللقطة بواسطة" value={detailSnapshot.generatedByName || '—'} date={detailSnapshot.generatedAt} />
                    <AuditItem label="راجعت بواسطة" value={detailSnapshot.reviewedByName || '—'} date={detailSnapshot.reviewedAt} />
                    <AuditItem label="اعتمدت بواسطة" value={detailSnapshot.approvedByName || '—'} date={detailSnapshot.approvedAt} />
                    <AuditItem label="أرشفت بواسطة" value={detailSnapshot.archivedByName || '—'} date={detailSnapshot.archivedAt} />
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-800">أداء المسؤولين في اللقطة الرسمية</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-right text-xs">
                      <thead className="bg-white text-[10px] font-black text-slate-500">
                        <tr>
                          <th className="px-3 py-3">المسؤول</th>
                          <th className="px-3 py-3">التقييم</th>
                          <th className="px-3 py-3">الدرجة</th>
                          <th className="px-3 py-3">الإنجاز</th>
                          <th className="px-3 py-3">الالتزام</th>
                          <th className="px-3 py-3">متوسط الإنجاز</th>
                          <th className="px-3 py-3">التأخير</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailSnapshot.payload.byAssignee.map((item) => (
                          <tr key={item.assigneeUserId || item.assigneeName}>
                            <td className="px-3 py-3 font-black text-slate-800">{item.assigneeName}</td>
                            <td className="px-3 py-3"><Badge variant="outline" className={kpiStatusClass[item.kpi.status]}>{kpiStatusLabel[item.kpi.status]}</Badge></td>
                            <td className="px-3 py-3">{item.kpi.score == null ? '—' : item.kpi.score}</td>
                            <td className="px-3 py-3">{item.completionRate == null ? '—' : item.completionRate + '%'}</td>
                            <td className="px-3 py-3">{item.onTimeRate == null ? '—' : item.onTimeRate + '%'}</td>
                            <td className="px-3 py-3">{item.avgCompletionHours == null ? '—' : (item.avgCompletionHours / 24).toFixed(1) + ' يوم'}</td>
                            <td className="px-3 py-3">{item.overdueRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => exportOfficialReport(detailSnapshot)}>
                    <FileSpreadsheet className="ml-2 h-4 w-4" />
                    تنزيل التقرير الرسمي Excel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ArchiveMetric = ({
  label,
  value,
  suffix = '',
  icon: Icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f5f2] text-[#006b63]"><Icon className="h-4 w-4" /></span>
      <strong className="text-xl font-black text-[#0b4a3f]">{value}{suffix}</strong>
    </div>
    <p className="mt-2 text-[11px] font-bold text-slate-500">{label}</p>
  </div>
);

const ComparisonMetric = ({
  label,
  older,
  newer,
  suffix,
  tone,
}: {
  label: string;
  older: number | null;
  newer: number | null;
  suffix: string;
  tone: 'better' | 'worse' | 'same' | 'unknown';
}) => {
  const delta = older == null || newer == null ? null : Number((newer - older).toFixed(1));
  const Icon = tone === 'better' ? ArrowUpRight : tone === 'worse' ? ArrowDownRight : Equal;
  const toneClass = tone === 'better'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'worse'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <strong className="text-lg font-black">{newer == null ? '—' : newer + suffix}</strong>
        <span className="text-[10px] font-black">{delta == null ? 'غير مقاس' : delta === 0 ? '0' : (delta > 0 ? '+' : '') + delta}</span>
      </div>
      <p className="mt-1 text-[9px] opacity-70">الأساس: {older == null ? '—' : older + suffix}</p>
    </div>
  );
};

const DetailMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-[10px] font-black text-slate-500">{label}</p>
    <p className="mt-2 text-xl font-black text-[#0b4a3f]">{value}</p>
  </div>
);

const AuditItem = ({ label, value, date }: { label: string; value: string; date?: string | null }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <p className="text-[10px] font-black text-slate-400">{label}</p>
    <p className="mt-1 text-xs font-black text-slate-800">{value}</p>
    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(date)}</p>
  </div>
);

export default MosqueKpiArchive;
