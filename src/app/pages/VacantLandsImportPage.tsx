import React from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, CheckCircle2, FileDown, FileSpreadsheet, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { apiJson } from '../../lib/http';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { VacantLandRelationsDialog } from '../components/VacantLandRelationsDialog';

type ImportRow = {
  code: string; name: string; campus: string; deedNumber: string;
  approximateArea: number | null; latitude: number | null; longitude: number | null;
  sourceReference: string; notes: string | null;
};
type PreviewRow = {
  rowNumber: number; code: string; name: string; deedNumber: string;
  campus?: string; approximateArea?: number; deedId: string | null;
  linkedDeed: { id: string; deedNumber: string; propertyDescription: string } | null;
  status: 'READY' | 'BLOCKED' | 'INVALID'; issues: string[];
};
type Preview = { total: number; schemaReady: boolean; deedMatched: number; ready: number; blocked: number; rows: PreviewRow[] };

const columns = {
  code: 'رمز الموقع',
  name: 'اسم الموقع',
  campus: 'النطاق العقاري',
  deedNumber: 'رقم الصك',
  approximateArea: 'المساحة التقديرية م²',
  latitude: 'خط العرض',
  longitude: 'خط الطول',
  sourceReference: 'مرجع الحصر',
  notes: 'ملاحظات',
} as const;

const baseCampuses = [
  { code: 'WEST', campus: 'الحرم الجامعي الغربي', count: 4, page: 1 },
  { code: 'RAKA', campus: 'أرض الراكة الشمالية - المدينة الطبية الأكاديمية', count: 5, page: 2 },
  { code: 'EAST', campus: 'الحرم الجامعي الشرقي', count: 12, page: 3 },
  { code: 'RAYAN', campus: 'أرض حي الريان', count: 4, page: 5 },
  { code: 'QASHLA', campus: 'أرض القشلة', count: 3, page: 6 },
];
const toWesternDigits = (value: string) =>
  value.replace(/[\u0660-\u0669]/g, (character) => String(character.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, (character) => String(character.charCodeAt(0) - 0x6f0));
const num = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const normalized = toWesternDigits(String(value)).replace(/[\u066b]/g, '.').replace(/[\u066c,\s]/g, '');
  const parsed = Number(normalized);
  return normalized && Number.isFinite(parsed) ? parsed : null;
};
const str = (value: unknown) => String(value ?? '').trim();

function buildReferenceRows() {
  return baseCampuses.flatMap((item) =>
    Array.from({ length: item.count }, (_, index) => ({
      [columns.code]: item.code + '-' + String(index + 1).padStart(2, '0'),
      [columns.name]: 'الموقع رقم ' + String(index + 1).padStart(2, '0'),
      [columns.campus]: item.campus,
      [columns.deedNumber]: '',
      [columns.approximateArea]: '',
      [columns.latitude]: '',
      [columns.longitude]: '',
      [columns.sourceReference]: 'بيان الأراضي الشاغرة – صفحة ' + (item.code === 'EAST' && index >= 9 ? 4 : item.page),
      [columns.notes]: 'موقع مرشح للحصر - غير معتمد',
    }))
  );
}

function saveTemplate() {
  const sheet = XLSX.utils.json_to_sheet(buildReferenceRows());
  sheet['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 52 }, { wch: 24 },
    { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 42 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'الحصر المبدئي 28 موقع');
  XLSX.writeFile(workbook, 'قالب-حصر-الأراضي-الشاغرة-28-موقع.xlsx');
}

function makeRow(record: Record<string, unknown>): ImportRow {
  const read = (key: keyof typeof columns) => record[columns[key]] ?? record[key];
  return {
    code: str(read('code')).toUpperCase(),
    name: str(read('name')),
    campus: str(read('campus')),
    deedNumber: toWesternDigits(str(read('deedNumber'))),
    approximateArea: num(read('approximateArea')),
    latitude: num(read('latitude')),
    longitude: num(read('longitude')),
    sourceReference: str(read('sourceReference')),
    notes: str(read('notes')) || null,
  };
}

export function VacantLandsImportPage() {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const mayPreview = isAdmin || hasPermission('vacant_lands', 'canAdd');
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [relation, setRelation] = React.useState<{ deedId: string; code: string } | null>(null);

  const readFile = async (file?: File) => {
    if (!file) return;
    setPreview(null);
    setRows([]);
    if (!/\.(xlsx|xls)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      toast.error('اختر ملف Excel بصيغة XLSX أو XLS لا يتجاوز 5MB');
      return;
    }
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      if (raw.length < 1 || raw.length > 100) throw new Error('يجب أن يحتوي الملف على 1 إلى 100 موقع');
      const imported = raw.map(makeRow);
      setRows(imported);
      setFileName(file.name);
      toast.success('تمت قراءة ' + imported.length + ' موقعًا؛ لم تُحفظ أي بيانات بعد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    }
  };

  const verify = async () => {
    try {
      setLoading(true);
      const data = await apiJson<Preview>('/api/vacant-lands/import/preview', {
        method: 'POST', body: JSON.stringify({ rows }),
      });
      setPreview(data);
      if (!data.schemaReady) {
        toast.warning('تم فحص أرقام الصكوك فقط؛ الحفظ متوقف لحين تهيئة جدول الأراضي الشاغرة');
      } else if (data.blocked) {
        toast.warning('توجد ' + data.blocked + ' مواقع تحتاج تصحيحًا قبل الحفظ');
      } else {
        toast.success('اكتملت مطابقة الصكوك، وجميع المواقع جاهزة للمراجعة والاعتماد');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر مراجعة بيانات الصكوك');
    } finally { setLoading(false); }
  };

  const commit = async () => {
    if (!preview || !preview.schemaReady || preview.blocked || !isAdmin) return;
    if (!window.confirm('سيتم إدخال ' + preview.ready + ' موقعًا بحالة شاغرة مبدئيًا غير معتمدة، مرتبطة بالصكوك المطابقة. هل تريد اعتماد الاستيراد؟')) return;
    try {
      setLoading(true);
      const result = await apiJson<{ committed: boolean; count: number }>('/api/vacant-lands/import/commit', {
        method: 'POST', body: JSON.stringify({ rows }),
      });
      if (!result.committed) throw new Error('تغيرت نتيجة المطابقة. أعد المعاينة قبل الاستيراد.');
      toast.success('تم إنشاء ' + result.count + ' موقعًا مبدئيًا');
      navigate('/lands/vacant');
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الحصر؛ لم يُعتمد الاستيراد');
    } finally { setLoading(false); }
  };

  const shown = preview?.rows.filter((row) =>
    [row.code, row.name, row.deedNumber].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  ) || [];

  return <div dir="rtl" className="mx-auto max-w-7xl space-y-5 px-4 py-6 text-foreground">
    <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">استيراد حصر الأراضي الشاغرة</h1>
          <p className="mt-1 text-sm text-muted-foreground">مطابقة رقم الصك مع سجل الصكوك قبل إضافة أي موقع؛ لا تُنشأ تلقائيًا مبانٍ أو مساحات أو فرص استثمارية.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/vacant')}><ArrowRight className="ml-2 h-4 w-4" />عودة إلى السجل</Button>
      </div>
      <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
        يحتوي قالب الـ28 موقعًا على رموز مرشحة موزعة حسب النطاقات في التقرير السابق فقط؛ يُرجى تعبئة أرقام الصكوك والمساحات والإحداثيات ومراجعتها من الوثائق المعتمدة. لا تُقبل المطابقة التخمينية ولا يُعتمد شغور أي أرض عند الاستيراد.
      </p>
    </div>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5">
        <FileDown className="mb-3 h-6 w-6 text-primary" />
        <h2 className="font-bold">1. تحميل قالب الحصر المبدئي</h2>
        <p className="my-3 text-sm text-muted-foreground">قالب Excel يحتوي على 28 صفًا موزعة على خمسة نطاقات عقارية، دون اختلاق رقم صك أو مساحة.</p>
        <Button variant="outline" onClick={saveTemplate}><FileSpreadsheet className="ml-2 h-4 w-4" />تنزيل قالب 28 موقعًا</Button>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <FileSpreadsheet className="mb-3 h-6 w-6 text-primary" />
        <h2 className="font-bold">2. رفع الملف المُراجع</h2>
        <p className="my-3 text-sm text-muted-foreground">احتفظ بأرقام الصكوك كنصوص لمنع Excel من تقريب الأرقام الطويلة. جميع المواقع ستُحفظ بوصفها أولية.</p>
        <input aria-label="رفع ملف Excel" disabled={!mayPreview || loading} className="w-full text-sm file:ml-3 file:cursor-pointer file:rounded-lg file:border file:bg-card file:p-2" type="file" accept=".xlsx,.xls" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ''; }} />
        {fileName && <p className="mt-3 text-xs">الملف المختار: {fileName} · {rows.length} موقعًا</p>}
      </div>
    </section>

    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-bold">3. مطابقة الصكوك ومراجعة النتائج</h2>
      <p className="my-2 text-sm text-muted-foreground">
        يتم التحقق من تطابق رقم الصك، ومنع الرموز المكررة داخل الملف أو السجل، ومراجعة المساحة والإحداثيات. عند وجود أي تعارض لن يُحفظ أي سجل في الدفعة.
      </p>
      <Button disabled={!mayPreview || rows.length === 0 || loading} onClick={() => void verify()}>
        <Search className="ml-2 h-4 w-4" />{loading ? 'جارٍ التحقق...' : 'فحص ومطابقة ' + rows.length + ' موقعًا'}
      </Button>
      {preview && <div className="mt-5 space-y-4">
        {!preview.schemaReady && <div role="status" className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          <strong>وضع المراجعة فقط</strong>
          <p className="mt-1">يمكن مطابقة أرقام الصكوك وعرض المباني والمواقع والفرص الاستثمارية المرتبطة بها وفق الصلاحيات. لكن لا يمكن فحص التكرار في سجل الأراضي الشاغرة أو حفظ أي موقع قبل إنشاء جدوله بأمان.</p>
        </div>}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'الإجمالي', value: preview.total },
            { label: 'صكوك مطابقة', value: preview.deedMatched },
            { label: 'غير جاهزة للحفظ', value: preview.blocked },
          ].map((x) => <div key={x.label} className="rounded-xl border bg-muted/20 p-4 text-center">
            <div className="text-xs text-muted-foreground">{x.label}</div><div className="mt-1 text-2xl font-bold">{x.value}</div>
          </div>)}
        </div>
        <label className="relative block"><Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <input className="h-10 w-full rounded-lg border border-input bg-background pr-10 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="تصفية النتائج بالرمز أو رقم الصك" />
        </label>
        <div className="max-h-[490px] overflow-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="sticky top-0 bg-card"><tr>{['#','رمز الموقع','النطاق','رقم الصك','المساحة التقديرية','المطابقة','الروابط العقارية','الملاحظات'].map((h) => <th key={h} className="border-b p-3">{h}</th>)}</tr></thead>
            <tbody>{shown.map((x) => <tr key={x.rowNumber} className="border-b odd:bg-muted/20">
              <td className="p-3">{x.rowNumber}</td>
              <td className="p-3">{x.code}</td>
              <td className="p-3">{x.campus || '—'}</td>
              <td className="p-3">{x.linkedDeed?.deedNumber || x.deedNumber || '—'}</td>
              <td className="p-3">{x.approximateArea ?? '—'}</td>
              <td className="p-3"><span className={x.linkedDeed ? 'text-emerald-600' : 'text-amber-600'}>{x.linkedDeed ? 'الصك مطابق' : 'الصك غير مطابق'}</span></td>
              <td className="p-3">{x.deedId && <Button type="button" size="sm" variant="outline" onClick={() => setRelation({ deedId: x.deedId!, code: x.code })}>المباني والاستثمارات</Button>}</td>
              <td className="p-3">{x.issues.length ? x.issues.join('، ') : 'مطابق للصك بالسجل الموحد'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>

    <section className="rounded-xl border border-primary/20 bg-card p-5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
        <div><h2 className="font-bold">4. اعتماد الاستيراد المبدئي</h2>
          <p className="my-2 text-sm text-muted-foreground">يقتصر اعتماد الدفعة على مسؤول المنصة، ويُنشئ المواقع بحالة «شاغرة مبدئيًا – غير معتمدة». لا يغير حالة الاستثمارات أو المباني، ولا يثبت ملكية الموقع أو شغوره.</p>
        </div>
      </div>
      {preview && preview.schemaReady && preview.blocked === 0 && <p className="mb-3 flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />جميع أرقام الصكوك متطابقة مع السجل الحالي.</p>}
      <Button disabled={!isAdmin || !preview || !preview.schemaReady || preview.blocked > 0 || loading} onClick={() => void commit()}>
        {loading ? 'جارٍ الحفظ...' : 'اعتماد استيراد الدفعة'}
      </Button>
      {!isAdmin && <p className="mt-2 text-xs text-muted-foreground">يمكنك مراجعة الملف، لكن اعتماد الدفعة متاح فقط لمسؤول النظام.</p>}
      {preview && !preview.schemaReady && <p className="mt-2 text-sm font-semibold text-amber-600">الحفظ مغلق لجميع المستخدمين، بمن فيهم المسؤول، حتى اكتمال تهيئة قاعدة البيانات.</p>}
    </section>
    {relation && <VacantLandRelationsDialog
      open={Boolean(relation)}
      deedId={relation.deedId}
      code={relation.code}
      onOpenChange={(value) => { if (!value) setRelation(null); }}
    />}
  </div>;
}
