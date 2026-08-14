import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileSpreadsheet,
  LandPlot,
  Layers3,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import { usePermissions } from '../../context/PermissionsContext';
import {
  deleteAccountingTransformationRecord,
  getAccountingTransformationCycles,
  getAccountingTransformationGroups,
  getAccountingTransformationRecords,
  getAccountingTransformationStats,
  type AccountingTransformationGroupSummary,
} from '../api/accountingTransformation';
import type {
  AccountingTransformationCycle,
  AccountingTransformationRecord,
  AccountingTransformationStats,
} from '../../types/accountingTransformation';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  ACCOUNTING_RECORD_TYPE_LABELS,
} from '../config/accountingTransformationFields';

const EMPTY_STATS: AccountingTransformationStats = {
  total: 0, lands: 0, buildings: 0, censusReady: 0, inventoryReady: 0,
  valuationReady: 0, needsCompletion: 0, underReview: 0,
  averageCensus: 0, averageInventory: 0, averageValuation: 0, averageOverall: 0,
};

type LoadedGroup = {
  items: AccountingTransformationRecord[];
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
};

const statusTone: Record<string, string> = {
  not_reviewed: 'border-slate-300 bg-slate-50 text-slate-700',
  under_review: 'border-sky-300 bg-sky-50 text-sky-700',
  needs_update: 'border-amber-300 bg-amber-50 text-amber-800',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  completed: 'border-teal-300 bg-teal-50 text-teal-700',
};

const ProgressMini: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600"><span>{label}</span><span>{value}%</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
  </div>
);

const RecordCard: React.FC<{
  item: AccountingTransformationRecord;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const TypeIcon = item.recordType === 'land' ? LandPlot : Building2;
  return (
    <article className="flex min-h-[322px] flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#17395f]/75 bg-[linear-gradient(145deg,#fff_0%,#fbfdff_55%,#edf3f8_100%)] shadow-[0_10px_0_rgba(13,48,82,.09),0_17px_30px_rgba(15,42,70,.10),inset_0_2px_0_rgba(255,255,255,.98)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_0_rgba(13,48,82,.10),0_22px_38px_rgba(15,42,70,.14)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/65 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${item.recordType === 'land' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}><TypeIcon className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{item.assetDescription || item.entityAssetNumber || item.recordNumber}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{item.recordNumber}</p></div>
        </div>
        <Badge variant="outline" className={statusTone[item.committeeStatus] || statusTone.not_reviewed}>{ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus}</Badge>
      </div>
      <div className="grid flex-1 gap-4 p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">نوع السجل</span><p className="mt-1 font-bold text-slate-800">{ACCOUNTING_RECORD_TYPE_LABELS[item.recordType]}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">رقم الأصل بالجهة</span><p className="mt-1 truncate font-bold text-slate-800">{item.entityAssetNumber || '-'}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">المدينة</span><p className="mt-1 truncate font-bold text-slate-800">{item.city || '-'}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">رمز الأصل المحاسبي</span><p className="mt-1 truncate font-bold text-slate-800">{item.accountingAssetCode || '-'}</p></div>
        </div>
        <div className="space-y-2 rounded-2xl border bg-white/65 p-3">
          <ProgressMini label="الحصر" value={item.censusProgress} />
          <ProgressMini label="الجرد" value={item.inventoryProgress} />
          <ProgressMini label="التقييم" value={item.valuationProgress} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t bg-white/70 p-3">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onView}><Eye className="ml-1 h-4 w-4" />عرض</Button>
        {canEdit && <Button size="sm" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}
        {canDelete && <Button size="sm" variant="outline" className="rounded-xl border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800" onClick={onDelete}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}
      </div>
    </article>
  );
};

const GroupHeader: React.FC<{
  group: AccountingTransformationGroupSummary;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}> = ({ group, expanded, loading, onToggle }) => {
  const isLand = group.key === 'type:land' || /أراض|ارض|land/i.test(group.label);
  const Icon = isLand ? LandPlot : group.key === 'type:building' || /مبان|مبنى|building/i.test(group.label) ? Building2 : Layers3;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center justify-between gap-4 rounded-[22px] border px-4 py-4 text-right transition duration-200 ${expanded ? 'border-sky-300 bg-[linear-gradient(135deg,#f8fcff,#edf8ff)] shadow-[0_8px_0_rgba(14,116,144,.08),0_14px_28px_rgba(15,42,70,.10)]' : 'border-slate-200 bg-white/90 shadow-[0_7px_0_rgba(30,64,95,.06),0_12px_24px_rgba(15,42,70,.07)] hover:-translate-y-0.5'}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${isLand ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-900">{group.label}</h3>
          <p className="mt-1 text-xs text-slate-500">{group.code ? `رمز المجموعة: ${group.code} · ` : ''}{group.count.toLocaleString('ar-SA')} سجل · متوسط الاكتمال {group.averageOverall}%</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">{group.count.toLocaleString('ar-SA')}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700">{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" /> : expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </div>
    </button>
  );
};

export const AccountingTransformationRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const [groups, setGroups] = useState<AccountingTransformationGroupSummary[]>([]);
  const [loadedGroups, setLoadedGroups] = useState<Record<string, LoadedGroup>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<AccountingTransformationStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(params.get('search') || '');
  const [recordType, setRecordType] = useState(params.get('type') || 'all');
  const [committeeStatus, setCommitteeStatus] = useState(params.get('status') || 'all');
  const cycleId = params.get('cycle') || '';
  const [selectedCycle, setSelectedCycle] = useState<AccountingTransformationCycle | null>(null);

  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');
  const canEdit = isAdmin || hasPermission('accounting_transformation', 'canEdit');
  const canDelete = isAdmin || hasPermission('accounting_transformation', 'canDelete');

  const commonFilters = useMemo(() => ({ search: appliedSearch, recordType, committeeStatus, cycleId: cycleId || undefined }), [appliedSearch, recordType, committeeStatus, cycleId]);
  const isArchivedCycle = selectedCycle?.status === 'archived';
  const effectiveCanEdit = canEdit && !isArchivedCycle;
  const effectiveCanDelete = canDelete && !isArchivedCycle;

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [groupData, statData, cycleData] = await Promise.all([
        getAccountingTransformationGroups(commonFilters),
        getAccountingTransformationStats(cycleId || undefined),
        cycleId ? getAccountingTransformationCycles() : Promise.resolve([]),
      ]);
      setGroups(groupData || []);
      setStats(statData || EMPTY_STATS);
      setSelectedCycle(cycleId ? (cycleData.find((cycle) => cycle.id === cycleId) || null) : null);
      setLoadedGroups({});
      setExpandedGroups({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مجموعات التحول المحاسبي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, [appliedSearch, recordType, committeeStatus, cycleId]);

  const loadGroup = async (groupKey: string, page = 1, append = false) => {
    setLoadedGroups((prev) => ({
      ...prev,
      [groupKey]: { ...(prev[groupKey] || { items: [], page: 1, totalPages: 1, total: 0 }), loading: true },
    }));
    try {
      const data = await getAccountingTransformationRecords({ ...commonFilters, group: groupKey, page, limit: 36 });
      setLoadedGroups((prev) => ({
        ...prev,
        [groupKey]: {
          items: append ? [...(prev[groupKey]?.items || []), ...(data.items || [])] : (data.items || []),
          page: data.page || page,
          totalPages: data.totalPages || 1,
          total: data.total || 0,
          loading: false,
        },
      }));
    } catch (error) {
      setLoadedGroups((prev) => ({ ...prev, [groupKey]: { ...(prev[groupKey] || { items: [], page: 1, totalPages: 1, total: 0 }), loading: false } }));
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجلات المجموعة');
    }
  };

  const toggleGroup = async (groupKey: string) => {
    const nextExpanded = !expandedGroups[groupKey];
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: nextExpanded }));
    if (nextExpanded && !loadedGroups[groupKey]?.items?.length) await loadGroup(groupKey, 1, false);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = search.trim();
    setAppliedSearch(trimmed);
    const next = new URLSearchParams();
    if (trimmed) next.set('search', trimmed);
    if (recordType !== 'all') next.set('type', recordType);
    if (committeeStatus !== 'all') next.set('status', committeeStatus);
    if (cycleId) next.set('cycle', cycleId);
    setParams(next);
  };

  const summaryCards = useMemo(() => [
    { type: 'all', label: 'جميع السجلات', value: stats.total, icon: FileSpreadsheet },
    { type: 'land', label: 'الأراضي', value: stats.lands, icon: LandPlot },
    { type: 'building', label: 'المباني', value: stats.buildings, icon: Building2 },
  ], [stats]);

  const remove = async (item: AccountingTransformationRecord, groupKey: string) => {
    if (!confirm(`هل تريد حذف السجل ${item.recordNumber}؟`)) return;
    try {
      await deleteAccountingTransformationRecord(item.id);
      toast.success('تم حذف السجل');
      await Promise.all([loadOverview(), loadGroup(groupKey, 1, false)]);
      setExpandedGroups((prev) => ({ ...prev, [groupKey]: true }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف السجل');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/85 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">سجلات متطلبات التحول المحاسبي</h1><p className="mt-1 text-sm text-slate-500">عرض السجلات كمجموعات محاسبية، ثم فتح كل مجموعة لاستعراض الأراضي والمباني التابعة لها.</p></div>
        <div className="flex flex-wrap gap-2">{canAdd && <Button className="rounded-2xl" onClick={() => navigate('/accounting-transformation/new')}><PlusCircle className="ml-2 h-4 w-4" />إضافة سجل</Button>}{canAdd && <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد Excel</Button>}</div>
      </section>

      {selectedCycle && <div className={`rounded-[22px] border p-4 ${selectedCycle.status === 'archived' ? 'border-slate-300 bg-slate-50' : selectedCycle.isCurrent ? 'border-emerald-200 bg-emerald-50/60' : 'border-sky-200 bg-sky-50/60'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-slate-500">عرض إصدار محدد من البيانات</p><p className="mt-1 font-black text-slate-900">#{selectedCycle.cycleNumber} — {selectedCycle.name}</p><p className="mt-1 text-xs text-slate-600">{selectedCycle.status === 'archived' ? 'نسخة تاريخية مؤرشفة — العرض فقط دون تعديل أو حذف.' : selectedCycle.isCurrent ? 'الدورة الحالية المعتمدة.' : 'دورة قيد العمل قبل الاعتماد.'}</p></div><Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}>سجل الدورات</Button></div></div>}

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map(({ type, label, value, icon: Icon }) => <button key={type} onClick={() => setRecordType(type)} className={`rounded-[22px] border p-4 text-right shadow-[0_7px_0_rgba(30,64,95,.05),0_12px_24px_rgba(15,42,70,.06)] transition hover:-translate-y-0.5 ${recordType === type ? 'border-blue-400 bg-blue-50' : 'bg-white/85'}`}><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value.toLocaleString('ar-SA')}</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white"><Icon className="h-5 w-5 text-blue-700" /></div></div></button>)}
      </div>

      <Card className="rounded-[24px] border-slate-200/90 bg-white/90 shadow-sm"><CardContent className="p-4"><form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl pr-9" placeholder="بحث برقم السجل أو الأصل أو الوصف أو المدينة..." /></div><NativeSelect value={recordType} onChange={(e) => setRecordType(e.target.value)} className="h-11 rounded-xl"><option value="all">كل الأنواع</option><option value="land">الأراضي</option><option value="building">المباني</option></NativeSelect><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value)} className="h-11 rounded-xl"><option value="all">كل حالات اللجنة</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect><Button type="submit" className="h-11 rounded-xl px-6">بحث</Button></form></CardContent></Card>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white/80 p-4"><p className="text-xs text-slate-500">عدد المجموعات</p><p className="mt-1 text-2xl font-black text-slate-900">{groups.length.toLocaleString('ar-SA')}</p></div>
        <div className="rounded-2xl border bg-white/80 p-4"><p className="text-xs text-slate-500">السجلات ضمن التصفية</p><p className="mt-1 text-2xl font-black text-slate-900">{groups.reduce((sum, group) => sum + group.count, 0).toLocaleString('ar-SA')}</p></div>
        <div className="rounded-2xl border bg-white/80 p-4"><p className="text-xs text-slate-500">متوسط الاكتمال العام</p><p className="mt-1 text-2xl font-black text-slate-900">{groups.length ? Math.round(groups.reduce((sum, group) => sum + group.averageOverall * group.count, 0) / Math.max(1, groups.reduce((sum, group) => sum + group.count, 0))) : 0}%</p></div>
      </div>

      {loading ? <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">جاري تحميل المجموعات...</div> : groups.length ? <div className="space-y-3">{groups.map((group) => {
        const loaded = loadedGroups[group.key];
        const expanded = !!expandedGroups[group.key];
        return <section key={group.key} className="space-y-4"><GroupHeader group={group} expanded={expanded} loading={!!loaded?.loading} onToggle={() => toggleGroup(group.key)} />{expanded && <div className="rounded-[26px] border border-slate-200/90 bg-slate-50/55 p-3 sm:p-4">{loaded?.loading && !loaded.items.length ? <div className="p-10 text-center text-sm text-slate-500">جاري تحميل سجلات المجموعة...</div> : loaded?.items?.length ? <><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{loaded.items.map((item) => <RecordCard key={item.id} item={item} canEdit={effectiveCanEdit} canDelete={effectiveCanDelete} onView={() => navigate(`/accounting-transformation/${item.id}`)} onEdit={() => navigate(`/accounting-transformation/${item.id}/edit`)} onDelete={() => remove(item, group.key)} />)}</div>{loaded.page < loaded.totalPages && <div className="mt-4 flex justify-center"><Button variant="outline" className="rounded-xl" disabled={loaded.loading} onClick={() => loadGroup(group.key, loaded.page + 1, true)}>عرض المزيد ({loaded.items.length.toLocaleString('ar-SA')} من {loaded.total.toLocaleString('ar-SA')})</Button></div>}</> : <div className="p-10 text-center text-sm text-slate-500">لا توجد سجلات في هذه المجموعة.</div>}</div>}</section>;
      })}</div> : <div className="rounded-[28px] border border-dashed bg-white/70 p-12 text-center text-slate-500">لا توجد مجموعات مطابقة.</div>}
    </div>
  );
};
