import React from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '../../lib/http';
import { Button } from './ui/button';

export type SmartExtractionModule =
  | 'deed'
  | 'allocated_land'
  | 'delivered_land'
  | 'leased_land_out'
  | 'leased_land_in'
  | 'leased_building_out'
  | 'leased_building_in'
  | 'site_inspection';

type SmartExtractionResult = {
  module?: string;
  fields: Record<string, unknown>;
  confidence?: number | null;
  warnings?: string[];
  summary?: string | null;
  source?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
    files?: Array<{ fileName?: string; mimeType?: string; size?: number }>;
  };
};

type ModuleConfig = {
  label: string;
  description: string;
  examples: string[];
  labels: Record<string, string>;
};

const MODULE_CONFIG: Record<SmartExtractionModule, ModuleConfig> = {
  deed: {
    label: 'الصك',
    description: 'اقرأ صورة الصك أو ملف PDF واستخرج بيانات الملكية والموقع والمساحة والأرقام الرسمية بقدر المستطاع.',
    examples: ['رقم الصك', 'تاريخ الصك', 'رقم القطعة', 'المساحة', 'المدينة', 'المخطط'],
    labels: {
      deedNumber: 'رقم الصك', deedDate: 'تاريخ الصك', deedDateType: 'نوع التاريخ', propertyDescription: 'بيان العقار',
      plotNumber: 'رقم القطعة', planNumber: 'رقم المخطط', area: 'المساحة', location: 'الموقع', region: 'المنطقة', city: 'المدينة',
      district: 'الحي', usageType: 'نوع الاستخدام', latitude: 'خط العرض', longitude: 'خط الطول', notes: 'ملاحظات',
    },
  },
  allocated_land: {
    label: 'الأرض المخصصة',
    description: 'اقرأ قرار التخصيص أو المخطط أو المستندات المرتبطة بالأرض ثم جهّز بياناتها الأساسية والمكانية.',
    examples: ['بيان العقار', 'رقم القطعة', 'رقم المخطط', 'المساحة', 'المنطقة', 'المدينة'],
    labels: {
      propertyDescription: 'بيان العقار', plotNumber: 'رقم القطعة', planNumber: 'رقم المخطط', area: 'المساحة', usageType: 'نوع الاستخدام',
      region: 'المنطقة', city: 'المدينة', district: 'الحي', coordinates: 'الإحداثيات', latitude: 'خط العرض', longitude: 'خط الطول',
      googleEarthLink: 'رابط Google Earth', notes: 'ملاحظات',
    },
  },
  delivered_land: {
    label: 'الأرض المسلّمة',
    description: 'اقرأ محضر التسليم أو المستندات والمخططات واستخرج جهة الاستلام وبيانات الأرض والمحضر والموقع.',
    examples: ['الجهة المستلمة', 'تاريخ التسليم', 'رقم المحضر', 'رقم القطعة', 'المساحة', 'الموقع'],
    labels: {
      recipientEntity: 'الجهة المستلمة', deliveryDate: 'تاريخ التسليم', deliveryDateType: 'نوع التاريخ', propertyDescription: 'بيان العقار',
      plotNumber: 'رقم القطعة', planNumber: 'رقم المخطط', area: 'المساحة', location: 'الموقع', coordinates: 'الإحداثيات',
      latitude: 'خط العرض', longitude: 'خط الطول', deliveryMinutesNumber: 'رقم محضر التسليم', notes: 'ملاحظات',
    },
  },
  leased_land_out: {
    label: 'عقد تأجير أرض',
    description: 'اقرأ العقد وملحقاته واستخرج بيانات المستأجر والعقد والأرض والقيمة والتواريخ تلقائيًا.',
    examples: ['رقم العقد', 'المستأجر', 'بداية العقد', 'نهاية العقد', 'قيمة الإيجار', 'الموقع'],
    labels: {
      'tenant.name': 'اسم المستأجر', 'tenant.commercialRegistration': 'السجل التجاري', 'tenant.entityRepresentative': 'ممثل الجهة',
      'tenant.identityNumber': 'رقم الهوية', 'tenant.nationality': 'الجنسية', 'tenant.mobileNumber': 'رقم الجوال', contractNumber: 'رقم العقد',
      contractStartDate: 'بداية العقد', contractStartDateType: 'نوع تاريخ البداية', contractEndDate: 'نهاية العقد', contractEndDateType: 'نوع تاريخ النهاية',
      contractDuration: 'مدة العقد', plotNumber: 'رقم القطعة', planNumber: 'رقم المخطط', area: 'المساحة', location: 'الموقع', coordinates: 'الإحداثيات',
      latitude: 'خط العرض', longitude: 'خط الطول', rentAmount: 'قيمة الإيجار', notes: 'ملاحظات',
    },
  },
  leased_land_in: {
    label: 'عقد استئجار أرض',
    description: 'اقرأ عقد الاستئجار وملحقاته واستخرج بيانات المالك والعقد والأرض والقيمة والتواريخ تلقائيًا.',
    examples: ['رقم العقد', 'المالك', 'بداية العقد', 'نهاية العقد', 'قيمة الإيجار', 'بيان العقار'],
    labels: {
      'owner.name': 'اسم المالك', 'owner.commercialRegistration': 'السجل التجاري', 'owner.entityRepresentative': 'ممثل الجهة',
      'owner.identityNumber': 'رقم الهوية', 'owner.nationality': 'الجنسية', 'owner.mobileNumber': 'رقم الجوال', contractNumber: 'رقم العقد',
      contractStartDate: 'بداية العقد', contractStartDateType: 'نوع تاريخ البداية', contractEndDate: 'نهاية العقد', contractEndDateType: 'نوع تاريخ النهاية',
      contractDuration: 'مدة العقد', propertyDescription: 'بيان العقار', area: 'المساحة', location: 'الموقع', coordinates: 'الإحداثيات',
      latitude: 'خط العرض', longitude: 'خط الطول', rentAmount: 'قيمة الإيجار', notes: 'ملاحظات',
    },
  },
  leased_building_out: {
    label: 'عقد تأجير مبنى',
    description: 'اقرأ عقد تأجير المبنى واستخرج بيانات المستأجر والعقد والمبنى والموقع والقيمة والتواريخ.',
    examples: ['رقم العقد', 'المستأجر', 'رقم المبنى', 'الموقع', 'قيمة الإيجار', 'التواريخ'],
    labels: {
      'tenant.name': 'اسم المستأجر', 'tenant.commercialRegistration': 'السجل التجاري', 'tenant.entityRepresentative': 'ممثل الجهة',
      'tenant.identityNumber': 'رقم الهوية', 'tenant.nationality': 'الجنسية', 'tenant.mobileNumber': 'رقم الجوال', contractNumber: 'رقم العقد',
      contractStartDate: 'بداية العقد', contractStartDateType: 'نوع تاريخ البداية', contractEndDate: 'نهاية العقد', contractEndDateType: 'نوع تاريخ النهاية',
      buildingNumber: 'رقم المبنى', planNumber: 'رقم المخطط', locationName: 'اسم / موقع المبنى', area: 'المساحة', city: 'المدينة', district: 'الحي',
      coordinates: 'الإحداثيات', latitude: 'خط العرض', longitude: 'خط الطول', rentAmount: 'قيمة الإيجار', notes: 'ملاحظات',
    },
  },
  leased_building_in: {
    label: 'عقد استئجار مبنى',
    description: 'اقرأ عقد استئجار المبنى واستخرج بيانات المالك والعقد والمبنى والموقع والقيمة والتواريخ.',
    examples: ['رقم العقد', 'المالك', 'رقم المبنى', 'الموقع', 'قيمة الإيجار', 'التواريخ'],
    labels: {
      'owner.name': 'اسم المالك', 'owner.commercialRegistration': 'السجل التجاري', 'owner.entityRepresentative': 'ممثل الجهة',
      'owner.identityNumber': 'رقم الهوية', 'owner.nationality': 'الجنسية', 'owner.mobileNumber': 'رقم الجوال', contractNumber: 'رقم العقد',
      contractStartDate: 'بداية العقد', contractStartDateType: 'نوع تاريخ البداية', contractEndDate: 'نهاية العقد', contractEndDateType: 'نوع تاريخ النهاية',
      buildingNumber: 'رقم المبنى', locationName: 'اسم / موقع المبنى', area: 'المساحة', region: 'المنطقة', city: 'المدينة', coordinates: 'الإحداثيات',
      latitude: 'خط العرض', longitude: 'خط الطول', rentAmount: 'قيمة الإيجار', notes: 'ملاحظات',
    },
  },
  site_inspection: {
    label: 'المعاينة الميدانية',
    description: 'اقرأ محضر المعاينة أو الخطاب أو الصور المرجعية واستخرج بيانات الموقع والزيارة والملاحظات والإجراء المقترح.',
    examples: ['اسم الموقع', 'تاريخ الزيارة', 'رقم الصك', 'رقم القطعة', 'الملاحظات', 'الإجراء المقترح'],
    labels: {
      title: 'عنوان المعاينة', siteType: 'نوع الموقع', siteName: 'اسم الموقع', visitDate: 'تاريخ الزيارة', visitDateType: 'نوع التاريخ',
      visitPurpose: 'غرض الزيارة', inspectorName: 'القائم بالمعاينة', accompanyingEntity: 'الجهة المرافقة', region: 'المنطقة', city: 'المدينة',
      district: 'الحي', locationDescription: 'وصف الموقع', deedNumber: 'رقم الصك', plotNumber: 'رقم القطعة', planNumber: 'رقم المخطط',
      latitude: 'خط العرض', longitude: 'خط الطول', observations: 'الملاحظات', recommendedAction: 'الإجراء المقترح', referredEntity: 'الجهة المحال إليها',
      followUpDate: 'تاريخ المتابعة', followUpDateType: 'نوع تاريخ المتابعة',
    },
  },
};

const MAX_FILES = 8;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const fileSignature = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
const isSupported = (file: File) => file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
const formatBytes = (value: number) => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
const hasValue = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

export const SmartDocumentExtraction: React.FC<{
  module: SmartExtractionModule;
  onApply: (fields: Record<string, unknown>) => void;
  disabled?: boolean;
  className?: string;
}> = ({ module, onApply, disabled = false, className = '' }) => {
  const config = MODULE_CONFIG[module];
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [extracting, setExtracting] = React.useState(false);
  const [result, setResult] = React.useState<SmartExtractionResult | null>(null);
  const [message, setMessage] = React.useState('');

  const addFiles = React.useCallback((incoming: FileList | null) => {
    if (!incoming?.length) return;
    const candidates = Array.from(incoming).filter(isSupported);
    const rejected = Array.from(incoming).filter((file) => !isSupported(file));
    if (rejected.length) toast.error('الاستخراج الذكي يدعم الصور وملفات PDF فقط.');

    setFiles((current) => {
      const next = [...current];
      const signatures = new Set(next.map(fileSignature));
      for (const file of candidates) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`الملف ${file.name} يتجاوز الحد الأقصى 12MB.`);
          continue;
        }
        if (signatures.has(fileSignature(file))) continue;
        if (next.length >= MAX_FILES) {
          toast.error(`يمكن تحليل حتى ${MAX_FILES} صفحات/ملفات في العملية الواحدة.`);
          break;
        }
        const total = next.reduce((sum, item) => sum + item.size, 0) + file.size;
        if (total > MAX_TOTAL_BYTES) {
          toast.error('إجمالي الملفات يتجاوز 40MB.');
          break;
        }
        next.push(file);
        signatures.add(fileSignature(file));
      }
      return next;
    });
    setResult(null);
    setMessage('');
  }, []);

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setResult(null);
    setMessage('');
  };

  const analyze = async () => {
    if (!files.length || extracting) return;
    setExtracting(true);
    setResult(null);
    setMessage(`جارٍ قراءة ${files.length.toLocaleString('ar-SA')} صفحة/ملف وربط المعلومات بينها...`);
    try {
      const body = new FormData();
      body.append('module', module);
      files.forEach((file) => body.append('files', file));
      const response = await authenticatedFetch('/api/assets/extract-data', { method: 'POST', body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'تعذر تحليل المستندات حاليًا.');
      setResult(payload as SmartExtractionResult);
      const count = Object.values((payload as SmartExtractionResult)?.fields || {}).filter(hasValue).length;
      setMessage(count ? `تم استخراج ${count.toLocaleString('ar-SA')} حقلًا قابلًا للمراجعة.` : 'تمت القراءة، لكن لم يتم العثور على حقول واضحة للتعبئة.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحليل المستندات.');
      toast.error(error instanceof Error ? error.message : 'تعذر تحليل المستندات.');
    } finally {
      setExtracting(false);
    }
  };

  const visibleFields = Object.entries(result?.fields || {}).filter(([, value]) => hasValue(value));
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <section className={`overflow-hidden rounded-[28px] border border-cyan-200/70 bg-gradient-to-l from-white via-sky-50/55 to-cyan-50/65 shadow-[0_18px_55px_rgba(14,116,144,0.10)] ${className}`}>
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-cyan-100/80 p-5 sm:p-6 lg:border-b-0 lg:border-l">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-white text-cyan-700 shadow-sm">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-black text-cyan-700">OCR / AI</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">قراءة ذكية للمستندات</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 sm:text-2xl">الاستخراج الذكي للبيانات</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{config.description}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {config.examples.map((item) => (
              <span key={item} className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-center text-[11px] font-bold text-slate-700 shadow-sm">{item}</span>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" className="h-12 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => cameraInputRef.current?.click()} disabled={disabled || extracting || files.length >= MAX_FILES}>
              <Camera className="ml-2 h-4 w-4" /> تصوير صفحة بالجوال
            </Button>
            <Button type="button" variant="outline" className="h-12 rounded-2xl bg-white/90" onClick={() => fileInputRef.current?.click()} disabled={disabled || extracting || files.length >= MAX_FILES}>
              <Upload className="ml-2 h-4 w-4" /> رفع صور / ملفات
            </Button>
            <Button type="button" className="h-12 rounded-2xl bg-cyan-700 text-white hover:bg-cyan-800" onClick={() => void analyze()} disabled={disabled || extracting || !files.length}>
              {extracting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
              تحليل المستندات {files.length ? `(${files.length.toLocaleString('ar-SA')})` : ''}
            </Button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf" className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          <p className="mt-2 text-[11px] leading-5 text-slate-500">حتى 8 صفحات/ملفات · 12MB للملف · 40MB للمجموعة. يمكنك تصوير عدة صفحات تباعًا قبل التحليل.</p>

          {files.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-black text-slate-700">الصفحات المختارة ({files.length.toLocaleString('ar-SA')})</div>
                <button type="button" className="text-[11px] font-bold text-slate-500 hover:text-red-600" onClick={() => { setFiles([]); setResult(null); setMessage(''); }}>مسح الكل</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {files.map((file, index) => (
                  <div key={fileSignature(file)} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-cyan-700" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold text-slate-700">{index + 1}. {file.name}</div>
                      <div className="text-[10px] text-slate-400">{formatBytes(file.size)}</div>
                    </div>
                    <button type="button" onClick={() => removeFile(index)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="حذف الصفحة"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-slate-400">الحجم الإجمالي: {formatBytes(totalSize)}</div>
            </div>
          )}

          {message && <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-xs font-semibold text-slate-700">{message}</div>}
        </div>
      </div>

      {result && (
        <div className="border-t border-cyan-100/90 bg-white/78 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-800"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> نتيجة القراءة — {config.label}</div>
              {result.summary && <p className="mt-1 text-xs leading-6 text-slate-500">{result.summary}</p>}
            </div>
            <div className="flex items-center gap-2">
              {typeof result.confidence === 'number' && <span className="rounded-full border bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">الثقة {Math.round(result.confidence * 100)}%</span>}
              <Button type="button" className="rounded-xl bg-emerald-700 text-white hover:bg-emerald-800" disabled={!visibleFields.length} onClick={() => { onApply(result.fields || {}); toast.success('تم تطبيق البيانات المستخرجة على الحقول المتاحة. راجعها قبل الحفظ.'); }}>
                <Sparkles className="ml-2 h-4 w-4" /> تعبئة الحقول تلقائيًا
              </Button>
            </div>
          </div>

          {visibleFields.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFields.map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400">{config.labels[key] || key}</div>
                  <div className="mt-1 break-words text-xs font-black text-slate-800">{typeof value === 'number' ? value.toLocaleString('ar-SA') : String(value)}</div>
                </div>
              ))}
            </div>
          )}

          {Boolean(result.warnings?.length) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <div className="mb-1 flex items-center gap-2 font-black"><AlertTriangle className="h-4 w-4" /> ملاحظات القراءة</div>
              {result.warnings?.map((warning, index) => <div key={`${warning}-${index}`}>• {warning}</div>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
