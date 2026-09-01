import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Eye,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Route,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  mosqueApi,
  type MosqueFieldTour,
  type MosqueFieldVisit,
  type MosqueFieldVisitAttachment,
  type MosqueFieldVisitImage,
  type MosqueFieldVisitItem,
  type MosqueFieldVisitSummary,
  type MosqueSite,
} from '../api/mosques';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';

type Props = {
  sites: MosqueSite[];
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
};

type VisitForm = {
  tourId: string;
  siteId: string;
  visitType: MosqueFieldVisit['visitType'];
  visitDate: string;
  departureAt: string;
  representativeName: string;
  teamMembers: string;
  overallStatus: MosqueFieldVisit['overallStatus'];
  priority: MosqueFieldVisit['priority'];
  workflowStatus: MosqueFieldVisit['workflowStatus'];
  generalNotes: string;
  recommendations: string;
  attachments: MosqueFieldVisitAttachment[];
  items: MosqueFieldVisitItem[];
};

const emptySummary: MosqueFieldVisitSummary = {
  totalSites: 0,
  visitedSites: 0,
  remainingSites: 0,
  coveragePercent: 0,
  visits: 0,
  openItems: 0,
  urgentItems: 0,
  resolvedItems: 0,
  overdueItems: 0,
};

const visitTypeLabels: Record<string, string> = {
  initial: 'زيارة أولية',
  follow_up: 'زيارة متابعة',
  urgent: 'زيارة عاجلة',
  closure_verification: 'تحقق من الإغلاق',
};
const visitStatusLabels: Record<string, string> = {
  planned: 'مجدولة',
  in_progress: 'جارية',
  completed: 'مكتملة',
  follow_up: 'تحتاج متابعة',
  closed: 'مغلقة',
};
const tourStatusLabels: Record<string, string> = {
  scheduled: 'مجدولة',
  in_progress: 'جارية',
  completed: 'مكتملة',
  postponed: 'مؤجلة',
  cancelled: 'ملغاة',
};
const overallLabels: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  needs_attention: 'تحتاج عناية',
  critical: 'حرجة',
};
const priorityLabels: Record<string, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  medium: 'متوسطة',
  high: 'مرتفعة',
  urgent: 'عاجلة',
};
const itemStatusLabels: Record<string, string> = {
  good: 'سليم',
  needs_action: 'يحتاج معالجة',
  not_available: 'غير متوفر',
  not_applicable: 'لا ينطبق',
  not_checked: 'لم يتم التحقق',
};
const resolutionLabels: Record<string, string> = {
  new: 'جديدة',
  referred: 'محالة',
  in_progress: 'قيد المعالجة',
  resolved: 'تمت المعالجة',
  closed: 'مغلقة بعد التحقق',
};

const splitMembers = (value: string) => value.split(/[،,\n]/).map((item) => item.trim()).filter(Boolean);
const html = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character] || character));
const dateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const dateOnly = (value?: string | null) => value ? dateTimeLocal(value).slice(0, 10) : '';
const freshItems = (items: MosqueFieldVisitItem[]) => items.map((item) => ({
  ...item,
  id: undefined,
  note: item.note || '',
  responsibleEntity: item.responsibleEntity || '',
  dueDate: dateOnly(item.dueDate),
  resolutionNote: item.resolutionNote || '',
  beforeImages: [...(item.beforeImages || [])],
  afterImages: [...(item.afterImages || [])],
}));

const emptyVisit = (items: MosqueFieldVisitItem[] = []): VisitForm => ({
  tourId: '',
  siteId: '',
  visitType: 'initial',
  visitDate: dateTimeLocal(new Date().toISOString()),
  departureAt: '',
  representativeName: '',
  teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي',
  overallStatus: 'good',
  priority: 'normal',
  workflowStatus: 'in_progress',
  generalNotes: '',
  recommendations: '',
  attachments: [],
  items: freshItems(items),
});

export const MosqueFieldVisitsPanel: React.FC<Props> = ({ sites, canAdd, canEdit, canDelete, canPrint }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [summary, setSummary] = React.useState<MosqueFieldVisitSummary>(emptySummary);
  const [tours, setTours] = React.useState<MosqueFieldTour[]>([]);
  const [visits, setVisits] = React.useState<MosqueFieldVisit[]>([]);
  const [template, setTemplate] = React.useState<MosqueFieldVisitItem[]>([]);
  const [view, setView] = React.useState<'visits' | 'tours'>('visits');
  const [search, setSearch] = React.useState('');
  const [siteFilter, setSiteFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  const [tourDialog, setTourDialog] = React.useState(false);
  const [tourSearch, setTourSearch] = React.useState('');
  const [tourForm, setTourForm] = React.useState({
    title: '', scheduledDate: new Date().toISOString().slice(0, 10), scope: '',
    teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي', notes: '', siteIds: [] as string[],
  });

  const [visitDialog, setVisitDialog] = React.useState(false);
  const [editingVisit, setEditingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [viewingVisit, setViewingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deletingVisit, setDeletingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [preparingPrint, setPreparingPrint] = React.useState(false);
  const [visitForm, setVisitForm] = React.useState<VisitForm>(() => emptyVisit());
  const [uploadingKey, setUploadingKey] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, tourData, visitData, checklist] = await Promise.all([
        mosqueApi.fieldVisitSummary(), mosqueApi.fieldTours(), mosqueApi.fieldVisits(), mosqueApi.fieldVisitChecklist(),
      ]);
      setSummary(summaryData);
      setTours(tourData);
      setVisits(visitData);
      setTemplate(checklist);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل الجولات والزيارات الميدانية');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const filteredVisits = React.useMemo(() => visits.filter((visit) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [visit.visitNumber, visit.site.name, visit.site.campusLocation, visit.representativeName]
      .some((value) => String(value || '').toLowerCase().includes(needle));
    return matchesSearch && (!siteFilter || visit.siteId === siteFilter) && (!statusFilter || visit.workflowStatus === statusFilter);
  }), [visits, search, siteFilter, statusFilter]);

  const filteredTourSites = React.useMemo(() => {
    const needle = tourSearch.trim().toLowerCase();
    return sites.filter((site) => !needle || [site.name, site.campusLocation, site.city, site.district].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [sites, tourSearch]);

  const openTour = () => {
    setTourForm({
      title: `جولة ميدانية - ${new Date().toLocaleDateString('ar-SA-u-ca-gregory')}`,
      scheduledDate: new Date().toISOString().slice(0, 10),
      scope: '', teamMembers: 'محمد أحمد المغربي، فهد بن عبدالله القعود، عبير بنت أحمد الكعبي', notes: '', siteIds: [],
    });
    setTourSearch('');
    setTourDialog(true);
  };

  const saveTour = async () => {
    const teamMembers = splitMembers(tourForm.teamMembers);
    if (!tourForm.title.trim() || !tourForm.scheduledDate || !teamMembers.length || !tourForm.siteIds.length) {
      toast.error('أكمل عنوان الجولة وتاريخها والفريق واختر موقعًا واحدًا على الأقل');
      return;
    }
    try {
      setSaving(true);
      await mosqueApi.createFieldTour({
        ...tourForm,
        scheduledDate: new Date(`${tourForm.scheduledDate}T09:00:00`).toISOString(),
        teamMembers,
      });
      toast.success(`تم إنشاء الجولة وجدولة ${tourForm.siteIds.length} زيارة مرتبطة بالمواقع المحددة`);
      setTourDialog(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الجولة');
    } finally { setSaving(false); }
  };

  const updateTourStatus = async (tour: MosqueFieldTour, status: MosqueFieldTour['status']) => {
    try {
      await mosqueApi.updateFieldTour(tour.id, { status, notes: tour.notes || null });
      setTours((current) => current.map((item) => item.id === tour.id ? { ...item, status } : item));
      toast.success('تم تحديث حالة الجولة');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الجولة'); }
  };

  const openNewVisit = (preset?: { siteId?: string; tourId?: string }) => {
    setEditingVisit(null);
    setVisitForm({ ...emptyVisit(template), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });
    setVisitDialog(true);
  };

  const openVisit = (visit: MosqueFieldVisit) => {
    setEditingVisit(visit);
    setVisitForm({
      tourId: visit.tourId || '', siteId: visit.siteId, visitType: visit.visitType,
      visitDate: dateTimeLocal(visit.visitDate), departureAt: dateTimeLocal(visit.departureAt),
      representativeName: visit.representativeName || '', teamMembers: (visit.teamMembers || []).join('، '),
      overallStatus: visit.overallStatus, priority: visit.priority, workflowStatus: visit.workflowStatus,
      generalNotes: visit.generalNotes || '', recommendations: visit.recommendations || '',
      attachments: [...(visit.attachments || [])], items: freshItems(visit.items || template),
    });
    setVisitDialog(true);
  };

  const setVisitItem = (index: number, patch: Partial<MosqueFieldVisitItem>) => {
    setVisitForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const uploadItemImages = async (index: number, phase: 'beforeImages' | 'afterImages', files: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const key = `${index}-${phase}`;
    try {
      setUploadingKey(key);
      const uploaded: MosqueFieldVisitImage[] = [];
      for (const file of selected) {
        if (!file.type.startsWith('image/')) throw new Error(`الملف ${file.name} ليس صورة مدعومة`);
        const result = await mosqueApi.upload(file);
        uploaded.push({
          url: result.driveUrl, fileId: result.driveFileId || null, fileName: result.fileName || file.name,
          mimeType: result.mimeType || file.type, capturedAt: new Date().toISOString(),
        });
      }
      setVisitItem(index, { [phase]: [...(visitForm.items[index][phase] || []), ...uploaded] });
      toast.success(`تم رفع ${uploaded.length} صورة`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر رفع الصور'); }
    finally { setUploadingKey(''); }
  };

  const removeItemImage = (index: number, phase: 'beforeImages' | 'afterImages', imageIndex: number) => {
    setVisitItem(index, { [phase]: visitForm.items[index][phase].filter((_, currentIndex) => currentIndex !== imageIndex) });
  };

  const uploadVisitAttachments = async (files: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
    const invalid = selected.find((file) => !allowedTypes.has(file.type));
    if (invalid) {
      toast.error(`الملف ${invalid.name} غير مدعوم. المسموح صور JPG وPNG وWEBP وGIF أو ملفات PDF`);
      return;
    }
    const oversized = selected.find((file) => file.size > 20 * 1024 * 1024);
    if (oversized) {
      toast.error(`حجم الملف ${oversized.name} يتجاوز الحد الأعلى 20 ميجابايت`);
      return;
    }
    if (visitForm.attachments.length + selected.length > 100) {
      toast.error('الحد الأعلى لمرفقات الزيارة هو 100 ملف');
      return;
    }

    try {
      setUploadingKey('visit-attachments');
      const uploaded: MosqueFieldVisitAttachment[] = [];
      for (const file of selected) {
        const result = await mosqueApi.upload(file);
        const attachment: MosqueFieldVisitAttachment = {
          url: result.driveUrl,
          fileId: result.driveFileId || null,
          fileName: result.fileName || file.name,
          description: '',
          mimeType: result.mimeType || file.type,
          fileSize: file.size,
          capturedAt: new Date().toISOString(),
        };
        uploaded.push(attachment);
        setVisitForm((current) => ({ ...current, attachments: [...current.attachments, attachment] }));
      }
      toast.success(`تم رفع ${uploaded.length} ${uploaded.length === 1 ? 'مرفق' : 'مرفقات'}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع مرفقات الزيارة');
    } finally {
      setUploadingKey('');
    }
  };

  const removeVisitAttachment = (index: number) => {
    setVisitForm((current) => ({ ...current, attachments: current.attachments.filter((_, currentIndex) => currentIndex !== index) }));
  };

  const updateVisitAttachmentDescription = (index: number, description: string) => {
    setVisitForm((current) => ({
      ...current,
      attachments: current.attachments.map((attachment, currentIndex) => currentIndex === index ? { ...attachment, description } : attachment),
    }));
  };

  const saveVisit = async () => {
    const teamMembers = splitMembers(visitForm.teamMembers);
    if (!visitForm.siteId || !visitForm.visitDate || !teamMembers.length) {
      toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة وأعضاء الفريق');
      return;
    }
    const undescribedAttachment = visitForm.attachments.find((attachment) => !String(attachment.description || '').trim());
    if (undescribedAttachment) {
      toast.error('اكتب وصفًا واضحًا لكل مرفق قبل حفظ الزيارة');
      return;
    }
    const needsNote = visitForm.items.find((item) => item.status === 'needs_action' && !String(item.note || '').trim());
    if (needsNote) {
      toast.error(`اكتب وصف الملاحظة في بند: ${needsNote.title}`);
      return;
    }
    if (['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus) && visitForm.items.some((item) => item.status === 'not_checked')) {
      toast.error('لا يمكن إكمال الزيارة مع وجود بنود لم يتم التحقق منها');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...visitForm,
        tourId: visitForm.tourId || null,
        visitDate: new Date(visitForm.visitDate).toISOString(),
        departureAt: visitForm.departureAt ? new Date(visitForm.departureAt).toISOString() : null,
        teamMembers,
        items: visitForm.items.map((item) => ({ ...item, id: undefined, dueDate: item.dueDate || null })),
      };
      if (editingVisit) await mosqueApi.updateFieldVisit(editingVisit.id, payload);
      else await mosqueApi.createFieldVisit(payload);
      toast.success(editingVisit ? 'تم تحديث الزيارة وحفظ نتائجها' : 'تم إنشاء الزيارة الميدانية');
      setVisitDialog(false);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ الزيارة'); }
    finally { setSaving(false); }
  };

  const deleteVisit = async () => {
    if (!deletingVisit) return;
    try {
      setDeleting(true);
      await mosqueApi.deleteFieldVisit(deletingVisit.id);
      toast.success(`تم حذف الزيارة ${deletingVisit.visitNumber}`);
      setDeletingVisit(null);
      setViewingVisit((current) => current?.id === deletingVisit.id ? null : current);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف الزيارة');
    } finally {
      setDeleting(false);
    }
  };

  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) {
      toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
      return;
    }
    report.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري إعداد التقرير</title></head><body style="font-family:Tahoma,Arial;text-align:center;padding:80px"><h2>جاري إعداد تقرير الزيارة...</h2><p>يرجى الانتظار حتى يتم تحميل الصور المحددة.</p></body></html>');
    report.document.close();

    const isImageAttachment = (attachment: MosqueFieldVisitAttachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''));
    const printImages = [
      ...(visit.attachments || []).filter(isImageAttachment).map((attachment, index) => ({ attachment, label: attachment.description || `مرفق الزيارة ${index + 1}` })),
      ...visit.items.flatMap((item) => [
        ...(item.beforeImages || []).map((attachment) => ({ attachment, label: `قبل المعالجة — ${item.title}` })),
        ...(item.afterImages || []).map((attachment) => ({ attachment, label: `بعد المعالجة — ${item.title}` })),
      ]),
    ];
    const pdfAttachments = (visit.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(String(attachment.fileName || '')));
    const objectUrls: string[] = [];
    const printableImages = includeImages ? (await Promise.all(printImages.map(async ({ attachment, label }) => {
      try {
        if (!attachment.fileId) return { src: attachment.url, label };
        const blob = await mosqueApi.mediaBlob(attachment.fileId);
        const src = URL.createObjectURL(blob);
        objectUrls.push(src);
        return { src, label };
      } catch {
        return null;
      }
    }))).filter((item): item is { src: string; label: string } => Boolean(item)) : [];
    const imageSection = printableImages.length ? `<section class="attachments"><h2>الصور المرفقة (${printableImages.length})</h2><div class="image-grid">${printableImages.map((item, index) => `<figure><img src="${html(item.src)}" alt="${html(item.label)}"><figcaption><b>${index + 1}. ${html(item.label)}</b></figcaption></figure>`).join('')}</div></section>` : '';
    const pdfSection = pdfAttachments.length ? `<section class="pdf-list"><b>ملفات PDF المرفقة (${pdfAttachments.length})</b><div>${pdfAttachments.map((attachment, index) => `${index + 1}. ${html(attachment.description || `مرفق PDF ${index + 1}`)}`).join(' &nbsp; | &nbsp; ')}</div></section>` : '';
    const actionItems = visit.items.filter((item) => item.status === 'needs_action');
    const rows = visit.items.map((item, index) => `<tr><td>${index + 1}</td><td>${html(item.category)}</td><td class="right">${html(item.title)}</td><td>${html(itemStatusLabels[item.status] || item.status)}</td><td>${html(priorityLabels[item.priority] || item.priority)}</td><td class="right">${html(item.note || '-')}</td><td>${html(item.responsibleEntity || '-')}</td><td>${html(resolutionLabels[item.resolutionStatus] || item.resolutionStatus)}</td><td>${(item.beforeImages?.length || 0)}/${(item.afterImages?.length || 0)}</td></tr>`).join('');
    report.document.open();
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(visit.visitNumber)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0f766e;border-radius:16px;padding:16px;background:#f0fdfa}.kicker{font-size:11px;color:#0f766e;font-weight:bold}.title{font-size:23px;font-weight:900;margin:6px 0}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.box{border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:white}.box small{display:block;color:#64748b;margin-bottom:4px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metric{padding:10px;border:1px solid #cbd5e1;border-radius:10px;text-align:center}.metric b{display:block;font-size:20px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:9.5px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:top}th{background:#e2e8f0}.right{text-align:right}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.note{border:1px solid #cbd5e1;border-radius:10px;padding:10px;min-height:65px;white-space:pre-wrap}.pdf-list{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:10px}.pdf-list div{margin-top:5px;color:#475569}.attachments{page-break-before:always;padding-top:3mm}.attachments h2{margin:0 0 12px;font-size:20px}.image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.image-grid figure{margin:0;border:1px solid #cbd5e1;border-radius:12px;padding:8px;break-inside:avoid;page-break-inside:avoid}.image-grid img{display:block;width:100%;height:230px;object-fit:contain;background:#f8fafc;border-radius:8px}.image-grid figcaption{display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:10px}.image-grid figcaption span{color:#64748b}.footer{margin-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title">تقرير زيارة ميدانية</div><div class="meta"><div class="box"><small>رقم الزيارة</small><b>${html(visit.visitNumber)}</b></div><div class="box"><small>المسجد / المصلى</small><b>${html(visit.site.name)}</b></div><div class="box"><small>التاريخ</small><b>${html(new Date(visit.visitDate).toLocaleString('ar-SA-u-ca-gregory'))}</b></div><div class="box"><small>نوع الزيارة</small><b>${html(visitTypeLabels[visit.visitType])}</b></div><div class="box"><small>الفريق</small><b>${html((visit.teamMembers || []).join('، '))}</b></div><div class="box"><small>ممثل الموقع</small><b>${html(visit.representativeName || '-')}</b></div><div class="box"><small>الحالة العامة</small><b>${html(overallLabels[visit.overallStatus])}</b></div><div class="box"><small>حالة السجل</small><b>${html(visitStatusLabels[visit.workflowStatus])}</b></div></div></div><div class="metrics"><div class="metric">بنود الفحص<b>${visit.items.length}</b></div><div class="metric">ملاحظات تحتاج معالجة<b>${actionItems.length}</b></div><div class="metric">ملاحظات عاجلة<b>${actionItems.filter((item) => item.priority === 'urgent').length}</b></div><div class="metric">تم إغلاقها<b>${visit.items.filter((item) => item.resolutionStatus === 'closed').length}</b></div></div><table><thead><tr><th>م</th><th>المحور</th><th>بند الفحص</th><th>النتيجة</th><th>الأولوية</th><th>الملاحظة</th><th>الجهة المسؤولة</th><th>المعالجة</th><th>صور قبل/بعد</th></tr></thead><tbody>${rows}</tbody></table><div class="notes"><div class="note"><b>الملاحظات العامة</b><br>${html(visit.generalNotes || '-')}</div><div class="note"><b>التوصيات</b><br>${html(visit.recommendations || '-')}</div></div>${pdfSection}${imageSection}<div class="footer"><span>تم إنشاء التقرير من منصة IAU Deeds</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    report.document.close();
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  };

  const requestVisitPrint = (visit: MosqueFieldVisit) => {
    setPrintTarget(visit);
    setIncludePrintImages(true);
  };

  const confirmVisitPrint = async () => {
    if (!printTarget) return;
    try {
      setPreparingPrint(true);
      await printVisit(printTarget, includePrintImages);
      setPrintTarget(null);
    } finally {
      setPreparingPrint(false);
    }
  };

  const printProgramReport = () => {
    const rows = filteredVisits.map((visit, index) => {
      const open = visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
      const urgent = visit.items.filter((item) => item.priority === 'urgent' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
      return `<tr><td>${index + 1}</td><td>${html(visit.visitNumber)}</td><td class="right">${html(visit.site.name)}</td><td>${html(visitTypeLabels[visit.visitType])}</td><td>${html(new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory'))}</td><td>${html(overallLabels[visit.overallStatus])}</td><td>${open}</td><td>${urgent}</td><td>${html(visitStatusLabels[visit.workflowStatus])}</td></tr>`;
    }).join('');
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) return toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير البرنامج الميداني</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0369a1;border-radius:16px;padding:16px;background:linear-gradient(135deg,#f0f9ff,#fff,#ecfdf5)}.kicker{font-size:11px;color:#0369a1;font-weight:bold}h1{font-size:24px;margin:6px 0}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0}.metric{border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;background:#fff}.metric small{display:block;color:#64748b}.metric b{display:block;font-size:22px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}th{background:#e2e8f0}.right{text-align:right}.footer{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>تقرير البرنامج الميداني للمساجد والمصليات</h1><div>تم تطبيق معايير البحث والتصفية الظاهرة في المنصة قبل إنشاء التقرير.</div></div><div class="metrics"><div class="metric"><small>إجمالي المواقع</small><b>${summary.totalSites}</b></div><div class="metric"><small>تمت زيارتها</small><b>${summary.visitedSites}</b></div><div class="metric"><small>نسبة التغطية</small><b>${summary.coveragePercent}%</b></div><div class="metric"><small>الملاحظات المفتوحة</small><b>${summary.openItems}</b></div><div class="metric"><small>العاجلة</small><b>${summary.urgentItems}</b></div><div class="metric"><small>المتأخرة</small><b>${summary.overdueItems}</b></div></div><table><thead><tr><th>م</th><th>رقم الزيارة</th><th>المسجد / المصلى</th><th>النوع</th><th>التاريخ</th><th>الحالة العامة</th><th>مفتوحة</th><th>عاجلة</th><th>حالة الزيارة</th></tr></thead><tbody>${rows || '<tr><td colspan="9">لا توجد زيارات مطابقة</td></tr>'}</tbody></table><div class="footer"><span>منصة IAU Deeds — البرنامج الميداني</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    report.document.close();
  };

  const printImageCount = printTarget ? [
    ...(printTarget.attachments || []).filter((attachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''))),
    ...printTarget.items.flatMap((item) => [...(item.beforeImages || []), ...(item.afterImages || [])]),
  ].length : 0;
  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;

  if (loading) return <div className="flex min-h-[320px] items-center justify-center gap-3"><Loader2 className="h-7 w-7 animate-spin text-sky-700" /><span className="font-semibold">جاري تحميل البرنامج الميداني...</span></div>;

  return <div className="space-y-5" dir="rtl">
    <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-l from-emerald-50 via-white to-sky-50">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <div><CardTitle className="flex items-center gap-2 text-xl"><Route className="h-5 w-5 text-emerald-700" />البرنامج الميداني للمساجد والمصليات</CardTitle><CardDescription className="mt-2">الجولات والزيارات مرتبطة مباشرة بالسجلات الحالية للمساجد والمصليات، مع متابعة الملاحظات والصور قبل المعالجة وبعدها.</CardDescription></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
          {canPrint && <Button variant="outline" onClick={printProgramReport}><Printer className="ml-2 h-4 w-4" />تقرير البرنامج</Button>}
          {canAdd && <Button variant="outline" className="border-emerald-300 text-emerald-800" onClick={openTour}><CalendarDays className="ml-2 h-4 w-4" />إنشاء جولة</Button>}
          {canAdd && <Button className="bg-sky-700 hover:bg-sky-800" onClick={() => openNewVisit()}><Plus className="ml-2 h-4 w-4" />زيارة مستقلة</Button>}
        </div>
      </CardHeader>
    </Card>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
      <Metric label="إجمالي المواقع" value={summary.totalSites} icon={MapPin} />
      <Metric label="تمت زيارتها" value={summary.visitedSites} icon={CheckCircle2} tone="green" />
      <Metric label="المتبقية" value={summary.remainingSites} icon={CalendarDays} tone="blue" />
      <Metric label="نسبة التغطية" value={`${summary.coveragePercent}%`} icon={Route} tone="green" />
      <Metric label="إجمالي الزيارات" value={summary.visits} icon={ClipboardList} />
      <Metric label="ملاحظات مفتوحة" value={summary.openItems} icon={FileText} tone="amber" />
      <Metric label="عاجلة" value={summary.urgentItems} icon={AlertTriangle} tone="red" />
      <Metric label="متأخرة" value={summary.overdueItems} icon={AlertTriangle} tone="amber" />
    </div>

    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-xl border bg-slate-50 p-1">
            <Button size="sm" variant={view === 'visits' ? 'default' : 'ghost'} onClick={() => setView('visits')}>الزيارات</Button>
            <Button size="sm" variant={view === 'tours' ? 'default' : 'ghost'} onClick={() => setView('tours')}>الجولات</Button>
          </div>
          {view === 'visits' && <div className="grid flex-1 gap-2 sm:grid-cols-3 md:max-w-4xl">
            <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم الزيارة أو الموقع" /></div>
            <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
            <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع الحالات</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
          </div>}
        </div>
        <div className="mt-4"><Progress value={summary.coveragePercent} className="h-2.5" /></div>
      </CardContent>
    </Card>

    {view === 'visits' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredVisits.map((visit) => <Card key={visit.id} className="overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-l from-slate-50 to-white pb-4">
          <div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{visit.site.name}</CardTitle><CardDescription className="mt-1">{visit.visitNumber}</CardDescription></div><StatusBadge status={visit.workflowStatus} /></div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm">
          <InfoLine label="نوع الزيارة" value={visitTypeLabels[visit.visitType]} />
          <InfoLine label="التاريخ" value={new Date(visit.visitDate).toLocaleString('ar-SA-u-ca-gregory')} />
          <InfoLine label="الموقع" value={visit.site.campusLocation || [visit.site.city, visit.site.district].filter(Boolean).join(' - ') || '-'} />
          <InfoLine label="الحالة العامة" value={overallLabels[visit.overallStatus]} />
          <div className="flex flex-wrap gap-2"><Badge variant="outline">{visit.items.length} بند فحص</Badge><Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">{visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length} ملاحظة مفتوحة</Badge>{visit.attachments?.length > 0 && <Badge variant="outline" className="gap-1 border-sky-200 bg-sky-50 text-sky-700"><Paperclip className="h-3 w-3" />{visit.attachments.length} مرفق</Badge>}{visit.items.some((item) => item.priority === 'urgent' && !['resolved', 'closed'].includes(item.resolutionStatus)) && <Badge className="bg-red-600">عاجل</Badge>}</div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
            <Button size="sm" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50" onClick={() => setViewingVisit(visit)}><Eye className="ml-1 h-4 w-4" />عرض</Button>
            {canPrint && <Button size="sm" variant="outline" onClick={() => requestVisitPrint(visit)}><Printer className="ml-1 h-4 w-4" />تقرير</Button>}
            {canEdit && <Button size="sm" onClick={() => openVisit(visit)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button>}
            {canDelete && <Button size="sm" variant="destructive" className="!border-red-700 !bg-red-600 !text-white shadow-sm hover:!bg-red-700 hover:!text-white" onClick={() => setDeletingVisit(visit)}><Trash2 className="ml-1 h-4 w-4 text-white" />حذف</Button>}
          </div>
        </CardContent>
      </Card>)}
      {!filteredVisits.length && <Empty message="لا توجد زيارات مطابقة للبحث" />}
    </div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tours.map((tour) => <Card key={tour.id} className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-l from-emerald-50/70 to-white"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{tour.title}</CardTitle><CardDescription className="mt-1">{tour.tourNumber}</CardDescription></div><Badge variant="outline">{tourStatusLabels[tour.status]}</Badge></div></CardHeader>
        <CardContent className="space-y-3 pt-4 text-sm"><InfoLine label="التاريخ" value={new Date(tour.scheduledDate).toLocaleDateString('ar-SA-u-ca-gregory')} /><InfoLine label="الفريق" value={(tour.teamMembers || []).join('، ')} /><InfoLine label="النطاق" value={tour.scope || '-'} /><div className="rounded-xl border bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="font-bold">المواقع المجدولة</span><Badge>{tour.visits?.length || 0}</Badge></div><div className="max-h-36 space-y-1 overflow-y-auto">{tour.visits?.map((visit) => <button key={visit.id} type="button" className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-1.5 text-right hover:bg-sky-50" onClick={() => { const full = visits.find((item) => item.id === visit.id); if (full) openVisit(full); }}><span>{visit.site.name}</span><span className="text-xs text-slate-500">{visitStatusLabels[visit.workflowStatus]}</span></button>)}</div></div>{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}</CardContent>
      </Card>)}
      {!tours.length && <Empty message="لم يتم إنشاء جولات ميدانية بعد" />}
    </div>}

    <Dialog open={Boolean(printTarget)} onOpenChange={(open) => { if (!open && !preparingPrint) setPrintTarget(null); }}>
      <DialogContent className="sm:max-w-[620px]" dir="rtl">
        {printTarget && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-sky-700" />خيارات طباعة التقرير</DialogTitle>
            <DialogDescription>اختر ما إذا كنت تريد إدراج الصور داخل تقرير الزيارة {printTarget.visitNumber}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${includePrintImages ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
              <input type="radio" name="visit-print-images" className="mt-1 h-4 w-4 accent-sky-700" checked={includePrintImages} onChange={() => setIncludePrintImages(true)} />
              <Camera className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
              <span><b className="block text-sm text-slate-800">طباعة التقرير مع الصور</b><small className="mt-1 block text-slate-500">إدراج {printImageCount} صورة من مرفقات الزيارة وصور قبل/بعد المعالجة في صفحات مستقلة.</small></span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${!includePrintImages ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <input type="radio" name="visit-print-images" className="mt-1 h-4 w-4 accent-slate-700" checked={!includePrintImages} onChange={() => setIncludePrintImages(false)} />
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
              <span><b className="block text-sm text-slate-800">طباعة التقرير بدون الصور</b><small className="mt-1 block text-slate-500">طباعة البيانات وقائمة الفحص والملاحظات فقط لتقليل عدد الصفحات.</small></span>
            </label>
          </div>
          {printPdfCount > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">يوجد {printPdfCount} ملف PDF؛ ستظهر أسماؤها في التقرير ويمكن فتح كل ملف وطباعته بصورة مستقلة.</div>}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setPrintTarget(null)} disabled={preparingPrint}>إلغاء</Button><Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => void confirmVisitPrint()} disabled={preparingPrint}>{preparingPrint ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{preparingPrint ? 'جاري إعداد التقرير...' : 'متابعة إلى الطباعة'}</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={tourDialog} onOpenChange={setTourDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-emerald-700" />إنشاء جولة ميدانية</DialogTitle><DialogDescription>اختر المواقع المسجلة حاليًا؛ ستُنشأ زيارة مجدولة مستقلة لكل مسجد أو مصلى داخل الجولة.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2"><Field label="عنوان الجولة *"><Input value={tourForm.title} onChange={(event) => setTourForm({ ...tourForm, title: event.target.value })} /></Field><Field label="تاريخ الجولة *"><Input type="date" value={tourForm.scheduledDate} onChange={(event) => setTourForm({ ...tourForm, scheduledDate: event.target.value })} /></Field><div className="md:col-span-2"><Field label="أعضاء الفريق *"><Textarea rows={2} value={tourForm.teamMembers} onChange={(event) => setTourForm({ ...tourForm, teamMembers: event.target.value })} placeholder="افصل بين الأسماء بفاصلة" /></Field></div><div className="md:col-span-2"><Field label="نطاق الجولة"><Input value={tourForm.scope} onChange={(event) => setTourForm({ ...tourForm, scope: event.target.value })} placeholder="مثال: الحرم الجامعي الشرقي - مباني الكليات الصحية" /></Field></div></div>
        <div className="rounded-2xl border bg-slate-50 p-4"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">المساجد والمصليات المشمولة</p><p className="text-xs text-slate-500">تم اختيار {tourForm.siteIds.length} موقع</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setTourForm({ ...tourForm, siteIds: filteredTourSites.map((site) => site.id) })}>تحديد الظاهر</Button><Button size="sm" variant="outline" onClick={() => setTourForm({ ...tourForm, siteIds: [] })}>إلغاء التحديد</Button></div></div><div className="relative mb-3"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={tourSearch} onChange={(event) => setTourSearch(event.target.value)} placeholder="ابحث عن موقع" /></div><div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{filteredTourSites.map((site) => { const checked = tourForm.siteIds.includes(site.id); return <label key={site.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}><input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700" checked={checked} onChange={() => setTourForm((current) => ({ ...current, siteIds: checked ? current.siteIds.filter((id) => id !== site.id) : [...current.siteIds, site.id] }))} /><span><b className="block text-sm">{site.name}</b><small className="text-slate-500">{site.campusLocation || [site.city, site.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}</small></span></label>; })}</div></div>
        <Field label="ملاحظات الجولة"><Textarea rows={3} value={tourForm.notes} onChange={(event) => setTourForm({ ...tourForm, notes: event.target.value })} /></Field>
        <DialogFooter><Button variant="outline" onClick={() => setTourDialog(false)}>إلغاء</Button><Button onClick={() => void saveTour()} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ وجدولة الزيارات</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(viewingVisit)} onOpenChange={(open) => { if (!open) setViewingVisit(null); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[980px]" dir="rtl">
        {viewingVisit && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-sky-700" />تفاصيل الزيارة {viewingVisit.visitNumber}</DialogTitle>
            <DialogDescription>عرض كامل لسجل الزيارة الميدانية دون تعديل البيانات.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-2xl border bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoBox label="المسجد أو المصلى" value={viewingVisit.site.name} />
            <InfoBox label="نوع الزيارة" value={visitTypeLabels[viewingVisit.visitType]} />
            <InfoBox label="حالة الزيارة" value={visitStatusLabels[viewingVisit.workflowStatus]} />
            <InfoBox label="تاريخ الوصول" value={new Date(viewingVisit.visitDate).toLocaleString('ar-SA-u-ca-gregory')} />
            <InfoBox label="وقت المغادرة" value={viewingVisit.departureAt ? new Date(viewingVisit.departureAt).toLocaleString('ar-SA-u-ca-gregory') : '-'} />
            <InfoBox label="الحالة العامة" value={overallLabels[viewingVisit.overallStatus]} />
            <InfoBox label="الأولوية" value={priorityLabels[viewingVisit.priority]} />
            <InfoBox label="ممثل الموقع" value={viewingVisit.representativeName || '-'} />
            <InfoBox label="الفريق الميداني" value={(viewingVisit.teamMembers || []).join('، ') || '-'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnlyNote label="الملاحظات العامة" value={viewingVisit.generalNotes} />
            <ReadOnlyNote label="التوصيات" value={viewingVisit.recommendations} />
          </div>
          <VisitAttachmentGallery label="مرفقات الزيارة" attachments={viewingVisit.attachments || []} />
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-black text-slate-800">نتائج قائمة الفحص</h3><Badge variant="outline">{viewingVisit.items.length} بند</Badge></div>
            {viewingVisit.items.map((item, index) => <Card key={item.id || `${item.category}-${item.title}-${index}`} className={item.status === 'needs_action' ? 'border-amber-300 bg-amber-50/30' : ''}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div><Badge variant="outline" className="mb-1">{item.category}</Badge><p className="font-bold text-slate-800">{item.title}</p></div>
                  <div className="flex flex-wrap gap-2"><Badge variant="outline">{itemStatusLabels[item.status]}</Badge><Badge variant="outline">{priorityLabels[item.priority]}</Badge></div>
                </div>
                {item.note && <ReadOnlyNote label="الملاحظة" value={item.note} />}
                {item.status === 'needs_action' && <div className="grid gap-2 border-t border-amber-200 pt-3 sm:grid-cols-3"><InfoBox label="الجهة المسؤولة" value={item.responsibleEntity || '-'} /><InfoBox label="المهلة" value={item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA-u-ca-gregory') : '-'} /><InfoBox label="حالة المعالجة" value={resolutionLabels[item.resolutionStatus]} /></div>}
                {item.resolutionNote && <ReadOnlyNote label="ملاحظة المعالجة" value={item.resolutionNote} />}
                {(item.beforeImages.length > 0 || item.afterImages.length > 0) && <div className="grid gap-3 border-t pt-3 sm:grid-cols-2"><VisitImages label="صور قبل المعالجة" images={item.beforeImages} /><VisitImages label="صور بعد المعالجة" images={item.afterImages} /></div>}
              </CardContent>
            </Card>)}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewingVisit(null)}>إغلاق</Button>
            {canPrint && <Button variant="outline" onClick={() => requestVisitPrint(viewingVisit)}><Printer className="ml-2 h-4 w-4" />طباعة التقرير</Button>}
            {canEdit && <Button onClick={() => { const visit = viewingVisit; setViewingVisit(null); openVisit(visit); }}><Pencil className="ml-2 h-4 w-4" />تعديل الزيارة</Button>}
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(deletingVisit)} onOpenChange={(open) => { if (!open && !deleting) setDeletingVisit(null); }}>
      <DialogContent className="sm:max-w-[520px]" dir="rtl">
        {deletingVisit && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-red-700"><Trash2 className="h-5 w-5" />حذف الزيارة الميدانية</DialogTitle>
            <DialogDescription>سيتم حذف الزيارة {deletingVisit.visitNumber} الخاصة بـ {deletingVisit.site.name} مع جميع بنود الفحص والصور المرتبطة بسجلها.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">هذا الإجراء نهائي ولا يمكن التراجع عنه.</div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDeletingVisit(null)} disabled={deleting}>إلغاء</Button><Button variant="destructive" className="!border-red-700 !bg-red-600 !text-white shadow-sm hover:!bg-red-700 hover:!text-white disabled:opacity-70" onClick={() => void deleteVisit()} disabled={deleting}>{deleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin text-white" /> : <Trash2 className="ml-2 h-4 w-4 text-white" />}تأكيد الحذف</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={visitDialog} onOpenChange={setVisitDialog}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[1120px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-sky-700" />{editingVisit ? `توثيق الزيارة ${editingVisit.visitNumber}` : 'إنشاء زيارة ميدانية'}</DialogTitle><DialogDescription>تُحفظ الزيارة في السجل التاريخي للمسجد أو المصلى المحدد، وتنتقل الملاحظات المفتوحة إلى المتابعة.</DialogDescription></DialogHeader>
        <div className="grid gap-4 rounded-2xl border bg-slate-50/70 p-4 md:grid-cols-3"><Field label="المسجد أو المصلى *"><NativeSelect value={visitForm.siteId} onChange={(event) => setVisitForm({ ...visitForm, siteId: event.target.value })} disabled={Boolean(editingVisit?.tourId)}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {site.campusLocation || site.city || ''}</option>)}</NativeSelect></Field><Field label="نوع الزيارة"><NativeSelect value={visitForm.visitType} onChange={(event) => setVisitForm({ ...visitForm, visitType: event.target.value as MosqueFieldVisit['visitType'] })}>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label="تاريخ ووقت الوصول *"><Input type="datetime-local" value={visitForm.visitDate} onChange={(event) => setVisitForm({ ...visitForm, visitDate: event.target.value })} /></Field><Field label="وقت المغادرة"><Input type="datetime-local" value={visitForm.departureAt} onChange={(event) => setVisitForm({ ...visitForm, departureAt: event.target.value })} /></Field><Field label="ممثل الموقع"><Input value={visitForm.representativeName} onChange={(event) => setVisitForm({ ...visitForm, representativeName: event.target.value })} /></Field><Field label="حالة سجل الزيارة"><NativeSelect value={visitForm.workflowStatus} onChange={(event) => setVisitForm({ ...visitForm, workflowStatus: event.target.value as MosqueFieldVisit['workflowStatus'] })}>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><div className="md:col-span-3"><Field label="أعضاء الفريق *"><Textarea rows={2} value={visitForm.teamMembers} onChange={(event) => setVisitForm({ ...visitForm, teamMembers: event.target.value })} /></Field></div><Field label="الحالة العامة"><NativeSelect value={visitForm.overallStatus} onChange={(event) => setVisitForm({ ...visitForm, overallStatus: event.target.value as MosqueFieldVisit['overallStatus'] })}>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label="الأولوية العامة"><NativeSelect value={visitForm.priority} onChange={(event) => setVisitForm({ ...visitForm, priority: event.target.value as MosqueFieldVisit['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field></div>
        <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-black">قائمة الفحص الميداني</h3><p className="text-xs text-slate-500">أكمل جميع البنود قبل اعتماد الزيارة كمكتملة.</p></div><Badge variant="outline">{visitForm.items.filter((item) => item.status !== 'not_checked').length} / {visitForm.items.length}</Badge></div>{visitForm.items.map((item, index) => <Card key={`${item.category}-${item.title}-${index}`} className={item.status === 'needs_action' ? 'border-amber-300 bg-amber-50/30' : ''}><CardContent className="space-y-3 pt-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><Badge variant="outline" className="mb-1">{item.category}</Badge><p className="font-bold text-slate-800">{item.title}</p></div><NativeSelect className="lg:w-44" value={item.status} onChange={(event) => setVisitItem(index, { status: event.target.value as MosqueFieldVisitItem['status'] })}>{Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect><NativeSelect className="lg:w-36" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>{item.status === 'needs_action' && <div className="grid gap-3 border-t border-amber-200 pt-3 md:grid-cols-2"><div className="md:col-span-2"><Field label="وصف الملاحظة *"><Textarea rows={2} value={item.note || ''} onChange={(event) => setVisitItem(index, { note: event.target.value })} /></Field></div><Field label="الجهة المسؤولة"><Input value={item.responsibleEntity || ''} onChange={(event) => setVisitItem(index, { responsibleEntity: event.target.value })} placeholder="مثال: إدارة التشغيل والصيانة" /></Field><Field label="المهلة المستهدفة"><Input type="date" value={dateOnly(item.dueDate)} onChange={(event) => setVisitItem(index, { dueDate: event.target.value })} /></Field><Field label="حالة المعالجة"><NativeSelect value={item.resolutionStatus} onChange={(event) => setVisitItem(index, { resolutionStatus: event.target.value as MosqueFieldVisitItem['resolutionStatus'] })}>{Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label="ملاحظة المعالجة"><Input value={item.resolutionNote || ''} onChange={(event) => setVisitItem(index, { resolutionNote: event.target.value })} /></Field><ImageField label="صور قبل المعالجة" images={item.beforeImages} loading={uploadingKey === `${index}-beforeImages`} onFiles={(files) => void uploadItemImages(index, 'beforeImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'beforeImages', imageIndex)} /><ImageField label="صور بعد المعالجة" images={item.afterImages} loading={uploadingKey === `${index}-afterImages`} onFiles={(files) => void uploadItemImages(index, 'afterImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'afterImages', imageIndex)} /></div>}</CardContent></Card>)}</div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="الملاحظات العامة"><Textarea rows={4} value={visitForm.generalNotes} onChange={(event) => setVisitForm({ ...visitForm, generalNotes: event.target.value })} /></Field><Field label="التوصيات"><Textarea rows={4} value={visitForm.recommendations} onChange={(event) => setVisitForm({ ...visitForm, recommendations: event.target.value })} /></Field></div>
        <VisitAttachmentField attachments={visitForm.attachments} loading={uploadingKey === 'visit-attachments'} onFiles={(files) => void uploadVisitAttachments(files)} onRemove={removeVisitAttachment} onDescriptionChange={updateVisitAttachmentDescription} />
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setVisitDialog(false)}>إلغاء</Button>{editingVisit && canPrint && <Button variant="outline" onClick={() => requestVisitPrint({ ...editingVisit, ...visitForm, teamMembers: splitMembers(visitForm.teamMembers), visitDate: new Date(visitForm.visitDate).toISOString(), departureAt: visitForm.departureAt ? new Date(visitForm.departureAt).toISOString() : null } as MosqueFieldVisit)}><Printer className="ml-2 h-4 w-4" />طباعة</Button>}<Button onClick={() => void saveVisit()} disabled={saving || Boolean(uploadingKey)}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}{editingVisit ? 'حفظ نتائج الزيارة' : 'إنشاء الزيارة'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <div><Label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</Label>{children}</div>;
const InfoLine: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="flex items-start justify-between gap-3"><span className="text-slate-500">{label}</span><b className="text-left text-slate-800">{value || '-'}</b></div>;
const InfoBox: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="rounded-xl border bg-white p-3"><span className="block text-[11px] font-semibold text-slate-500">{label}</span><b className="mt-1 block text-sm text-slate-800">{value || '-'}</b></div>;
const ReadOnlyNote: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => <div className="rounded-xl border bg-white p-3"><span className="block text-[11px] font-semibold text-slate-500">{label}</span><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || '-'}</p></div>;
const AttachmentPreview: React.FC<{
  attachment: MosqueFieldVisitAttachment;
  className?: string;
}> = ({ attachment, className = 'h-full w-full' }) => {
  const [previewUrl, setPreviewUrl] = React.useState(attachment.fileId ? '' : attachment.url);
  const [failed, setFailed] = React.useState(false);
  const isPdf = attachment.mimeType === 'application/pdf' || String(attachment.fileName || '').toLowerCase().endsWith('.pdf');

  React.useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);
    if (!attachment.fileId) {
      setPreviewUrl(attachment.url);
      return () => { active = false; };
    }
    setPreviewUrl('');
    void mosqueApi.mediaBlob(attachment.fileId).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.fileId, attachment.url]);

  if (failed) return <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-500 ${className}`}>{isPdf ? <FileText className="h-9 w-9 text-red-600" /> : <ImageIcon className="h-9 w-9 text-sky-600" />}<span className="mt-1 text-[10px] font-semibold">تعذرت المعاينة</span></div>;
  if (!previewUrl) return <div className={`flex items-center justify-center bg-slate-100 ${className}`}><Loader2 className="h-6 w-6 animate-spin text-sky-700" /></div>;
  if (isPdf) return <iframe src={`${previewUrl}#page=1&toolbar=0&navpanes=0&view=FitH`} title={attachment.description || 'معاينة ملف PDF'} className={`pointer-events-none border-0 bg-white ${className}`} />;
  return <img src={previewUrl} alt={attachment.description || 'صورة مرفقة'} className={`object-cover ${className}`} onError={() => setFailed(true)} />;
};
const VisitImages: React.FC<{ label: string; images: MosqueFieldVisitImage[] }> = ({ label, images }) => <div><p className="mb-2 text-xs font-bold text-slate-600">{label} ({images.length})</p><div className="flex flex-wrap gap-2">{images.length ? images.map((image, index) => <a key={`${image.url}-${index}`} href={image.url} target="_blank" rel="noreferrer" className="block h-20 w-24 overflow-hidden rounded-lg border bg-white shadow-sm"><AttachmentPreview attachment={image} /></a>) : <span className="text-xs text-slate-400">لا توجد صور</span>}</div></div>;
const attachmentSize = (size?: number | null) => {
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} كيلوبايت`;
  return `${(size / (1024 * 1024)).toFixed(1)} ميجابايت`;
};
const VisitAttachmentGallery: React.FC<{
  label: string;
  attachments: MosqueFieldVisitAttachment[];
  onRemove?: (index: number) => void;
  onDescriptionChange?: (index: number, description: string) => void;
}> = ({ label, attachments, onRemove, onDescriptionChange }) => <div className="rounded-2xl border bg-slate-50/70 p-4">
  <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-sky-700" /><h3 className="font-black text-slate-800">{label}</h3></div><Badge variant="outline">{attachments.length}</Badge></div>
  {attachments.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map((attachment, index) => {
    const isImage = String(attachment.mimeType || '').startsWith('image/');
    const hasDescription = Boolean(String(attachment.description || '').trim());
    return <div key={`${attachment.url}-${index}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${onDescriptionChange && !hasDescription ? 'border-amber-400' : ''}`}>
      <a href={attachment.url} target="_blank" rel="noreferrer" className="flex h-28 items-center justify-center bg-slate-100">
        {isImage || attachment.mimeType === 'application/pdf' ? <AttachmentPreview attachment={attachment} /> : <div className="text-center text-red-600"><FileText className="mx-auto h-10 w-10" /><span className="mt-1 block text-xs font-black">PDF</span></div>}
      </a>
      <div className="space-y-2 p-2.5">{onDescriptionChange ? <div><Label className="mb-1 block text-[11px] font-bold text-slate-600">وصف المرفق *</Label><Input value={attachment.description || ''} onChange={(event) => onDescriptionChange(index, event.target.value)} maxLength={500} placeholder="مثال: صورة المقاعد التي تحتاج استبدال" className={`h-9 text-xs ${hasDescription ? '' : 'border-amber-400 focus-visible:ring-amber-400'}`} /></div> : <b className="block text-sm text-slate-800">{attachment.description || `مرفق ${index + 1}`}</b>}<div className="flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{attachment.mimeType === 'application/pdf' ? 'ملف PDF' : 'صورة'}{attachmentSize(attachment.fileSize) ? ` — ${attachmentSize(attachment.fileSize)}` : ''}</span>{onRemove && <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onRemove(index)} aria-label={`حذف ${attachment.description || 'المرفق'}`}><Trash2 className="h-4 w-4" /></Button>}</div></div>
    </div>;
  })}</div> : <div className="rounded-xl border border-dashed bg-white p-5 text-center text-sm text-slate-400">لا توجد مرفقات مرفوعة</div>}
</div>;
const VisitAttachmentField: React.FC<{
  attachments: MosqueFieldVisitAttachment[];
  loading: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  onDescriptionChange: (index: number, description: string) => void;
}> = ({ attachments, loading, onFiles, onRemove, onDescriptionChange }) => <div className="space-y-3">
  <label className={`flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-sky-300 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/70'}`}>
    {loading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-sky-700" /> : <Upload className="mb-2 h-6 w-6 text-sky-700" />}
    <b className="text-sm text-slate-800">{loading ? 'جاري رفع المرفقات...' : 'رفع صور أو ملفات PDF'}</b>
    <span className="mt-1 text-xs text-slate-500">يمكن اختيار عدة ملفات دفعة واحدة — وبعد الرفع اكتب وصفًا واضحًا لكل مرفق</span>
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
  </label>
  <VisitAttachmentGallery label="المرفقات المضافة" attachments={attachments} onRemove={onRemove} onDescriptionChange={onDescriptionChange} />
</div>;
const Metric: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone?: 'green' | 'blue' | 'amber' | 'red' }> = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const tones = { green: 'border-emerald-200 bg-emerald-50 text-emerald-700', blue: 'border-sky-200 bg-sky-50 text-sky-700', amber: 'border-amber-200 bg-amber-50 text-amber-700', red: 'border-red-200 bg-red-50 text-red-700' };
  return <Card className={`${tones[tone]} shadow-sm`}><CardContent className="p-3 sm:p-4"><Icon className="h-4 w-4 opacity-80" /><p className="mt-2 text-[11px] font-semibold">{label}</p><p className="mt-1 text-xl font-black sm:text-2xl">{value}</p></CardContent></Card>;
};
const StatusBadge: React.FC<{ status: string }> = ({ status }) => <Badge variant="outline" className={status === 'closed' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : status === 'follow_up' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sky-300 bg-sky-50 text-sky-700'}>{visitStatusLabels[status] || status}</Badge>;
const Empty: React.FC<{ message: string }> = ({ message }) => <Card className="md:col-span-2 xl:col-span-3"><CardContent className="flex min-h-40 flex-col items-center justify-center text-center text-slate-500"><ClipboardList className="mb-3 h-8 w-8 opacity-50" /><p>{message}</p></CardContent></Card>;

const ImageField: React.FC<{
  label: string;
  images: MosqueFieldVisitImage[];
  loading: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}> = ({ label, images, loading, onFiles, onRemove }) => <div className="rounded-xl border bg-white p-3"><div className="mb-2 flex items-center justify-between"><Label className="text-xs font-bold">{label}</Label><Badge variant="outline">{images.length}</Badge></div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}{loading ? 'جاري الرفع...' : 'التقاط / اختيار صور'}<input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} /></label>{images.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{images.map((image, index) => <span key={`${image.url}-${index}`} className="flex items-center gap-1 rounded-lg border bg-slate-50 px-2 py-1 text-[11px]"><a href={image.url} target="_blank" rel="noreferrer" className="max-w-28 truncate text-sky-700">{image.fileName || `صورة ${index + 1}`}</a><button type="button" className="text-red-500" onClick={() => onRemove(index)}>×</button></span>)}</div>}</div>;
