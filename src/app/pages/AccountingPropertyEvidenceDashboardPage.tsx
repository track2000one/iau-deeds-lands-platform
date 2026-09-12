import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  FolderOpen,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { getAccountingTransformationRecords } from '../api/accountingTransformation';
import {
  PROPERTY_CONTROL_MEMO_PROFILES,
  findPropertyControlMemoProfile,
  memoProfileToAnalysisSeed,
  type PropertyControlMemoProfile,
} from '../config/accountingPropertyControlMemoProfiles';
import {
  findMatchingPropertyEvidenceAttachment,
  getPropertyEvidenceRequirements,
  type PropertyEvidenceStatus,
} from '../config/accountingPropertyEvidenceRequirements';
import type {
  AccountingTransformationAttachment,
  AccountingTransformationRecord,
} from '../../types/accountingTransformation';

const CONTROL_KEY = '__propertyControlAnalysis';

type EvidenceChecklistEntry = {
  status?: PropertyEvidenceStatus;
  attachmentKey?: string;
  notes?: string;
};

type SavedControlAnalysis = {
  evidenceChecklist?: Record<string, EvidenceChecklistEntry>;
  evidenceCompletionPercent?: number;
  responsible?: string;
  nextAction?: string;
  documentCompleteness?: 'complete' | 'partial' | 'missing';
  updatedAt?: string;
};

type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete';

type DashboardRow = {
  profile: PropertyControlMemoProfile;
  records: AccountingTransformationRecord[];
  representative: AccountingTransformationRecord | null;
  attachments: AccountingTransformationAttachment[];
  percentage: number;
  available: number;
  missing: number;
  needsUpdate: number;
  totalRequirements: number;
  responsible: string;
  nextAction: string;
  updatedAt?: string;
};

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

const readSavedAnalysis = (record: AccountingTransformationRecord): SavedControlAnalysis | null => {
  const raw = record.payload?.[CONTROL_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as SavedControlAnalysis;
};

const latestAnalysisRecord = (records: AccountingTransformationRecord[]) => {
  const withAnalysis = records
    .map((record) => ({ record, analysis: readSavedAnalysis(record) }))
    .filter((item): item is { record: AccountingTransformationRecord; analysis: SavedControlAnalysis } => Boolean(item.analysis));
  if (!withAnalysis.length) return null;
  return withAnalysis.sort((a, b) => {
    const aTime = a.analysis.updatedAt ? Date.parse(a.analysis.updatedAt) : 0;
    const bTime = b.analysis.updatedAt ? Date.parse(b.analysis.updatedAt) : 0;
    return bTime - aTime;
  })[0];
};

const attachmentIdentity = (attachment: AccountingTransformationAttachment) =>
  attachment.driveFileId || attachment.driveUrl || `${attachment.title || ''}-${attachment.documentNumber || ''}`;

const uniqueAttachments = (records: AccountingTransformationRecord[]) => {
  const seen = new Set<string>();
  const result: AccountingTransformationAttachment[] = [];
  records.forEach((record) => (record.attachments || []).forEach((attachment) => {
    const key = attachmentIdentity(attachment);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(attachment);
  }));
  return result;
};

const buildRow = (profile: PropertyControlMemoProfile, records: AccountingTransformationRecord[]): DashboardRow => {
  const profileRecords = records.filter((record) => findPropertyControlMemoProfile(record)?.id === profile.id);
  const latest = latestAnalysisRecord(profileRecords);
  const representative = latest?.record || profileRecords[0] || null;
  const attachments = uniqueAttachments(profileRecords);
  const seed = memoProfileToAnalysisSeed(profile) as SavedControlAnalysis;
  const saved = latest?.analysis || null;
  const analysis = { ...seed, ...(saved || {}) };
  const requirements = getPropertyEvidenceRequirements(profile.id);

  let available = 0;
  let missing = 0;
  let needsUpdate = 0;

  requirements.forEach((requirement) => {
    const savedEntry = analysis.evidenceChecklist?.[requirement.key];
    const linkedAttachment = savedEntry?.attachmentKey
      ? attachments.find((attachment) => attachmentIdentity(attachment) === savedEntry.attachmentKey)
        || findMatchingPropertyEvidenceAttachment(requirement, attachments)
      : findMatchingPropertyEvidenceAttachment(requirement, attachments);
    const status: PropertyEvidenceStatus = savedEntry?.status || (linkedAttachment ? 'available' : 'missing');
    if (status === 'available') available += 1;
    else if (status === 'needs_update') needsUpdate += 1;
    else missing += 1;
  });

  const totalRequirements = requirements.length;
  const percentage = totalRequirements
    ? Math.round(((available + needsUpdate * 0.5) / totalRequirements) * 100)
    : 0;

  return {
    profile,
    records: profileRecords,
    representative,
    attachments,
    percentage,
    available,
    missing,
    needsUpdate,
    totalRequirements,
    responsible: String(analysis.responsible || profile.responsible || 'غير محدد'),
    nextAction: String(analysis.nextAction || profile.nextAction || 'غير محدد'),
    updatedAt: saved?.updatedAt,
  };
};

const completionTone = (percentage: number) => {
  if (percentage >= 100) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (percentage >= 50) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
};

export const AccountingPropertyEvidenceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      setRecords([...(buildings.items || []), ...(lands.items || [])]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات مستندات الإثبات');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(
    () => PROPERTY_CONTROL_MEMO_PROFILES.map((profile) => buildRow(profile, records)),
    [records]
  );

  const filteredRows = useMemo(() => {
    const needle = normalize(query);
    return rows.filter((row) => {
      if (filter === 'missing' && row.missing === 0) return false;
      if (filter === 'needs_update' && row.needsUpdate === 0) return false;
      if (filter === 'complete' && row.percentage < 100) return false;
      if (!needle) return true;
      return normalize([
        row.profile.title,
        row.profile.sourceLabel,
        row.responsible,
        row.nextAction,
        row.representative?.assetDescription,
        row.representative?.city,
      ].filter(Boolean).join(' ')).includes(needle);
    });
  }, [rows, query, filter]);

  const totalRequirements = rows.reduce((sum, row) => sum + row.totalRequirements, 0);
  const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);
  const totalMissing = rows.reduce((sum, row) => sum + row.missing, 0);
  const totalNeedsUpdate = rows.reduce((sum, row) => sum + row.needsUpdate, 0);
  const overallPercentage = totalRequirements
    ? Math.round(((totalAvailable + totalNeedsUpdate * 0.5) / totalRequirements) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-8" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#17324d,#0b2238)] text-white shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-cyan-200/30 bg-cyan-200/10 text-cyan-50">متابعة مركزية</Badge>
              <Badge variant="outline" className="border-indigo-200/30 bg-indigo-200/10 text-indigo-50">الحالات الأربع في مذكرة مؤشرات السيطرة</Badge>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">لوحة متابعة مستندات الإثبات</h1>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">متابعة اكتمال المعززات والمستندات الداعمة للعقارات محل تحليل السيطرة، مع إظهار المستندات الناقصة وما يحتاج تحديثًا والمسؤول والإجراء التالي دون إنشاء سجل مرفقات موازٍ.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => void load()} disabled={loading}>
              <RefreshCcw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation/control-indicators')}>
              <ShieldCheck className="ml-2 h-4 w-4" />مؤشرات السيطرة
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['الحالات', rows.length, FolderOpen, 'text-blue-700'],
          ['نسبة الاكتمال', `${overallPercentage}%`, FileCheck2, 'text-emerald-700'],
          ['متطلبات متوفرة', totalAvailable, CheckCircle2, 'text-teal-700'],
          ['تحتاج تحديث', totalNeedsUpdate, FileWarning, 'text-amber-700'],
          ['مستندات ناقصة', totalMissing, AlertTriangle, 'text-red-700'],
        ].map(([label, value, Icon, tone]) => (
          <Card key={String(label)} className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border bg-slate-50"><Icon className={`h-5 w-5 ${tone}`} /></div>
              <div><p className="text-[11px] font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black text-slate-950">{typeof value === 'number' ? value.toLocaleString('ar-SA') : String(value)}</p></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-[26px]">
        <CardHeader className="border-b bg-slate-50/70">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-end">
            <div>
              <CardTitle className="text-base">متابعة الحالات</CardTitle>
              <div className="relative mt-3"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالعقار أو المسؤول أو الإجراء التالي..." /></div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">حالة المستندات</p>
              <NativeSelect value={filter} onChange={(event) => setFilter(event.target.value as FilterMode)}>
                <option value="all">جميع الحالات</option>
                <option value="missing">يوجد مستند ناقص</option>
                <option value="needs_update">يوجد مستند يحتاج تحديث</option>
                <option value="complete">مكتمل 100%</option>
              </NativeSelect>
            </div>
            <Button type="button" variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'missing' ? 'all' : 'missing')}>
              <AlertTriangle className="ml-2 h-4 w-4" />الناقص فقط
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل ملف الإثبات...</div>}
          {!loading && !filteredRows.length && <div className="py-20 text-center text-sm text-slate-500">لا توجد حالات مطابقة للفلتر الحالي.</div>}
          {!loading && filteredRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">العقار / الحالة</th>
                    <th className="px-4 py-3">الربط بالسجل</th>
                    <th className="px-4 py-3">الاكتمال</th>
                    <th className="px-4 py-3">متوفر</th>
                    <th className="px-4 py-3">يحتاج تحديث</th>
                    <th className="px-4 py-3">ناقص</th>
                    <th className="px-4 py-3">المسؤول</th>
                    <th className="px-4 py-3">الإجراء التالي</th>
                    <th className="px-4 py-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row) => (
                    <tr key={row.profile.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">{row.profile.title}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{row.profile.sourceLabel}</p>
                      </td>
                      <td className="px-4 py-4">
                        {row.records.length ? <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">{row.records.length.toLocaleString('ar-SA')} سجل مرتبط</Badge> : <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">غير مرتبط</Badge>}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={completionTone(row.percentage)}>{row.percentage}%</Badge>
                        <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${row.percentage}%` }} /></div>
                      </td>
                      <td className="px-4 py-4 font-black text-emerald-700">{row.available}</td>
                      <td className="px-4 py-4 font-black text-amber-700">{row.needsUpdate}</td>
                      <td className="px-4 py-4 font-black text-red-700">{row.missing}</td>
                      <td className="max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700">{row.responsible}</td>
                      <td className="max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700">{row.nextAction}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          {row.representative ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/${row.representative!.id}`)}>
                              <ArrowLeft className="ml-1 h-4 w-4" />فتح سجل العقار
                            </Button>
                          ) : (
                            <span className="text-[11px] text-red-600">يتطلب ربط الحالة بسجل عقاري أولًا</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">ملاحظة: النسبة في هذه اللوحة تجمع المرفقات الموجودة في جميع السجلات المطابقة لكل حالة. «متوفر» يحتسب بكامل الوزن، «يحتاج تحديث» بنصف الوزن، و«ناقص» بدون وزن. القرار المحاسبي يظل خاضعًا لمراجعة المستندات واعتماد الجهات المختصة.</p>
    </div>
  );
};
