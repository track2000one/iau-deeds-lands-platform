import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiJson } from '../../lib/http';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

const EXPECTED_SHEET = 'APPLICANT_FULL';

type ImportRow = {
  sourceRow: number;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  applicantType: string;
  competition: string;
  applicationNumber: string;
  qualification: string;
  qualificationDate: string;
  experienceStart: string;
  experienceEnd: string;
  experienceYears: string;
  governmentEmployment: string;
  jobType: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  sourceStatus: string;
  reviewerDate: string;
  reviewer: string;
  reviewerNotes: string;
  specialty: string;
};

type ChangedField = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

type PreviewItem = ImportRow & {
  matchType: 'new_applicant' | 'existing_applicant_new_application' | 'update' | 'identical' | 'conflict' | 'invalid';
  message: string;
  changedFields: ChangedField[];
  relatedApplications: Array<{ id: string; applicationNumber: string; jobType: string; status: string }>;
  existingId: string | null;
};

type PreviewResponse = {
  total: number;
  counts: Record<PreviewItem['matchType'], number>;
  items: PreviewItem[];
};

type CommitResponse = {
  message: string;
  summary: {
    total: number;
    created: number;
    updated: number;
    identical: number;
    conflicts: number;
    invalid: number;
    skipped: number;
  };
};

const asText = (value: unknown) => String(value ?? '').trim();
const joinName = (...values: unknown[]) => values.map(asText).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const toImportRow = (row: Record<string, unknown>, index: number): ImportRow => ({
  sourceRow: index + 2,
  fullName: joinName(row['الاسم الاول'], row['الاسم الثاني'], row['الاسم الثالث'], row['الاسم الاخير']),
  nationalId: asText(row['رقم السجل المدني']),
  phone: asText(row['رقم الموبايل']),
  email: asText(row['البريد الالكتروني']),
  applicantType: asText(row['نوع المتقدم']),
  competition: asText(row['المسابقة']),
  applicationNumber: asText(row['رقم الطلب']),
  qualification: asText(row['المؤهل العلمي']),
  qualificationDate: asText(row['تاريخ المؤهل']),
  experienceStart: asText(row['تاريخ بداية الخبرة']),
  experienceEnd: asText(row['تاريخ نهاية الخبرة']),
  experienceYears: asText(row['عدد سنوات الخبرة الاجمالية']),
  governmentEmployment: asText(row['يعمل حاليا بجهاز الدولة']),
  jobType: asText(row['الوظيفة المتقدم عليها']),
  gender: asText(row['الجنس']),
  birthDate: asText(row['تاريخ الميلاد']),
  birthPlace: asText(row['مكان الميلاد']),
  address: asText(row['العنوان']),
  sourceStatus: asText(row['حاله الطلب']),
  reviewerDate: asText(row['تاريخ دراسه الطلب']),
  reviewer: asText(row['دارس الطلب']),
  reviewerNotes: asText(row['ملاحظات دارس الطلب']),
  specialty: asText(row['المرتبة / التخصص']),
});

const matchLabels: Record<PreviewItem['matchType'], string> = {
  new_applicant: 'متقدم جديد',
  existing_applicant_new_application: 'متقدم سابق / طلب جديد',
  update: 'يحتاج تحديث',
  identical: 'مطابق بالكامل',
  conflict: 'تعارض',
  invalid: 'بيانات غير مكتملة',
};

const matchClasses: Record<PreviewItem['matchType'], string> = {
  new_applicant: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  existing_applicant_new_application: 'border-sky-300 bg-sky-50 text-sky-700',
  update: 'border-amber-300 bg-amber-50 text-amber-800',
  identical: 'border-slate-300 bg-slate-50 text-slate-700',
  conflict: 'border-red-300 bg-red-50 text-red-700',
  invalid: 'border-rose-300 bg-rose-50 text-rose-700',
};

const maskNationalId = (value: string) => value.length >= 4 ? `******${value.slice(-4)}` : value;

export const MosqueJobsImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);

  const actionable = useMemo(() => {
    if (!preview) return 0;
    return preview.counts.new_applicant + preview.counts.existing_applicant_new_application + preview.counts.update;
  }, [preview]);

  const readWorkbook = async (selected: File) => {
    const buffer = await selected.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    if (!workbook.SheetNames.length) throw new Error('ملف Excel لا يحتوي على أوراق قابلة للقراءة');
    const resolvedSheet = workbook.SheetNames.includes(EXPECTED_SHEET) ? EXPECTED_SHEET : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[resolvedSheet];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: false });
    if (!rawRows.length) throw new Error('ورقة Excel لا تحتوي على بيانات متقدمين');
    setSheetName(resolvedSheet);
    setRows(rawRows.map(toImportRow));
    setPreview(null);
    setCommitResult(null);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setRows([]);
    setPreview(null);
    setCommitResult(null);
    if (!selected) return;
    try {
      await readWorkbook(selected);
      toast.success('تمت قراءة ملف Excel. يمكنك الآن تنفيذ المطابقة.');
    } catch (error) {
      setFile(null);
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    }
  };

  const runPreview = async () => {
    if (!file || !rows.length) return;
    setLoading(true);
    try {
      const result = await apiJson<PreviewResponse>('/api/mosques/job-import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows, sourceFileName: file.name, sourceSheet: sheetName }),
      });
      setPreview(result);
      toast.success(`اكتملت المطابقة لـ ${result.total} سجلًا`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ المطابقة');
    } finally {
      setLoading(false);
    }
  };

  const commitImport = async () => {
    if (!file || !rows.length || !preview || !actionable) return;
    setCommitting(true);
    try {
      const result = await apiJson<CommitResponse>('/api/mosques/job-import/commit', {
        method: 'POST',
        body: JSON.stringify({ rows, sourceFileName: file.name, sourceSheet: sheetName }),
      });
      setCommitResult(result);
      toast.success(result.message);
      await runPreview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ نتائج الاستيراد');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">استيراد ومطابقة طلبات التعاون</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            وحدة العناية بالمساجد والمصليات — تحليل ملف المتقدمين قبل إنشاء أو تحديث أي طلب.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/mosques')}>
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة إلى الوحدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            ملف المتقدمين
          </CardTitle>
          <CardDescription>
            يدعم ملف APPLICANT_FULL الحالي، كما سيستخدم أول ورقة تلقائيًا إذا تغير اسم الورقة مستقبلًا.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-7 text-sky-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0" />
              <span>
                المطابقة تعتمد على <strong>رقم الطلب</strong> لتحديد الطلب نفسه، وعلى <strong>رقم السجل المدني</strong> لتحديد المتقدم.
                وجود المتقدم سابقًا لا يمنع إنشاء طلب جديد إذا كان رقم الطلب مختلفًا.
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium">اختر ملف Excel</label>
              <Input type="file" accept=".xlsx,.xls" onChange={handleFile} />
            </div>
            <Button onClick={runPreview} disabled={!file || !rows.length || loading}>
              {loading ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Upload className="ml-2 h-4 w-4" />}
              تحليل ومطابقة
            </Button>
          </div>

          {file && rows.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">الملف: {file.name}</Badge>
              <Badge variant="outline">الورقة: {sheetName}</Badge>
              <Badge variant="outline">السجلات: {rows.length}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {([
              ['new_applicant', 'جديد'],
              ['existing_applicant_new_application', 'متقدم سابق / طلب جديد'],
              ['update', 'تحديث'],
              ['identical', 'مطابق'],
              ['conflict', 'تعارض'],
              ['invalid', 'غير مكتمل'],
            ] as const).map(([key, label]) => (
              <Card key={key}>
                <CardContent className="pt-5">
                  <div className="text-2xl font-bold">{preview.counts[key]}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />نتائج المطابقة</CardTitle>
              <CardDescription>
                السجلات المتعارضة أو غير المكتملة لن تُحفظ. السجلات المطابقة بالكامل ستُتجاهل تلقائيًا دون إنشاء نسخة جديدة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <table className="min-w-[1050px] w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr className="text-right">
                      <th className="p-3">الصف</th>
                      <th className="p-3">رقم الطلب</th>
                      <th className="p-3">المتقدم</th>
                      <th className="p-3">السجل المدني</th>
                      <th className="p-3">الوظيفة</th>
                      <th className="p-3">نتيجة المطابقة</th>
                      <th className="p-3">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <tr key={`${item.sourceRow}-${item.applicationNumber}`} className="border-t align-top">
                        <td className="p-3 font-mono">{item.sourceRow}</td>
                        <td className="p-3 font-mono font-medium">{item.applicationNumber || '—'}</td>
                        <td className="p-3">{item.fullName || '—'}</td>
                        <td className="p-3 font-mono">{maskNationalId(item.nationalId)}</td>
                        <td className="p-3">{item.jobType || '—'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={matchClasses[item.matchType]}>{matchLabels[item.matchType]}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="max-w-[420px] space-y-1">
                            <div>{item.message}</div>
                            {item.changedFields.map((change) => (
                              <div key={change.field} className="text-xs text-amber-800">
                                {change.label}: <span className="line-through opacity-70">{change.before || 'فارغ'}</span> ← <strong>{change.after || 'فارغ'}</strong>
                              </div>
                            ))}
                            {!!item.relatedApplications.length && (
                              <div className="text-xs text-sky-700">
                                طلبات سابقة: {item.relatedApplications.map((x) => `${x.applicationNumber} (${x.jobType})`).join('، ')}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <div className="font-semibold">جاهز للحفظ: {actionable} سجل</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  سيتم إنشاء الطلبات الجديدة وتحديث الطلب نفسه فقط عند وجود اختلاف فعلي في البيانات الأساسية.
                </div>
              </div>
              <Button onClick={commitImport} disabled={!actionable || committing}>
                {committing ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}
                اعتماد الاستيراد
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {commitResult && (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="h-5 w-5" />تم تنفيذ الاستيراد</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div>تم الإنشاء: <strong>{commitResult.summary.created}</strong></div>
            <div>تم التحديث: <strong>{commitResult.summary.updated}</strong></div>
            <div>مطابق: <strong>{commitResult.summary.identical}</strong></div>
            <div>تعارض: <strong>{commitResult.summary.conflicts}</strong></div>
            <div>غير مكتمل: <strong>{commitResult.summary.invalid}</strong></div>
            <div>متجاوز: <strong>{commitResult.summary.skipped}</strong></div>
          </CardContent>
        </Card>
      )}

      {!preview && file && rows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />لم يتم حفظ أي سجل بعد. نفّذ «تحليل ومطابقة» أولًا.</div>
        </div>
      )}
    </div>
  );
};