import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, CheckCircle2, ClipboardCheck, Eye, FileSpreadsheet, History, Loader2, PlusCircle, Printer, RefreshCw, RotateCcw, Search, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import {
  approveAssetCycle,
  confirmAssetCycleRecord,
  createAssetCycle,
  deleteAssetCycle,
  getAssetCycleComparison,
  getAssetCycleRecords,
  getAssetCycles,
  reopenAssetCycle,
  sendAssetCycleToReview,
  type AssetCycleComparison,
  type AssetCycleRecord,
  type AssetUpdateCycle,
} from '../api/assetCycles';

const cycleStatusLabel: Record<string, string> = {
  draft: 'مسودة',
  under_review: 'تحت المراجعة',
  approved: 'معتمدة',
  archived: 'مؤرشفة',
};

const cycleStatusClass: Record<string, string> = {
  draft: 'border-amber-200 bg-amber-50 text-amber-800',
  under_review: 'border-sky-200 bg-sky-50 text-sky-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  archived: 'border-slate-200 bg-slate-100 text-slate-700',
};

const changeLabel: Record<string, string> = {
  new: 'جديد', modified: 'معدل', unchanged: 'بدون تغيير', baseline: 'تأسيسي', manual: 'يدوي', missing: 'غير موجود بالتحديث',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const esc = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const Summary = ({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' }) => {
  const cls = {
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-800',
    sky: 'border-sky-200 bg-sky-50/70 text-sky-800',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-800',
    slate: 'border-slate-200 bg-white/80 text-slate-800',
  }[tone];
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="text-xs font-bold opacity-75">{label}</div><div className="mt-2 text-2xl font-black">{Number(value || 0).toLocaleString('ar-SA')}</div></div>;
};

export const AssetCyclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('assets', 'canAdd');
  const canEdit = isAdmin || hasPermission('assets', 'canEdit');
  const canDelete = isAdmin || hasPermission('assets', 'canDelete');
  const canPrint = isAdmin || hasPermission('assets', 'canPrint');

  const [cycles, setCycles] = useState<AssetUpdateCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<AssetUpdateCycle | null>(null);
  const [comparison, setComparison] = useState<AssetCycleComparison | null>(null);
  const [records, setRecords] = useState<AssetCycleRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [search, setSearch] = useState('');
  const [changeType, setChangeType] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');

  const loadCycles = async () => {
    setLoading(true);
    try {
      const data = await getAssetCycles();
      setCycles(data);
      if (selectedCycle) {
        const fresh = data.find((cycle) => cycle.id === selectedCycle.id) || null;
        setSelectedCycle(fresh);
        if (fresh) setComparison(fresh.comparison || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورات تحديث الأصول');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCycles(); }, []);

  const currentCycle = useMemo(() => cycles.find((cycle) => cycle.isCurrent) || null, [cycles]);
  const openCycle = useMemo(() => cycles.find((cycle) => ['draft', 'under_review'].includes(cycle.status) && !cycle.isCurrent) || null, [cycles]);

  const loadRecords = async (cycle: AssetUpdateCycle, page = 1) => {
    setRecordsLoading(true);
    try {
      const [pageData, comp] = await Promise.all([
        getAssetCycleRecords(cycle.id, { page, limit: 50, search, changeType, reviewStatus }),
        getAssetCycleComparison(cycle.id),
      ]);
      setSelectedCycle(cycle);
      setRecords(pageData.items);
      setRecordsTotal(pageData.total);
      setRecordsPage(pageData.page);
      setComparison(comp);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات الدورة');
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (createName.trim().length < 3) return toast.error('أدخل اسم دورة واضحًا');
    setBusyId('create');
    try {
      const created = await createAssetCycle({ name: createName.trim(), description: createDescription.trim() || null });
      setCreateName(''); setCreateDescription(''); setShowCreate(false);
      toast.success('تم إنشاء دورة تحديث الأصول');
      await loadCycles();
      navigate(`/assets/import?cycleId=${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الدورة');
    } finally { setBusyId(''); }
  };

  const lifecycle = async (cycle: AssetUpdateCycle, action: 'review' | 'reopen' | 'approve' | 'delete') => {
    setBusyId(cycle.id + action);
    try {
      if (action === 'review') {
        await sendAssetCycleToReview(cycle.id);
        toast.success('تم إرسال دورة الأصول للمراجعة وتجميد تعديل بياناتها');
      } else if (action === 'reopen') {
        await reopenAssetCycle(cycle.id);
        toast.success('تمت إعادة الدورة إلى المسودة');
      } else if (action === 'approve') {
        const comp = await getAssetCycleComparison(cycle.id);
        const warning = comp.removed > 0 ? `\n\nتنبيه: يوجد ${comp.removed.toLocaleString('ar-SA')} أصل لم يظهر في التحديث الجديد، وسيبقى محفوظًا تاريخيًا ويصنف «غير موجود في الدورة الحالية».` : '';
        if (!window.confirm(`سيتم اعتماد «${cycle.name}» وجعلها البيانات الحالية للأصول، مع أرشفة الدورة السابقة.${warning}\n\nهل ترغب بالمتابعة؟`)) return;
        await approveAssetCycle(cycle.id);
        toast.success('تم اعتماد دورة الأصول وأصبحت هي البيانات الحالية');
      } else {
        if (!window.confirm(`حذف مسودة الدورة «${cycle.name}»؟ لا يؤثر ذلك على البيانات الحالية المعتمدة.`)) return;
        await deleteAssetCycle(cycle.id);
        toast.success('تم حذف مسودة الدورة');
      }
      setSelectedCycle(null); setRecords([]); setComparison(null);
      await loadCycles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء');
    } finally { setBusyId(''); }
  };

  const confirmRecord = async (record: AssetCycleRecord) => {
    if (!selectedCycle) return;
    try {
      await confirmAssetCycleRecord(selectedCycle.id, record.id);
      toast.success('تم تأكيد السجل بعد المراجعة');
      await loadRecords(selectedCycle, recordsPage);
      await loadCycles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تأكيد السجل');
    }
  };

  const printCycleReport = async (cycle: AssetUpdateCycle) => {
    if (!canPrint) return;
    setBusyId(cycle.id + 'print');
    try {
      const comp = await getAssetCycleComparison(cycle.id);
      const all: AssetCycleRecord[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const result = await getAssetCycleRecords(cycle.id, { page, limit: 500 });
        all.push(...result.items);
        totalPages = result.totalPages || 1;
        page += 1;
      } while (page <= totalPages && all.length < 20000);
      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (!win) throw new Error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
      const rowsHtml = all.map((record, index) => `<tr><td>${index + 1}</td><td>${esc(record.itemNumber || '—')}</td><td>${esc(record.name)}</td><td>${esc(record.department || '—')}</td><td>${esc(changeLabel[record.changeType] || record.changeType)}</td><td>${esc((record.changedFields || []).join('، ') || '—')}</td></tr>`).join('');
      win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(cycle.name)}</title><style>body{font-family:Arial,Tahoma,sans-serif;color:#172033;margin:28px}h1{font-size:24px} .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.box{border:1px solid #cbd5e1;border-radius:12px;padding:10px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:right}th{background:#f1f5f9}@media print{body{margin:10mm}.no-print{display:none}}</style></head><body><h1>تقرير دورة تحديث بيانات الأصول</h1><h2>${esc(cycle.name)}</h2><p>الدورة رقم #${cycle.cycleNumber} — الحالة: ${esc(cycleStatusLabel[cycle.status] || cycle.status)} — تاريخ الاعتماد: ${esc(formatDate(cycle.approvedAt))}</p><div class="meta"><div class="box">إجمالي الدورة<br><b>${comp.totalTarget.toLocaleString('ar-SA')}</b></div><div class="box">جديد<br><b>${comp.new.toLocaleString('ar-SA')}</b></div><div class="box">معدل<br><b>${comp.modified.toLocaleString('ar-SA')}</b></div><div class="box">لم يظهر بالتحديث<br><b>${comp.removed.toLocaleString('ar-SA')}</b></div></div><table><thead><tr><th>#</th><th>رقم الصنف</th><th>الأصل</th><th>الجهة</th><th>نوع التغيير</th><th>الحقول المتغيرة</th></tr></thead><tbody>${rowsHtml}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
      win.document.close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء تقرير الدورة');
    } finally { setBusyId(''); }
  };

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 pb-10" dir="rtl">
      <Card className="overflow-hidden rounded-[32px] border text-[color:var(--asset-dashboard-text,#fff)]" style={{ background: 'var(--asset-dashboard-overlay, linear-gradient(135deg,#23364a 0%,#122941 44%,#0a1f36 100%))', borderColor: 'var(--asset-dashboard-border,rgba(255,255,255,.20))', boxShadow: '0 26px 75px color-mix(in srgb, var(--asset-dashboard-base,#10243b) 32%, transparent)' }}>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2"><Badge className="border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))] bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] text-[color:var(--asset-dashboard-text,#fff)]"><History className="ml-1 h-3.5 w-3.5" />سجل تاريخي كامل</Badge><Badge className="border-emerald-300/30 bg-emerald-300/15 text-[color:var(--asset-dashboard-text,#fff)]"><ShieldCheck className="ml-1 h-3.5 w-3.5 text-emerald-300" />لا حذف للبيانات القديمة</Badge></div>
              <h1 className="text-3xl font-black sm:text-4xl">دورات تحديث بيانات الأصول</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--asset-dashboard-muted,#cbd5e1)]">كل تحديث يحفظ كإصدار مستقل. الدورة الجديدة تمر بالاستيراد والمقارنة والمراجعة قبل أن تصبح هي البيانات الحالية، وتبقى الإصدارات السابقة مؤرشفة وقابلة للعرض والتقرير.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canAdd && <Button className="border-0 text-white shadow-lg hover:brightness-110" style={{ background: 'var(--asset-dashboard-button,#123d73)' }} onClick={() => openCycle ? navigate(`/assets/import?cycleId=${openCycle.id}`) : setShowCreate(true)}><PlusCircle className="ml-2 h-4 w-4" />{openCycle ? 'استكمال الدورة المفتوحة' : 'إنشاء دورة جديدة'}</Button>}
              <Button variant="outline" className="border-[color:var(--asset-dashboard-inner-border,rgba(255,255,255,.12))] bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] text-[color:var(--asset-dashboard-text,#fff)] hover:bg-[var(--asset-dashboard-soft,rgba(255,255,255,.10))] hover:text-[color:var(--asset-dashboard-text,#fff)]" onClick={() => navigate('/assets')}><ArrowLeft className="ml-2 h-4 w-4" />لوحة الأصول</Button>
            </div>
          </div>
          {currentCycle && <div className="mt-6 rounded-2xl border p-4" style={{ background: 'var(--asset-dashboard-panel-strong,rgba(255,255,255,.105))', borderColor: 'var(--asset-dashboard-inner-border,rgba(255,255,255,.12))' }}><div className="text-xs font-bold text-[color:var(--asset-dashboard-muted,#cbd5e1)]">الدورة الحالية المعتمدة</div><div className="mt-1 text-lg font-black">#{currentCycle.cycleNumber} — {currentCycle.name}</div><div className="mt-2 text-xs text-[color:var(--asset-dashboard-muted,#cbd5e1)]">{currentCycle.recordCount.toLocaleString('ar-SA')} سجل — اعتمدت في {formatDate(currentCycle.approvedAt)}</div></div>}
        </CardContent>
      </Card>

      {showCreate && canAdd && !openCycle && <Card className="rounded-[28px] border-border/80 bg-card/95 shadow-sm"><CardHeader><CardTitle>إنشاء دورة تحديث جديدة</CardTitle></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2"><div><label className="mb-2 block text-xs font-bold">اسم الدورة</label><Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="مثال: تحديث بيانات الأصول — الربع الثالث 2026" /></div><div><label className="mb-2 block text-xs font-bold">وصف مختصر</label><Textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} className="min-h-10" placeholder="مصدر البيانات أو سبب التحديث" /></div><div className="flex gap-2 lg:col-span-2"><Button onClick={() => void handleCreate()} disabled={busyId === 'create'}>{busyId === 'create' ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}إنشاء والانتقال للاستيراد</Button><Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button></div></CardContent></Card>}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">سجل الدورات</h2><p className="text-xs text-muted-foreground">الدورات المعتمدة والمؤرشفة لا يمكن حذفها أو تعديل بياناتها.</p></div><Button variant="outline" onClick={() => void loadCycles()} disabled={loading}><RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث</Button></div>
        {loading ? <Card><CardContent className="flex items-center justify-center gap-2 p-10"><Loader2 className="h-5 w-5 animate-spin" />جارٍ تحميل الدورات...</CardContent></Card> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {cycles.map((cycle) => {
              const comp = cycle.comparison;
              return <Card key={cycle.id} className={`rounded-[26px] bg-card/95 text-card-foreground shadow-sm ${cycle.isCurrent ? 'border-emerald-400/70 ring-1 ring-emerald-300/20' : 'border-border/80'}`}><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black">#{cycle.cycleNumber} — {cycle.name}</h3>{cycle.isCurrent && <Badge className="bg-emerald-600">الحالية</Badge>}<Badge variant="outline" className={cycleStatusClass[cycle.status] || ''}>{cycleStatusLabel[cycle.status] || cycle.status}</Badge></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{cycle.description || 'لا يوجد وصف إضافي.'}</p></div><div className="text-left text-xs text-muted-foreground">{cycle.recordCount.toLocaleString('ar-SA')} سجل</div></div>{comp && <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs"><div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-2 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-200"><b>{comp.new.toLocaleString('ar-SA')}</b><br />جديد</div><div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-2 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"><b>{comp.modified.toLocaleString('ar-SA')}</b><br />معدل</div><div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-2 text-sky-900 dark:border-sky-700/50 dark:bg-sky-950/30 dark:text-sky-200"><b>{comp.unchanged.toLocaleString('ar-SA')}</b><br />ثابت</div><div className="rounded-xl border border-rose-200/80 bg-rose-50/70 p-2 text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/30 dark:text-rose-200"><b>{comp.removed.toLocaleString('ar-SA')}</b><br />لم يظهر</div></div>}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void loadRecords(cycle, 1)}><Eye className="ml-1.5 h-4 w-4" />عرض البيانات</Button>{canPrint && <Button size="sm" variant="outline" onClick={() => void printCycleReport(cycle)} disabled={busyId === cycle.id + 'print'}><Printer className="ml-1.5 h-4 w-4" />تقرير الدورة</Button>}{cycle.status === 'draft' && canAdd && <Button size="sm" onClick={() => navigate(`/assets/import?cycleId=${cycle.id}`)}><FileSpreadsheet className="ml-1.5 h-4 w-4" />استيراد / استكمال</Button>}{cycle.status === 'draft' && canEdit && <Button size="sm" variant="outline" onClick={() => void lifecycle(cycle, 'review')}><ClipboardCheck className="ml-1.5 h-4 w-4" />إرسال للمراجعة</Button>}{cycle.status === 'under_review' && canEdit && <><Button size="sm" variant="outline" onClick={() => void lifecycle(cycle, 'reopen')}><RotateCcw className="ml-1.5 h-4 w-4" />إعادة للمسودة</Button><Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" onClick={() => void lifecycle(cycle, 'approve')}><CheckCircle2 className="ml-1.5 h-4 w-4" />اعتماد الدورة</Button></>}{['draft', 'under_review'].includes(cycle.status) && !cycle.isCurrent && canDelete && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void lifecycle(cycle, 'delete')}><Trash2 className="ml-1.5 h-4 w-4" />حذف المسودة</Button>}</div><div className="mt-3 text-[11px] text-muted-foreground">أُنشئت: {formatDate(cycle.createdAt)} {cycle.approvedAt ? `— الاعتماد: ${formatDate(cycle.approvedAt)}` : ''}</div></CardContent></Card>;
            })}
          </div>
        )}
      </section>

      {selectedCycle && <Card className="rounded-[28px] border-border/80 bg-card/95 text-card-foreground"><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3"><span>بيانات الدورة #{selectedCycle.cycleNumber} — {selectedCycle.name}</span><Button variant="outline" size="sm" onClick={() => { setSelectedCycle(null); setRecords([]); }}>إغلاق العرض</Button></CardTitle></CardHeader><CardContent className="space-y-5">{comparison && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7"><Summary label="الإجمالي" value={comparison.totalTarget} /><Summary label="جديد" value={comparison.new} tone="emerald" /><Summary label="معدل" value={comparison.modified} tone="amber" /><Summary label="بدون تغيير" value={comparison.unchanged} tone="sky" /><Summary label="لم يظهر" value={comparison.removed} tone="rose" /><Summary label="يحتاج مراجعة" value={comparison.needsReview} tone="amber" /><Summary label="الدورة السابقة" value={comparison.totalBase} /></div>}<div className="grid gap-2 lg:grid-cols-[1fr_190px_190px_auto]"><div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" placeholder="بحث برقم الصنف أو الأصل أو الجهة..." /></div><select className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground" value={changeType} onChange={(e) => setChangeType(e.target.value)}><option value="all">كل التغييرات</option><option value="new">جديد</option><option value="modified">معدل</option><option value="unchanged">بدون تغيير</option><option value="baseline">تأسيسي</option></select><select className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}><option value="all">كل حالات المراجعة</option><option value="needs_review">يحتاج مراجعة</option><option value="reviewed">تمت مراجعته</option><option value="auto">مطابقة آلية</option></select><Button variant="outline" onClick={() => void loadRecords(selectedCycle, 1)}>تطبيق</Button></div>{recordsLoading ? <div className="flex items-center justify-center gap-2 p-10"><Loader2 className="h-5 w-5 animate-spin" />جارٍ تحميل البيانات...</div> : <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="p-3 text-right">رقم الصنف</th><th className="p-3 text-right">الأصل</th><th className="p-3 text-right">الجهة / الموقع</th><th className="p-3 text-right">نوع التغيير</th><th className="p-3 text-right">الحقول المتغيرة</th><th className="p-3 text-right">المراجعة</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t align-top"><td className="p-3 font-bold">{record.itemNumber || '—'}</td><td className="p-3"><div className="font-bold">{record.name}</div><div className="text-xs text-muted-foreground">{record.category}</div></td><td className="p-3">{record.department || '—'}<div className="text-xs text-muted-foreground">{record.building || ''}</div></td><td className="p-3"><Badge variant="outline">{changeLabel[record.changeType] || record.changeType}</Badge></td><td className="max-w-[360px] p-3 text-xs leading-6">{(record.changedFields || []).length ? (record.changedFields || []).slice(0, 8).join('، ') : '—'}</td><td className="p-3">{record.reviewStatus === 'needs_review' ? <div className="space-y-2"><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800"><TriangleAlert className="ml-1 h-3.5 w-3.5" />يحتاج مراجعة</Badge>{canEdit && ['draft', 'under_review'].includes(selectedCycle.status) && <Button size="sm" variant="outline" onClick={() => void confirmRecord(record)}>تأكيد السجل</Button>}</div> : record.reviewStatus === 'reviewed' ? <Badge className="bg-emerald-600">تمت المراجعة</Badge> : <Badge variant="outline">مطابقة آلية</Badge>}</td></tr>)}{records.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">لا توجد سجلات مطابقة للفلاتر الحالية.</td></tr>}</tbody></table></div>}<div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي النتائج: {recordsTotal.toLocaleString('ar-SA')}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={recordsPage <= 1} onClick={() => void loadRecords(selectedCycle, recordsPage - 1)}>السابق</Button><span className="flex items-center px-2">صفحة {recordsPage.toLocaleString('ar-SA')}</span><Button size="sm" variant="outline" disabled={records.length < 50 || recordsPage * 50 >= recordsTotal} onClick={() => void loadRecords(selectedCycle, recordsPage + 1)}>التالي</Button></div></div></CardContent></Card>}

      {openCycle && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900"><Archive className="mt-0.5 h-5 w-5 shrink-0" /><div><b>توجد دورة مفتوحة:</b> {openCycle.name}. النظام يمنع إنشاء دورة ثانية قبل إنهاء الحالية حتى لا تتداخل الإصدارات.</div></div>}
    </div>
  );
};
