import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  FileDown,
  FileSpreadsheet,
  LayoutGrid,
  Table2,
  ShieldCheck,
  AlertTriangle,
  Copy,
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
import { authenticatedFetch } from '../../lib/http';
import { usePermissions } from '../../context/PermissionsContext';
import { AttachmentPreviewCard } from '../components/AttachmentPreview';
import { ArchiveReportsDialog } from '../components/ArchiveReportsDialog';
import { ArchiveExcelImportDialog, type ArchiveExcelImportPayload } from '../components/ArchiveExcelImportDialog';

type ArchiveDocument = {
  id: string;
  title: string;
  category: string;
  documentNumber: string;
  documentDate: string;
  documentDateType: 'gregorian' | 'hijri';
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
  documentDateType: 'gregorian' | 'hijri';
  issuingAuthority: string;
  confidentiality: 'public' | 'internal' | 'confidential';
  tags: string;
  description: string;
  files: File[];
};

const LEGACY_STORAGE_KEY = 'iau_archive_documents_v1';
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

const emptyForm: ArchiveFormState = {
  title: '',
  category: 'عام',
  documentNumber: '',
  documentDate: '',
  documentDateType: 'gregorian',
  issuingAuthority: '',
  confidentiality: 'internal',
  tags: '',
  description: '',
  files: [],
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

const formatArchiveDocumentDate = (value?: string, type: 'gregorian' | 'hijri' = 'gregorian') => {
  if (!value) return '-';

  if (type === 'hijri') {
    return `${value}هـ`;
  }

  try {
    return new Date(value).toLocaleDateString('ar-SA-u-ca-gregory');
  } catch {
    return value;
  }
};

const normalizeHijriInput = (value: string) => {
  return value
    .replace(/[^0-9/\-]/g, '')
    .replaceAll('-', '/')
    .slice(0, 10);
};

const getConfidentialityLabel = (value: ArchiveDocument['confidentiality']) =>
  confidentialityOptions.find((item) => item.value === value)?.label || value;

const getConfidentialityVariant = (value: ArchiveDocument['confidentiality']) => {
  if (value === 'confidential') return 'destructive';
  if (value === 'public') return 'secondary';
  return 'outline';
};


const getArchiveConfidentialityClassName = (value: ArchiveDocument['confidentiality']) => {
  if (value === 'confidential') {
    return 'border-red-300/90 bg-gradient-to-b from-red-50 to-red-100 text-red-700 shadow-[0_3px_0_rgba(185,28,28,0.16),0_7px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
  }

  if (value === 'public') {
    return 'border-emerald-300/90 bg-gradient-to-b from-emerald-50 to-emerald-100 text-emerald-700 shadow-[0_3px_0_rgba(5,150,105,0.16),0_7px_14px_rgba(16,185,129,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
  }

  return 'border-sky-300/90 bg-gradient-to-b from-sky-50 to-sky-100 text-sky-700 shadow-[0_3px_0_rgba(2,132,199,0.16),0_7px_14px_rgba(14,165,233,0.10),inset_0_1px_0_rgba(255,255,255,0.95)]';
};

const getArchiveReference = (doc: ArchiveDocument) =>
  `ARC-${String(doc.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || '00000000'}`;

const getArchiveMissingMetadata = (doc: ArchiveDocument) => {
  const missing: string[] = [];
  if (!String(doc.documentNumber || '').trim()) missing.push('رقم المستند');
  if (!String(doc.documentDate || '').trim()) missing.push('تاريخ المستند');
  if (!String(doc.issuingAuthority || '').trim()) missing.push('الجهة / المصدر');
  if (!String(doc.tags || '').trim()) missing.push('الكلمات المفتاحية');
  if (!String(doc.description || '').trim()) missing.push('الوصف');
  if (!String(doc.driveUrl || '').trim()) missing.push('رابط الملف');
  return missing;
};

const getArchiveFileTypeLabel = (doc: ArchiveDocument) => {
  const extension = String(doc.originalName || doc.fileName || '')
    .split('.')
    .pop()
    ?.trim()
    .toUpperCase();

  if (extension && extension.length <= 8) return extension;

  const mimeType = String(doc.mimeType || '');
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word')) return 'WORD';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'EXCEL';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.startsWith('image/')) return 'صورة';
  return 'ملف';
};


export const ArchivePage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('archive', 'canAdd');
  const canEdit = isAdmin || hasPermission('archive', 'canEdit');
  const canDelete = isAdmin || hasPermission('archive', 'canDelete');
  const canPrint = isAdmin || hasPermission('archive', 'canPrint');

  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterConfidentiality, setFilterConfidentiality] = useState('');
  // IAU_ARCHIVE_VIEW_TOGGLE_V1
  const [archiveViewMode, setArchiveViewMode] = useState<'cards' | 'table'>(() => {
    try {
      return localStorage.getItem('iau_archive_view_mode') === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);

  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [form, setForm] = useState<ArchiveFormState>(emptyForm);
  const [selectedDocument, setSelectedDocument] = useState<ArchiveDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ArchiveDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const archiveRequest = async <T,>(
    path = '',
    options: RequestInit = {}
  ): Promise<T> => {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_URL غير موجود. تأكد من ربط الواجهة بالـ Backend.');
    }

    const response = await authenticatedFetch(`/api/archive${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message || 'تعذر تنفيذ عملية الأرشفة');
    }

    return body as T;
  };

  const loadDocumentsFromServer = async () => {
    const remote = await archiveRequest<ArchiveDocument[]>();
    setDocuments(Array.isArray(remote) ? remote : []);
    return Array.isArray(remote) ? remote : [];
  };

  const migrateLegacyDocuments = async (remoteDocuments: ArchiveDocument[]) => {
    const migrationMarker = 'iau_archive_documents_migrated_to_postgres_v1';

    if (localStorage.getItem(migrationMarker) === 'done') {
      return remoteDocuments;
    }

    let legacyDocuments: ArchiveDocument[] = [];

    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      legacyDocuments = Array.isArray(parsed) ? parsed : [];
    } catch {
      legacyDocuments = [];
    }

    if (legacyDocuments.length === 0) {
      localStorage.setItem(migrationMarker, 'done');
      return remoteDocuments;
    }

    const existingKeys = new Set(
      remoteDocuments.map(
        (document) =>
          `${document.driveUrl || ''}|${document.originalName || ''}|${document.documentNumber || ''}`
      )
    );

    let migratedCount = 0;

    for (const legacy of legacyDocuments) {
      const key = `${legacy.driveUrl || ''}|${legacy.originalName || ''}|${legacy.documentNumber || ''}`;

      if (!legacy.driveUrl || existingKeys.has(key)) {
        continue;
      }

      await archiveRequest<ArchiveDocument>('', {
        method: 'POST',
        body: JSON.stringify(legacy),
      });

      existingKeys.add(key);
      migratedCount += 1;
    }

    localStorage.setItem(migrationMarker, 'done');

    if (migratedCount > 0) {
      toast.success(`تم نقل ${migratedCount} ملف أرشيف قديم إلى قاعدة البيانات`);
      return loadDocumentsFromServer();
    }

    return remoteDocuments;
  };

  useEffect(() => {
    let mounted = true;

    const initializeArchive = async () => {
      try {
        const remote = await loadDocumentsFromServer();

        if (!mounted) return;

        if (isAdmin) {
          await migrateLegacyDocuments(remote);
        }
      } catch (error) {
        console.error('Archive load error:', error);

        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'تعذر تحميل الأرشفة من الخادم'
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeArchive();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

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
  const archiveQuality = useMemo(() => {
    const numberCounts = new Map<string, number>();
    documents.forEach((doc) => {
      const value = String(doc.documentNumber || '').trim().toLowerCase();
      if (value) numberCounts.set(value, (numberCounts.get(value) || 0) + 1);
    });
    const duplicateNumbers = new Set(
      Array.from(numberCounts.entries()).filter(([, count]) => count > 1).map(([value]) => value),
    );
    const incomplete = documents.filter((doc) => getArchiveMissingMetadata(doc).length > 0).length;
    const duplicateRecords = documents.filter((doc) => duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase())).length;
    const missingLinks = documents.filter((doc) => !String(doc.driveUrl || '').trim()).length;
    const complete = Math.max(0, documents.length - incomplete - duplicateRecords);
    return { incomplete, duplicateRecords, missingLinks, complete, duplicateNumbers };
  }, [documents]);

  const updateFormField = (field: keyof ArchiveFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAddForm = () => {
    if (!canAdd) {
      toast.error('لا تملك صلاحية إضافة ملفات إلى الأرشفة');
      return;
    }

    setFormMode('add');
    setSelectedDocument(null);
    setDetailsOpen(false);
    setForm(emptyForm);
    setFormOpen(true);
    setTimeout(() => document.getElementById('archive-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openEditForm = (doc: ArchiveDocument) => {
    if (!canEdit) {
      toast.error('لا تملك صلاحية تعديل بيانات الأرشفة');
      return;
    }

    setFormMode('edit');
    setSelectedDocument(doc);
    setDetailsOpen(false);
    setForm({
      title: doc.title,
      category: doc.category,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate || '',
      documentDateType: doc.documentDateType || 'gregorian',
      issuingAuthority: doc.issuingAuthority,
      confidentiality: doc.confidentiality,
      tags: doc.tags,
      description: doc.description,
      files: [],
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
    if (!canDelete) {
      toast.error('لا تملك صلاحية حذف سجلات الأرشفة');
      return;
    }

    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!canDelete) {
      toast.error('لا تملك صلاحية حذف سجلات الأرشفة');
      return;
    }

    if (!documentToDelete) return;

    try {
      await archiveRequest<void>(`/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      setDocuments((current) =>
        current.filter((doc) => doc.id !== documentToDelete.id)
      );

      toast.success('تم حذف الملف من الأرشفة');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);

      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error('Archive delete error:', error);
      toast.error(
        error instanceof Error ? error.message : 'فشل في حذف ملف الأرشفة'
      );
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
    if (formMode === 'add' && form.files.length === 0) {
      toast.error('اختر ملفًا واحدًا على الأقل للأرشفة');
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

    const response = await authenticatedFetch('/api/uploads', {
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
    if ((formMode === 'add' && !canAdd) || (formMode === 'edit' && !canEdit)) {
      toast.error('لا تملك الصلاحية المطلوبة لتنفيذ عملية الأرشفة');
      return;
    }

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (formMode === 'add') {
        const savedDocuments: ArchiveDocument[] = [];

        for (const file of form.files) {
          const uploaded = await uploadFileToGoogleDrive(file);

          const baseTitle = form.title.trim();
          const title =
            form.files.length === 1
              ? baseTitle
              : `${baseTitle} - ${file.name.replace(/\.[^/.]+$/, '')}`;

          const payload = {
            title,
            category: form.category.trim(),
            documentNumber: form.documentNumber.trim(),
            documentDate: form.documentDate || '',
            documentDateType: form.documentDateType,
            issuingAuthority: form.issuingAuthority.trim(),
            confidentiality: form.confidentiality,
            tags: form.tags.trim(),
            description: form.description.trim(),
            fileName: uploaded.fileName || file.name,
            originalName: file.name,
            mimeType:
              uploaded.mimeType ||
              file.type ||
              'application/octet-stream',
            fileSize: file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          };

          const saved = await archiveRequest<ArchiveDocument>('', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          savedDocuments.push(saved);
        }

        setDocuments((current) => [...savedDocuments, ...current]);

        toast.success(
          savedDocuments.length === 1
            ? 'تمت أرشفة الملف بنجاح'
            : `تمت أرشفة ${savedDocuments.length} ملفات بنجاح`
        );
      } else if (selectedDocument) {
        let updatedFileData: Partial<ArchiveDocument> = {};

        if (form.files.length > 0) {
          const file = form.files[0];
          const uploaded = await uploadFileToGoogleDrive(file);

          updatedFileData = {
            fileName: uploaded.fileName || file.name,
            originalName: file.name,
            mimeType:
              uploaded.mimeType ||
              file.type ||
              'application/octet-stream',
            fileSize: file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          };
        }

        const payload = {
          ...selectedDocument,
          title: form.title.trim(),
          category: form.category.trim(),
          documentNumber: form.documentNumber.trim(),
          documentDate: form.documentDate || '',
          documentDateType: form.documentDateType,
          issuingAuthority: form.issuingAuthority.trim(),
          confidentiality: form.confidentiality,
          tags: form.tags.trim(),
          description: form.description.trim(),
          ...updatedFileData,
        };

        const updated = await archiveRequest<ArchiveDocument>(
          `/${selectedDocument.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        setDocuments((current) =>
          current.map((doc) =>
            doc.id === selectedDocument.id ? updated : doc
          )
        );

        toast.success('تم تحديث بيانات الملف');
      }

      setFormOpen(false);
      setSelectedDocument(null);
      setForm(emptyForm);
    } catch (error) {
      console.error('Archive save error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'فشل في حفظ بيانات الأرشفة'
      );
    } finally {
      setIsSaving(false);
    }
  };
  const selectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    setForm((prev) => {
      const existingKeys = new Set(
        prev.files.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
      );

      const uniqueNewFiles = selectedFiles.filter(
        (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`)
      );

      return {
        ...prev,
        files: [...prev.files, ...uniqueNewFiles],
        title: prev.title.trim()
          ? prev.title
          : selectedFiles.length > 1
            ? 'مجموعة ملفات مؤرشفة'
            : selectedFiles[0].name.replace(/\.[^/.]+$/, ''),
      };
    });

    event.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, fileIndex) => fileIndex !== index),
    }));
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

  const changeArchiveViewMode = (mode: 'cards' | 'table') => {
    setArchiveViewMode(mode);
    try {
      localStorage.setItem('iau_archive_view_mode', mode);
    } catch {
      // Ignore storage restrictions; the selected view still works for the current session.
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterConfidentiality('');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mr-3">جاري تحميل الأرشفة...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 space-y-4 p-0 sm:p-3 md:space-y-6 md:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">الأرشفة</h1>
          <p className="text-muted-foreground mt-1">
            أرشفة المستندات والصور وملفات PDF وWord وجميع الصيغ مع العناوين والتصنيفات والبحث.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {canPrint && (
            <Button variant="outline" onClick={() => setReportsOpen(true)} className="w-full lg:w-auto">
              <FileDown className="ml-2 h-4 w-4" />
              تقارير الأرشفة — طباعة / PDF / Excel
            </Button>
          )}
          {canAdd && (
            <Button
              variant="outline"
              onClick={() => setExcelImportOpen(true)}
              className="w-full border-emerald-300 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100 lg:w-auto"
            >
              <FileSpreadsheet className="ml-2 h-4 w-4" />
              استيراد Excel
            </Button>
          )}
          {canAdd && (
            <Button onClick={openAddForm} className="w-full lg:w-auto">
              <Plus className="ml-2 h-4 w-4" />
              إضافة ملف للأرشفة
            </Button>
          )}
        </div>
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

      <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-l from-sky-50/70 via-white to-slate-50/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            جودة وسلامة الأرشفة
          </CardTitle>
          <CardDescription>مراجعة آلية لجودة الفهرسة قبل الاعتماد على الأرشيف في التقارير والبحث.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
              <p className="text-xs text-muted-foreground">سجلات مكتملة مبدئيًا</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{archiveQuality.complete}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> بيانات وصفية ناقصة</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{archiveQuality.incomplete}</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Copy className="h-3.5 w-3.5" /> أرقام مستندات مكررة</p>
              <p className="mt-1 text-2xl font-black text-violet-700">{archiveQuality.duplicateRecords}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3">
              <p className="text-xs text-muted-foreground">سجلات دون رابط ملف</p>
              <p className="mt-1 text-2xl font-black text-red-700">{archiveQuality.missingLinks}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
            <b>ملاحظة إجرائية:</b> حذف سجل الأرشفة حاليًا يحذف الفهرسة من المنصة فقط؛ ملف Google Drive لا يُحذف تلقائيًا. لذلك يعرض النظام هذه المعلومة بوضوح قبل الحذف لمنع فقدان التتبع.
          </div>
        </CardContent>
      </Card>

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
                <CardDescription>يمكن أرشفة ملف واحد أو عدة ملفات دفعة واحدة، مع عنوان وتصنيف ورقم وتاريخ وجهة وملاحظات.</CardDescription>
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
                  <Label>نوع التاريخ</Label>
                  <NativeSelect
                    value={form.documentDateType}
                    onChange={(e) => {
                      updateFormField('documentDateType', e.target.value);
                      updateFormField('documentDate', '');
                    }}
                  >
                    <option value="gregorian">ميلادي</option>
                    <option value="hijri">هجري</option>
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label>
                    تاريخ المستند <span className="text-muted-foreground">(اختياري)</span>
                  </Label>

                  {form.documentDateType === 'gregorian' ? (
                    <Input
                      type="date"
                      value={form.documentDate}
                      onChange={(e) => updateFormField('documentDate', e.target.value)}
                    />
                  ) : (
                    <Input
                      value={form.documentDate}
                      onChange={(e) => updateFormField('documentDate', normalizeHijriInput(e.target.value))}
                      placeholder="مثال: 1447/07/18"
                      dir="ltr"
                    />
                  )}

                  <p className="text-xs text-muted-foreground">
                    يمكن ترك التاريخ فارغًا، أو اختيار ميلادي/هجري حسب المستند.
                  </p>
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
                <CardDescription>يدعم رفع أكثر من ملف دفعة واحدة: صور و PDF و Word و Excel و PowerPoint والملفات النصية والمضغوطة ومعظم الصيغ.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-xl border border-dashed p-6 text-center bg-muted/20">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
                  <p className="font-semibold mb-1">{form.files.length > 0 ? `تم اختيار ${form.files.length} ملف` : formMode === 'edit' ? 'اختيار ملفات جديدة اختياري' : 'اختر ملفًا أو أكثر للأرشفة'}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {form.files.length > 0
                      ? `إجمالي الحجم: ${formatFileSize(form.files.reduce((sum, file) => sum + file.size, 0))}`
                      : 'PDF، Word، Excel، PowerPoint، صور، ملفات مضغوطة، وجميع الصيغ تقريبًا'}
                  </p>

                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                    <Paperclip className="ml-2 h-4 w-4" />
                    اختيار ملفات
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={selectFiles}
                    accept="*/*"
                    multiple
                  />
                </div>

                {form.files.length > 0 && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-semibold">الملفات المختارة ({form.files.length})</p>

                    <div className="space-y-2">
                      {form.files.map((file, index) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg bg-muted/30 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium break-all">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} — {file.type || 'نوع غير معروف'}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSelectedFile(index)}
                            disabled={isSaving}
                          >
                            <X className="ml-2 h-4 w-4" />
                            إزالة
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
              <p className="text-sm text-muted-foreground mt-1">عرض بيانات الملف والإجراءات المتاحة.</p>
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
              <InfoItem label="المرجع الأرشيفي" value={getArchiveReference(selectedDocument)} />
              <InfoItem label="العنوان" value={selectedDocument.title} />
              <InfoItem label="التصنيف" value={selectedDocument.category} />
              <InfoItem label="رقم المستند" value={selectedDocument.documentNumber || '-'} />
              <InfoItem label="تاريخ المستند" value={formatArchiveDocumentDate(selectedDocument.documentDate, selectedDocument.documentDateType)} />
              <InfoItem label="نوع التاريخ" value={selectedDocument.documentDateType === 'hijri' ? 'هجري' : 'ميلادي'} />
              <InfoItem label="الجهة / المصدر" value={selectedDocument.issuingAuthority || '-'} />
              <InfoItem label="الكلمات المفتاحية" value={selectedDocument.tags || '-'} />
              <InfoItem label="اسم الملف" value={selectedDocument.originalName} />
              <InfoItem label="نوع الملف" value={selectedDocument.mimeType || '-'} />
              <InfoItem label="الحجم" value={formatFileSize(selectedDocument.fileSize)} />
              <InfoItem label="تاريخ الأرشفة" value={formatDate(selectedDocument.createdAt)} />
              <InfoItem label="آخر تعديل" value={formatDate(selectedDocument.updatedAt)} />
            </div>

            {selectedDocument.description && <InfoBlock label="الوصف / الملاحظات" value={selectedDocument.description} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  الملف المؤرشف
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <AttachmentPreviewCard
                  attachment={selectedDocument}
                />

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

            {(canEdit || canDelete) && (
              <div className="flex flex-col md:flex-row justify-end gap-2">
                {canEdit && (
                  <Button variant="outline" onClick={() => openEditForm(selectedDocument)}>
                    <Edit className="ml-2 h-4 w-4" />
                    تعديل البيانات
                  </Button>
                )}
                {canDelete && (
                  <Button variant="destructive" onClick={() => requestDelete(selectedDocument)}>
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف
                  </Button>
                )}
              </div>
            )}
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

      <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/45 to-slate-50/80 shadow-[0_9px_0_rgba(100,116,139,0.12),0_22px_48px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,1)]">
        <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-gradient-to-l from-sky-50/95 via-white to-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-800 sm:text-xl">
              <Archive className="h-5 w-5 text-sky-700" />
              ملفات الأرشفة ({filteredDocuments.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              اختر طريقة العرض المناسبة: بطاقات مرئية أو جدول تفصيلي مضغوط.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-300 bg-white/95 p-1 shadow-sm" role="group" aria-label="طريقة عرض ملفات الأرشفة">
              <Button
                type="button"
                size="sm"
                variant={archiveViewMode === 'cards' ? 'default' : 'ghost'}
                onClick={() => changeArchiveViewMode('cards')}
                className="h-9 rounded-lg px-3 font-bold"
                aria-pressed={archiveViewMode === 'cards'}
              >
                <LayoutGrid className="ml-2 h-4 w-4" />
                بطاقات
              </Button>
              <Button
                type="button"
                size="sm"
                variant={archiveViewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => changeArchiveViewMode('table')}
                className="h-9 rounded-lg px-3 font-bold"
                aria-pressed={archiveViewMode === 'table'}
              >
                <Table2 className="ml-2 h-4 w-4" />
                جدول
              </Button>
            </div>
            <Badge variant="outline" className="w-fit border-slate-300 bg-white/90 px-3 py-1 font-bold text-slate-700 shadow-sm">
              {filteredDocuments.length} ملف
            </Badge>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {filteredDocuments.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
              <Archive className="mx-auto mb-3 h-12 w-12 opacity-30" />
              لا توجد ملفات مؤرشفة مطابقة للبحث.
            </div>
          ) : archiveViewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <article
                  key={doc.id}
                  className="group relative flex min-h-[390px] flex-col overflow-hidden rounded-[22px] border border-slate-300/90 bg-gradient-to-b from-white via-white to-sky-50/45 shadow-[0_6px_0_rgba(51,65,85,0.16),0_13px_28px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-200 hover:-translate-y-1 hover:border-sky-400/80 hover:shadow-[0_9px_0_rgba(37,99,235,0.16),0_20px_34px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,1)]"
                >
                  <div className="h-1.5 w-full bg-gradient-to-l from-sky-400 via-blue-700 to-slate-800 shadow-[0_2px_5px_rgba(30,64,175,0.20)]" />

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-slate-300 bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm">
                            {doc.category || 'غير مصنف'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`px-2.5 py-1 text-[11px] font-black ${getArchiveConfidentialityClassName(doc.confidentiality)}`}
                          >
                            {getConfidentialityLabel(doc.confidentiality)}
                          </Badge>
                          {getArchiveMissingMetadata(doc).length > 0 && (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                              بيانات ناقصة: {getArchiveMissingMetadata(doc).length}
                            </Badge>
                          )}
                          {archiveQuality.duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase()) && (
                            <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-800">رقم مكرر</Badge>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-base font-black leading-7 text-slate-800 sm:text-lg">
                          {doc.title}
                        </h3>
                        <p className="mt-1 truncate text-xs text-slate-500" dir="auto">
                          {doc.originalName || doc.fileName}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-sky-100 text-sky-700 shadow-[0_4px_0_rgba(14,116,144,0.14),0_9px_18px_rgba(14,165,233,0.13),inset_0_1px_0_rgba(255,255,255,1)]">
                        <FileText className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="my-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    <div className="rounded-[18px] border border-slate-200/90 bg-gradient-to-b from-slate-50/95 to-white/90 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_4px_12px_rgba(15,23,42,0.045)]">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">رقم المستند</p>
                          <p className="mt-1 break-words font-bold text-slate-700">{doc.documentNumber || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">تاريخ المستند</p>
                          <p className="mt-1 flex items-center gap-1 font-bold text-slate-700">
                            <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                            {formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] font-medium text-slate-400">الجهة / المصدر</p>
                          <p className="mt-1 line-clamp-2 font-bold text-slate-700">{doc.issuingAuthority || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">نوع الملف</p>
                          <p className="mt-1 font-black text-slate-700">{getArchiveFileTypeLabel(doc)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">الحجم</p>
                          <p className="mt-1 font-black text-slate-700">{formatFileSize(doc.fileSize)}</p>
                        </div>
                      </div>
                    </div>

                    {doc.tags ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {doc.tags
                          .split(/[,،]/)
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((tag) => (
                            <span key={tag} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                              #{tag}
                            </span>
                          ))}
                      </div>
                    ) : null}

                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-4 sm:grid-cols-3">
                      <Button
                        variant="outline"
                        onClick={() => openDetails(doc)}
                        className="border-slate-300 bg-gradient-to-b from-white to-slate-50 font-bold text-slate-700 shadow-[0_4px_0_rgba(71,85,105,0.16),0_7px_12px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-white active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.14)]"
                      >
                        <Eye className="ml-2 h-4 w-4" />
                        عرض
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => openFile(doc)}
                        className="border-sky-300 bg-gradient-to-b from-white to-sky-50 font-bold text-sky-800 shadow-[0_4px_0_rgba(2,132,199,0.16),0_7px_12px_rgba(14,165,233,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-sky-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(2,132,199,0.14)]"
                      >
                        <ExternalLink className="ml-2 h-4 w-4" />
                        فتح
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => downloadFile(doc)}
                        className="border-indigo-300 bg-gradient-to-b from-white to-indigo-50 font-bold text-indigo-800 shadow-[0_4px_0_rgba(79,70,229,0.15),0_7px_12px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(79,70,229,0.14)]"
                      >
                        <Download className="ml-2 h-4 w-4" />
                        تنزيل
                      </Button>

                      {(canEdit || canDelete) && (
                        <>
                          {canEdit && (
                            <Button
                              variant="outline"
                              onClick={() => openEditForm(doc)}
                              className="border-amber-300 bg-gradient-to-b from-white to-amber-50 font-bold text-amber-800 shadow-[0_4px_0_rgba(180,83,9,0.15),0_7px_12px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-amber-50 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,83,9,0.14)]"
                            >
                              <Edit className="ml-2 h-4 w-4" />
                              تعديل
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              onClick={() => requestDelete(doc)}
                              className="border-red-400/90 bg-gradient-to-b from-red-50 to-red-100 font-bold text-red-600 shadow-[0_4px_0_rgba(185,28,28,0.20),0_8px_14px_rgba(220,38,38,0.10),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:border-red-500 hover:text-red-700 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(185,28,28,0.18)]"
                            >
                              <Trash2 className="ml-2 h-4 w-4" />
                              حذف
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-right text-sm">
                  <thead className="bg-gradient-to-l from-slate-100 via-sky-50 to-slate-50 text-slate-700">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-black">العنوان / الملف</th>
                      <th className="px-4 py-3 font-black">التصنيف</th>
                      <th className="px-4 py-3 font-black">رقم المستند</th>
                      <th className="px-4 py-3 font-black">تاريخ المستند</th>
                      <th className="px-4 py-3 font-black">الجهة / المصدر</th>
                      <th className="px-4 py-3 font-black">السرية</th>
                      <th className="px-4 py-3 font-black">النوع</th>
                      <th className="px-4 py-3 font-black">الحجم</th>
                      <th className="px-4 py-3 text-center font-black">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc, index) => (
                      <tr
                        key={doc.id}
                        className={`border-b border-slate-100 transition-colors hover:bg-sky-50/70 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/55'}`}
                      >
                        <td className="max-w-[280px] px-4 py-3 align-top">
                          <button type="button" onClick={() => openDetails(doc)} className="block w-full text-right">
                            <span className="line-clamp-2 font-black text-slate-800 hover:text-sky-700">{doc.title}</span>
                            <span className="mt-1 block truncate text-xs text-slate-500" dir="auto">{doc.originalName || doc.fileName}</span>
                          </button>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {getArchiveMissingMetadata(doc).length > 0 && (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-800">
                                ناقص {getArchiveMissingMetadata(doc).length}
                              </Badge>
                            )}
                            {archiveQuality.duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase()) && (
                              <Badge variant="outline" className="border-violet-300 bg-violet-50 text-[10px] text-violet-800">مكرر</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top font-semibold text-slate-700">{doc.category || 'غير مصنف'}</td>
                        <td className="px-4 py-3 align-top font-bold text-slate-700">{doc.documentNumber || '-'}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">{formatArchiveDocumentDate(doc.documentDate, doc.documentDateType)}</td>
                        <td className="max-w-[220px] px-4 py-3 align-top text-slate-700"><span className="line-clamp-2">{doc.issuingAuthority || '-'}</span></td>
                        <td className="px-4 py-3 align-top">
                          <Badge variant="outline" className={`text-[10px] font-black ${getArchiveConfidentialityClassName(doc.confidentiality)}`}>
                            {getConfidentialityLabel(doc.confidentiality)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top font-black text-slate-700">{getArchiveFileTypeLabel(doc)}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">{formatFileSize(doc.fileSize)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex min-w-max items-center justify-center gap-1.5">
                            <Button type="button" variant="outline" size="sm" onClick={() => openDetails(doc)} title="عرض التفاصيل" className="h-8 px-2.5">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openFile(doc)} title="فتح الملف" className="h-8 px-2.5 text-sky-700">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => downloadFile(doc)} title="تنزيل الملف" className="h-8 px-2.5 text-indigo-700">
                              <Download className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(doc)} title="تعديل" className="h-8 px-2.5 text-amber-700">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button type="button" variant="outline" size="sm" onClick={() => requestDelete(doc)} title="حذف" className="h-8 px-2.5 text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-xs text-slate-500">
                يعرض الجدول {filteredDocuments.length} ملفًا. استخدم البحث والتصفية لتقليل النتائج، ويمكن التمرير أفقيًا على الشاشات الصغيرة.
              </div>
            </div>
          )}
        </div>
      </section>

      <ArchiveExcelImportDialog
        open={excelImportOpen}
        onOpenChange={setExcelImportOpen}
        existingDocuments={documents}
        createArchiveDocument={(payload: ArchiveExcelImportPayload) =>
          archiveRequest<ArchiveDocument>('', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
        }
        onImported={async () => {
          await loadDocumentsFromServer();
        }}
      />

      <ArchiveReportsDialog documents={documents} open={reportsOpen} onOpenChange={setReportsOpen} />

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

