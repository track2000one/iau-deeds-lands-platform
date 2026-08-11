import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Barcode,
  Building2,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  PackagePlus,
  Paperclip,
  Save,
  ScanBarcode,
  Sparkles,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AppDateField } from '../components/AppDateField';
import { AssetOfficialTemplateFields } from '../components/AssetOfficialTemplateFields';
import { createAsset, extractAssetData, uploadAssetFile } from '../api/assets';
import type { AssetSmartExtraction, AssetSmartExtractionFields } from '../api/assets';
import type { AssetInput, AssetStatus } from '../../types/asset';

type AssetAttachmentCategory =
  | 'asset_images'
  | 'purchase_documents'
  | 'warranty_documents'
  | 'custody_documents'
  | 'other_documents';

type AssetAttachmentState = Record<AssetAttachmentCategory, File[]>;

const EMPTY_ATTACHMENTS: AssetAttachmentState = {
  asset_images: [],
  purchase_documents: [],
  warranty_documents: [],
  custody_documents: [],
  other_documents: [],
};

const SMART_EXTRACTION_LABELS: Record<keyof AssetSmartExtractionFields, string> = {
  itemNumber: 'رقم الصنف',
  barcode: 'الباركود',
  name: 'اسم الصنف / الأصل',
  category: 'التصنيف',
  brand: 'الماركة',
  model: 'الموديل',
  serialNumber: 'الرقم التسلسلي',
  purchaseDate: 'تاريخ الشراء',
  purchaseValue: 'قيمة الشراء',
  department: 'الجهة / الإدارة',
  building: 'المبنى',
  floor: 'الدور',
  room: 'الغرفة / الموقع',
  manufacturer: 'الشركة المصنعة',
  entityName: 'اسم الجهة',
  region: 'المنطقة',
  city: 'المدينة',
  assetDescription: 'وصف الأصل',
  supplier: 'المورد',
  invoiceNumber: 'رقم الفاتورة',
  currency: 'العملة',
};

const CATEGORY_LABELS: Record<string, string> = {
  it: 'تقنية معلومات',
  furniture: 'أثاث',
  equipment: 'أجهزة ومعدات',
  vehicle: 'مركبات',
  land: 'أراضي',
  other: 'أخرى',
};

const ATTACHMENT_SECTIONS: Array<{
  key: AssetAttachmentCategory;
  title: string;
  description: string;
  accept: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'asset_images',
    title: 'صور الأصل',
    description: 'صور عامة للأصل، ملصق الباركود، الرقم التسلسلي أو حالته الحالية.',
    accept: 'image/*',
    icon: <Camera className="h-5 w-5" />,
  },
  {
    key: 'purchase_documents',
    title: 'الفاتورة ومستندات الشراء',
    description: 'الفاتورة، أمر الشراء، مستند التوريد أو أي مستند مالي مرتبط بالأصل.',
    accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: 'warranty_documents',
    title: 'الضمان والكتيبات الفنية',
    description: 'شهادة الضمان، كتيب التشغيل، المواصفات الفنية أو تقارير الفحص.',
    accept: 'image/*,.pdf,.doc,.docx',
    icon: <Paperclip className="h-5 w-5" />,
  },
  {
    key: 'custody_documents',
    title: 'مستندات العهدة والاستلام',
    description: 'محضر استلام، نموذج عهدة، نقل عهدة أو مستند تسليم واستلام.',
    accept: 'image/*,.pdf,.doc,.docx',
    icon: <UserRound className="h-5 w-5" />,
  },
  {
    key: 'other_documents',
    title: 'مرفقات أخرى',
    description: 'أي صور أو ملفات إضافية مرتبطة بالأصل ولا تندرج ضمن الأقسام السابقة.',
    accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt',
    icon: <Upload className="h-5 w-5" />,
  },
];

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentImagePreview: React.FC<{ file: File }> = ({ file }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = file.type.startsWith('image/');

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  if (!isImage || !previewUrl) return null;

  return (
    <div className="relative overflow-hidden border-b bg-slate-100">
      <img
        src={previewUrl}
        alt={`معاينة ${file.name}`}
        className="h-44 w-full bg-slate-100 object-contain sm:h-52"
      />
      <div className="absolute bottom-2 right-2 rounded-lg bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
        معاينة الصورة
      </div>
    </div>
  );
};

const emptyForm: AssetInput = {
  itemNumber: '',
  barcode: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'available',
  department: '',
  building: '',
  floor: '',
  room: '',
  purchaseDate: '',
  purchaseDateType: 'gregorian',
  purchaseValue: null,
  notes: '',
  attachments: [],
  excelPayload: { templateType: 'ppe' },
};

export const AddAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<AssetInput>(emptyForm);
  const [attachments, setAttachments] = useState<AssetAttachmentState>(EMPTY_ATTACHMENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');
  const [hardwareScannerActive, setHardwareScannerActive] = useState(false);
  const [hardwareScannerMessage, setHardwareScannerMessage] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerFrameRef = useRef<number | null>(null);
  const smartFileInputRef = useRef<HTMLInputElement | null>(null);
  const smartCameraInputRef = useRef<HTMLInputElement | null>(null);
  const [smartSourceFiles, setSmartSourceFiles] = useState<File[]>([]);
  const [smartExtraction, setSmartExtraction] = useState<AssetSmartExtraction | null>(null);
  const [smartExtracting, setSmartExtracting] = useState(false);
  const [smartExtractionMessage, setSmartExtractionMessage] = useState('');

  const totalAttachments = useMemo(
    () => Object.values(attachments).reduce((total, files) => total + files.length, 0),
    [attachments]
  );

  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (category: AssetAttachmentCategory, files: FileList | null) => {
    if (!files?.length) return;

    setAttachments((current) => {
      const existing = current[category];
      const incoming = Array.from(files);
      const merged = [...existing];

      incoming.forEach((file) => {
        const duplicate = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );
        if (!duplicate) merged.push(file);
      });

      return { ...current, [category]: merged };
    });
  };

  const removeFile = (category: AssetAttachmentCategory, index: number) => {
    setAttachments((current) => ({
      ...current,
      [category]: current[category].filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const startHardwareBarcodeReader = () => {
    setHardwareScannerMessage('');
    setHardwareScannerActive(true);
    setField('barcode', '');
    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
    });
  };

  const finishHardwareBarcodeReader = (rawValue?: string) => {
    const value = String(rawValue ?? barcodeInputRef.current?.value ?? form.barcode ?? '').trim();
    if (!value) {
      setHardwareScannerMessage('لم يتم استلام باركود بعد. مرّر الملصق أمام القارئ المتصل ثم حاول مرة أخرى.');
      barcodeInputRef.current?.focus();
      return;
    }

    setField('barcode', value);
    setHardwareScannerActive(false);
    setHardwareScannerMessage(`تمت قراءة الباركود من القارئ المتصل بنجاح: ${value}`);
    barcodeInputRef.current?.blur();
  };

  const cancelHardwareBarcodeReader = () => {
    setHardwareScannerActive(false);
    setHardwareScannerMessage('تم إلغاء وضع القراءة من القارئ المتصل.');
    barcodeInputRef.current?.blur();
  };

  const handleHardwareScannerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hardwareScannerActive) return;

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      finishHardwareBarcodeReader(event.currentTarget.value);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelHardwareBarcodeReader();
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;

    let active = true;

    const stopScanner = () => {
      active = false;
      if (scannerFrameRef.current !== null) {
        window.cancelAnimationFrame(scannerFrameRef.current);
        scannerFrameRef.current = null;
      }
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const startScanner = async () => {
      setScannerMessage('');

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setScannerMessage('قارئ الباركود بالكاميرا غير مدعوم في هذا المتصفح. جرّب متصفحًا حديثًا على الجوال أو أدخل الرقم يدويًا.');
        setScannerOpen(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerMessage('تعذر الوصول إلى كاميرا الجهاز من هذا المتصفح.');
        setScannerOpen(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        const detector = new BarcodeDetectorCtor();

        const scanFrame = async () => {
          if (!active || !videoRef.current) return;

          try {
            if (videoRef.current.readyState >= 2) {
              const results = await detector.detect(videoRef.current);
              const value = results?.[0]?.rawValue;
              if (value) {
                setField('barcode', String(value));
                setScannerMessage(`تمت قراءة الباركود بنجاح: ${String(value)}`);
                setScannerOpen(false);
                return;
              }
            }
          } catch {
            // Continue scanning; transient frame detection errors are expected.
          }

          scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
        };

        scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
      } catch (cameraError: any) {
        const permissionDenied = cameraError?.name === 'NotAllowedError' || cameraError?.name === 'PermissionDeniedError';
        setScannerMessage(
          permissionDenied
            ? 'لم يتم السماح باستخدام الكاميرا. اسمح للمتصفح بالوصول إلى الكاميرا ثم حاول مرة أخرى.'
            : 'تعذر تشغيل كاميرا الجوال لقراءة الباركود.'
        );
        setScannerOpen(false);
      }
    };

    void startScanner();
    return stopScanner;
  }, [scannerOpen]);

  const smartExtractionEntries = useMemo(() => {
    if (!smartExtraction?.fields) return [];
    return (Object.entries(smartExtraction.fields) as Array<[keyof AssetSmartExtractionFields, unknown]>)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => ({
        key,
        label: SMART_EXTRACTION_LABELS[key] || String(key),
        value: key === 'category' ? (CATEGORY_LABELS[String(value)] || String(value)) : key === 'purchaseValue' ? Number(value).toLocaleString('ar-SA') + ' ر.س' : String(value),
      }));
  }, [smartExtraction]);

  const addSmartSourceFiles = (incoming: FileList | File[] | null) => {
    if (!incoming || smartExtracting) return;
    const candidates = Array.from(incoming);
    if (!candidates.length) return;

    const valid: File[] = [];
    const rejected: string[] = [];
    candidates.forEach((file) => {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/');
      if (!isPdf && !isImage) {
        rejected.push(file.name + ' (نوع غير مدعوم)');
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        rejected.push(file.name + ' (أكبر من 12MB)');
        return;
      }
      valid.push(file);
    });

    setSmartSourceFiles((current) => {
      const merged = [...current];
      valid.forEach((file) => {
        const duplicate = merged.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
        if (!duplicate && merged.length < 8) merged.push(file);
      });
      const totalSize = merged.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 40 * 1024 * 1024) {
        setSmartExtractionMessage('إجمالي ملفات القراءة تجاوز 40MB. احذف بعض الصفحات أو استخدم ملفات أصغر.');
        return current;
      }
      return merged;
    });
    setSmartExtraction(null);
    if (rejected.length) setSmartExtractionMessage('تم تجاهل: ' + rejected.join('، '));
    else setSmartExtractionMessage('تمت إضافة الصفحات. يمكنك إضافة صور/ملفات أخرى ثم بدء التحليل دفعة واحدة.');
  };

  const removeSmartSourceFile = (index: number) => {
    setSmartSourceFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setSmartExtraction(null);
    setSmartExtractionMessage('تم تحديث مجموعة الصفحات. اضغط «تحليل المستندات» لقراءة المجموعة الحالية.');
  };

  const clearSmartSourceFiles = () => {
    setSmartSourceFiles([]);
    setSmartExtraction(null);
    setSmartExtractionMessage('');
  };

  const handleSmartExtraction = async () => {
    if (!smartSourceFiles.length || smartExtracting) return;
    setSmartExtraction(null);
    setSmartExtractionMessage('جارٍ قراءة ' + smartSourceFiles.length.toLocaleString('ar-SA') + ' صفحة/ملف وربط البيانات بينها...');
    setSmartExtracting(true);
    try {
      const result = await extractAssetData(smartSourceFiles);
      setSmartExtraction(result);
      const found = Object.values(result.fields || {}).filter((value) => value !== null && value !== undefined && String(value).trim() !== '').length;
      setSmartExtractionMessage(found ? ('تم تحليل ' + smartSourceFiles.length.toLocaleString('ar-SA') + ' صفحة/ملف واستخراج ' + found.toLocaleString('ar-SA') + ' حقل. راجع النتائج ثم طبّقها على النموذج.') : 'تمت قراءة المستندات، لكن لم يتم العثور على بيانات أصل واضحة بما يكفي.');
    } catch (smartError: any) {
      setSmartExtractionMessage(String(smartError?.message || 'تعذر قراءة المستندات واستخراج البيانات.'));
    } finally {
      setSmartExtracting(false);
    }
  };

  const applySmartExtraction = () => {
    const fields = smartExtraction?.fields;
    if (!fields) return;
    let applied = 0;
    setForm((current) => {
      const next = { ...current } as AssetInput;
      const fillText = (key: keyof AssetInput, value: unknown) => {
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = current[key];
        if (existing === null || existing === undefined || String(existing).trim() === '') {
          (next as any)[key] = String(value).trim();
          applied += 1;
        }
      };

      fillText('itemNumber', fields.itemNumber);
      fillText('barcode', fields.barcode);
      fillText('name', fields.name);
      fillText('category', fields.category);
      fillText('brand', fields.brand);
      fillText('model', fields.model);
      fillText('serialNumber', fields.serialNumber);
      fillText('purchaseDate', fields.purchaseDate);
      fillText('department', fields.department || fields.entityName);
      fillText('building', fields.building);
      fillText('floor', fields.floor);
      fillText('room', fields.room);
      fillText('manufacturer', fields.manufacturer);
      fillText('entityName', fields.entityName || fields.department);
      fillText('region', fields.region);
      fillText('city', fields.city);
      fillText('assetDescription', fields.assetDescription);

      if (fields.purchaseValue !== null && fields.purchaseValue !== undefined && (current.purchaseValue === null || current.purchaseValue === undefined || current.purchaseValue === ('' as any))) {
        next.purchaseValue = Number(fields.purchaseValue);
        applied += 1;
      }
      return next;
    });
    setSmartExtractionMessage('تمت تعبئة الحقول الفارغة تلقائيًا. الحقول التي سبق إدخالها يدويًا لم يتم استبدالها.');
  };

  const handleSubmit = async () => {
    setError('');

    if (!String(form.itemNumber || '').trim()) { setError('رقم الصنف مطلوب.'); return; }

    if (!String(form.name || '').trim()) {
      setError('اسم الأصل مطلوب.');
      return;
    }

    if (!String(form.category || '').trim()) {
      setError('تصنيف الأصل مطلوب.');
      return;
    }

    try {
      setIsSaving(true);

      const filesToUpload = ATTACHMENT_SECTIONS.flatMap((section) =>
        attachments[section.key].map((file) => ({
          file,
          category: section.key,
          categoryTitle: section.title,
        }))
      );

      const uploaded = [];
      for (let index = 0; index < filesToUpload.length; index += 1) {
        const item = filesToUpload[index];
        setUploadProgress(`رفع المرفق ${index + 1} من ${filesToUpload.length}: ${item.file.name}`);
        const uploadedFile = await uploadAssetFile(item.file, item.category);
        uploaded.push({
          ...uploadedFile,
          notes: item.category,
        });
      }

      setUploadProgress('حفظ بيانات الأصل...');

      const created = await createAsset({
        ...form,
        itemNumber: String(form.itemNumber || '').trim(),
        barcode: String(form.barcode || '').trim() || null,
        name: String(form.name || '').trim(),
        category: String(form.category || '').trim(),
        brand: String(form.brand || '').trim() || null,
        model: String(form.model || '').trim() || null,
        serialNumber: String(form.serialNumber || '').trim() || null,
        department: String(form.department || '').trim() || null,
        building: String(form.building || '').trim() || null,
        floor: String(form.floor || '').trim() || null,
        room: String(form.room || '').trim() || null,
        purchaseDate: form.purchaseDate || null,
        purchaseValue:
          form.purchaseValue === null || form.purchaseValue === undefined || form.purchaseValue === ('' as any)
            ? null
            : Number(form.purchaseValue),
        notes: String(form.notes || '').trim() || null,
        attachments: uploaded,
      });

      navigate('/assets/list', {
        replace: true,
        state: { createdAssetNumber: created.assetNumber },
      });
    } catch (submitError: any) {
      setError(submitError?.message || 'تعذر حفظ الأصل. حاول مرة أخرى.');
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <PackagePlus className="h-4 w-4" />
            وحدة الأصول
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">إضافة أصل جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            تسجيل الأصل وربطه بالموقع الإداري والمرفقات مباشرة بقاعدة البيانات.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate('/assets/list')} className="h-11 rounded-2xl">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لسجل الأصول
        </Button>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden rounded-[30px] border border-cyan-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,.96),rgba(245,252,253,.92),rgba(249,250,251,.96))] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <CardContent className="p-0">
          <div className="grid gap-0 xl:grid-cols-[1.15fr_.85fr]">
            <div className="order-2 border-t border-slate-200/70 p-5 sm:p-6 xl:order-1 xl:border-l xl:border-t-0">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={() => smartCameraInputRef.current?.click()} disabled={smartExtracting || smartSourceFiles.length >= 8} className="h-12 flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                  <Camera className="ml-2 h-4 w-4" />
                  تصوير صفحة بالجوال
                </Button>
                <Button type="button" variant="outline" onClick={() => smartFileInputRef.current?.click()} disabled={smartExtracting || smartSourceFiles.length >= 8} className="h-12 flex-1 rounded-2xl bg-white/90">
                  <Upload className="ml-2 h-4 w-4" />
                  رفع صور / ملفات
                </Button>
                <Button type="button" onClick={() => void handleSmartExtraction()} disabled={smartExtracting || !smartSourceFiles.length} className="h-12 flex-1 rounded-2xl bg-cyan-700 text-white hover:bg-cyan-800">
                  {smartExtracting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
                  تحليل المستندات {smartSourceFiles.length ? '(' + smartSourceFiles.length.toLocaleString('ar-SA') + ')' : ''}
                </Button>
                <input ref={smartCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addSmartSourceFiles(event.target.files); event.currentTarget.value = ''; }} />
                <input ref={smartFileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,.pdf,application/pdf" className="hidden" onChange={(event) => { addSmartSourceFiles(event.target.files); event.currentTarget.value = ''; }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>حتى 8 صفحات/ملفات • 12MB للملف • 40MB للمجموعة</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>يمكن التصوير عدة مرات أو اختيار عدة ملفات دفعة واحدة</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>تستخدم للتحليل فقط ولا تُحفظ كمرفقات تلقائيًا</span>
              </div>

              {smartSourceFiles.length > 0 && (
                <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/45 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-slate-700">صفحات ومستندات القراءة <span className="mr-1 rounded-full bg-white px-2 py-0.5 text-cyan-700">{smartSourceFiles.length.toLocaleString('ar-SA')}</span></div>
                    <button type="button" onClick={clearSmartSourceFiles} disabled={smartExtracting} className="text-[11px] font-bold text-slate-500 hover:text-red-600">مسح الكل</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {smartSourceFiles.map((file, index) => (
                      <div key={file.name + file.size + file.lastModified} className="flex items-center gap-2 rounded-xl border border-white bg-white/90 px-3 py-2 shadow-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600">{(index + 1).toLocaleString('ar-SA')}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-slate-700" title={file.name}>{file.name}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" onClick={() => removeSmartSourceFile(index)} disabled={smartExtracting} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="حذف هذه الصفحة"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(smartSourceFiles.length > 0 || smartExtractionMessage) && (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black">نتيجة القراءة المجمعة (معاينة)</div>
                      {smartSourceFiles.length > 0 && <div className="mt-1 text-[11px] text-muted-foreground">يتم دمج المعلومات من جميع الصفحات باعتبارها مستندات مرتبطة بنفس الأصل.</div>}
                    </div>
                    {smartExtraction && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> تم الاستخراج بنجاح
                      </div>
                    )}
                  </div>

                  {smartExtractionMessage && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs leading-6 text-slate-600">
                      {smartExtracting && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-cyan-600" />}
                      {smartExtractionMessage}
                    </div>
                  )}

                  {smartExtractionEntries.length > 0 && (
                    <>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {smartExtractionEntries.slice(0, 12).map((entry) => (
                          <div key={String(entry.key)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                            <div className="text-[10px] font-semibold text-muted-foreground">{entry.label}</div>
                            <div className="mt-1 truncate text-xs font-extrabold text-slate-800" title={entry.value}>{entry.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Button type="button" onClick={applySmartExtraction} className="h-10 rounded-xl bg-slate-900 px-5 text-white hover:bg-slate-800">
                          <Sparkles className="ml-2 h-4 w-4 text-cyan-300" />
                          تعبئة الحقول تلقائيًا
                        </Button>
                        <span className="text-[11px] text-muted-foreground">راجع البيانات قبل الحفظ. لن يتم استبدال أي حقل أدخلته يدويًا.</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="order-1 relative overflow-hidden p-5 sm:p-7 xl:order-2">
              <div className="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-cyan-200/25 blur-3xl" />
              <div className="absolute -bottom-12 right-0 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl" />
              <div className="relative flex h-full flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black tracking-wide text-cyan-700">OCR / AI</span>
                  <span className="rounded-full border bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-slate-500">قراءة ذكية للمستندات</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-100 bg-white shadow-sm">
                    <Sparkles className="h-7 w-7 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 sm:text-2xl">الاستخراج الذكي للبيانات</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      التقط صفحة واحدة أو عدة صفحات، أو ارفع مجموعة صور وملفات PDF؛ وسيقرأ النظام المستندات معًا ويربط المعلومات بينها لتعبئة الحقول المناسبة تلقائيًا.
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                  {['اسم الصنف', 'قيمة الشراء', 'الماركة', 'الموديل', 'الرقم التسلسلي', 'الجهة والموقع'].map((label) => (
                    <div key={label} className="rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-center font-bold text-slate-600 shadow-sm">{label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Barcode className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>رقم الصنف *</Label>
            <Input value={form.itemNumber || ''} onChange={(e) => setField('itemNumber', e.target.value)} placeholder="أدخل رقم الصنف الفريد" />
          </div>
          <div className="space-y-2">
            <Label>رقم الباركود / ملصق الأصل</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                ref={barcodeInputRef}
                value={form.barcode || ''}
                onChange={(e) => setField('barcode', e.target.value)}
                onKeyDown={handleHardwareScannerKeyDown}
                autoComplete="off"
                className={hardwareScannerActive ? 'min-w-[220px] flex-1 border-emerald-400 ring-2 ring-emerald-100' : 'min-w-[220px] flex-1'}
                placeholder={hardwareScannerActive ? 'جاهز للقراءة... مرّر الباركود أمام القارئ' : 'اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول'}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => hardwareScannerActive ? finishHardwareBarcodeReader(barcodeInputRef.current?.value) : startHardwareBarcodeReader()}
                className={hardwareScannerActive ? 'h-10 shrink-0 rounded-xl border-emerald-300 bg-emerald-50 px-3 text-emerald-700 hover:bg-emerald-100' : 'h-10 shrink-0 rounded-xl px-3'}
                title="قراءة الباركود من قارئ USB أو القارئ اللاسلكي المتصل بالكمبيوتر"
              >
                <Barcode className="ml-2 h-4 w-4 text-emerald-600" />
                <span>{hardwareScannerActive ? 'إنهاء القراءة' : 'قارئ USB'}</span>
              </Button>
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="h-10 shrink-0 rounded-xl px-3">
                <ScanBarcode className="ml-2 h-4 w-4 text-blue-600" />
                <span className="hidden sm:inline">كاميرا الجوال</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">يدعم قارئ الباركود المتصل بالكمبيوتر عبر USB أو اللاسلكي بوضع لوحة المفاتيح، وكذلك القراءة بكاميرا الجوال.</p>
            {hardwareScannerActive && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                القارئ جاهز الآن: مرّر الباركود أمام الجهاز المتصل. تُعتمد القراءة تلقائيًا عند إرسال Enter أو Tab من القارئ، ويمكن الضغط على «إنهاء القراءة» يدويًا.
              </div>
            )}
            {hardwareScannerMessage && !hardwareScannerActive && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                {hardwareScannerMessage}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>اسم الأصل *</Label>
            <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="مثال: جهاز حاسب مكتبي" />
          </div>
          <div className="space-y-2">
            <Label>التصنيف *</Label>
            <Select value={form.category} onValueChange={(value) => setField('category', value)}>
              <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="it">تقنية معلومات</SelectItem>
                <SelectItem value="furniture">أثاث</SelectItem>
                <SelectItem value="equipment">أجهزة ومعدات</SelectItem>
                <SelectItem value="vehicle">مركبات</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={form.status} onValueChange={(value) => setField('status', value as AssetStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">متاح</SelectItem>
                <SelectItem value="in_use">قيد الاستخدام</SelectItem>
                <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                <SelectItem value="damaged">تالف</SelectItem>
                <SelectItem value="lost">مفقود / عجز</SelectItem>
                <SelectItem value="disposed">مستبعد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الماركة</Label>
            <Input value={form.brand || ''} onChange={(e) => setField('brand', e.target.value)} placeholder="مثال: Dell" />
          </div>
          <div className="space-y-2">
            <Label>الموديل</Label>
            <Input value={form.model || ''} onChange={(e) => setField('model', e.target.value)} placeholder="الموديل" />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label>الرقم التسلسلي</Label>
            <Input value={form.serialNumber || ''} onChange={(e) => setField('serialNumber', e.target.value)} placeholder="Serial Number" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            الموقع والعهدة
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>الجهة / الإدارة</Label>
            <Input value={form.department || ''} onChange={(e) => setField('department', e.target.value)} placeholder="اسم الجهة" />
          </div>
          <div className="space-y-2">
            <Label>المبنى</Label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={form.building || ''} onChange={(e) => setField('building', e.target.value)} className="pr-9" placeholder="اسم أو رقم المبنى" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} placeholder="الدور" />
          </div>
          <div className="space-y-2">
            <Label>الغرفة / الموقع التفصيلي</Label>
            <Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} placeholder="رقم الغرفة أو وصف الموقع" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="text-lg">بيانات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <AppDateField
              id="asset-purchase-date"
              label="تاريخ الشراء"
              value={String(form.purchaseDate || '')}
              dateType={form.purchaseDateType || 'gregorian'}
              onValueChange={(value) => setField('purchaseDate', value)}
              onDateTypeChange={(value) => setField('purchaseDateType', value)}
            />
          </div>
          <div className="space-y-2">
            <Label>قيمة الشراء</Label>
            <Input type="number" min="0" step="0.01" value={form.purchaseValue ?? ''} onChange={(e) => setField('purchaseValue', e.target.value === '' ? null : Number(e.target.value))} placeholder="0.00" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} rows={4} placeholder="أي معلومات إضافية عن الأصل..." />
          </div>
        </CardContent>
      </Card>

      <AssetOfficialTemplateFields value={form} onChange={setForm} />

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Paperclip className="h-5 w-5 text-primary" />
                المرفقات والوثائق
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                يمكن رفع عدة ملفات في كل خانة، وسيتم رفعها إلى Google Drive وربطها تلقائيًا بالأصل.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="h-9 rounded-xl px-3 text-xs">
                <ScanBarcode className="ml-2 h-4 w-4 text-blue-600" />
                قارئ الباركود
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                <Camera className="ml-2 h-4 w-4" />
                تصوير مباشر
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    addFiles('asset_images', event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <div className="w-fit rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold">
                {totalAttachments} مرفق
              </div>
            </div>
          </div>
        </CardHeader>

        {scannerMessage && (
          <div className="mx-5 mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800 sm:mx-6">
            {scannerMessage}
          </div>
        )}

        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2">
          {ATTACHMENT_SECTIONS.map((section) => {
            const files = attachments[section.key];
            return (
              <div key={section.key} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="border-b bg-white/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary">
                      {section.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold">{section.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[0.025] px-4 py-4 text-center transition hover:border-primary/60 hover:bg-primary/[0.045]">
                    <Upload className="mb-2 h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">اختيار ملفات</span>
                    <span className="mt-1 text-xs text-muted-foreground">يمكنك اختيار عدة ملفات دفعة واحدة</span>
                    <input
                      type="file"
                      multiple
                      accept={section.accept}
                      className="hidden"
                      onChange={(event) => {
                        addFiles(section.key, event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}-${index}`} className="overflow-hidden rounded-xl border bg-background/80 shadow-sm">
                          <AttachmentImagePreview file={file} />
                          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(section.key, index)} className="h-8 w-8 shrink-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">الحفظ مرتبط الآن بقاعدة البيانات.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploadProgress || 'سيُنشأ رقم الأصل تلقائيًا، وترفع المرفقات ثم تربط بالسجل.'}
          </p>
        </div>
        <Button disabled={isSaving} onClick={handleSubmit} className="h-11 rounded-2xl px-6">
          <Save className="ml-2 h-4 w-4" />
          {isSaving ? 'جارٍ الحفظ...' : 'حفظ الأصل'}
        </Button>
      </div>
      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="قارئ الباركود">
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-cyan-300" />
                <div>
                  <h3 className="font-bold">قارئ باركود الأصل</h3>
                  <p className="mt-0.5 text-[11px] text-slate-300">وجّه الكاميرا الخلفية نحو الباركود حتى تتم القراءة تلقائيًا.</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setScannerOpen(false)} className="text-white hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-36 w-[82%] max-w-sm rounded-2xl border-2 border-cyan-300/90 shadow-[0_0_0_999px_rgba(2,6,23,0.38),0_0_30px_rgba(34,211,238,0.28)]">
                  <div className="absolute left-3 right-3 top-1/2 h-px bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-300">
              <span>تعمل الكاميرا الخلفية تلقائيًا على الجوال.</span>
              <Button type="button" variant="outline" onClick={() => setScannerOpen(false)} className="h-9 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">إلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
