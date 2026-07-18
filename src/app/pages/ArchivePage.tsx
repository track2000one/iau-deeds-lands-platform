import React, { useMemo, useRef, useState } from 'react';
import {
  Archive,
  Upload,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  ExternalLink,
  Save,
  X,
  FileText,
  Loader2,
  Paperclip,
  CalendarDays,
  Tags,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';

type ArchiveDocument = {
  id: string;
  title: string;
  category: string;
  documentNumber: string;
  documentDate: string;
  issuingAuthority: string;
  confidentiality: 'public' | 'internal' | 'confidential';
  tags: string;
  description: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  driveUrl: string;
  driveFileId: string;
  createdAt: string;
  updatedAt: string;
};

type UploadResponse = {
  fileName: string;
  driveUrl: string;
  driveFileId: string;
  mimeType: string;
  attachment?: unknown;
};

type ArchiveFormState = {
  title: string;
  category: string;
  documentNumber: string;
  documentDate: string;
  issuingAuthority: string;
  confidentiality: 'public' | 'internal' | 'confidential';
  tags: string;
  description: string;
  file?: File | null;
};

const STORAGE_KEY = 'iau_archive_documents_v1';
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

const emptyForm: ArchiveFormState = {
  title: '',
  category: 'عام',
  documentNumber: '',
  documentDate: new Date().toISOString().split('T')[0],
  issuingAuthority: '',
  confidentiality: 'internal',
  tags: '',
  description: '',
  file: null,
};

const categories = ['عام', 'صكوك', 'أراضي', 'مباني', 'عقود', 'محاضر', 'خطابات', 'صور', 'مخططات', 'مراسلات', 'أخرى'];

const confidentialityOptions = [
  { value: 'public', label: 'عام' },
  { value: 'internal', label: 'داخلي' },
  { value: 'confidential', label: 'سري' },
] as const;

const formatFileSize = (bytes: number) => {
  if (!bytes || Number.isNaN(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleDateString('ar-SA');
  } catch {
    return '-';
  }
};

const getConfidentialityLabel = (value: ArchiveDocument['confidentiality']) =>
  confidentialityOptions.find((item) => item.value === value)?.label || value;

const getConfidentialityVariant = (value: ArchiveDocument['confidentiality']) => {
  if (value === 'confidential') return 'destructive';
  if (value === 'public') return 'secondary';
  return 'outline';
};

const loadArchiveDocuments = (): ArchiveDocument[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveArchiveDocuments = (items: ArchiveDocument[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const ArchivePage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<ArchiveDocument[]>(() => loadArchiveDocuments());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterConfidentiality, setFilterConfidentiality] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<ArchiveFormState>(emptyForm);
  const [selectedDocument, setSelectedDocument] = useState<ArchiveDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ArchiveDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return documents.filter((doc) => {
      const matchesSearch =
        !query ||
        [doc.title, doc.category, doc.documentNumber, doc.documentDate, doc.issuingAuthority, doc.tags, doc.description, doc.originalName, doc.mimeType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory = !filterCategory || doc.category === filterCategory;
      const matchesConfidentiality = !filterConfidentiality || doc.confidentiality === filterConfidentiality;

      return matchesSearch && matchesCategory && matchesConfidentiality;
    });
  }, [documents, searchQuery, filterCategory, filterConfidentiality]);

  const totalSize = useMemo(() => documents.reduce((sum, doc) => sum + Number(doc.fileSize || 0), 0), [documents]);
  const availableCategories = useMemo(() => Array.from(new Set([...categories, ...documents.map((doc) => doc.category).filter(Boolean)])), [documents]);

  const updateFormField = (field: keyof ArchiveFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const persistDocuments = (items: ArchiveDocument[]) => {
    setDocuments(items);
    saveArchiveDocuments(items);
  };

  const openAddForm = () => {
    setFormMode('add');
    setSelectedDocument(null);
    setDetailsOpen(false);
    setForm(emptyForm);
    setFormOpen(true);
    setTimeout(() => document.getElementById('archive-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openEditForm = (doc: ArchiveDocument) => {
    setFormMode('edit');
    setSelectedDocument(doc);
    setDetailsOpen(false);
    setForm({
      title: doc.title,
      category: doc.category,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      issuingAuthority: doc.issuingAuthority,
      confidentiality: doc.confidentiality,
      tags: doc.tags,
      description: doc.description,
      file: null,
    });
    setFormOpen(true);
    setTimeout(() => document.getElementById('archive-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openDetails = (doc: ArchiveDocument) => {
    setSelectedDocument(doc);
    setFormOpen(false);
    setDetailsOpen(true);
    setTimeout(() => document.getElementById('archive-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const requestDelete = (doc: ArchiveDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!documentToDelete) return;
    const next = documents.filter((doc) => doc.id !== documentToDelete.id);
    persistDocuments(next);
    toast.success('تم حذف الملف من الأرشفة');
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
    if (selectedDocument?.id === documentToDelete.id) {
      setSelectedDocument(null);
      setDetailsOpen(false);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('عنوان الملف مطلوب');
      return false;
    }
    if (!form.category.trim()) {
      toast.error('تصنيف الملف مطلوب');
      return false;
    }
    if (formMode === 'add' && !form.file) {
      toast.error('اختر ملفًا للأرشفة');
      return false;
    }
    return true;
  };

  const uploadFileToGoogleDrive = async (file: File): Promise<UploadResponse> => {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_URL غير موجود. تأكد من ربط الواجهة بالـ Backend في Railway.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || 'تعذر رفع الملف إلى Google Drive');
    }
    if (!body?.driveUrl) {
      throw new Error('تم رفع الملف لكن لم يتم إرجاع رابط Google Drive');
    }
    return body as UploadResponse;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      if (formMode === 'add') {
        const file = form.file as File;
        const uploaded = await uploadFileToGoogleDrive(file);

        const newDocument: ArchiveDocument = {
          id: `archive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: form.title.trim(),
          category: form.category.trim(),
          documentNumber: form.documentNumber.trim(),
          documentDate: form.documentDate,
          issuingAuthority: form.issuingAuthority.trim(),
          confidentiality: form.confidentiality,
          tags: form.tags.trim(),
          description: form.description.trim(),
          fileName: uploaded.fileName || file.name,
          originalName: file.name,
          mimeType: uploaded.mimeType || file.type || 'application/octet-stream',
          fileSize: file.size,
          driveUrl: uploaded.driveUrl,
          driveFileId: uploaded.driveFileId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        persistDocuments([newDocument, ...documents]);
        toast.success('تمت أرشفة الملف بنجاح');
      } else if (selectedDocument) {
        let updatedFileData: Partial<ArchiveDocument> = {};

        if (form.file) {
          const uploaded = await uploadFileToGoogleDrive(form.file);
          updatedFileData = {
            fileName: uploaded.fileName || form.file.name,
            originalName: form.file.name,
            mimeType: uploaded.mimeType || form.file.type || 'application/octet-stream',
            fileSize: form.file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          };
        }

        const next = documents.map((doc) =>
          doc.id === selectedDocument.id
            ? {
                ...doc,
                title: form.title.trim(),
                category: form.category.trim(),
                documentNumber: form.documentNumber.trim(),
                documentDate: form.documentDate,
                issuingAuthority: form.issuingAuthority.trim(),
                confidentiality: form.confidentiality,
                tags: form.tags.trim(),
                description: form.description.trim(),
                ...updatedFileData,
                updatedAt: new Date().toISOString(),
              }
            : doc
        );

        persistDocuments(next);
        toast.success('تم تحديث بيانات الملف');
      }

      setFormOpen(false);
      setSelectedDocument(null);
      setForm(emptyForm);
    } catch (error) {
      console.error('Archive save error:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في حفظ بيانات الأرشفة');
    } finally {
      setIsSaving(false);
    }
  };

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    updateFormField('file', file);
    if (!form.title.trim()) {
      updateFormField('title', file.name.replace(/\.[^/.]+$/, ''));
    }
    event.target.value = '';
  };

  const openFile = (doc: ArchiveDocument) => {
    window.open(doc.driveUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = (doc: ArchiveDocument) => {
    const link = document.createElement('a');
    link.href = doc.driveUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = doc.originalName || doc.fileName;
    link.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterConfidentiality('');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الأرشفة</h1>
          <p className="text-muted-foreground mt-1">
            أرشفة المستندات والصور وملفات PDF وWord وجميع الصيغ مع العناوين والتصنيفات والبحث.
          </p>
        </div>

        <Button onClick={openAddForm} className="w-full lg:w-auto">
          <Plus className="ml-2 h-4 w-4" />
          إضافة ملف للأرشفة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الملفات</p>
              <p className="text-2xl font-bold">{documents.length}</p>
            </div>
            <Archive className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">نتائج البحث</p>
              <p className="text-2xl font-bold">{filteredDocuments.length}</p>
            </div>
            <Search className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">حجم الملفات</p>
              <p className="text-2xl font-bold">{formatFileSize(totalSize)}</p>
            </div>
            <Paperclip className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">التصنيفات</p>
              <p className="text-2xl font-bold">{new Set(documents.map((doc) => doc.category).filter(Boolean)).size}</p>
            </div>
            <Tags className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>
      </div>

      {formOpen && (
        <div id="archive-form" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{formMode === 'add' ? 'إضافة ملف للأرشفة' : 'تعديل بيانات الملف'}</h2>
              <p className="text-sm text-muted-foreground mt-1">أضف عنوانًا وتصنيفًا وبيانات وصفية، ثم ارفع الملف إلى Google Drive.</p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setSelectedDocument(null);
                setForm(emptyForm);
              }}
              disabled={isSaving}
              className="w-full md:w-auto"
            >
              <X className="ml-2 h-4 w-4" />
              إغلاق النموذج
            </Button>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بيانات الملف</CardTitle>
                <CardDescription>كل ملف في الأرشفة له عنوان وتصنيف ورقم وتاريخ وجهة وملاحظات.</CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>عنوان الملف *</Label>
                  <Input value={form.title} onChange={(e) => updateFormField('title', e.target.value)} placeholder="مثال: خطاب تسليم أجهزة الباركود" />
                </div>

                <div className="space-y-2">
                  <Label>التصنيف *</Label>
                  <NativeSelect value={form.category} onChange={(e) => updateFormField('category', e.target.value)}>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label>رقم المستند</Label>
                  <Input value={form.documentNumber} onChange={(e) => updateFormField('documentNumber', e.target.value)} placeholder="اختياري" />
                </div>

                <div className="space-y-2">
                  <Label>تاريخ المستند</Label>
                  <Input type="date" value={form.documentDate} onChange={(e) => updateFormField('documentDate', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>درجة السرية</Label>
                  <NativeSelect value={form.confidentiality} onChange={(e) => updateFormField('confidentiality', e.target.value)}>
                    {confidentialityOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>الجهة / المصدر</Label>
                  <Input value={form.issuingAuthority} onChange={(e) => updateFormField('issuingAuthority', e.target.value)} placeholder="مثال: إدارة أوقاف وأملاك الجامعة" />
                </div>

                <div className="space-y-2">
                  <Label>الكلمات المفتاحية</Label>
                  <Input value={form.tags} onChange={(e) => updateFormField('tags', e.target.value)} placeholder="مثال: صك، عقد، محضر" />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>وصف / ملاحظات</Label>
                  <Textarea value={form.description} onChange={(e) => updateFormField('description', e.target.value)} rows={4} placeholder="وصف مختصر للمستند..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  رفع الملف
                </CardTitle>
                <CardDescription>يدعم الصور و PDF و Word و Excel و PowerPoint والملفات النصية والمضغوطة ومعظم الصيغ.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-xl border border-dashed p-6 text-center bg-muted/20">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <p className="font-semibold mb-1">{form.file ? form.file.name : formMode === 'edit' ? 'اختيار ملف جديد اختياري' : 'اختر ملفًا للأرشفة'}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {form.file ? `${formatFileSize(form.file.size)} — ${form.file.type || 'نوع غير معروف'}` : 'PDF، Word، Excel، PowerPoint، صور، ملفات مضغوطة، وجميع الصيغ تقريبًا'}
                  </p>

                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                    <Paperclip className="ml-2 h-4 w-4" />
                    اختيار ملف
                  </Button>

                  <input ref={fileInputRef} type="file" className="hidden" onChange={selectFile} accept="*/*" />
                </div>

                {formMode === 'edit' && selectedDocument && (
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <p className="text-sm font-medium">الملف الحالي</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedDocument.originalName} — {formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  setSelectedDocument(null);
                  setForm(emptyForm);
                }}
                disabled={isSaving}
              >
                <X className="ml-2 h-4 w-4" />
                إلغاء
              </Button>

              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                {isSaving ? 'جاري الحفظ...' : 'حفظ الأرشفة'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && selectedDocument && (
        <div id="archive-details" className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">تفاصيل ملف الأرشفة</h2>
              <p className="text-sm text-muted-foreground mt-1">عرض بيانات الملف ورابط Google Drive والإجراءات.</p>
            </div>

            <Button variant="outline" onClick={() => { setDetailsOpen(false); setSelectedDocument(null); }} className="w-full md:w-auto">
              <X className="ml-2 h-4 w-4" />
              إغلاق التفاصيل
            </Button>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{selectedDocument.title}</h3>
                <p className="text-muted-foreground">{selectedDocument.originalName}</p>
              </div>

              <Badge variant={getConfidentialityVariant(selectedDocument.confidentiality) as any}>
                {getConfidentialityLabel(selectedDocument.confidentiality)}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoItem label="العنوان" value={selectedDocument.title} />
              <InfoItem label="التصنيف" value={selectedDocument.category} />
              <InfoItem label="رقم المستند" value={selectedDocument.documentNumber || '-'} />
              <InfoItem label="تاريخ المستند" value={formatDate(selectedDocument.documentDate)} />
              <InfoItem label="الجهة / المصدر" value={selectedDocument.issuingAuthority || '-'} />
              <InfoItem label="الكلمات المفتاحية" value={selectedDocument.tags || '-'} />
              <InfoItem label="اسم الملف" value={selectedDocument.originalName} />
              <InfoItem label="نوع الملف" value={selectedDocument.mimeType || '-'} />
              <InfoItem label="الحجم" value={formatFileSize(selectedDocument.fileSize)} />
              <InfoItem label="تاريخ الأرشفة" value={formatDate(selectedDocument.createdAt)} />
              <InfoItem label="آخر تعديل" value={formatDate(selectedDocument.updatedAt)} />
              <InfoItem label="رقم Google Drive" value={selectedDocument.driveFileId || '-'} />
            </div>

            {selectedDocument.description && <InfoBlock label="الوصف / الملاحظات" value={selectedDocument.description} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  الملف المؤرشف
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedDocument.originalName}</p>
                    <p className="text-sm text-muted-foreground">{selectedDocument.mimeType || 'نوع غير معروف'} — {formatFileSize(selectedDocument.fileSize)}</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <Button variant="outline" onClick={() => openFile(selectedDocument)}>
                      <ExternalLink className="ml-2 h-4 w-4" />
                      فتح
                    </Button>
                    <Button variant="outline" onClick={() => downloadFile(selectedDocument)}>
                      <Download className="ml-2 h-4 w-4" />
                      تنزيل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col md:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => openEditForm(selectedDocument)}>
                <Edit className="ml-2 h-4 w-4" />
                تعديل البيانات
              </Button>
              <Button variant="destructive" onClick={() => requestDelete(selectedDocument)}>
                <Trash2 className="ml-2 h-4 w-4" />
                حذف
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
          <CardDescription>ابحث بالعنوان أو الرقم أو الجهة أو الكلمات المفتاحية أو اسم الملف.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في الأرشفة..." className="pr-9" />
            </div>

            <NativeSelect value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">جميع التصنيفات</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </NativeSelect>

            <NativeSelect value={filterConfidentiality} onChange={(e) => setFilterConfidentiality(e.target.value)}>
              <option value="">جميع درجات السرية</option>
              {confidentialityOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </NativeSelect>

            <Button variant="outline" onClick={clearFilters}>
              <X className="ml-2 h-4 w-4" />
              مسح التصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            ملفات الأرشفة ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العنوان</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>رقم المستند</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الجهة</TableHead>
                  <TableHead>درجة السرية</TableHead>
                  <TableHead>نوع الملف</TableHead>
                  <TableHead>الحجم</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      لا توجد ملفات مؤرشفة مطابقة للبحث.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium max-w-[260px]">
                        <div className="truncate">{doc.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{doc.originalName}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{doc.category}</Badge></TableCell>
                      <TableCell>{doc.documentNumber || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                          {formatDate(doc.documentDate)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{doc.issuingAuthority || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getConfidentialityVariant(doc.confidentiality) as any}>
                          {getConfidentialityLabel(doc.confidentiality)}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.mimeType || '-'}</TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" title="عرض التفاصيل" onClick={() => openDetails(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="فتح الملف" onClick={() => openFile(doc)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEditForm(doc)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="حذف" onClick={() => requestDelete(doc)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ملف من الأرشفة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف بيانات الملف من الأرشفة داخل المنصة. لن يتم حذف الملف من Google Drive تلقائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="whitespace-pre-wrap leading-7">{value}</p>
    </div>
  );
};
