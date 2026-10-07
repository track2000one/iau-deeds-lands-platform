import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { NativeSelect } from './ui/native-select';
import {
  mosqueApi,
  type MosqueCompletionKpiResult,
  type MosqueCompletionKpiSnapshot,
} from '../api/mosques';

type OfficialSnapshot = MosqueCompletionKpiSnapshot & {
  status: 'approved' | 'archived';
};

type AssigneeAnnualRow = {
  key: string;
  name: string;
  months: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  standardDeviation: number | null;
  stabilityScore: number | null;
  avgCompletionRate: number | null;
  avgOnTimeRate: number | null;
  avgCompletionDays: number | null;
  avgOverdueRate: number | null;
};

type GapAnnualRow = {
  key: string;
  label: string;
  created: number;
  completed: number;
  active: number;
  overdue: number;
};

const kpiStatusLabel: Record<MosqueCompletionKpiResult['status'], string> = {
  excellent: 'ممتاز',
  good: 'جيد',
  needs_improvement: 'يحتاج تحسين',
  no_data: 'لا توجد بيانات كافية',
};

const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

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

const currentRiyadhYear = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'year')?.value || new Date().getFullYear());
};

const monthNumber = (month: string) => Number(month.split('-')[1] || 0);
const monthYear = (month: string) => Number(month.split('-')[0] || 0);
const monthDisplay = (month: string) => {
  const number = monthNumber(month);
  return number >= 1 && number <= 12 ? monthNames[number - 1] : month;
};

const average = (values: number[]) => values.length
  ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  : null;

const weightedAverage = (rows: Array<{ value: number | null; weight: number }>) => {
  const eligible = rows.filter((row) => row.value != null && row.weight > 0);
  const weight = eligible.reduce((sum, row) => sum + row.weight, 0);
  if (!weight) return null;
  return Math.round((eligible.reduce((sum, row) => sum + Number(row.value) * row.weight, 0) / weight) * 10) / 10;
};

const standardDeviation = (values: number[]) => {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
};

const percentText = (value: number | null) => value == null ? '—' : `${value}%`;

export const MosqueKpiAnnualDashboard: React.FC = () => {
  const [snapshots, setSnapshots] = useState<MosqueCompletionKpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentRiyadhYear());

  const load = async () => {
    setLoading(true);
    try {
      const rows = await mosqueApi.completionKpiSnapshots();
      setSnapshots(rows || []);
    } catch (error) {
      setSnapshots([]);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات التحليل السنوي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const officialSnapshots = useMemo<OfficialSnapshot[]>(
    () => snapshots
      .filter((row): row is OfficialSnapshot => row.status === 'approved' || row.status === 'archived')
      .sort((a, b) => a.month.localeCompare(b.month)),
    [snapshots]
  );

  const years = useMemo(() => {
    const available = Array.from(new Set(officialSnapshots.map((row) => monthYear(row.month)).filter(Boolean))).sort((a, b) => b - a);
    if (!available.includes(currentRiyadhYear())) available.unshift(currentRiyadhYear());
    return available;
  }, [officialSnapshots]);

  useEffect(() => {
    if (!years.includes(selectedYear)) setSelectedYear(years[0] || currentRiyadhYear());
  }, [years, selectedYear]);

  const yearRows = useMemo(
    () => officialSnapshots.filter((row) => monthYear(row.month) === selectedYear),
    [officialSnapshots, selectedYear]
  );

  const annualSummary = useMemo(() => {
    const scored = yearRows.filter((row) => row.payload.unitKpi.score != null);
    const scores = scored.map((row) => Number(row.payload.unitKpi.score));
    const best = [...scored].sort((a, b) => Number(b.payload.unitKpi.score) - Number(a.payload.unitKpi.score))[0] || null;
    const worst = [...scored].sort((a, b) => Number(a.payload.unitKpi.score) - Number(b.payload.unitKpi.score))[0] || null;
    const first = scored[0] || null;
    const last = scored[scored.length - 1] || null;
    const improvement = first && last && first.id !== last.id
      ? Number(last.payload.unitKpi.score) - Number(first.payload.unitKpi.score)
      : null;

    const completionRate = weightedAverage(yearRows.map((row) => ({
      value: row.payload.summary.created ? row.payload.summary.completionRate : null,
      weight: row.payload.summary.created,
    })));
    const onTimeRate = weightedAverage(yearRows.map((row) => ({
      value: row.payload.summary.onTimeRate,
      weight: row.payload.summary.completedWithDueDate,
    })));
    const avgCompletionDays = weightedAverage(yearRows.map((row) => ({
      value: row.payload.summary.avgCompletionDays,
      weight: row.payload.summary.completed,
    })));
    const avgMonthlyOverdueRate = average(yearRows.map((row) => row.payload.summary.overdueRate));

    return {
      officialMonths: yearRows.length,
      avgScore: average(scores),
      best,
      worst,
      first,
      last,
      improvement,
      completionRate,
      onTimeRate,
      avgCompletionDays,
      avgMonthlyOverdueRate,
      totalCreated: yearRows.reduce((sum, row) => sum + row.payload.summary.created, 0),
      totalCompleted: yearRows.reduce((sum, row) => sum + row.payload.summary.completed, 0),
      totalOnTime: yearRows.reduce((sum, row) => sum + row.payload.summary.onTimeCompleted, 0),
      totalDue: yearRows.reduce((sum, row) => sum + row.payload.summary.completedWithDueDate, 0),
    };
  }, [yearRows]);

  const assigneeRows = useMemo<AssigneeAnnualRow[]>(() => {
    const map = new Map<string, {
      name: string;
      scores: number[];
      completionRates: number[];
      onTimeRates: number[];
      completionDays: number[];
      overdueRates: number[];
      monthKeys: Set<string>;
    }>();

    for (const snapshot of yearRows) {
      for (const row of snapshot.payload.byAssignee) {
        if (row.assigneeName === 'غير مسندة') continue;
        const key = row.assigneeUserId || `name:${row.assigneeName}`;
        const current = map.get(key) || {
          name: row.assigneeName,
          scores: [],
          completionRates: [],
          onTimeRates: [],
          completionDays: [],
          overdueRates: [],
          monthKeys: new Set<string>(),
        };
        current.monthKeys.add(snapshot.month);
        if (row.kpi.score != null) current.scores.push(row.kpi.score);
        if (row.completionRate != null) current.completionRates.push(row.completionRate);
        if (row.onTimeRate != null) current.onTimeRates.push(row.onTimeRate);
        if (row.avgCompletionHours != null) current.completionDays.push(row.avgCompletionHours / 24);
        current.overdueRates.push(row.overdueRate);
        map.set(key, current);
      }
    }

    return [...map.entries()].map(([key, row]) => {
      const deviation = standardDeviation(row.scores);
      const avgScore = average(row.scores);
      return {
        key,
        name: row.name,
        months: row.monthKeys.size,
        avgScore,
        minScore: row.scores.length ? Math.min(...row.scores) : null,
        maxScore: row.scores.length ? Math.max(...row.scores) : null,
        standardDeviation: deviation,
        stabilityScore: deviation == null ? null : Math.max(0, Math.round((100 - deviation) * 10) / 10),
        avgCompletionRate: average(row.completionRates),
        avgOnTimeRate: average(row.onTimeRates),
        avgCompletionDays: average(row.completionDays),
        avgOverdueRate: average(row.overdueRates),
      };
    }).sort((a, b) => {
      const aStable = a.stabilityScore ?? -1;
      const bStable = b.stabilityScore ?? -1;
      if (a.months >= 2 && b.months < 2) return -1;
      if (b.months >= 2 && a.months < 2) return 1;
      if (bStable !== aStable) return bStable - aStable;
      return (b.avgScore ?? -1) - (a.avgScore ?? -1);
    });
  }, [yearRows]);

  const gapRows = useMemo<GapAnnualRow[]>(() => {
    const map = new Map<string, GapAnnualRow>();
    for (const snapshot of yearRows) {
      for (const row of snapshot.payload.byMissingKey) {
        const current = map.get(row.missingKey) || {
          key: row.missingKey,
          label: missingLabels[row.missingKey] || row.missingKey,
          created: 0,
          completed: 0,
          active: 0,
          overdue: 0,
        };
        current.created += row.created;
        current.completed += row.completed;
        current.active += row.active;
        current.overdue += row.overdue;
        map.set(row.missingKey, current);
      }
    }
    return [...map.values()].sort((a, b) => b.created - a.created || b.completed - a.completed);
  }, [yearRows]);

  const monthSeries = useMemo(() => {
    const byMonth = new Map(yearRows.map((row) => [monthNumber(row.month), row]));
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const snapshot = byMonth.get(month) || null;
      return {
        month,
        label: monthNames[index],
        snapshot,
        score: snapshot?.payload.unitKpi.score ?? null,
        completion: snapshot?.payload.summary.created ? snapshot.payload.summary.completionRate : null,
        onTime: snapshot?.payload.summary.onTimeRate ?? null,
      };
    });
  }, [yearRows]);

  const exportAnnualReport = () => {
    if (!yearRows.length) {
      toast.error('لا توجد أشهر رسمية معتمدة لهذه السنة');
      return;
    }

    const executive = [
      ['التقرير', 'التقرير السنوي التنفيذي لمؤشرات أداء استكمال بيانات المساجد والمصليات'],
      ['السنة', selectedYear],
      ['عدد الأشهر الرسمية', annualSummary.officialMonths],
      ['متوسط KPI السنوي', annualSummary.avgScore == null ? 'غير مقاس' : annualSummary.avgScore + '/100'],
      ['أفضل شهر', annualSummary.best ? `${monthDisplay(annualSummary.best.month)} — ${annualSummary.best.payload.unitKpi.score}/100` : '—'],
      ['أقل شهر', annualSummary.worst ? `${monthDisplay(annualSummary.worst.month)} — ${annualSummary.worst.payload.unitKpi.score}/100` : '—'],
      ['التغير من أول شهر رسمي إلى آخر شهر', annualSummary.improvement == null ? 'غير مقاس' : (annualSummary.improvement > 0 ? '+' : '') + annualSummary.improvement + ' نقطة'],
      [],
      ['المؤشر السنوي', 'القيمة'],
      ['إجمالي المهام المنشأة خلال الأشهر الرسمية', annualSummary.totalCreated],
      ['إجمالي المهام المنجزة خلال الأشهر الرسمية', annualSummary.totalCompleted],
      ['متوسط نسبة الإنجاز الموزون', percentText(annualSummary.completionRate)],
      ['نسبة الالتزام بالمواعيد الموزونة', percentText(annualSummary.onTimeRate)],
      ['متوسط مدة الإنجاز الموزون', annualSummary.avgCompletionDays == null ? 'غير مقاس' : annualSummary.avgCompletionDays + ' يوم'],
      ['متوسط نسبة التأخير الشهرية', percentText(annualSummary.avgMonthlyOverdueRate)],
      ['إجمالي المنجز ضمن الموعد', annualSummary.totalOnTime],
      ['إجمالي المهام المنجزة ذات موعد', annualSummary.totalDue],
    ];

    const months = yearRows.map((row) => ({
      'الشهر': monthDisplay(row.month),
      'الشهر الرقمي': row.month,
      'الحالة': row.status === 'approved' ? 'معتمد' : 'مؤرشف',
      'درجة KPI': row.payload.unitKpi.score ?? '',
      'التقييم': kpiStatusLabel[row.payload.unitKpi.status],
      'مهام أنشئت': row.payload.summary.created,
      'مهام منجزة': row.payload.summary.completed,
      'نسبة الإنجاز': row.payload.summary.created ? row.payload.summary.completionRate + '%' : '',
      'الالتزام بالمواعيد': row.payload.summary.onTimeRate == null ? '' : row.payload.summary.onTimeRate + '%',
      'متوسط الإنجاز بالأيام': row.payload.summary.avgCompletionDays ?? '',
      'نسبة التأخير': row.payload.summary.overdueRate + '%',
      'اعتمد بواسطة': row.approvedByName || '',
      'تاريخ الاعتماد': row.approvedAt ? new Date(row.approvedAt).toLocaleDateString('ar-SA-u-ca-gregory') : '',
    }));

    const assignees = assigneeRows.map((row, index) => ({
      'م': index + 1,
      'المسؤول': row.name,
      'عدد الأشهر': row.months,
      'متوسط KPI': row.avgScore ?? '',
      'أدنى درجة': row.minScore ?? '',
      'أعلى درجة': row.maxScore ?? '',
      'الانحراف المعياري': row.standardDeviation ?? '',
      'مؤشر الاستقرار': row.stabilityScore ?? '',
      'متوسط الإنجاز': row.avgCompletionRate == null ? '' : row.avgCompletionRate + '%',
      'متوسط الالتزام': row.avgOnTimeRate == null ? '' : row.avgOnTimeRate + '%',
      'متوسط مدة الإنجاز': row.avgCompletionDays == null ? '' : row.avgCompletionDays,
      'متوسط التأخير': row.avgOverdueRate == null ? '' : row.avgOverdueRate + '%',
    }));

    const gaps = gapRows.map((row, index) => ({
      'م': index + 1,
      'نوع النقص': row.label,
      'إجمالي المهام المنشأة': row.created,
      'إجمالي المهام المنجزة': row.completed,
      'مجموع الرصيد النشط عبر اللقطات': row.active,
      'مجموع الرصيد المتأخر عبر اللقطات': row.overdue,
    }));

    const workbook = XLSX.utils.book_new();
    const executiveSheet = XLSX.utils.aoa_to_sheet(executive);
    const monthsSheet = XLSX.utils.json_to_sheet(months);
    const assigneeSheet = XLSX.utils.json_to_sheet(assignees);
    const gapsSheet = XLSX.utils.json_to_sheet(gaps);

    for (const sheet of [executiveSheet, monthsSheet, assigneeSheet, gapsSheet]) {
      (sheet as any)['!views'] = [{ RTL: true }];
    }

    (executiveSheet as any)['!cols'] = [{ wch: 46 }, { wch: 32 }];
    (monthsSheet as any)['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 18 }];
    (assigneeSheet as any)['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
    (gapsSheet as any)['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 28 }];

    XLSX.utils.book_append_sheet(workbook, executiveSheet, 'الملخص التنفيذي');
    XLSX.utils.book_append_sheet(workbook, monthsSheet, 'الأداء الشهري');
    XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'استقرار المسؤولين');
    XLSX.utils.book_append_sheet(workbook, gapsSheet, 'النواقص السنوية');

    XLSX.writeFile(workbook, `IAU_Mosques_KPI_Annual_${selectedYear}.xlsx`);
  };

  const maxScore = Math.max(...monthSeries.map((row) => row.score || 0), 1);

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">التحليل السنوي للإدارة</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <BarChart3 className="h-5 w-5" />
                الاتجاهات السنوية لمؤشرات KPI
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                تحليل الأشهر الرسمية المعتمدة والمقفلة فقط، وقياس التحسن السنوي واستقرار أداء المسؤولين وأكثر أنواع النواقص تكرارًا.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <NativeSelect className="h-10 min-w-[145px] bg-white" value={String(selectedYear)} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
              <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={loading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث
              </Button>
              <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={exportAnnualReport} disabled={!yearRows.length || loading}>
                <FileSpreadsheet className="ml-2 h-4 w-4" />
                التقرير السنوي
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm font-bold text-slate-500">
              <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
              جاري إعداد التحليل السنوي...
            </div>
          ) : yearRows.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-amber-700" />
              <p className="mt-3 text-sm font-black text-amber-900">لا توجد نتائج KPI معتمدة أو مؤرشفة لسنة {selectedYear}.</p>
              <p className="mt-1 text-xs leading-6 text-amber-800">يظهر التحليل السنوي بعد اعتماد نتيجة شهر واحد على الأقل من مركز اكتمال البيانات.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <SummaryMetric label="الأشهر الرسمية" value={annualSummary.officialMonths} icon={CalendarDays} />
                <SummaryMetric label="متوسط KPI السنوي" value={annualSummary.avgScore ?? '—'} suffix={annualSummary.avgScore == null ? '' : '/100'} icon={Gauge} />
                <SummaryMetric label="أفضل شهر" value={annualSummary.best ? monthDisplay(annualSummary.best.month) : '—'} subValue={annualSummary.best?.payload.unitKpi.score == null ? '' : annualSummary.best.payload.unitKpi.score + '/100'} icon={Award} />
                <SummaryMetric label="أقل شهر" value={annualSummary.worst ? monthDisplay(annualSummary.worst.month) : '—'} subValue={annualSummary.worst?.payload.unitKpi.score == null ? '' : annualSummary.worst.payload.unitKpi.score + '/100'} icon={BarChart3} />
                <SummaryMetric
                  label="التغير من أول شهر إلى آخر شهر"
                  value={annualSummary.improvement == null ? '—' : (annualSummary.improvement > 0 ? '+' : '') + annualSummary.improvement}
                  suffix={annualSummary.improvement == null ? '' : ' نقطة'}
                  icon={annualSummary.improvement != null && annualSummary.improvement < 0 ? TrendingDown : TrendingUp}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <AnnualTargetCard label="متوسط الإنجاز الموزون" value={percentText(annualSummary.completionRate)} target="المستهدف الشهري 90% فأعلى" met={annualSummary.completionRate == null ? null : annualSummary.completionRate >= 90} />
                <AnnualTargetCard label="الالتزام بالمواعيد الموزون" value={percentText(annualSummary.onTimeRate)} target="المستهدف الشهري 90% فأعلى" met={annualSummary.onTimeRate == null ? null : annualSummary.onTimeRate >= 90} />
                <AnnualTargetCard label="متوسط مدة الإنجاز الموزون" value={annualSummary.avgCompletionDays == null ? '—' : annualSummary.avgCompletionDays + ' يوم'} target="المستهدف 5 أيام فأقل" met={annualSummary.avgCompletionDays == null ? null : annualSummary.avgCompletionDays <= 5} />
                <AnnualTargetCard label="متوسط نسبة التأخير الشهرية" value={percentText(annualSummary.avgMonthlyOverdueRate)} target="المستهدف 10% فأقل" met={annualSummary.avgMonthlyOverdueRate == null ? null : annualSummary.avgMonthlyOverdueRate <= 10} />
              </div>

              <div className="rounded-[24px] border border-[#d9c9a5] bg-gradient-to-l from-[#fffaf0] via-white to-[#f2fbf8] p-4">
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-black text-[#0b4a3f]">منحنى KPI خلال السنة</p>
                    <p className="mt-1 text-xs text-slate-500">يعرض فقط النتائج الرسمية المقفلة؛ الأشهر غير المعتمدة تبقى فارغة.</p>
                  </div>
                  <Badge variant="outline" className="w-fit border-[#d6b46a] bg-white text-[#0b4a3f]">{selectedYear}</Badge>
                </div>

                <div className="grid grid-cols-6 gap-2 xl:grid-cols-12">
                  {monthSeries.map((row) => {
                    const height = row.score == null ? 0 : Math.max(8, Math.round((row.score / maxScore) * 100));
                    return (
                      <div key={row.month} className="rounded-2xl border border-slate-200 bg-white p-2 text-center">
                        <div className="flex h-28 items-end justify-center">
                          <div className="relative h-full w-8 overflow-hidden rounded-t-xl bg-slate-100">
                            {row.score != null && <div className="absolute bottom-0 left-0 right-0 rounded-t-xl bg-[#0b4a3f]" style={{ height: `${height}%` }} />}
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] font-black text-slate-600">{row.label.slice(0, 4)}</p>
                        <p className="mt-1 text-xs font-black text-[#0b4a3f]">{row.score == null ? '—' : row.score}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <Users className="h-4 w-4" />
                      استقرار أداء المسؤولين
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">الأولوية للمسؤولين الذين لديهم نتيجتان رسميتان فأكثر، ثم الأقل تذبذبًا والأعلى متوسطًا.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-right text-xs">
                      <thead className="bg-white text-[10px] font-black text-slate-500">
                        <tr>
                          <th className="px-3 py-3">المسؤول</th>
                          <th className="px-3 py-3">الأشهر</th>
                          <th className="px-3 py-3">متوسط KPI</th>
                          <th className="px-3 py-3">أدنى / أعلى</th>
                          <th className="px-3 py-3">الاستقرار</th>
                          <th className="px-3 py-3">الإنجاز</th>
                          <th className="px-3 py-3">الالتزام</th>
                          <th className="px-3 py-3">مدة الإنجاز</th>
                          <th className="px-3 py-3">التأخير</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assigneeRows.length ? assigneeRows.slice(0, 12).map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-3 font-black text-slate-800">{row.name}</td>
                            <td className="px-3 py-3">{row.months}</td>
                            <td className="px-3 py-3 font-black text-[#0b4a3f]">{row.avgScore == null ? '—' : row.avgScore}</td>
                            <td className="px-3 py-3">{row.minScore == null ? '—' : `${row.minScore} / ${row.maxScore}`}</td>
                            <td className="px-3 py-3">
                              {row.stabilityScore == null
                                ? <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">عينة غير كافية</Badge>
                                : <Badge variant="outline" className={row.stabilityScore >= 90 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : row.stabilityScore >= 80 ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{row.stabilityScore}/100</Badge>}
                            </td>
                            <td className="px-3 py-3">{percentText(row.avgCompletionRate)}</td>
                            <td className="px-3 py-3">{percentText(row.avgOnTimeRate)}</td>
                            <td className="px-3 py-3">{row.avgCompletionDays == null ? '—' : row.avgCompletionDays + ' يوم'}</td>
                            <td className="px-3 py-3">{percentText(row.avgOverdueRate)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={9} className="px-3 py-8 text-center text-xs font-bold text-slate-400">لا توجد بيانات مسؤولين كافية لهذه السنة.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
                  <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                    <ShieldCheck className="h-4 w-4" />
                    أكثر أنواع النواقص تكرارًا سنويًا
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-500">مجموع المهام المنشأة لكل نوع نقص خلال الأشهر الرسمية.</p>
                  <div className="mt-4 space-y-3">
                    {gapRows.slice(0, 8).length ? gapRows.slice(0, 8).map((row) => {
                      const max = Math.max(...gapRows.map((item) => item.created), 1);
                      const width = Math.max(4, Math.round((row.created / max) * 100));
                      return (
                        <div key={row.key}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                            <span className="font-bold text-slate-700">{row.label}</span>
                            <strong className="text-[#0b4a3f]">{row.created}</strong>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#0b4a3f]" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    }) : <p className="py-8 text-center text-xs font-bold text-slate-400">لا توجد نواقص مسجلة في الأشهر الرسمية.</p>}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-800">التفصيل الشهري الرسمي</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-right text-xs">
                    <thead className="bg-white text-[10px] font-black text-slate-500">
                      <tr>
                        <th className="px-3 py-3">الشهر</th>
                        <th className="px-3 py-3">الحالة</th>
                        <th className="px-3 py-3">KPI</th>
                        <th className="px-3 py-3">التقييم</th>
                        <th className="px-3 py-3">أنشئت</th>
                        <th className="px-3 py-3">أنجزت</th>
                        <th className="px-3 py-3">الإنجاز</th>
                        <th className="px-3 py-3">الالتزام</th>
                        <th className="px-3 py-3">مدة الإنجاز</th>
                        <th className="px-3 py-3">التأخير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-3 font-black text-slate-800">{monthDisplay(row.month)}</td>
                          <td className="px-3 py-3"><Badge variant="outline" className={row.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-violet-200 bg-violet-50 text-violet-800'}>{row.status === 'approved' ? 'معتمد' : 'مؤرشف'}</Badge></td>
                          <td className="px-3 py-3 font-black text-[#0b4a3f]">{row.payload.unitKpi.score == null ? '—' : row.payload.unitKpi.score + '/100'}</td>
                          <td className="px-3 py-3">{kpiStatusLabel[row.payload.unitKpi.status]}</td>
                          <td className="px-3 py-3">{row.payload.summary.created}</td>
                          <td className="px-3 py-3">{row.payload.summary.completed}</td>
                          <td className="px-3 py-3">{row.payload.summary.created ? row.payload.summary.completionRate + '%' : '—'}</td>
                          <td className="px-3 py-3">{row.payload.summary.onTimeRate == null ? '—' : row.payload.summary.onTimeRate + '%'}</td>
                          <td className="px-3 py-3">{row.payload.summary.avgCompletionDays == null ? '—' : row.payload.summary.avgCompletionDays + ' يوم'}</td>
                          <td className="px-3 py-3">{row.payload.summary.overdueRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryMetric = ({
  label,
  value,
  suffix = '',
  subValue = '',
  icon: Icon,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  subValue?: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f5f2] text-[#006b63]"><Icon className="h-4 w-4" /></span>
      <strong className="text-lg font-black text-[#0b4a3f]">{value}{suffix}</strong>
    </div>
    <p className="mt-2 text-[11px] font-bold text-slate-500">{label}</p>
    {subValue && <p className="mt-1 text-[10px] font-black text-slate-400">{subValue}</p>}
  </div>
);

const AnnualTargetCard = ({
  label,
  value,
  target,
  met,
}: {
  label: string;
  value: string;
  target: string;
  met: boolean | null;
}) => (
  <div className={`rounded-2xl border p-4 ${met === true ? 'border-emerald-200 bg-emerald-50/70' : met === false ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-slate-50'}`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-black text-slate-600">{label}</p>
      <Badge variant="outline" className={met === true ? 'border-emerald-200 bg-white text-emerald-700' : met === false ? 'border-rose-200 bg-white text-rose-700' : 'border-slate-200 bg-white text-slate-500'}>
        {met === true ? 'محقق' : met === false ? 'غير محقق' : 'غير مقاس'}
      </Badge>
    </div>
    <p className="mt-3 text-2xl font-black text-slate-800">{value}</p>
    <p className="mt-2 text-[10px] font-bold text-slate-400">{target}</p>
  </div>
);

export default MosqueKpiAnnualDashboard;
