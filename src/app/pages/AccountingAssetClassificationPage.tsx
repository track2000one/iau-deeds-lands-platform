import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  BookOpenCheck,
  Boxes,
  CalendarClock,
  FileSpreadsheet,
  Layers3,
  LibraryBig,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Tags,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  getAccountingAssetClassificationOptions,
  getAccountingAssetClassifications,
  getAccountingAssetClassificationStats,
  getAccountingAssetClassificationVersions,
  getAccountingAssetUsefulLives,
  importAccountingAssetClassificationCatalog,
  type AccountingAssetClassificationOptions,
  type AccountingAssetClassificationRow,
  type AccountingAssetClassificationStats,
  type AccountingAssetClassificationVersion,
  type AccountingAssetUsefulLifeRow,
} from '../api/accountingAssetClassification';
import {
  parseAccountingAssetClassificationWorkbook,
  type ParsedAccountingAssetClassificationWorkbook,
} from '../../utils/accountingAssetClassificationExcel';

const emptyStats: AccountingAssetClassificationStats = {
  version: null,
  classificationCount: 0,
  usefulLifeCount: 0,
  level1Count: 0,
  level2Count: 0,
  level3Count: 0,
  accountingGroupCount: 0,
  newAssetCount: 0,
  oldAssetCount: 0,
};

const PAGE_SIZE = 50;
const card3d = 'border-slate-200/80 bg-white/90 shadow-[0_8px_0_rgba(15,23,42,.06),0_18px_42px_rgba(15,23,42,.07),inset_0_1px_0_rgba(255,255,255,1)]';
const button3d = 'shadow-[0_4px_0_rgba(15,23,42,.10),0_8px_16px_rgba(15,23,42,.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(15,23,42,.08)]';

const formatNumber = (value?: number | null) => value == null ? '—' : value.toLocaleString('ar-SA');
const formatMoney = (value?: number | null, raw?: string | null) => {
  if (value == null) return raw || '—';
  return `${value.toLocaleString('ar-SA')} ر.س`;
};
const statusLabel = (value?: string | null) => /new/i.test(String(value || '')) ? 'جديد' : /old/i.test(String(value || '')) ? 'سابق' : value || '—';
const statusClass = (value?: string | null) => /new/i.test(String(value || ''))
  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
  : 'border-slate-300 bg-slate-50 text-slate-600';

export const AccountingAssetClassificationPage: React.FC = () => {
  const { isAdmin, hasPermission } = usePermissions();
  const canImport = isAdmin || hasPermission('accounting_transformation', 'canAdd');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [tab, setTab] = useState<'classification' | 'usefulLife'>('classification');
  const [stats, setStats] = useState<AccountingAssetClassificationStats>(emptyStats);
  const [versions, setVersions] = useState<AccountingAssetClassificationVersion[]>([]);
  const [options, setOptions] = useState<AccountingAssetClassificationOptions>({ levels1: [], accountingGroups: [] });
  const [classifications, setClassifications] = useState<AccountingAssetClassificationRow[]>([]);
  const [usefulLives, setUsefulLives] = useState<AccountingAssetUsefulLifeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [level1Code, setLevel1Code] = useState('all');
  const [accountingGroupCode, setAccountingGroupCode] = useState('all');
  const [lifecycleStatus, setLifecycleStatus] = useState('all');

  const [importDialog, setImportDialog] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedAccountingAssetClassificationWorkbook | null>(null);
  const [versionLabel, setVersionLabel] = useState('');

  const loadMeta = async () => {
    setLoadingMeta(true);
    try {
      const [statsData, versionData, optionData] = await Promise.all([
        getAccountingAssetClassificationStats(),
        getAccountingAssetClassificationVersions(),
        getAccountingAssetClassificationOptions(),
      ]);
      setStats(statsData || emptyStats);
      setVersions(versionData || []);
      setOptions(optionData || { levels1: [], accountingGroups: [] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات دليل تصنيف الأصول');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => { loadMeta(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoadingRows(true);
      try {
        if (tab === 'classification') {
          const data = await getAccountingAssetClassifications({ search, level1Code, accountingGroupCode, lifecycleStatus, page, limit: PAGE_SIZE });
          setClassifications(data.items || []);
          setUsefulLives([]);
          setTotal(data.total || 0);
          setPages(data.pages || 0);
        } else {
          const data = await getAccountingAssetUsefulLives({ search, lifecycleStatus, page, limit: PAGE_SIZE });
          setUsefulLives(data.items || []);
          setClassifications([]);
          setTotal(data.total || 0);
          setPages(data.pages || 0);
        }
      } catch (error) {
        setClassifications([]);
        setUsefulLives([]);
        setTotal(0);
        setPages(0);
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجلات الدليل');
      } finally {
        setLoadingRows(false);
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [tab, search, level1Code, accountingGroupCode, lifecycleStatus, page, stats.version?.id]);

  useEffect(() => { setPage(1); }, [tab, search, level1Code, accountingGroupCode, lifecycleStatus]);

  const selectFile = () => fileInputRef.current?.click();

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) return toast.error('يرجى اختيار ملف Excel بصيغة XLSX.');
    setParsing(true);
    try {
      const result = await parseAccountingAssetClassificationWorkbook(file);
      setParsed(result);
      setVersionLabel(result.versionLabel);
      setImportDialog(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحليل ملف التصنيف والترميز');
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!parsed) return;
    if (!versionLabel.trim()) return toast.error('اكتب مسمى إصدار الدليل قبل الاستيراد.');
    setImporting(true);
    try {
      const { summary: _summary, ...input } = parsed;
      const result = await importAccountingAssetClassificationCatalog({ ...input, versionLabel: versionLabel.trim() });
      toast.success(`تم اعتماد ${result.imported.classifications.toLocaleString('ar-SA')} رمزًا و${result.imported.usefulLives.toLocaleString('ar-SA')} سجل عمر إنتاجي.`);
      setImportDialog(false);
      setParsed(null);
      setPage(1);
      await loadMeta();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد الدليل');
    } finally {
      setImporting(false);
    }
  };

  const kpis = [
    { label: 'سجلات الترميز', value: stats.classificationCount, icon: Tags },
    { label: 'المستوى الأول', value: stats.level1Count, icon: Layers3 },
    { label: 'المستوى الثاني', value: stats.level2Count, icon: Boxes },
    { label: 'المستوى الثالث', value: stats.level3Count, icon: LibraryBig },
    { label: 'المجموعات المحاسبية', value: stats.accountingGroupCount, icon: BookOpenCheck },
    { label: 'الأعمار وحدود الرسملة', value: stats.usefulLifeCount, icon: CalendarClock },
  ];

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-8" dir="rtl">
      <input ref={fileInputRef} className="hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} />

      <section className="relative overflow-hidden rounded-[32px] border border-slate-300/40 bg-[radial-gradient(circle_at_84%_10%,rgba(56,189,248,.16),transparent_28%),linear-gradient(135deg,#263b51_0%,#122a42_48%,#0a2138_100%)] p-5 text-white shadow-[0_28px_70px_rgba(2,8,23,.24)] sm:p-7">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border border-white/15 bg-white/10 text-white hover:bg-white/10">لجنة متابعة متطلبات التحول المحاسبي</Badge>
              <Badge className="border border-cyan-200/20 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/10"><ShieldCheck className="ml-1 h-3.5 w-3.5" />بيانات مرجعية محاسبية</Badge>
              {stats.version && <Badge className="border border-emerald-200/20 bg-emerald-300/10 text-emerald-50 hover:bg-emerald-300/10">{stats.version.versionLabel}</Badge>}
            </div>
            <h1 className="text-2xl font-black sm:text-4xl">تصنيف وترميز الأصول</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">الدليل المرجعي لتصنيف الأصول، رموز المجموعات والحسابات المحاسبية، والأعمار الإنتاجية وحدود الرسملة. تدار النسخة المعتمدة من اللجنة وتُستخدم مرجعيًا في وحدات المنصة ذات العلاقة.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => { loadMeta(); setPage(1); }}><RefreshCcw className="ml-2 h-4 w-4" />تحديث</Button>
            {canImport && <Button className="bg-cyan-400 px-5 font-black text-slate-950 hover:bg-cyan-300" onClick={selectFile} disabled={parsing}>{parsing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}{stats.version ? 'تحديث إصدار الدليل' : 'استيراد الدليل الرسمي'}</Button>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon }) => <Card key={label} className={card3d}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black text-slate-800">{loadingMeta ? '...' : value.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border border-sky-200 bg-sky-50 p-2.5 text-sky-700 shadow-sm"><Icon className="h-5 w-5" /></div></CardContent></Card>)}
      </section>

      <Card className={`${card3d} overflow-hidden`}>
        <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div>
            <div><p className="font-black text-slate-800">مرجعية الدليل</p><p className="mt-1 text-sm leading-6 text-muted-foreground">الملكية والإدارة داخل لجنة متابعة متطلبات التحول المحاسبي. ويمكن لاحقًا ربط وحدة الأصول بهذا الدليل للاختيار التلقائي للرمز وحد الرسملة والعمر الإنتاجي دون السماح بتعديل المصدر المرجعي.</p></div>
          </div>
          {stats.version && <div className="rounded-2xl border bg-slate-50 px-4 py-3 text-xs leading-6"><strong>المصدر:</strong> {stats.version.sourceFileName}<br /><strong>آخر اعتماد:</strong> {new Date(stats.version.importedAt).toLocaleString('ar-SA')}</div>}
        </CardContent>
      </Card>

      {!stats.version && !loadingMeta ? (
        <Card className={card3d}><CardContent className="py-14 text-center"><FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black">لم يتم استيراد دليل التصنيف والترميز بعد</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">يتم استيراد ملف Excel الرسمي الخاص بلجنة متابعة متطلبات التحول المحاسبي، ثم يحفظ النظام بياناته كإصدار مرجعي مستقل مع الاحتفاظ بالإصدارات السابقة.</p>{canImport && <Button className={`mt-5 ${button3d}`} onClick={selectFile}><Upload className="ml-2 h-4 w-4" />استيراد ملف XLSX</Button>}</CardContent></Card>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'classification' | 'usefulLife')} className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-2xl border bg-white/85 p-2 shadow-sm">
            <TabsTrigger value="classification" className="gap-2"><Tags className="h-4 w-4" />تصنيف وترميز الأصول <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{stats.classificationCount.toLocaleString('ar-SA')}</span></TabsTrigger>
            <TabsTrigger value="usefulLife" className="gap-2"><CalendarClock className="h-4 w-4" />الأعمار الإنتاجية وحدود الرسملة <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{stats.usefulLifeCount.toLocaleString('ar-SA')}</span></TabsTrigger>
          </TabsList>

          <Card className={card3d}>
            <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative xl:col-span-2"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" placeholder="بحث بالاسم أو الرمز أو الحساب..." /></div>
              {tab === 'classification' && <NativeSelect value={level1Code} onChange={(e) => setLevel1Code(e.target.value)}><option value="all">جميع التصنيفات الرئيسية</option>{options.levels1.map((item) => <option key={item.level1Code} value={item.level1Code}>{item.level1Code} — {item.level1Ar}</option>)}</NativeSelect>}
              {tab === 'classification' && <NativeSelect value={accountingGroupCode} onChange={(e) => setAccountingGroupCode(e.target.value)}><option value="all">جميع المجموعات المحاسبية</option>{options.accountingGroups.map((item) => <option key={item.accountingGroupCode} value={item.accountingGroupCode}>{item.accountingGroupCode} — {item.accountingGroupAr}</option>)}</NativeSelect>}
              <NativeSelect value={lifecycleStatus} onChange={(e) => setLifecycleStatus(e.target.value)}><option value="all">جميع الحالات</option><option value="New">جديد في الإصدار</option><option value="Old">سابق</option></NativeSelect>
            </CardContent>
          </Card>

          <TabsContent value="classification" className="mt-0">
            <Card className={`${card3d} overflow-hidden`}>
              <CardHeader className="border-b bg-slate-50/70 pb-4"><CardTitle className="flex items-center gap-2 text-lg"><Tags className="h-5 w-5" />دليل التصنيف والترميز</CardTitle><CardDescription>يعرض التسلسل الهرمي للتصنيف والربط بالمجموعة والحسابات المحاسبية.</CardDescription></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-right text-xs"><thead className="bg-slate-100/90 text-slate-600"><tr><Th>المستوى الأول</Th><Th>المستوى الثاني</Th><Th>المستوى الثالث</Th><Th>المجموعة المحاسبية</Th><Th>رمز الأصل المحاسبي</Th><Th>حساب تكلفة الأصل</Th><Th>الحساب الوسيط</Th><Th>الحالة</Th></tr></thead><tbody className="divide-y">{loadingRows ? <LoadingRows colSpan={8} /> : classifications.map((row) => <tr key={row.id} className="bg-white hover:bg-sky-50/35"><Td><Code value={row.level1Code} /><div className="font-bold">{row.level1Ar}</div><Muted>{row.level1En}</Muted></Td><Td><Code value={row.level2Code} /><div className="font-bold">{row.level2Ar}</div><Muted>{row.level2En}</Muted></Td><Td><Code value={row.level3Code} /><div className="font-bold">{row.level3Ar}</div><Muted>{row.level3En}</Muted></Td><Td><Code value={row.accountingGroupCode} /><div className="font-bold">{row.accountingGroupAr}</div><Muted>{row.accountingGroupEn}</Muted></Td><Td><Code value={row.accountingAssetCode} large /></Td><Td><Code value={row.assetCostAccountCode} /><div className="mt-1 max-w-[240px] leading-5">{row.assetCostAccountName || '—'}</div></Td><Td><Code value={row.clearingAccountCode} /><div className="mt-1 max-w-[240px] leading-5">{row.clearingAccountName || '—'}</div></Td><Td><Badge variant="outline" className={statusClass(row.lifecycleStatus)}>{statusLabel(row.lifecycleStatus)}</Badge></Td></tr>)}{!loadingRows && !classifications.length && <EmptyRow colSpan={8} />}</tbody></table></div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usefulLife" className="mt-0">
            <Card className={`${card3d} overflow-hidden`}>
              <CardHeader className="border-b bg-slate-50/70 pb-4"><CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5" />الأعمار الإنتاجية وحدود الرسملة</CardTitle><CardDescription>مرجع العمر المحاسبي وحد الرسملة لكل تصنيف من المستوى الثالث.</CardDescription></CardHeader>
              <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-right text-xs"><thead className="bg-slate-100/90 text-slate-600"><tr><Th>المستوى الأول</Th><Th>المستوى الثاني</Th><Th>المستوى الثالث</Th><Th>حد الرسملة</Th><Th>الحد الأدنى للعمر</Th><Th>الحد الأعلى للعمر</Th><Th>العمر الافتراضي</Th><Th>الحالة</Th></tr></thead><tbody className="divide-y">{loadingRows ? <LoadingRows colSpan={8} /> : usefulLives.map((row) => <tr key={row.id} className="bg-white hover:bg-sky-50/35"><Td><div className="font-bold">{row.level1Ar}</div><Muted>{row.level1En}</Muted></Td><Td><div className="font-bold">{row.level2Ar}</div><Muted>{row.level2En}</Muted></Td><Td><div className="font-bold">{row.level3Ar}</div><Muted>{row.level3En}</Muted></Td><Td className="font-black text-slate-800">{formatMoney(row.capitalizationLimit, row.capitalizationLimitRaw)}</Td><Td>{formatNumber(row.minimumUsefulLife)}</Td><Td>{formatNumber(row.maximumUsefulLife)}</Td><Td className="font-black">{formatNumber(row.defaultUsefulLife)}</Td><Td><Badge variant="outline" className={statusClass(row.lifecycleStatus)}>{statusLabel(row.lifecycleStatus)}</Badge></Td></tr>)}{!loadingRows && !usefulLives.length && <EmptyRow colSpan={8} />}</tbody></table></div></CardContent>
            </Card>
          </TabsContent>

          <div className="flex flex-col gap-3 rounded-2xl border bg-white/80 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <span>عرض {total ? ((page - 1) * PAGE_SIZE + 1).toLocaleString('ar-SA') : 0}–{Math.min(page * PAGE_SIZE, total).toLocaleString('ar-SA')} من {total.toLocaleString('ar-SA')}</span>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" className={button3d} disabled={page <= 1 || loadingRows} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</Button><span className="min-w-24 text-center font-bold">صفحة {page.toLocaleString('ar-SA')} من {Math.max(1, pages).toLocaleString('ar-SA')}</span><Button variant="outline" size="sm" className={button3d} disabled={page >= pages || loadingRows} onClick={() => setPage((value) => Math.min(pages, value + 1))}>التالي</Button></div>
          </div>
        </Tabs>
      )}

      {versions.length > 0 && <Card className={card3d}><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Archive className="h-5 w-5" />إصدارات الدليل</CardTitle><CardDescription>يحفظ النظام كل إصدار تم استيراده، بينما يستخدم الإصدار الحالي في البحث والربط التشغيلي.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{versions.slice(0, 6).map((version) => <div key={version.id} className={`rounded-2xl border p-4 ${version.isCurrent ? 'border-emerald-200 bg-emerald-50/70' : 'bg-slate-50/70'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black">{version.versionLabel}</p><p className="mt-1 text-xs text-muted-foreground">{version.sourceFileName}</p></div>{version.isCurrent && <Badge className="bg-emerald-600">الحالي</Badge>}</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><span>الترميز: <strong>{version.classificationCount.toLocaleString('ar-SA')}</strong></span><span>الأعمار: <strong>{version.usefulLifeCount.toLocaleString('ar-SA')}</strong></span></div><p className="mt-3 text-[11px] text-muted-foreground">{new Date(version.importedAt).toLocaleString('ar-SA')}</p></div>)}</CardContent></Card>}

      <Dialog open={importDialog} onOpenChange={(open) => { if (!importing) setImportDialog(open); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />استيراد إصدار دليل تصنيف وترميز الأصول</DialogTitle><DialogDescription>تمت قراءة ملف Excel والتحقق من ورقتي التصنيف والترميز والأعمار الإنتاجية وحدود الرسملة. راجع الملخص قبل الاعتماد.</DialogDescription></DialogHeader>
          {parsed && <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><PreviewMetric label="سجلات الترميز" value={parsed.classifications.length} /><PreviewMetric label="المستوى الأول" value={parsed.summary.level1Count} /><PreviewMetric label="المستوى الثالث" value={parsed.summary.level3Count} /><PreviewMetric label="الأعمار والرسملة" value={parsed.usefulLives.length} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>مسمى الإصدار *</Label><Input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="مثال: النسخة السادسة" /></div><div className="space-y-1.5"><Label>اسم الملف المصدر</Label><Input value={parsed.sourceFileName} disabled dir="ltr" /></div></div>
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="المستوى الثاني" value={parsed.summary.level2Count} /><Info label="المجموعات المحاسبية" value={parsed.summary.accountingGroupCount} /><Info label="ترميزات جديدة" value={parsed.summary.newClassificationCount} /><Info label="ترميزات سابقة" value={parsed.summary.oldClassificationCount} /></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><strong>تنبيه الإصدار:</strong> عند الاعتماد يصبح هذا الإصدار هو المرجع الحالي، ويحتفظ النظام بالإصدار السابق في سجل الإصدارات ولا يحذفه.</div>
          </div>}
          <DialogFooter className="gap-2 sm:justify-start"><Button variant="outline" onClick={() => setImportDialog(false)} disabled={importing}>إلغاء</Button><Button onClick={confirmImport} disabled={importing || !parsed}>{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="ml-2 h-4 w-4" />}{importing ? 'جاري الاعتماد...' : 'اعتماد واستيراد الإصدار'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Th = ({ children }: { children: React.ReactNode }) => <th className="whitespace-nowrap px-4 py-3 font-black">{children}</th>;
const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <td className={`align-top px-4 py-3 leading-5 ${className}`}>{children}</td>;
const Muted = ({ children }: { children?: React.ReactNode }) => children ? <div className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">{children}</div> : null;
const Code = ({ value, large = false }: { value?: string | null; large?: boolean }) => <span className={`inline-block rounded-lg border bg-slate-50 px-2 py-1 font-mono font-bold text-slate-700 ${large ? 'text-sm' : 'text-[10px]'}`} dir="ltr">{value || '—'}</span>;
const LoadingRows = ({ colSpan }: { colSpan: number }) => <tr><td colSpan={colSpan} className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-sky-600" /><p className="mt-3 text-muted-foreground">جاري تحميل البيانات...</p></td></tr>;
const EmptyRow = ({ colSpan }: { colSpan: number }) => <tr><td colSpan={colSpan} className="py-16 text-center text-muted-foreground">لا توجد نتائج مطابقة للبحث الحالي.</td></tr>;
const PreviewMetric = ({ label, value }: { label: string; value: number }) => <div className="rounded-2xl border bg-white p-4 text-center shadow-sm"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p></div>;
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>;
