import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, FileText, LandPlot, Pencil, Plus, Search, Trash2, CheckCircle2, MapPin, Ruler, Map as MapIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { InvestmentPolygonEditor } from '../components/InvestmentPolygonEditor';
import { VacantLandRelationsDialog } from '../components/VacantLandRelationsDialog';
import { getPolygonMetrics, type InvestmentPolygonFeature } from '../../features/investments/geometry';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { apiJson } from '../../lib/http';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

type Status = 'DRAFT' | 'UNDER_REVIEW' | 'VERIFIED_VACANT' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' | 'ALLOCATED';

type DeedOption = { id: string; deedNumber: string; propertyDescription: string; area: number };
type VacantLand = {
  id: string;
  code: string;
  name: string;
  campus: string;
  deedId: string;
  deed?: DeedOption | null;
  locationDescription?: string | null;
  approximateArea: string | number;
  verifiedVacantArea?: string | number | null;
  status: Status;
  currentUse?: string | null;
  allocationPurpose?: string | null;
  geometryGeoJson?: InvestmentPolygonFeature | null;
  geometrySourceName?: string | null;
  geometryUpdatedByName?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  inspectionDate?: string | null;
  inspectionNote?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
};
type FormState = {
  code: string; name: string; campus: string; deedId: string;
  locationDescription: string; approximateArea: string; verifiedVacantArea: string;
  status: Status; currentUse: string; allocationPurpose: string;
  latitude: string; longitude: string; inspectionDate: string; inspectionNote: string; notes: string;
  geometryGeoJson: InvestmentPolygonFeature | null; geometrySourceName: string;
};
const emptyForm: FormState = {
  code: '', name: '', campus: 'الحرم الجامعي الشرقي', deedId: '',
  locationDescription: '', approximateArea: '', verifiedVacantArea: '',
  status: 'DRAFT', currentUse: '', allocationPurpose: '',
  latitude: '', longitude: '', inspectionDate: '', inspectionNote: '', notes: '',
  geometryGeoJson: null, geometrySourceName: '',
};
const statusOptions: { value: Status; label: string; tone: string }[] = [
  { value: 'DRAFT', label: 'شاغرة مبدئيًا – غير معتمدة', tone: 'border-slate-500/40 bg-slate-500/10 text-foreground' },
  { value: 'UNDER_REVIEW', label: 'قيد المعاينة والتحقق', tone: 'border-blue-500/40 bg-blue-500/10 text-foreground' },
  { value: 'VERIFIED_VACANT', label: 'شاغرة بعد التحقق', tone: 'border-emerald-500/50 bg-emerald-500/10 text-foreground' },
  { value: 'PARTIALLY_OCCUPIED', label: 'مشغولة جزئيًا', tone: 'border-amber-500/40 bg-amber-500/10 text-foreground' },
  { value: 'OCCUPIED', label: 'مشغولة بالكامل', tone: 'border-rose-500/40 bg-rose-500/10 text-foreground' },
  { value: 'ALLOCATED', label: 'مخصصة لمشروع', tone: 'border-violet-500/40 bg-violet-500/10 text-foreground' },
];
const areaNumber = (value: string | number | null | undefined) => Number(value || 0);
const areaFmt = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(areaNumber(value));
const day = (date?: string | null) => date ? date.slice(0, 10) : '';
const clean = (value: string) => value.trim() || null;

const Field = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold text-foreground">{title}</Label>
    {children}
  </div>
);

export function VacantLandsPage() {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const { username, currentUser } = useAuth();
  const [items, setItems] = useState<VacantLand[]>([]);
  const [deeds, setDeeds] = useState<DeedOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VacantLand | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [query, setQuery] = useState('');
  const [campus, setCampus] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deedQuery, setDeedQuery] = useState('');
  const [relationItem, setRelationItem] = useState<VacantLand | null>(null);
  const [error, setError] = useState('');

  const canAdd = isAdmin || hasPermission('vacant_lands', 'canAdd');
  const canEdit = isAdmin || hasPermission('vacant_lands', 'canEdit');
  const canDelete = isAdmin || hasPermission('vacant_lands', 'canDelete');
  const canPrint = isAdmin || hasPermission('vacant_lands', 'canPrint');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiJson<VacantLand[]>('/api/vacant-lands');
      setItems(response);
    } catch (reason) {
      const msg = reason instanceof Error ? reason.message : 'تعذر تحميل بيانات الأراضي';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const lookupDeeds = async (q = '') => {
    try {
      const options = await apiJson<DeedOption[]>( '/api/vacant-lands/deed-options?q=' + encodeURIComponent(q.trim()));
      setDeeds(options);
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'تعذر تحميل الصكوك'); }
  };

  const allCampuses = useMemo(() => [...new Set(items.map((x) => x.campus).filter(Boolean))].sort(), [items]);
  const shown = useMemo(() => items.filter((x) => {
    const search = query.trim().toLocaleLowerCase('ar');
    return (!search || [x.name, x.code, x.campus, x.deed?.deedNumber || '', x.locationDescription || '']
      .some((v) => v.toLocaleLowerCase('ar').includes(search)))
      && (!campus || x.campus === campus)
      && (!filterStatus || x.status === filterStatus);
  }), [items, query, campus, filterStatus]);

  const verified = items.filter((x) => x.status === 'VERIFIED_VACANT');
  const verifiedArea = verified.reduce((total, x) => total + areaNumber(x.verifiedVacantArea), 0);
  const tentativeArea = items.reduce((total, x) => total + areaNumber(x.approximateArea), 0);
  const unreviewedCount = items.filter((x) => x.status === 'DRAFT' || x.status === 'UNDER_REVIEW').length;
  const filteredVerifiedArea = shown.filter((x) => x.status === 'VERIFIED_VACANT').reduce((n, x) => n + areaNumber(x.verifiedVacantArea), 0);
  const findStatus = (value: Status) => statusOptions.find((s) => s.value === value) || statusOptions[0];

  const patch = (key: keyof FormState, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDeedQuery('');
    setOpen(true);
    void lookupDeeds();
  };
  const openEdit = (x: VacantLand) => {
    setEditing(x);
    setForm({
      code: x.code,
      name: x.name,
      campus: x.campus,
      deedId: x.deedId,
      locationDescription: x.locationDescription || '',
      approximateArea: String(x.approximateArea),
      verifiedVacantArea: x.verifiedVacantArea == null ? '' : String(x.verifiedVacantArea),
      status: x.status,
      currentUse: x.currentUse || '',
      allocationPurpose: x.allocationPurpose || '',
      latitude: x.latitude == null ? '' : String(x.latitude),
      longitude: x.longitude == null ? '' : String(x.longitude),
      inspectionDate: day(x.inspectionDate),
      inspectionNote: x.inspectionNote || '',
      notes: x.notes || '',
      geometryGeoJson: x.geometryGeoJson || null,
      geometrySourceName: x.geometrySourceName || '',
    });
    setDeedQuery(x.deed?.deedNumber || '');
    setDeeds(x.deed ? [x.deed] : []);
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const area = Number(form.approximateArea);
    const official = form.verifiedVacantArea.trim() ? Number(form.verifiedVacantArea) : null;
    if (!form.deedId || !form.code.trim() || !form.name.trim() || !form.campus.trim()
        || !Number.isFinite(area) || area <= 0 || (official != null && (!Number.isFinite(official) || official < 0 || official > area))) {
      toast.error('تحقق من الصك والبيانات والمساحات، بحيث لا تتجاوز المساحة المعتمدة مساحة الموقع');
      return;
    }
    if (form.status === 'VERIFIED_VACANT' && (official == null || !isAdmin || !form.inspectionDate)) {
      toast.error('اعتماد الشغور يتطلب صلاحية مسؤول ومساحة مؤكدة وتاريخ معاينة');
      return;
    }
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      campus: form.campus.trim(),
      deedId: form.deedId,
      locationDescription: clean(form.locationDescription),
      approximateArea: area,
      verifiedVacantArea: official,
      status: form.status,
      currentUse: clean(form.currentUse),
      allocationPurpose: clean(form.allocationPurpose),
      latitude: form.latitude.trim() ? Number(form.latitude) : null,
      longitude: form.longitude.trim() ? Number(form.longitude) : null,
      inspectionDate: form.inspectionDate ? new Date(form.inspectionDate + 'T12:00:00Z').toISOString() : null,
      inspectionNote: clean(form.inspectionNote),
      notes: clean(form.notes),
      geometryGeoJson: form.geometryGeoJson,
      geometrySourceName: form.geometryGeoJson ? clean(form.geometrySourceName) : null,
    };
    try {
      setSaving(true);
      await apiJson(editing ? '/api/vacant-lands/' + encodeURIComponent(editing.id) : '/api/vacant-lands', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      toast.success(editing ? 'تم تحديث بيانات الموقع' : 'تمت إضافة الموقع مبدئيًا');
      setOpen(false);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'تعذر حفظ الموقع');
    } finally { setSaving(false); }
  };

  const remove = async (x: VacantLand) => {
    if (!window.confirm('هل تريد حذف الموقع ' + x.code + '؟ ستُسجل عملية الحذف في سجل العمليات.')) return;
    try {
      await apiJson('/api/vacant-lands/' + encodeURIComponent(x.id), { method: 'DELETE' });
      toast.success('تم حذف الموقع');
      await load();
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'تعذر الحذف'); }
  };

  const reportRows = shown.map((x) => ({
    'رمز الموقع': x.code, 'اسم الموقع': x.name, 'الحرم/النطاق': x.campus,
    'رقم الصك': x.deed?.deedNumber || '',
    'المساحة التقريبية م²': areaNumber(x.approximateArea),
    'المساحة الشاغرة المعتمدة م²': x.status === 'VERIFIED_VACANT' ? areaNumber(x.verifiedVacantArea) : '',
    'حالة الإشغال': findStatus(x.status).label,
    'الاستخدام الحالي': x.currentUse || '',
    'الموقع والوصف': x.locationDescription || '',
    'حدود الموقع': x.geometryGeoJson ? 'مدخلة - غير مساحية معتمدة' : 'غير مدخلة',
    'مصدر الحدود المعلن': x.geometrySourceName || '',
    'آخر مُحدّث': x.updatedByName || '',
  }));
  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(reportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'الأراضي الشاغرة');
    XLSX.writeFile(workbook, 'حصر-الأراضي-الشاغرة.xlsx');
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 px-3 py-5 text-foreground sm:px-6">
      <section className="print:hidden space-y-6">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-l from-primary/15 to-card p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-primary/15 p-3 text-primary"><LandPlot className="h-7 w-7" /></span>
              <div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">الأراضي الشاغرة</h1>
                <p className="mt-1 text-sm text-muted-foreground">حصر وإدارة المواقع والمساحات غير المشغولة وربطها بالصكوك العقارية</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/lands/vacant/map')}><MapIcon className="ml-2 h-4 w-4" />الخريطة التفاعلية</Button>
              {canAdd && <Button variant="outline" onClick={() => navigate('/lands/vacant/import')}><FileDown className="ml-2 h-4 w-4" />استيراد المواقع وربط الصكوك</Button>
              {canPrint && <Button variant="outline" onClick={exportExcel}><FileDown className="ml-2 h-4 w-4" />تصدير Excel</Button>}
              {canPrint && <Button variant="outline" onClick={() => window.print()}><FileText className="ml-2 h-4 w-4" />طباعة التقرير</Button>}
              {canAdd && <Button onClick={openNew}><Plus className="ml-2 h-4 w-4" />إضافة موقع</Button>}
            </div>
          </div>
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            تنبيه رقابي: المساحات التقديرية لا تعد شاغرة معتمدة إلا بعد التحقق. هذه الوحدة للحصر العقاري، ولا تتضمن اعتماد فرص أو خطط استثمارية.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'إجمالي المواقع', value: String(items.length), icon: MapPin },
            { label: 'قيد التحقق', value: String(unreviewedCount), icon: Search },
            { label: 'مواقع شاغرة معتمدة', value: String(verified.length), icon: CheckCircle2 },
            { label: 'مساحة شاغرة معتمدة (م²)', value: areaFmt(verifiedArea), icon: Ruler },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-primary/20 bg-card/85 p-4 shadow-md transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl">
              <metric.icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pr-9" placeholder="بحث برمز الموقع أو الصك أو اسم الموقع" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select aria-label="تصفية حسب النطاق" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={campus} onChange={(event) => setCampus(event.target.value)}>
              <option value="">جميع الأحرم والنطاقات</option>
              {allCampuses.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select aria-label="تصفية حسب حالة الإشغال" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="">جميع الحالات</option>
              {statusOptions.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            المعروض: {shown.length} موقع · مجموع المساحات التقديرية المسجلة: {areaFmt(tentativeArea)} م² (غير معتمد)
          </p>
        </div>

        {loading ? <p className="py-10 text-center">جارٍ تحميل سجل الأراضي...</p> :
          error ? <p role="alert" className="rounded-xl border border-destructive/50 p-4">{error} <Button variant="outline" onClick={() => void load()}>إعادة المحاولة</Button></p> :
          shown.length === 0 ? <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">لا توجد مواقع مطابقة. يمكنك إضافة أول موقع بعد التحقق من الصك.</div> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((x) => {
              const badge = findStatus(x.status);
              return (
                <article key={x.id} className="rounded-2xl border border-primary/20 bg-card p-5 shadow-md transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-primary">{x.code}</p>
                      <h2 className="mt-1 text-lg font-bold">{x.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{x.campus}</p>
                    </div>
                    <span className={'rounded-full border px-2.5 py-1 text-xs font-semibold ' + badge.tone}>{badge.label}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">المساحة التقديرية</p><strong>{areaFmt(x.approximateArea)} م²</strong></div>
                    <div><p className="text-xs text-muted-foreground">الشاغرة المعتمدة</p><strong>{x.status === 'VERIFIED_VACANT' ? areaFmt(x.verifiedVacantArea) + ' م²' : 'غير معتمدة'}</strong></div>
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">رقم الصك</p><strong>{x.deed?.deedNumber || '—'}</strong></div>
                    <div className="col-span-2"><p className="text-xs text-muted-foreground">الحدود الجغرافية</p><strong>{x.geometryGeoJson ? `مرسومة · نحو ${areaFmt(getPolygonMetrics(x.geometryGeoJson).calculatedAreaSqm)} م² هندسيًا` : 'لم ترسم بعد'}</strong></div>
                  </div>
                  {x.locationDescription && <p className="mt-3 line-clamp-2 text-sm">{x.locationDescription}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">أُنشئ بواسطة: {x.createdByName || 'غير محدد'} · آخر تعديل: {x.updatedByName || 'غير محدد'}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/lands/vacant/map?selected=' + encodeURIComponent(x.id))}><MapIcon className="ml-1 h-4 w-4" />الخريطة</Button>
                    <Button size="sm" variant="outline" onClick={() => setRelationItem(x)}>روابط الصك والمباني والاستثمار</Button>
                    {canEdit && (isAdmin || (x.createdById === currentUser?.uid && x.status !== 'VERIFIED_VACANT')) && <Button size="sm" variant="outline" onClick={() => openEdit(x)}><Pencil className="ml-1 h-4 w-4" />تحرير</Button>}
                    {canDelete && (isAdmin || (x.createdById === currentUser?.uid && x.status !== 'VERIFIED_VACANT')) && <Button size="sm" variant="outline" onClick={() => void remove(x)}><Trash2 className="ml-1 h-4 w-4" />حذف</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        }
      </section>

      {canPrint && <div id="vacant-lands-print" className="hidden print:block">
        <style>{'@media print { @page { size: A4 landscape; margin: 12mm; } body,html,#root,.neo-platform-shell { height:auto!important; overflow:visible!important; background:white!important; } header,aside,nav { display:none!important; } #vacant-lands-print { position:relative!important;display:block!important;color:#111!important;background:white!important; } }'}</style>
        <h1 className="mb-2 text-xl font-bold">جامعة الإمام عبدالرحمن بن فيصل – بيان حصر الأراضي الشاغرة</h1>
        <p className="mb-3 text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-SA')} · المُعد: {username || '—'} · عدد المواقع: {shown.length}</p>
        <p className="mb-4 text-xs">تنبيه: المواقع غير المعتمدة لا تدخل ضمن المساحة الشاغرة المؤكدة. التقرير يخص الحصر العقاري فقط.</p>
        <table className="w-full border-collapse text-xs">
          <thead><tr>{['الرمز','الموقع','النطاق','رقم الصك','المساحة التقديرية م²','الشاغرة المعتمدة م²','الحالة','آخر مُحدّث'].map((h) => <th key={h} className="border border-black p-2 text-right">{h}</th>)}</tr></thead>
          <tbody>{shown.map((x) => <tr key={x.id}><td className="border border-black p-2">{x.code}</td><td className="border border-black p-2">{x.name}</td><td className="border border-black p-2">{x.campus}</td><td className="border border-black p-2">{x.deed?.deedNumber || '—'}</td><td className="border border-black p-2">{areaFmt(x.approximateArea)}</td><td className="border border-black p-2">{x.status === 'VERIFIED_VACANT' ? areaFmt(x.verifiedVacantArea) : '—'}</td><td className="border border-black p-2">{findStatus(x.status).label}</td><td className="border border-black p-2">{x.updatedByName || '—'}</td></tr>)}</tbody>
        </table>
        <p className="mt-4 text-sm">مجموع المساحة الشاغرة المعتمدة للمواقع المفلترة: {areaFmt(filteredVerifiedArea)} م²</p>
      </div>}

      {relationItem && (
        <VacantLandRelationsDialog
          open={Boolean(relationItem)}
          deedId={relationItem.deedId}
          code={relationItem.code}
          onOpenChange={(value) => { if (!value) setRelationItem(null); }}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-5xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-xl">{editing ? 'تعديل موقع شاغر' : 'إضافة موقع إلى الحصر المبدئي'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => void save(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="رمز الموقع *"><Input required value={form.code} onChange={(e) => patch('code', e.target.value)} placeholder="مثال: EAST-03" /></Field>
              <Field title="اسم الموقع *"><Input required value={form.name} onChange={(e) => patch('name', e.target.value)} placeholder="الموقع رقم 03" /></Field>
              <Field title="الحرم أو النطاق العقاري *"><Input required value={form.campus} onChange={(e) => patch('campus', e.target.value)} /></Field>
              <Field title="حالة الإشغال">
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm((old) => ({ ...old, status: e.target.value as Status, verifiedVacantArea: e.target.value === 'VERIFIED_VACANT' ? old.verifiedVacantArea : '' }))}>
                  {statusOptions.filter((s) => isAdmin || s.value !== 'VERIFIED_VACANT').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2 space-y-2 rounded-xl border p-3">
                <Field title="البحث عن الصك العقاري">
                  <div className="flex gap-2"><Input value={deedQuery} onChange={(e) => setDeedQuery(e.target.value)} placeholder="اكتب رقم الصك ثم اضغط بحث" />
                    <Button type="button" variant="outline" onClick={() => void lookupDeeds(deedQuery)}>بحث</Button></div>
                </Field>
                <Field title="ربط الموقع بالصك *">
                  <select required className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.deedId} onChange={(e) => patch('deedId', e.target.value)}>
                    <option value="">اختر الصك المسجل في المنصة</option>
                    {deeds.map((d) => <option key={d.id} value={d.id}>{d.deedNumber} – {d.propertyDescription}</option>)}
                  </select>
                </Field>
              </div>
              <Field title="المساحة التقديرية للموقع (م²) *"><Input required type="number" min="0.01" step="0.01" value={form.approximateArea} onChange={(e) => patch('approximateArea', e.target.value)} /></Field>
              <Field title="المساحة الشاغرة المؤكدة (م²)"><Input type="number" min="0" step="0.01" disabled={!isAdmin || form.status !== 'VERIFIED_VACANT'} value={form.verifiedVacantArea} onChange={(e) => patch('verifiedVacantArea', e.target.value)} placeholder="تُملأ بعد التحقق" /></Field>
              <Field title="خط العرض"><Input type="number" min="-90" max="90" step="any" readOnly={Boolean(form.geometryGeoJson)} value={form.latitude} onChange={(e) => patch('latitude', e.target.value)} placeholder="26.39" /></Field>
              <Field title="خط الطول"><Input type="number" min="-180" max="180" step="any" readOnly={Boolean(form.geometryGeoJson)} value={form.longitude} onChange={(e) => patch('longitude', e.target.value)} placeholder="50.20" /></Field>
              <Field title="تاريخ المعاينة"><Input type="date" value={form.inspectionDate} onChange={(e) => patch('inspectionDate', e.target.value)} /></Field>
              <Field title="الاستخدام الحالي"><Input value={form.currentUse} onChange={(e) => patch('currentUse', e.target.value)} placeholder="مثال: أرض فضاء / مواقف" /></Field>
              <Field title="المخصص له الموقع (إن وجد)"><Input value={form.allocationPurpose} onChange={(e) => patch('allocationPurpose', e.target.value)} placeholder="مثال: مشروع جامعي" /></Field>
              <Field title="وصف الموقع"><Input value={form.locationDescription} onChange={(e) => patch('locationDescription', e.target.value)} /></Field>
              <div className="sm:col-span-2">
                <Field title="ملاحظات المعاينة">
                  <textarea className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" value={form.inspectionNote} onChange={(e) => patch('inspectionNote', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field title="ملاحظات إضافية">
                  <textarea className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" value={form.notes} onChange={(e) => patch('notes', e.target.value)} />
                </Field>
              </div>
            </div>
            <InvestmentPolygonEditor
              key={editing?.id || 'new-vacant-land'}
              title="حدود الموقع على الخريطة الجوية"
              helperText="ارسم مضلعًا واحدًا لهذا الموقع، أو ارفع ملف Google Earth بصيغة KML / KMZ، أو ملف GeoJSON. يمكن تعديل النقاط على الخريطة. لا يثبت الرسم شغور الأرض أو ملكيتها."
              geoJson={form.geometryGeoJson}
              strictSinglePolygon
              approximateArea={Number(form.approximateArea) || null}
              referenceCoordinates={
                form.latitude.trim() && form.longitude.trim()
                  ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
                  : undefined
              }
              fileBaseName={form.code || 'vacant-land'}
              onImportFile={(fileName) => setForm((previous) => ({ ...previous, geometrySourceName: fileName }))}
              onGeometryChange={(geoJson, metrics) => setForm((previous) => {
                const changed = JSON.stringify(previous.geometryGeoJson) !== JSON.stringify(geoJson);
                if (!changed) return previous;
                return {
                  ...previous,
                  geometryGeoJson: geoJson,
                  geometrySourceName: geoJson ? 'رسم يدوي على الخريطة' : '',
                  latitude: metrics.centroid ? String(metrics.centroid.latitude) : '',
                  longitude: metrics.centroid ? String(metrics.centroid.longitude) : '',
                  status: previous.status === 'VERIFIED_VACANT' ? 'UNDER_REVIEW' : previous.status,
                  verifiedVacantArea: '',
                };
              })}
            />
            {form.geometryGeoJson && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                المساحة الهندسية المحسوبة من المضلع: <strong>{areaFmt(getPolygonMetrics(form.geometryGeoJson).calculatedAreaSqm)} م²</strong>.
                هذه القيمة لا تعد مساحة صك أو مساحة شاغرة معتمدة.
                {form.geometrySourceName && <p className="mt-1">مصدر الحدود: {form.geometrySourceName}</p>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">لا تمثل هذه البيانات اعتمادًا لفرصة استثمارية. يلزم التحقق الميداني ومطابقة الصك والمخطط قبل إقرار المساحة الشاغرة.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>{saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديل' : 'حفظ الموقع'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
