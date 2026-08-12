import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Building2,
  Eye,
  FileSpreadsheet,
  LandPlot,
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
  getAccountingTransformationRecords,
  getAccountingTransformationStats,
} from '../api/accountingTransformation';
import type {
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
    <article className="flex min-h-[322px] flex-col overflow-hidden rounded-[22px] border-[1.5px] border-[#17395f]/75 bg-[linear-gradient(145deg,#fff_0%,#fbfdff_55%,#edf3f8_100%)] shadow-[0_10px_0_rgba(13,48,82,.09),0_17px_30px_rgba(15,42,70,.10),inset_0_2px_0_rgba(255,255,255,.98)]">
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
        {canDelete && <Button size="sm" variant="outline" className="rounded-xl text-red-700 hover:text-red-800" onClick={onDelete}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}
      </div>
    </article>
  );
};

export const AccountingTransformationRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const [items, setItems] = useState<AccountingTransformationRecord[]>([]);
  const [stats, setStats] = useState<AccountingTransformationStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [recordType, setRecordType] = useState(params.get('type') || 'all');
  const [committeeStatus, setCommitteeStatus] = useState(params.get('status') || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');
  const canEdit = isAdmin || hasPermission('accounting_transformation', 'canEdit');
  const canDelete = isAdmin || hasPermission('accounting_transformation', 'canDelete');

  const load = async () => {
    setLoading(true);
    try {
      const [pageData, statData] = await Promise.all([
        getAccountingTransformationRecords({ search, recordType, committeeStatus, page, limit: 36 }),
        getAccountingTransformationStats(),
      ]);
      setItems(pageData.items || []);
      setTotalPages(pageData.totalPages || 1);
      setTotal(pageData.total || 0);
      setStats(statData || EMPTY_STATS);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجلات التحول المحاسبي');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, recordType, committeeStatus]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (recordType !== 'all') next.set('type', recordType);
    if (committeeStatus !== 'all') next.set('status', committeeStatus);
    setParams(next);
    load();
  };

  const summaryCards = useMemo(() => [
    { type: 'all', label: 'جميع السجلات', value: stats.total, icon: FileSpreadsheet },
    { type: 'land', label: 'الأراضي', value: stats.lands, icon: LandPlot },
    { type: 'building', label: 'المباني', value: stats.buildings, icon: Building2 },
  ], [stats]);

  const remove = async (item: AccountingTransformationRecord) => {
    if (!confirm(`هل تريد حذف السجل ${item.recordNumber}؟`)) return;
    try {
      await deleteAccountingTransformationRecord(item.id);
      toast.success('تم حذف السجل');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف السجل');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/85 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">سجلات متطلبات التحول المحاسبي</h1><p className="mt-1 text-sm text-slate-500">متابعة بيانات الأراضي والمباني واكتمال متطلبات الحصر والجرد والتقييم.</p></div>
        <div className="flex flex-wrap gap-2">{canAdd && <Button className="rounded-2xl" onClick={() => navigate('/accounting-transformation/new')}><PlusCircle className="ml-2 h-4 w-4" />إضافة سجل</Button>}<Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد Excel</Button></div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map(({ type, label, value, icon: Icon }) => <button key={type} onClick={() => { setRecordType(type); setPage(1); }} className={`rounded-[22px] border p-4 text-right shadow-sm transition hover:-translate-y-0.5 ${recordType === type ? 'border-blue-400 bg-blue-50' : 'bg-white/85'}`}><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div><div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white"><Icon className="h-5 w-5 text-blue-700" /></div></div></button>)}
      </div>

      <Card className="rounded-[24px] border-slate-200/90 bg-white/90 shadow-sm"><CardContent className="p-4"><form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl pr-9" placeholder="بحث برقم السجل أو الأصل أو الوصف أو المدينة..." /></div><NativeSelect value={recordType} onChange={(e) => { setRecordType(e.target.value); setPage(1); }} className="h-11 rounded-xl"><option value="all">كل الأنواع</option><option value="land">الأراضي</option><option value="building">المباني</option></NativeSelect><NativeSelect value={committeeStatus} onChange={(e) => { setCommitteeStatus(e.target.value); setPage(1); }} className="h-11 rounded-xl"><option value="all">كل حالات اللجنة</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect><Button type="submit" className="h-11 rounded-xl px-6">بحث</Button></form></CardContent></Card>

      <div className="flex items-center justify-between text-xs text-slate-500"><span>النتائج: {total.toLocaleString('ar-SA')}</span><span>الصفحة {page} من {Math.max(1, totalPages)}</span></div>

      {loading ? <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500">جاري تحميل السجلات...</div> : items.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{items.map((item) => <RecordCard key={item.id} item={item} canEdit={canEdit} canDelete={canDelete} onView={() => navigate(`/accounting-transformation/${item.id}`)} onEdit={() => navigate(`/accounting-transformation/${item.id}/edit`)} onDelete={() => remove(item)} />)}</div> : <div className="rounded-[28px] border border-dashed bg-white/70 p-12 text-center text-slate-500">لا توجد سجلات مطابقة.</div>}

      {totalPages > 1 && <div className="flex justify-center gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>السابق</Button><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>التالي</Button></div>}
    </div>
  );
};
