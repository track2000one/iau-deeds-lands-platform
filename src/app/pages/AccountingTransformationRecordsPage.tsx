import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Boxes,
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
  getAccountingTransformationHierarchy,
  getAccountingTransformationHierarchyRecords,
  getAccountingTransformationStats,
  type AccountingTransformationHierarchyLeaf,
  type AccountingTransformationHierarchyNode,
} from '../api/accountingTransformation';
import type {
  AccountingRecordType,
  AccountingTransformationCycle,
  AccountingTransformationRecord,
  AccountingTransformationStats,
} from '../../types/accountingTransformation';
import { ACCOUNTING_COMMITTEE_STATUS_LABELS } from '../config/accountingTransformationFields';
import { getAccountingRecordTypeLabel } from '../config/accountingRecordPresentation';

const EMPTY_STATS: AccountingTransformationStats = {
  total: 0, fixedAssets: 0, lands: 0, buildings: 0, censusReady: 0, inventoryReady: 0,
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

const typeVisual = (type: AccountingRecordType) => type === 'fixed_asset'
  ? { Icon: Boxes, tone: 'border-violet-200 bg-violet-50 text-violet-700' }
  : type === 'land'
    ? { Icon: LandPlot, tone: 'border-amber-200 bg-amber-50 text-amber-700' }
    : { Icon: Building2, tone: 'border-blue-200 bg-blue-50 text-blue-700' };

const ProgressMini: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div><div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600"><span>{label}</span><span>{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>
);

const RecordCard: React.FC<{
  item: AccountingTransformationRecord;
  canEdit: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const { Icon, tone } = typeVisual(item.recordType);
  return (
    <article className="flex min-h-[322px] flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#17395f]/75 bg-[linear-gradient(145deg,#fff_0%,#fbfdff_55%,#edf3f8_100%)] shadow-[0_10px_0_rgba(13,48,82,.09),0_17px_30px_rgba(15,42,70,.10)] transition duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/65 p-4">
        <div className="flex min-w-0 items-center gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${tone}`}><Icon className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{item.assetDescription || item.entityAssetNumber || item.recordNumber}</p><p className="mt-1 font-mono text-[11px] text-slate-500">{item.recordNumber}</p></div></div>
        <Badge variant="outline" className={statusTone[item.committeeStatus] || statusTone.not_reviewed}>{ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus}</Badge>
      </div>
      <div className="grid flex-1 gap-4 p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">نوع السجل</span><p className="mt-1 font-bold text-slate-800">{getAccountingRecordTypeLabel(item.recordType)}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">رقم الأصل بالجهة</span><p className="mt-1 truncate font-bold text-slate-800">{item.entityAssetNumber || '-'}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">المدينة</span><p className="mt-1 truncate font-bold text-slate-800">{item.city || '-'}</p></div>
          <div className="rounded-xl border bg-white/70 p-3"><span className="text-slate-500">رمز الأصل المحاسبي</span><p className="mt-1 truncate font-bold text-slate-800">{item.accountingAssetCode || '-'}</p></div>
        </div>
        <div className="space-y-2 rounded-2xl border bg-white/65 p-3"><ProgressMini label="الحصر" value={item.censusProgress} /><ProgressMini label="الجرد" value={item.inventoryProgress} /><ProgressMini label="التقييم" value={item.valuationProgress} /></div>
      </div>
      <div className="flex flex-wrap gap-2 border-t bg-white/70 p-3"><Button size="sm" variant="outline" className="rounded-xl" onClick={onView}><Eye className="ml-1 h-4 w-4" />عرض</Button>{canEdit && <Button size="sm" variant="outline" className="rounded-xl" onClick={onEdit}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}{canDelete && <Button size="sm" variant="outline" className="rounded-xl border-red-300 bg-red-50 text-red-700" onClick={onDelete}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}</div>
    </article>
  );
};

const SectionHeader: React.FC<{
  section: AccountingTransformationHierarchyNode;
  expanded: boolean;
  onToggle: () => void;
}> = ({ section, expanded, onToggle }) => {
  const { Icon, tone } = typeVisual(section.recordType);
  const unclassified = /غير مصنف/.test(section.label);
  return (
    <button type="button" onClick={onToggle} className={`flex w-full items-center justify-between gap-4 rounded-[24px] border px-5 py-5 text-right shadow-sm transition hover:-translate-y-0.5 ${expanded ? 'border-sky-300 bg-[linear-gradient(135deg,#f8fcff,#edf8ff)]' : unclassified ? 'border-amber-300 bg-amber-50/65' : 'border-slate-200 bg-white/95'}`}>
      <div className="flex min-w-0 items-center gap-4">
        <div className={`grid h-13 w-13 shrink-0 place-items-center rounded-2xl border p-3 ${tone}`}><Icon className="h-6 w-6" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-black text-slate-900">{section.label}</h2>{section.legacy && <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-600">Legacy</Badge>}{unclassified && <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">يحتاج استكمال التصنيف</Badge>}</div>
          <p className="mt-1 text-xs text-slate-500">{section.code ? `رمز التصنيف الرئيسي: ${section.code} · ` : ''}{section.children.length.toLocaleString('ar-SA')} مجموعة فرعية · {section.count.toLocaleString('ar-SA')} سجل · متوسط الاكتمال {section.averageOverall}%</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2"><span className="rounded-full border bg-white px-3 py-1 text-xs font-black text-slate-700">{section.count.toLocaleString('ar-SA')}</span><span className="grid h-10 w-10 place-items-center rounded-xl border bg-white text-slate-700">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span></div>
    </button>
  );
};

const LeafHeader: React.FC<{
  leaf: AccountingTransformationHierarchyLeaf;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
}> = ({ leaf, expanded, loading, onToggle }) => (
  <button type="button" onClick={onToggle} className={`flex w-full items-center justify-between gap-4 rounded-[20px] border px-4 py-3 text-right transition ${expanded ? 'border-violet-250 bg-violet-50/55' : 'border-slate-200 bg-white hover:bg-slate-50/70'}`}>
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"><Layers3 className="h-4 w-4" /></div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-black text-slate-900">{leaf.label}</h3>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{leaf.code ? `رمز التصنيف الفرعي: ${leaf.code} · ` : ''}المجموعة المحاسبية: {leaf.accountingGroupLabel || 'غير محددة'}{leaf.accountingGroupCode ? ` (${leaf.accountingGroupCode})` : ''} · {leaf.count.toLocaleString('ar-SA')} سجل · اكتمال {leaf.averageOverall}%</p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2"><span className="rounded-full border bg-white px-2.5 py-1 text-[11px] font-black">{leaf.count.toLocaleString('ar-SA')}</span><span className="grid h-8 w-8 place-items-center rounded-lg border bg-white">{loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" /> : expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span></div>
  </button>
);

export const AccountingTransformationRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const [hierarchy, setHierarchy] = useState<AccountingTransformationHierarchyNode[]>([]);
  const [loadedGroups, setLoadedGroups] = useState<Record<string, LoadedGroup>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedLeaves, setExpandedLeaves] = useState<Record<string, boolean>>({});
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

  const loadLeaf = async (leafKey: string, page = 1, append = false) => {
    setLoadedGroups((prev) => ({ ...prev, [leafKey]: { ...(prev[leafKey] || { items: [], page: 1, totalPages: 1, total: 0 }), loading: true } }));
    try {
      const data = await getAccountingTransformationHierarchyRecords(leafKey, { ...commonFilters, page, limit: 36 });
      setLoadedGroups((prev) => ({ ...prev, [leafKey]: { items: append ? [...(prev[leafKey]?.items || []), ...(data.items || [])] : (data.items || []), page: data.page || page, totalPages: data.totalPages || 1, total: data.total || 0, loading: false } }));
    } catch (error) {
      setLoadedGroups((prev) => ({ ...prev, [leafKey]: { ...(prev[leafKey] || { items: [], page: 1, totalPages: 1, total: 0 }), loading: false } }));
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجلات المجموعة');
    }
  };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [hierarchyData, statData, cycleData] = await Promise.all([
        getAccountingTransformationHierarchy(commonFilters),
        getAccountingTransformationStats(cycleId || undefined),
        cycleId ? getAccountingTransformationCycles() : Promise.resolve([]),
      ]);
      const nextHierarchy = hierarchyData || [];
      setHierarchy(nextHierarchy);
      setStats(statData || EMPTY_STATS);
      setSelectedCycle(cycleId ? (cycleData.find((cycle) => cycle.id === cycleId) || null) : null);
      setLoadedGroups({});

      if (appliedSearch) {
        setExpandedSections(Object.fromEntries(nextHierarchy.map((section) => [section.key, true])));
        const leaves = nextHierarchy.flatMap((section) => section.children);
        if (leaves.length === 1) {
          setExpandedLeaves({ [leaves[0].key]: true });
          void loadLeaf(leaves[0].key, 1, false);
        } else {
          setExpandedLeaves({});
        }
      } else {
        setExpandedSections({});
        setExpandedLeaves({});
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجلات التحول المحاسبي'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadOverview(); }, [appliedSearch, recordType, committeeStatus, cycleId]);

  const toggleSection = (sectionKey: string) => setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));

  const toggleLeaf = async (leafKey: string) => {
    const nextExpanded = !expandedLeaves[leafKey];
    setExpandedLeaves((prev) => ({ ...prev, [leafKey]: nextExpanded }));
    if (nextExpanded && !loadedGroups[leafKey]?.items?.length) await loadLeaf(leafKey, 1, false);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = search.trim(); setAppliedSearch(trimmed);
    const next = new URLSearchParams(); if (trimmed) next.set('search', trimmed); if (recordType !== 'all') next.set('type', recordType); if (committeeStatus !== 'all') next.set('status', committeeStatus); if (cycleId) next.set('cycle', cycleId); setParams(next);
  };

  const summaryCards = useMemo(() => [
    { type: 'all', label: 'جميع السجلات', value: stats.total, Icon: FileSpreadsheet },
    { type: 'fixed_asset', label: 'نموذج ب — الأصول الثابتة', value: stats.fixedAssets || 0, Icon: Boxes },
    { type: 'land', label: 'Legacy — الأراضي', value: stats.lands, Icon: LandPlot },
    { type: 'building', label: 'Legacy — المباني', value: stats.buildings, Icon: Building2 },
  ], [stats]);

  const remove = async (item: AccountingTransformationRecord, sectionKey: string, leafKey: string) => {
    if (!confirm(`هل تريد حذف السجل ${item.recordNumber}؟`)) return;
    try {
      await deleteAccountingTransformationRecord(item.id);
      toast.success('تم حذف السجل');
      await loadOverview();
      setExpandedSections((prev) => ({ ...prev, [sectionKey]: true }));
      setExpandedLeaves((prev) => ({ ...prev, [leafKey]: true }));
      await loadLeaf(leafKey, 1, false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حذف السجل'); }
  };

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div><Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className="text-2xl font-black md:text-3xl">سجل الأصول ومتطلبات التحول</h1><p className="mt-1 text-sm text-slate-500">العرض منظم هرميًا حسب نوع السجل ثم التصنيف الرئيسي ثم التصنيف الفرعي والمجموعة المحاسبية، مع إبقاء مصادر Legacy منفصلة.</p></div><div className="flex flex-wrap gap-2">{canAdd && <Button variant="outline" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد تحديث</Button>}{canAdd && <Button onClick={() => navigate('/accounting-transformation/new')}><PlusCircle className="ml-2 h-4 w-4" />إضافة سجل</Button>}</div></section>

      {selectedCycle && <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-sm"><strong>الدورة:</strong> #{selectedCycle.cycleNumber} — {selectedCycle.name} · {selectedCycle.status === 'archived' ? 'مؤرشفة للعرض فقط' : selectedCycle.status}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map(({ type, label, value, Icon }) => <button key={type} onClick={() => { setRecordType(type); setAppliedSearch(search.trim()); }} className={`rounded-[22px] border p-4 text-right shadow-sm transition hover:-translate-y-0.5 ${recordType === type ? 'border-sky-300 bg-sky-50' : 'bg-white'}`}><Icon className="mb-2 h-5 w-5 text-sky-700" /><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p></button>)}</div>

      <Card className="rounded-[24px]"><CardContent className="p-4"><form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" placeholder="رقم الأصل، وصف الأصل، الجهة، المدينة أو الرمز المحاسبي..." /></div><NativeSelect value={recordType} onChange={(e) => setRecordType(e.target.value)}><option value="all">كل أنواع السجلات</option><option value="fixed_asset">نموذج ب — الأصول الثابتة</option><option value="land">Legacy — الأراضي</option><option value="building">Legacy — المباني</option></NativeSelect><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value)}><option value="all">كل حالات اللجنة</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect><Button type="submit">بحث</Button></form></CardContent></Card>

      {loading ? <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">جاري تحميل المجموعات...</div> : !hierarchy.length ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-slate-500">لا توجد سجلات مطابقة.</div> : <div className="space-y-4">{hierarchy.map((section) => {
        const sectionExpanded = Boolean(expandedSections[section.key]);
        return <section key={section.key} className="space-y-3"><SectionHeader section={section} expanded={sectionExpanded} onToggle={() => toggleSection(section.key)} />{sectionExpanded && <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/45 p-3 sm:p-4">{section.children.map((leaf) => {
          const state = loadedGroups[leaf.key];
          const leafExpanded = Boolean(expandedLeaves[leaf.key]);
          return <div key={leaf.key} className="space-y-3"><LeafHeader leaf={leaf} expanded={leafExpanded} loading={Boolean(state?.loading)} onToggle={() => void toggleLeaf(leaf.key)} />{leafExpanded && <div className="rounded-[22px] border bg-white/80 p-4">{state?.loading && !state.items.length ? <div className="py-10 text-center text-sm text-slate-500">جاري تحميل السجلات...</div> : <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(state?.items || []).map((item) => <RecordCard key={item.id} item={item} canEdit={effectiveCanEdit} canDelete={effectiveCanDelete} onView={() => navigate(`/accounting-transformation/${item.id}`)} onEdit={() => navigate(`/accounting-transformation/${item.id}/edit`)} onDelete={() => void remove(item, section.key, leaf.key)} />)}</div>{state && state.page < state.totalPages && <div className="mt-4 text-center"><Button variant="outline" disabled={state.loading} onClick={() => void loadLeaf(leaf.key, state.page + 1, true)}>تحميل المزيد</Button></div>}</>}</div>}</div>;
        })}</div>}</section>;
      })}</div>}
    </div>
  );
};
