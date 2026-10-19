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
  RotateCcw,
  ListTodo,
  Printer,
  GitMerge,
  History,
  Clock3,
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
import {
  transactionFollowUpApi,
  type TransactionFollowUpRecord,
  type TransactionFollowUpOrganizationalUnit,
} from '../api/transactionFollowUp';

type ArchiveAttachment = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  driveUrl: string;
  driveFileId: string;
  version?: number;
  versionGroupId?: string;
  versionNote?: string | null;
  versionStatus?: 'draft' | 'approved' | 'superseded' | 'cancelled';
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNote?: string | null;
  cancelledById?: string | null;
  cancelledByName?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  isCurrent?: boolean;
  addedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ArchiveActivity = {
  id: string;
  action: string;
  description?: string | null;
  actorName?: string | null;
  createdAt: string;
};

type ArchiveDocument = {
  id: string;
  archiveNumber?: string;
  attachmentCount?: number;
  attachmentVersionCount?: number;
  pendingVersionCount?: number;
  totalFileSize?: number;
  attachments?: ArchiveAttachment[];
  activities?: ArchiveActivity[];
  status?: string;
  deletedAt?: string | null;
  mergedAt?: string | null;
  mergedIntoId?: string | null;
  updatedBy?: string | null;
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

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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

const formatArchivedTransactionDate = (record: TransactionFollowUpRecord) => {
  if (record.transactionDateType === 'hijri' && record.transactionDateInput) {
    return `${record.transactionDateInput}هـ`;
  }
  return formatDate(record.transactionDate);
};

const archivedOrganizationalUnitLabels: Record<TransactionFollowUpOrganizationalUnit, string> = {
  endowments_properties: 'إدارة أوقاف وأملاك الجامعة',
  mosques_prayer_rooms: 'وحدة العناية بالمساجد والمصليات الجامعية',
};

const archivedOrganizationalUnitLabel = (
  value?: TransactionFollowUpOrganizationalUnit | null,
) => value
  ? archivedOrganizationalUnitLabels[value]
  : 'غير محددة للمعاملات السابقة';

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
  doc.archiveNumber ||
  `ARC-${String(doc.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || '00000000'}`;

const getAttachmentVersionGroups = (doc: ArchiveDocument) => {
  const source = doc.attachments?.length
    ? doc.attachments
    : [{
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        driveUrl: doc.driveUrl,
        driveFileId: doc.driveFileId,
        version: 1,
        versionGroupId: doc.id,
        isCurrent: true,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      } as ArchiveAttachment];

  const groups = new Map<string, ArchiveAttachment[]>();
  source.forEach((attachment) => {
    const key = attachment.versionGroupId || attachment.id;
    const bucket = groups.get(key) || [];
    bucket.push(attachment);
    groups.set(key, bucket);
  });

  return Array.from(groups.entries()).map(([groupId, versions]) => {
    const sorted = [...versions].sort((a, b) => {
      const versionDiff = Number(b.version || 1) - Number(a.version || 1);
      if (versionDiff !== 0) return versionDiff;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    const current = sorted.find((item) => item.isCurrent) || sorted[0];
    return { groupId, current, versions: sorted };
  });
};

const getAttachmentVersionStatus = (attachment: ArchiveAttachment) =>
  attachment.versionStatus || (attachment.isCurrent ? 'approved' : 'superseded');

const getAttachmentVersionStatusLabel = (attachment: ArchiveAttachment) => {
  const status = getAttachmentVersionStatus(attachment);
  if (status === 'draft') return 'بانتظار الاعتماد';
  if (status === 'approved') return attachment.isCurrent ? 'معتمد — الحالي' : 'معتمد';
  if (status === 'superseded') return 'إصدار سابق';
  if (status === 'cancelled') return 'ملغى';
  return status;
};

const getAttachmentVersionStatusClassName = (attachment: ArchiveAttachment) => {
  const status = getAttachmentVersionStatus(attachment);
  if (status === 'draft') return 'border-amber-300 bg-amber-50 text-amber-800';
  if (status === 'approved' && attachment.isCurrent) return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (status === 'approved') return 'border-emerald-200 bg-emerald-50/60 text-emerald-700';
  if (status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-300 bg-slate-50 text-slate-600';
};

const getArchiveMissingMetadata = (doc: ArchiveDocument) => {
  const missing: string[] = [];
  if (!String(doc.documentNumber || '').trim()) missing.push('رقم المستند');
  if (!String(doc.documentDate || '').trim()) missing.push('تاريخ المستند');
  if (!String(doc.issuingAuthority || '').trim()) missing.push('الجهة / المصدر');
  if (!String(doc.tags || '').trim()) missing.push('الكلمات المفتاحية');
  if (!String(doc.description || '').trim()) missing.push('الوصف');
  if (!(doc.attachments?.length || String(doc.driveUrl || '').trim())) missing.push('الملفات المرفقة');
  return missing;
};

const archiveActivityLabels: Record<string, string> = {
  record_created: 'إنشاء السجل',
  record_updated: 'تحديث البيانات',
  attachments_added: 'إضافة ملفات',
  attachment_removed: 'إزالة ملف',
  attachment_version_added: 'إنشاء مسودة إصدار',
  attachment_version_approved: 'اعتماد إصدار',
  attachment_version_cancelled: 'إلغاء مسودة إصدار',
  record_deleted: 'نقل إلى المحذوفات',
  record_restored: 'استعادة السجل',
  records_merged: 'دمج سجلات داخل هذا السجل',
  record_merged: 'دمج هذا السجل في سجل آخر',
  legacy_migrated: 'نقل من الأرشيف السابق',
};

const getArchiveActivityLabel = (action: string) =>
  archiveActivityLabels[action] || action || 'إجراء أرشيفي';

const getArchiveActivityClassName = (action: string) => {
  if (action.includes('delete') || action.includes('removed')) {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (action.includes('merge')) {
    return 'border-violet-200 bg-violet-50 text-violet-800';
  }
  if (action.includes('restore') || action.includes('created')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (action.includes('attachment')) {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
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


const escapePrintHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export const ArchivePage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('archive', 'canAdd');
  const canEdit = isAdmin || hasPermission('archive', 'canEdit');
  const canDelete = isAdmin || hasPermission('archive', 'canDelete');
  const canPrint = isAdmin || hasPermission('archive', 'canPrint');
  const canRestoreTransaction = isAdmin || hasPermission('archive', 'canEdit');

  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [archivedTransactions, setArchivedTransactions] = useState<TransactionFollowUpRecord[]>([]);
  const [selectedArchivedTransaction, setSelectedArchivedTransaction] = useState<TransactionFollowUpRecord | null>(null);
  const [archivedTransactionLoading, setArchivedTransactionLoading] = useState(false);
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

  const [trashOpen, setTrashOpen] = useState(false);
  const [trashRecords, setTrashRecords] = useState<ArchiveDocument[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringRecordId, setRestoringRecordId] = useState<string | null>(null);

  const [mergeSelectionMode, setMergeSelectionMode] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionSourceAttachment, setVersionSourceAttachment] = useState<ArchiveAttachment | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNote, setVersionNote] = useState('');
  const [versionSaving, setVersionSaving] = useState(false);

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
    const remote = await archiveRequest<ArchiveDocument[]>('/records');
    setDocuments(Array.isArray(remote) ? remote : []);
    return Array.isArray(remote) ? remote : [];
  };

  const loadTrashRecords = async () => {
    const remote = await archiveRequest<ArchiveDocument[]>('/records/trash');
    setTrashRecords(Array.isArray(remote) ? remote : []);
    return Array.isArray(remote) ? remote : [];
  };

  const loadArchivedTransactions = async () => {
    const result = await transactionFollowUpApi.archived({ page: 1, pageSize: 500 });
    setArchivedTransactions(result.items || []);
    return result.items || [];
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

      await archiveRequest<ArchiveDocument>('/records', {
        method: 'POST',
        body: JSON.stringify({
          title: legacy.title,
          category: legacy.category,
          documentNumber: legacy.documentNumber,
          documentDate: legacy.documentDate,
          documentDateType: legacy.documentDateType,
          issuingAuthority: legacy.issuingAuthority,
          confidentiality: legacy.confidentiality,
          tags: legacy.tags,
          description: legacy.description,
          attachments: [{
            fileName: legacy.fileName,
            originalName: legacy.originalName,
            mimeType: legacy.mimeType,
            fileSize: legacy.fileSize,
            driveUrl: legacy.driveUrl,
            driveFileId: legacy.driveFileId,
          }],
        }),
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
        const [remote] = await Promise.all([
          loadDocumentsFromServer(),
          loadArchivedTransactions(),
          loadTrashRecords(),
        ]);

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
        [
          doc.title,
          doc.archiveNumber,
          doc.category,
          doc.documentNumber,
          doc.documentDate,
          doc.issuingAuthority,
          doc.tags,
          doc.description,
          doc.originalName,
          doc.mimeType,
          ...(doc.attachments || []).flatMap((item) => [item.originalName, item.mimeType]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCategory = !filterCategory || doc.category === filterCategory;
      const matchesConfidentiality = !filterConfidentiality || doc.confidentiality === filterConfidentiality;

      return matchesSearch && matchesCategory && matchesConfidentiality;
    });
  }, [documents, searchQuery, filterCategory, filterConfidentiality]);

  const filteredArchivedTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return archivedTransactions;

    return archivedTransactions.filter((record) =>
      [
        record.transactionNumber,
        record.transactionYear,
        record.trackingNumber,
        record.subject,
        record.organizationalUnit ? archivedOrganizationalUnitLabels[record.organizationalUnit] : null,
        record.sourceEntity,
        record.currentAssigneeName,
        record.archivedByName,
        record.archiveNote,
      ]
        .filter((value) => value !== undefined && value !== null && String(value).trim())
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [archivedTransactions, searchQuery]);

  const totalSize = useMemo(
    () => documents.reduce((sum, doc) => sum + Number(doc.totalFileSize ?? doc.fileSize ?? 0), 0),
    [documents],
  );
  const totalArchiveAttachments = useMemo(
    () => documents.reduce((sum, doc) => sum + Number(doc.attachmentCount || doc.attachments?.length || 1), 0),
    [documents],
  );
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

  const openArchivedTransaction = async (record: TransactionFollowUpRecord) => {
    try {
      setArchivedTransactionLoading(true);
      const details = await transactionFollowUpApi.archivedRecord(record.id);
      setSelectedArchivedTransaction(details);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فتح المعاملة المؤرشفة');
    } finally {
      setArchivedTransactionLoading(false);
    }
  };

  const restoreArchivedTransaction = async (record: TransactionFollowUpRecord) => {
    const entered = window.prompt(
      `اكتب سبب استعادة المعاملة رقم ${record.transactionNumber} من الأرشفة:`,
      '',
    );
    if (entered == null) return;
    const note = entered.trim();
    if (note.length < 5) {
      toast.error('سبب الاستعادة مطلوب ويجب توضيحه');
      return;
    }
    if (!window.confirm(
      'ستعود المعاملة إلى نظام المتابعة بحالتها المغلقة، ويمكن إعادة فتحها لاحقًا بصلاحية مستقلة. هل تريد المتابعة؟',
    )) {
      return;
    }

    try {
      setArchivedTransactionLoading(true);
      await transactionFollowUpApi.restoreFromArchive(record.id, note);
      setArchivedTransactions((current) => current.filter((item) => item.id !== record.id));
      if (selectedArchivedTransaction?.id === record.id) {
        setSelectedArchivedTransaction(null);
      }
      toast.success('تمت استعادة المعاملة من الأرشفة إلى نظام المتابعة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استعادة المعاملة من الأرشفة');
    } finally {
      setArchivedTransactionLoading(false);
    }
  };

  const deleteArchivedTransaction = async (record: TransactionFollowUpRecord) => {
    if (!canDelete) {
      toast.error('لا تملك صلاحية حذف المعاملات المؤرشفة');
      return;
    }

    if (!window.confirm(
      `حذف المعاملة رقم ${record.transactionNumber} نهائيًا من المنصة؟ سيتم حذف سجل المتابعة والإجراءات المرتبطة بها من قاعدة البيانات، بينما ملفات Google Drive الأصلية لا تُحذف تلقائيًا.`,
    )) {
      return;
    }

    const confirmation = window.prompt(
      'للتأكيد اكتب كلمة: حذف',
      '',
    );
    if (confirmation?.trim() !== 'حذف') {
      if (confirmation != null) toast.error('لم يتم الحذف لأن كلمة التأكيد غير مطابقة');
      return;
    }

    try {
      setArchivedTransactionLoading(true);
      await transactionFollowUpApi.deleteArchivedTransaction(record.id);
      setArchivedTransactions((current) => current.filter((item) => item.id !== record.id));
      if (selectedArchivedTransaction?.id === record.id) {
        setSelectedArchivedTransaction(null);
      }
      toast.success('تم حذف المعاملة المؤرشفة نهائيًا من المنصة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المعاملة المؤرشفة');
    } finally {
      setArchivedTransactionLoading(false);
    }
  };

  const printArchivedTransaction = (record: TransactionFollowUpRecord) => {
    if (!canPrint) {
      toast.error('لا تملك صلاحية طباعة المعاملات المؤرشفة');
      return;
    }

    const popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) {
      toast.error('تعذر فتح نافذة الطباعة. تحقق من السماح بالنوافذ المنبثقة.');
      return;
    }
    popup.opener = null;

    const rows = [
      ['رقم المعاملة', record.transactionNumber],
      ['السنة', record.transactionYear ? `${record.transactionYear}${record.transactionDateType === 'hijri' ? 'هـ' : 'م'}` : '—'],
      ['تاريخ المعاملة', formatArchivedTransactionDate(record)],
      ['رقم المتابعة', record.trackingNumber],
      ['الإدارة / الوحدة', archivedOrganizationalUnitLabel(record.organizationalUnit)],
      ['الموضوع', record.subject],
      ['الجهة', record.sourceEntity || '—'],
      ['الموظف المختص', record.currentAssigneeName || '—'],
      ['تاريخ الإقفال', formatDate(record.closedAt || undefined)],
      ['تاريخ الأرشفة', formatDate(record.archivedAt || undefined)],
      ['تمت الأرشفة بواسطة', record.archivedByName || '—'],
      ['ملاحظات الأرشفة', record.archiveNote || '—'],
    ];

    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>المعاملة المؤرشفة ${escapePrintHtml(record.transactionNumber)}</title>
<style>
  body{font-family:Arial,"Segoe UI",sans-serif;margin:32px;color:#0f172a}
  h1{font-size:24px;margin:0 0 8px}
  .sub{color:#64748b;margin-bottom:22px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #cbd5e1;padding:10px;text-align:right;vertical-align:top}
  th{width:190px;background:#f8fafc}
  .foot{margin-top:20px;color:#64748b;font-size:12px}
  @media print{body{margin:12mm}}
</style>
</head>
<body>
  <h1>بيانات المعاملة المؤرشفة</h1>
  <div class="sub">نظام المتابعة — قسم الأرشفة</div>
  <table>
    <tbody>
      ${rows.map(([label, value]) => `<tr><th>${escapePrintHtml(label)}</th><td>${escapePrintHtml(value)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="foot">تم إنشاء نسخة الطباعة من منصة إدارة الأصول والأملاك والأوقاف الجامعية.</div>
  <script>window.onload=()=>{window.print();}</script>
</body>
</html>`);
    popup.document.close();
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

  const openTrashCenter = async () => {
    setTrashOpen((current) => !current);
    if (!trashOpen) {
      try {
        setTrashLoading(true);
        await loadTrashRecords();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل المحذوفات');
      } finally {
        setTrashLoading(false);
      }
    }
  };

  const restoreArchiveRecord = async (record: ArchiveDocument) => {
    if (!canEdit) {
      toast.error('لا تملك صلاحية استعادة السجلات الأرشيفية');
      return;
    }
    if (record.status === 'merged') {
      toast.error('السجل المدمج لا يمكن استعادته كسجل مستقل');
      return;
    }

    try {
      setRestoringRecordId(record.id);
      const restored = await archiveRequest<ArchiveDocument>(`/records/${record.id}/restore`, {
        method: 'PATCH',
      });
      setTrashRecords((current) => current.filter((item) => item.id !== record.id));
      setDocuments((current) => [restored, ...current]);
      toast.success('تمت استعادة السجل الأرشيفي بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استعادة السجل الأرشيفي');
    } finally {
      setRestoringRecordId(null);
    }
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
      await archiveRequest<void>(`/records/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      setDocuments((current) =>
        current.filter((doc) => doc.id !== documentToDelete.id)
      );

      toast.success('تم نقل السجل الأرشيفي إلى المحذوفات');
      void loadTrashRecords().catch(() => undefined);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);

      if (selectedDocument?.id === documentToDelete.id) {
        setSelectedDocument(null);
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error('Archive delete error:', error);
      toast.error(
        error instanceof Error ? error.message : 'فشل في حذف السجل الأرشيفي'
      );
    }
  };
  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error('عنوان السجل الأرشيفي مطلوب');
      return false;
    }
    if (!form.category.trim()) {
      toast.error('تصنيف السجل الأرشيفي مطلوب');
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

  const openAttachmentVersionDialog = (attachment: ArchiveAttachment) => {
    if (!canEdit) {
      toast.error('لا تملك صلاحية إضافة إصدار جديد');
      return;
    }
    setVersionSourceAttachment(attachment);
    setVersionFile(null);
    setVersionNote('');
    setVersionDialogOpen(true);
  };

  const closeAttachmentVersionDialog = () => {
    if (versionSaving) return;
    setVersionDialogOpen(false);
    setVersionSourceAttachment(null);
    setVersionFile(null);
    setVersionNote('');
  };

  const saveAttachmentVersion = async () => {
    if (!selectedDocument || !versionSourceAttachment || !versionFile) {
      toast.error('اختر ملف الإصدار الجديد أولًا');
      return;
    }
    if (!canEdit) {
      toast.error('لا تملك صلاحية إضافة إصدار جديد');
      return;
    }

    try {
      setVersionSaving(true);
      const uploaded = await uploadFileToGoogleDrive(versionFile);
      const updated = await archiveRequest<ArchiveDocument>(
        `/records/${selectedDocument.id}/attachments/${versionSourceAttachment.id}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({
            fileName: uploaded.fileName || versionFile.name,
            originalName: versionFile.name,
            mimeType: uploaded.mimeType || versionFile.type || 'application/octet-stream',
            fileSize: versionFile.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
            versionNote: versionNote.trim(),
          }),
        },
      );

      setDocuments((current) =>
        current.map((doc) => (doc.id === updated.id ? updated : doc)),
      );
      setSelectedDocument(updated);
      toast.success(
        `تم حفظ الإصدار ${Math.max(2, Number(versionSourceAttachment.version || 1) + 1)} كنسخة حالية`,
      );
      setVersionDialogOpen(false);
      setVersionSourceAttachment(null);
      setVersionFile(null);
      setVersionNote('');
    } catch (error) {
      console.error('Archive attachment version error:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الإصدار الجديد');
    } finally {
      setVersionSaving(false);
    }
  };

  const handleSubmit = async () => {
    if ((formMode === 'add' && !canAdd) || (formMode === 'edit' && !canEdit)) {
      toast.error('لا تملك الصلاحية المطلوبة لتنفيذ عملية الأرشفة');
      return;
    }

    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const metadataPayload = {
        title: form.title.trim(),
        category: form.category.trim(),
        documentNumber: form.documentNumber.trim(),
        documentDate: form.documentDate || '',
        documentDateType: form.documentDateType,
        issuingAuthority: form.issuingAuthority.trim(),
        confidentiality: form.confidentiality,
        tags: form.tags.trim(),
        description: form.description.trim(),
      };

      const uploadSelectedFiles = async () => {
        const attachments = [];
        for (const file of form.files) {
          const uploaded = await uploadFileToGoogleDrive(file);
          attachments.push({
            fileName: uploaded.fileName || file.name,
            originalName: file.name,
            mimeType: uploaded.mimeType || file.type || 'application/octet-stream',
            fileSize: file.size,
            driveUrl: uploaded.driveUrl,
            driveFileId: uploaded.driveFileId,
          });
        }
        return attachments;
      };

      if (formMode === 'add') {
        const attachments = await uploadSelectedFiles();
        const saved = await archiveRequest<ArchiveDocument>('/records', {
          method: 'POST',
          body: JSON.stringify({
            ...metadataPayload,
            attachments,
          }),
        });

        setDocuments((current) => [saved, ...current]);
        toast.success(
          attachments.length === 1
            ? 'تم إنشاء السجل الأرشيفي وإضافة الملف بنجاح'
            : `تم إنشاء سجل أرشيفي واحد وإضافة ${attachments.length} ملفات داخله`,
        );
      } else if (selectedDocument) {
        let updated = await archiveRequest<ArchiveDocument>(
          `/records/${selectedDocument.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(metadataPayload),
          },
        );

        if (form.files.length > 0) {
          const attachments = await uploadSelectedFiles();
          updated = await archiveRequest<ArchiveDocument>(
            `/records/${selectedDocument.id}/attachments`,
            {
              method: 'POST',
              body: JSON.stringify({ attachments }),
            },
          );
        }

        setDocuments((current) =>
          current.map((doc) => (doc.id === selectedDocument.id ? updated : doc)),
        );
        toast.success(
          form.files.length > 0
            ? `تم تحديث السجل وإضافة ${form.files.length} ملفات جديدة`
            : 'تم تحديث بيانات السجل الأرشيفي',
        );
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
    if ((doc.attachmentCount || doc.attachments?.length || 1) > 1) {
      openDetails(doc);
      return;
    }
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

  const selectedMergeRecords = useMemo(
    () => documents.filter((doc) => selectedMergeIds.includes(doc.id)),
    [documents, selectedMergeIds],
  );

  const toggleMergeSelection = (id: string) => {
    const next = selectedMergeIds.includes(id)
      ? selectedMergeIds.filter((item) => item !== id)
      : [...selectedMergeIds, id];

    setSelectedMergeIds(next);
    setMergeTargetId((target) => (target && next.includes(target) ? target : next[0] || ''));
  };

  const stopMergeSelection = () => {
    setMergeSelectionMode(false);
    setSelectedMergeIds([]);
    setMergeTargetId('');
    setMergeDialogOpen(false);
  };

  const openMergeRecordsDialog = () => {
    if (selectedMergeIds.length < 2) {
      toast.error('حدد سجلين على الأقل للدمج');
      return;
    }
    setMergeTargetId((current) =>
      current && selectedMergeIds.includes(current) ? current : selectedMergeIds[0],
    );
    setMergeDialogOpen(true);
  };

  const mergeArchiveRecords = async () => {
    if (!canEdit) {
      toast.error('لا تملك صلاحية دمج السجلات الأرشيفية');
      return;
    }
    if (selectedMergeIds.length < 2 || !mergeTargetId) {
      toast.error('حدد سجلين على الأقل واختر السجل الرئيسي');
      return;
    }

    try {
      setIsMerging(true);
      const result = await archiveRequest<{
        record: ArchiveDocument;
        mergedSourceIds: string[];
        movedAttachmentCount: number;
      }>('/records/merge', {
        method: 'POST',
        body: JSON.stringify({
          recordIds: selectedMergeIds,
          targetId: mergeTargetId,
        }),
      });

      setDocuments((current) => {
        const remaining = current.filter(
          (doc) => !selectedMergeIds.includes(doc.id) || doc.id === mergeTargetId,
        );
        const withoutTarget = remaining.filter((doc) => doc.id !== mergeTargetId);
        return [result.record, ...withoutTarget];
      });

      toast.success(
        `تم دمج ${result.mergedSourceIds.length + 1} سجلات في سجل واحد ونقل ${result.movedAttachmentCount} ملف`,
      );
      stopMergeSelection();
    } catch (error) {
      console.error('Archive merge error:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر دمج السجلات الأرشيفية');
    } finally {
      setIsMerging(false);
    }
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
            مركز موحد لأرشفة المستندات والملفات، واستقبال المعاملات المغلقة التي يتم ترحيلها اختياريًا من نظام المتابعة.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {canPrint && (
            <Button variant="outline" onClick={() => setReportsOpen(true)} className="w-full lg:w-auto">
              <FileDown className="ml-2 h-4 w-4" />
              تقارير الأرشفة — طباعة / PDF / Excel
            </Button>
          )}
          {(canEdit || canDelete) && (
            <Button
              variant="outline"
              onClick={() => void openTrashCenter()}
              className={trashOpen
                ? "w-full border-slate-500 bg-slate-800 font-bold text-white hover:bg-slate-700 lg:w-auto"
                : "w-full border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-50 lg:w-auto"}
            >
              <Trash2 className="ml-2 h-4 w-4" />
              المحذوفات
              {trashRecords.length > 0 ? (
                <Badge variant="secondary" className="mr-2 min-w-6 justify-center bg-slate-100 px-1.5 text-slate-700">
                  {trashRecords.length.toLocaleString('ar-SA')}
                </Badge>
              ) : null}
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
              إنشاء سجل أرشيفي
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">السجلات الأرشيفية</p>
              <p className="text-2xl font-bold">{documents.length}</p>
            </div>
            <Archive className="h-9 w-9 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الملفات</p>
              <p className="text-2xl font-bold">{totalArchiveAttachments.toLocaleString('ar-SA')}</p>
            </div>
            <Paperclip className="h-9 w-9 text-primary" />
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

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المعاملات المؤرشفة</p>
              <p className="text-2xl font-bold text-emerald-800">{archivedTransactions.length}</p>
            </div>
            <ListTodo className="h-9 w-9 text-emerald-700" />
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

      {trashOpen && (
        <Card className="overflow-hidden border-slate-300 bg-gradient-to-l from-slate-50 via-white to-slate-50 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trash2 className="h-5 w-5 text-slate-700" />
                  مركز المحذوفات
                </CardTitle>
                <CardDescription className="mt-1">
                  يعرض السجلات المحذوفة والسجلات التي تم دمجها، مع إمكانية الاستعادة للسجلات المحذوفة فقط.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                  {trashRecords.length.toLocaleString('ar-SA')} سجل
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void openTrashCenter()}
                >
                  <X className="ml-2 h-4 w-4" />
                  إغلاق
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            {trashLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري تحميل المحذوفات...
              </div>
            ) : trashRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted-foreground">
                لا توجد سجلات في المحذوفات حاليًا.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {trashRecords.map((record) => {
                  const isMerged = record.status === 'merged';
                  return (
                    <article
                      key={record.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={isMerged
                                ? "border-violet-300 bg-violet-50 font-bold text-violet-800"
                                : "border-red-200 bg-red-50 font-bold text-red-700"}
                            >
                              {isMerged ? 'مدمج' : 'محذوف'}
                            </Badge>
                            <span className="text-xs font-bold text-slate-500">
                              {getArchiveReference(record)}
                            </span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 font-black leading-6 text-slate-800">
                            {record.title}
                          </h3>
                        </div>
                        <Trash2 className={isMerged ? "h-5 w-5 text-violet-600" : "h-5 w-5 text-red-500"} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                        <div>
                          <p className="text-slate-500">التصنيف</p>
                          <p className="mt-1 font-bold text-slate-800">{record.category || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">عدد الملفات</p>
                          <p className="mt-1 font-bold text-slate-800">
                            {(record.attachmentCount || record.attachments?.length || 0).toLocaleString('ar-SA')}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-slate-500">{isMerged ? 'تاريخ الدمج' : 'تاريخ الحذف'}</p>
                          <p className="mt-1 font-bold text-slate-800">
                            {formatDateTime(isMerged ? record.mergedAt : record.deletedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        {isMerged ? (
                          <Badge variant="outline" className="border-violet-200 bg-violet-50 px-3 py-2 text-violet-800">
                            لا يُستعاد كسجل مستقل
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void restoreArchiveRecord(record)}
                            disabled={restoringRecordId === record.id || !canEdit}
                            className="border-emerald-300 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            {restoringRecordId === record.id
                              ? <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                              : <RotateCcw className="ml-2 h-4 w-4" />}
                            استعادة السجل
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-l from-emerald-50/60 via-white to-slate-50/70">
        <CardHeader className="border-b border-emerald-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListTodo className="h-5 w-5 text-emerald-700" />
                المعاملات المؤرشفة من نظام المتابعة
              </CardTitle>
              <CardDescription>
                تظهر هنا فقط المعاملات المغلقة التي اختار صاحب الصلاحية ترحيلها إلى الأرشفة.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-300 bg-white px-3 py-1 text-emerald-800">
              {filteredArchivedTransactions.length.toLocaleString('ar-SA')} معاملة
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {filteredArchivedTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-8 text-center text-sm text-muted-foreground">
              لا توجد معاملات مؤرشفة مطابقة للبحث حاليًا.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredArchivedTransactions.map((record) => (
                <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-base text-slate-900">معاملة {record.transactionNumber}</b>
                        {record.transactionYear ? (
                          <Badge variant="outline">{record.transactionYear}{record.transactionDateType === 'hijri' ? 'هـ' : 'م'}</Badge>
                        ) : null}
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">مؤرشفة</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{record.subject}</p>
                    </div>
                    <Archive className="h-5 w-5 shrink-0 text-emerald-700" />
                  </div>

                  <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                    <span>تاريخ المعاملة: <b className="text-foreground">{formatArchivedTransactionDate(record)}</b></span>
                    <span>الإدارة / الوحدة: <b className="text-foreground">{archivedOrganizationalUnitLabel(record.organizationalUnit)}</b></span>
                    <span>الجهة: <b className="text-foreground">{record.sourceEntity || '—'}</b></span>
                    <span>الموظف: <b className="text-foreground">{record.currentAssigneeName || '—'}</b></span>
                    <span>تاريخ الأرشفة: <b className="text-foreground">{formatDate(record.archivedAt || undefined)}</b></span>
                    <span>أرشفها: <b className="text-foreground">{record.archivedByName || '—'}</b></span>
                  </div>

                  {record.archiveNote ? (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                      <b>ملاحظة الأرشفة:</b> {record.archiveNote}
                    </p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 sm:flex sm:flex-wrap sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={archivedTransactionLoading}
                      onClick={() => void openArchivedTransaction(record)}
                    >
                      <Eye className="ml-1 h-4 w-4" />
                      عرض التفاصيل
                    </Button>

                    {canPrint && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-sky-300 text-sky-800 hover:bg-sky-50"
                        disabled={archivedTransactionLoading}
                        onClick={() => printArchivedTransaction(record)}
                      >
                        <Printer className="ml-1 h-4 w-4" />
                        طباعة
                      </Button>
                    )}

                    {canRestoreTransaction && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-800 hover:bg-amber-50"
                        disabled={archivedTransactionLoading}
                        onClick={() => void restoreArchivedTransaction(record)}
                      >
                        <RotateCcw className="ml-1 h-4 w-4" />
                        استعادة للمتابعة
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={archivedTransactionLoading}
                        onClick={() => void deleteArchivedTransaction(record)}
                      >
                        <Trash2 className="ml-1 h-4 w-4" />
                        حذف
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedArchivedTransaction && (
        <Card className="border-emerald-200">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-emerald-700" />
                  تفاصيل المعاملة المؤرشفة رقم {selectedArchivedTransaction.transactionNumber}
                </CardTitle>
                <CardDescription className="mt-1">{selectedArchivedTransaction.subject}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedArchivedTransaction(null)}>
                <X className="ml-1 h-4 w-4" />
                إغلاق
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoItem label="رقم المعاملة" value={selectedArchivedTransaction.transactionNumber} />
              <InfoItem label="السنة" value={selectedArchivedTransaction.transactionYear ? `${selectedArchivedTransaction.transactionYear}${selectedArchivedTransaction.transactionDateType === 'hijri' ? 'هـ' : 'م'}` : '—'} />
              <InfoItem label="تاريخ المعاملة" value={formatArchivedTransactionDate(selectedArchivedTransaction)} />
              <InfoItem label="رقم المتابعة" value={selectedArchivedTransaction.trackingNumber} />
              <InfoItem label="الإدارة / الوحدة" value={archivedOrganizationalUnitLabel(selectedArchivedTransaction.organizationalUnit)} />
              <InfoItem label="الجهة" value={selectedArchivedTransaction.sourceEntity || '—'} />
              <InfoItem label="الموظف المختص" value={selectedArchivedTransaction.currentAssigneeName || '—'} />
              <InfoItem label="تاريخ الإقفال" value={formatDate(selectedArchivedTransaction.closedAt || undefined)} />
              <InfoItem label="تاريخ الأرشفة" value={formatDate(selectedArchivedTransaction.archivedAt || undefined)} />
              <InfoItem label="تمت الأرشفة بواسطة" value={selectedArchivedTransaction.archivedByName || '—'} />
            </div>

            {selectedArchivedTransaction.archiveNote ? (
              <InfoBlock label="ملاحظات الأرشفة" value={selectedArchivedTransaction.archiveNote} />
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-black">مرفقات المعاملة</h3>
              {selectedArchivedTransaction.attachments?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedArchivedTransaction.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{attachment.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{attachment.mimeType || 'ملف'}</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={attachment.driveUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="ml-1 h-4 w-4" />
                          فتح
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  لا توجد مرفقات مرتبطة بهذه المعاملة.
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-black">سجل الإجراءات والتحويلات</h3>
              {selectedArchivedTransaction.events?.length ? (
                <div className="max-h-[360px] space-y-2 overflow-y-auto">
                  {selectedArchivedTransaction.events.map((event) => (
                    <div key={event.id} className="rounded-xl border bg-slate-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm">{event.actionText || 'تحديث المعاملة'}</b>
                        <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">بواسطة: {event.createdByName || '—'}</p>
                      {event.note ? <p className="mt-2 text-sm leading-6">{event.note}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  لا توجد أحداث مسجلة.
                </div>
              )}
            </div>

            {(canPrint || canRestoreTransaction || canDelete) && (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {canPrint && (
                  <Button
                    variant="outline"
                    className="border-sky-300 text-sky-800 hover:bg-sky-50"
                    disabled={archivedTransactionLoading}
                    onClick={() => printArchivedTransaction(selectedArchivedTransaction)}
                  >
                    <Printer className="ml-2 h-4 w-4" />
                    طباعة
                  </Button>
                )}

                {canRestoreTransaction && (
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-800 hover:bg-amber-50"
                    disabled={archivedTransactionLoading}
                    onClick={() => void restoreArchivedTransaction(selectedArchivedTransaction)}
                  >
                    <RotateCcw className="ml-2 h-4 w-4" />
                    استعادة المعاملة إلى نظام المتابعة
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="destructive"
                    disabled={archivedTransactionLoading}
                    onClick={() => void deleteArchivedTransaction(selectedArchivedTransaction)}
                  >
                    <Trash2 className="ml-2 h-4 w-4" />
                    حذف المعاملة نهائيًا
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
              <h2 className="text-xl md:text-2xl font-bold">{formMode === 'add' ? 'إنشاء سجل أرشيفي' : 'تحديث السجل وإضافة ملفات'}</h2>
              <p className="text-sm text-muted-foreground mt-1">أنشئ سجلًا واحدًا للموضوع، ثم أرفق داخله ملفًا واحدًا أو عدة ملفات. ويمكن إضافة ملفات جديدة لاحقًا دون إنشاء سجل جديد.</p>
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
                  <p className="font-semibold mb-1">{form.files.length > 0 ? `تم اختيار ${form.files.length} ملف` : formMode === 'edit' ? 'إضافة ملفات جديدة إلى السجل (اختياري)' : 'اختر ملفًا أو أكثر داخل السجل الأرشيفي'}</p>
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
                    <p className="text-sm font-medium">الملفات الموجودة حاليًا</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(selectedDocument.attachmentCount || selectedDocument.attachments?.length || 1).toLocaleString('ar-SA')} ملف
                      {' — '}
                      {formatFileSize(selectedDocument.totalFileSize ?? selectedDocument.fileSize)}
                    </p>
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
              <h2 className="text-xl md:text-2xl font-bold">تفاصيل السجل الأرشيفي</h2>
              <p className="text-sm text-muted-foreground mt-1">عرض البيانات الوصفية وجميع الملفات والتحديثات التابعة للسجل.</p>
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
                <p className="text-muted-foreground">
                  {getArchiveReference(selectedDocument)} · {(selectedDocument.attachmentCount || selectedDocument.attachments?.length || 1).toLocaleString('ar-SA')} ملف
                </p>
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
              <InfoItem label="عدد الملفات" value={(selectedDocument.attachmentCount || selectedDocument.attachments?.length || 1).toLocaleString('ar-SA')} />
              <InfoItem label="إجمالي الحجم" value={formatFileSize(selectedDocument.totalFileSize ?? selectedDocument.fileSize)} />
              <InfoItem
                label="إجمالي الإصدارات"
                value={(selectedDocument.attachmentVersionCount || selectedDocument.attachments?.length || selectedDocument.attachmentCount || 1).toLocaleString('ar-SA')}
              />
              <InfoItem label="تاريخ الأرشفة" value={formatDate(selectedDocument.createdAt)} />
              <InfoItem label="آخر تعديل" value={formatDate(selectedDocument.updatedAt)} />
            </div>

            {selectedDocument.description && <InfoBlock label="الوصف / الملاحظات" value={selectedDocument.description} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  الملفات المرفقة ({selectedDocument.attachmentCount || selectedDocument.attachments?.length || 1})
                </CardTitle>
                <CardDescription>
                  يمكن إضافة ملفات جديدة للسجل، أو رفع إصدار أحدث لملف قائم مع الاحتفاظ بجميع نسخه السابقة.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {(selectedDocument.attachments?.length
                  ? selectedDocument.attachments.filter((item) => item.isCurrent !== false)
                  : [{
                      id: selectedDocument.id,
                      fileName: selectedDocument.fileName,
                      originalName: selectedDocument.originalName,
                      mimeType: selectedDocument.mimeType,
                      fileSize: selectedDocument.fileSize,
                      driveUrl: selectedDocument.driveUrl,
                      driveFileId: selectedDocument.driveFileId,
                    }]
                ).map((attachment) => (
                  <div
                    key={attachment.id || attachment.driveFileId || attachment.driveUrl}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{attachment.originalName || attachment.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {attachment.mimeType || 'نوع غير معروف'} — {formatFileSize(attachment.fileSize)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            الإصدار الحالي V{attachment.version || 1}
                          </Badge>
                          {(() => {
                            const group = getAttachmentVersionGroups(selectedDocument).find(
                              (item) => item.current.id === attachment.id,
                            );
                            return group && group.versions.length > 1 ? (
                              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                                {group.versions.length.toLocaleString('ar-SA')} إصدارات
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => window.open(attachment.driveUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink className="ml-2 h-4 w-4" />
                          فتح
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = attachment.driveUrl;
                            link.target = '_blank';
                            link.rel = 'noreferrer';
                            link.download = attachment.originalName || attachment.fileName;
                            link.click();
                          }}
                        >
                          <Download className="ml-2 h-4 w-4" />
                          تنزيل
                        </Button>
                        {canEdit && (
                          <Button
                            type="button"
                            onClick={() => openAttachmentVersionDialog(attachment)}
                            className="bg-[#1F4E78] font-bold text-white hover:bg-[#173A59]"
                          >
                            <History className="ml-2 h-4 w-4" />
                            إصدار جديد
                          </Button>
                        )}
                      </div>
                    </div>
                    <AttachmentPreviewCard attachment={attachment as any} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {getAttachmentVersionGroups(selectedDocument).some((group) => group.versions.length > 1) && (
              <Card className="border-slate-200">
                <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-[#1F4E78]" />
                    سجل إصدارات الملفات
                  </CardTitle>
                  <CardDescription>
                    يحتفظ النظام بجميع النسخ السابقة ويحدد الإصدار الحالي لكل ملف.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {getAttachmentVersionGroups(selectedDocument)
                    .filter((group) => group.versions.length > 1)
                    .map((group) => (
                      <div key={group.groupId} className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="font-black text-slate-800">
                          {group.current.originalName || group.current.fileName}
                        </p>
                        <div className="mt-3 space-y-2">
                          {group.versions.map((version) => (
                            <div
                              key={version.id}
                              className={version.isCurrent
                                ? "flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                                : "flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"}
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <b className="text-sm text-slate-800">V{version.version || 1}</b>
                                  <Badge
                                    variant="outline"
                                    className={version.isCurrent
                                      ? "border-emerald-200 bg-white text-emerald-800"
                                      : "border-slate-300 bg-white text-slate-600"}
                                  >
                                    {version.isCurrent ? 'الحالي' : 'سابق'}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDateTime(version.createdAt)} · {formatFileSize(version.fileSize)}
                                </p>
                                {version.versionNote ? (
                                  <p className="mt-1 text-xs leading-5 text-slate-700">{version.versionNote}</p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(version.driveUrl, '_blank', 'noopener,noreferrer')}
                              >
                                <Eye className="ml-2 h-4 w-4" />
                                عرض الإصدار
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/70">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4 text-slate-700" />
                  سجل النشاط الزمني
                </CardTitle>
                <CardDescription>
                  سجل تدقيق يوضح ما تم على السجل الأرشيفي ومن قام بالإجراء وتاريخه.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {selectedDocument.activities?.length ? (
                  <div className="relative space-y-0">
                    {selectedDocument.activities.map((activity, index) => (
                      <div key={activity.id} className="relative flex gap-4 pb-5 last:pb-0">
                        {index < (selectedDocument.activities?.length || 0) - 1 && (
                          <div className="absolute right-[15px] top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />
                        )}
                        <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                          <Clock3 className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Badge
                              variant="outline"
                              className={`w-fit font-bold ${getArchiveActivityClassName(activity.action)}`}
                            >
                              {getArchiveActivityLabel(activity.action)}
                            </Badge>
                            <span className="text-xs font-medium text-slate-500">
                              {formatDateTime(activity.createdAt)}
                            </span>
                          </div>
                          {activity.description ? (
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {activity.description}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-500">
                            بواسطة: <b className="text-slate-700">{activity.actorName || 'النظام'}</b>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-muted-foreground">
                    لا توجد أحداث مسجلة لهذا السجل حتى الآن.
                  </div>
                )}
              </CardContent>
            </Card>

            {(canEdit || canDelete) && (
              <div className="flex flex-col md:flex-row justify-end gap-2">
                {canEdit && (
                  <Button variant="outline" onClick={() => openEditForm(selectedDocument)}>
                    <Edit className="ml-2 h-4 w-4" />
                    تحديث السجل وإضافة ملفات
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
          <CardDescription>ابحث في ملفات الأرشفة والمعاملات المؤرشفة بالعنوان أو الرقم أو الجهة أو الكلمات المفتاحية.</CardDescription>
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
              السجلات الأرشيفية ({filteredDocuments.length})
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              كل بطاقة تمثل سجلًا أرشيفيًا واحدًا، ويمكن أن يحتوي السجل على عدة ملفات ومرفقات.
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
            {canEdit && !mergeSelectionMode && filteredDocuments.length > 1 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMergeSelectionMode(true);
                  setSelectedMergeIds([]);
                  setMergeTargetId('');
                }}
                className="h-9 border-violet-300 bg-violet-50 font-bold text-violet-800 hover:bg-violet-100"
              >
                <GitMerge className="ml-2 h-4 w-4" />
                دمج سجلات
              </Button>
            )}
            {canEdit && mergeSelectionMode && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={stopMergeSelection}
                  className="h-9"
                  disabled={isMerging}
                >
                  <X className="ml-2 h-4 w-4" />
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={openMergeRecordsDialog}
                  disabled={selectedMergeIds.length < 2 || isMerging}
                  className="h-9 bg-violet-700 font-bold text-white hover:bg-violet-800"
                >
                  <GitMerge className="ml-2 h-4 w-4" />
                  دمج المحدد ({selectedMergeIds.length})
                </Button>
              </>
            )}
            <Badge variant="outline" className="w-fit border-slate-300 bg-white/90 px-3 py-1 font-bold text-slate-700 shadow-sm">
              {filteredDocuments.length} سجل · {totalArchiveAttachments.toLocaleString('ar-SA')} ملف
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
                  {mergeSelectionMode && (
                    <label className="absolute left-4 top-4 z-10 flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-white/95 px-3 py-2 text-xs font-black text-violet-800 shadow-sm">
                      <input
                        type="checkbox"
                        checked={selectedMergeIds.includes(doc.id)}
                        onChange={() => toggleMergeSelection(doc.id)}
                        className="h-4 w-4 accent-violet-700"
                      />
                      تحديد للدمج
                    </label>
                  )}

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
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                          {getArchiveReference(doc)} · {(doc.attachmentCount || doc.attachments?.length || 1).toLocaleString('ar-SA')} ملف
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
                          <p className="text-[11px] font-medium text-slate-400">عدد الملفات</p>
                          <p className="mt-1 font-black text-slate-700">{(doc.attachmentCount || doc.attachments?.length || 1).toLocaleString('ar-SA')} ملف</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-400">إجمالي الحجم</p>
                          <p className="mt-1 font-black text-slate-700">{formatFileSize(doc.totalFileSize ?? doc.fileSize)}</p>
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
                      {mergeSelectionMode && <th className="w-14 px-3 py-3 text-center font-black">دمج</th>}
                      <th className="px-4 py-3 font-black">العنوان / المرجع</th>
                      <th className="px-4 py-3 font-black">التصنيف</th>
                      <th className="px-4 py-3 font-black">رقم المستند</th>
                      <th className="px-4 py-3 font-black">تاريخ المستند</th>
                      <th className="px-4 py-3 font-black">الجهة / المصدر</th>
                      <th className="px-4 py-3 font-black">السرية</th>
                      <th className="px-4 py-3 font-black">الملفات</th>
                      <th className="px-4 py-3 font-black">إجمالي الحجم</th>
                      <th className="px-4 py-3 text-center font-black">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((doc, index) => (
                      <tr
                        key={doc.id}
                        className={`border-b border-slate-100 transition-colors hover:bg-sky-50/70 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/55'}`}
                      >
                        {mergeSelectionMode && (
                          <td className="px-3 py-3 align-top text-center">
                            <input
                              type="checkbox"
                              checked={selectedMergeIds.includes(doc.id)}
                              onChange={() => toggleMergeSelection(doc.id)}
                              className="h-4 w-4 accent-violet-700"
                              aria-label={`تحديد ${doc.title} للدمج`}
                            />
                          </td>
                        )}
                        <td className="max-w-[280px] px-4 py-3 align-top">
                          <button type="button" onClick={() => openDetails(doc)} className="block w-full text-right">
                            <span className="line-clamp-2 font-black text-slate-800 hover:text-sky-700">{doc.title}</span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{getArchiveReference(doc)}</span>
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
                        <td className="px-4 py-3 align-top font-black text-slate-700">{(doc.attachmentCount || doc.attachments?.length || 1).toLocaleString('ar-SA')}</td>
                        <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-700">{formatFileSize(doc.totalFileSize ?? doc.fileSize)}</td>
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
                يعرض الجدول {filteredDocuments.length} سجلًا أرشيفيًا و{totalArchiveAttachments.toLocaleString('ar-SA')} ملفًا مرفقًا. استخدم البحث والتصفية لتقليل النتائج، ويمكن التمرير أفقيًا على الشاشات الصغيرة.
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
          archiveRequest<ArchiveDocument>('/records', {
            method: 'POST',
            body: JSON.stringify({
              title: payload.title,
              category: payload.category,
              documentNumber: payload.documentNumber,
              documentDate: payload.documentDate,
              documentDateType: payload.documentDateType,
              issuingAuthority: payload.issuingAuthority,
              confidentiality: payload.confidentiality,
              tags: payload.tags,
              description: payload.description,
              attachments: [{
                fileName: payload.fileName,
                originalName: payload.originalName,
                mimeType: payload.mimeType,
                fileSize: payload.fileSize,
                driveUrl: payload.driveUrl,
                driveFileId: payload.driveFileId,
              }],
            }),
          })
        }
        onImported={async () => {
          await loadDocumentsFromServer();
        }}
      />

      <ArchiveReportsDialog documents={documents} open={reportsOpen} onOpenChange={setReportsOpen} />

      <AlertDialog
        open={versionDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAttachmentVersionDialog();
        }}
      >
        <AlertDialogContent className="max-w-xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#1F4E78]" />
              رفع إصدار جديد للملف
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              سيبقى الإصدار السابق محفوظًا للرجوع إليه، ويصبح الملف الجديد هو الإصدار الحالي.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-800">
                {versionSourceAttachment?.originalName || versionSourceAttachment?.fileName || 'الملف الحالي'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                الإصدار الحالي: V{versionSourceAttachment?.version || 1}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="archive-version-file">ملف الإصدار الجديد *</Label>
              <Input
                id="archive-version-file"
                type="file"
                accept="*/*"
                disabled={versionSaving}
                onChange={(event) => setVersionFile(event.target.files?.[0] || null)}
              />
              {versionFile ? (
                <p className="text-xs font-medium text-slate-600">
                  {versionFile.name} — {formatFileSize(versionFile.size)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="archive-version-note">ملاحظة الإصدار</Label>
              <Textarea
                id="archive-version-note"
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                placeholder="مثال: نسخة محدثة بعد اعتماد التعديلات النهائية"
                rows={3}
                disabled={versionSaving}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={versionSaving}
              onClick={(event) => {
                event.preventDefault();
                closeAttachmentVersionDialog();
              }}
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void saveAttachmentVersion();
              }}
              disabled={versionSaving || !versionFile}
              className="bg-[#1F4E78] text-white hover:bg-[#173A59]"
            >
              {versionSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <History className="ml-2 h-4 w-4" />}
              {versionSaving ? 'جاري حفظ الإصدار...' : 'حفظ كإصدار جديد'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent className="max-w-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-violet-700" />
              دمج السجلات الأرشيفية
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-7">
              سيتم نقل جميع ملفات السجلات المحددة إلى سجل رئيسي واحد، مع الاحتفاظ بسجل تدقيق للعملية.
              السجلات الأخرى ستُحفظ كـ «مدمجة» ولن تظهر كبطاقات مستقلة.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3 text-sm text-violet-950">
              تم تحديد <b>{selectedMergeRecords.length}</b> سجلات تحتوي إجمالًا على{' '}
              <b>
                {selectedMergeRecords
                  .reduce((sum, item) => sum + Number(item.attachmentCount || item.attachments?.length || 1), 0)
                  .toLocaleString('ar-SA')}
              </b>{' '}
              ملف.
            </div>

            <div className="space-y-2">
              <Label htmlFor="archive-merge-target">السجل الرئيسي الذي ستبقى بياناته</Label>
              <NativeSelect
                id="archive-merge-target"
                value={mergeTargetId}
                onChange={(event) => setMergeTargetId(event.target.value)}
              >
                {selectedMergeRecords.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {getArchiveReference(doc)} — {doc.title}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs leading-6 text-muted-foreground">
                سيتم الاحتفاظ بعنوان وتصنيف ورقم المستند والجهة والسرية الخاصة بالسجل الرئيسي،
                بينما تنتقل إليه جميع الملفات الموجودة في السجلات الأخرى.
              </p>
            </div>

            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {selectedMergeRecords.map((doc) => (
                <label
                  key={doc.id}
                  className={doc.id === mergeTargetId
                    ? "flex items-start gap-3 rounded-lg border border-violet-300 bg-violet-50 p-3"
                    : "flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"}
                >
                  <input
                    type="radio"
                    name="archive-merge-target-radio"
                    checked={doc.id === mergeTargetId}
                    onChange={() => setMergeTargetId(doc.id)}
                    className="mt-1 h-4 w-4 accent-violet-700"
                  />
                  <div className="min-w-0">
                    <p className="font-black text-slate-800">{doc.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getArchiveReference(doc)} · {(doc.attachmentCount || doc.attachments?.length || 1).toLocaleString('ar-SA')} ملف
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void mergeArchiveRecords();
              }}
              disabled={isMerging || selectedMergeRecords.length < 2 || !mergeTargetId}
              className="bg-violet-700 text-white hover:bg-violet-800"
            >
              {isMerging ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <GitMerge className="ml-2 h-4 w-4" />}
              {isMerging ? 'جاري الدمج...' : 'اعتماد الدمج'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف سجل أرشيفي</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم نقل السجل الأرشيفي إلى المحذوفات داخل المنصة، مع بقاء الملفات الأصلية في Google Drive. يمكن إضافة الاستعادة والحذف النهائي ضمن إدارة المحذوفات لاحقًا.
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

