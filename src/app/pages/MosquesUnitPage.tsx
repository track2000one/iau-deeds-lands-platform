import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MapPin,
  MessageSquare,
  Plus,
  Pencil,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  mosqueApi,
  type MosqueAssignment,
  type MosqueDashboard,
  type MosqueJobApplication,
  type MosqueLeave,
  type MosqueModuleRole,
  type MosqueNotification,
  type MosquePersonnel,
  type MosqueQuranInventory,
  type MosqueQuranInventoryOverviewItem,
  type MosqueQuranInventorySummary,
  type MosqueRequest,
  type MosqueSite,
  type MosqueSiteMediaLibrary,
  type MosqueStaffUser,
  type MosqueTicket,
  type MosqueWorkflowHistoryEntry,
  type MosqueWorkflowKind,
} from '../api/mosques';

const roleLabels: Record<MosqueModuleRole, string> = {
  head: 'رئيس الوحدة',
  supervisor: 'مشرف الوحدة',
  personnel: 'منسوب المسجد أو المصلى',
  university_member: 'منسوب الجامعة',
  viewer: 'منسوب الجامعة',
};

const personnelRoleLabels: Record<string, string> = { imam: 'إمام', muezzin: 'مؤذن', khateeb: 'خطيب', collaborating_khateeb: 'خطيب متعاون', collaborator: 'خطيب متعاون' };
const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى' };
const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };
const prayerRoomGenderLabels: Record<string, string> = { men: 'رجال', women: 'نساء' };
const siteTypeDisplayLabel = (site: Pick<MosqueSite, 'siteType' | 'prayerRoomGender'>) =>
  site.siteType === 'prayer_room' && site.prayerRoomGender
    ? `مصلى ${prayerRoomGenderLabels[site.prayerRoomGender] || site.prayerRoomGender}`
    : siteTypeLabels[site.siteType] || site.siteType;


type SitePrintColumnKey = 'name' | 'type' | 'building' | 'location' | 'cityDistrict' | 'area' | 'capacity' | 'imam' | 'muezzin' | 'khateeb' | 'contactPhone' | 'coordinates' | 'status' | 'notes';
const SITE_PRINT_COLUMNS: Array<{ key: SitePrintColumnKey; label: string }> = [
  { key: 'name', label: 'الاسم' },
  { key: 'type', label: 'النوع' },
  { key: 'building', label: 'رقم المبنى' },
  { key: 'location', label: 'الموقع داخل الجامعة' },
  { key: 'cityDistrict', label: 'المدينة / الحي' },
  { key: 'area', label: 'المساحة' },
  { key: 'capacity', label: 'الطاقة الاستيعابية' },
  { key: 'imam', label: 'الإمام' },
  { key: 'muezzin', label: 'المؤذن' },
  { key: 'khateeb', label: 'الخطيب' },
  { key: 'contactPhone', label: 'رقم التواصل' },
  { key: 'coordinates', label: 'الإحداثيات' },
  { key: 'status', label: 'الحالة' },
  { key: 'notes', label: 'الملاحظات' },
];
const DEFAULT_SITE_PRINT_COLUMNS: SitePrintColumnKey[] = ['name', 'type', 'building', 'location', 'cityDistrict', 'area', 'imam', 'muezzin', 'status'];

const SITE_PRINT_FONT_MIN = 5;
const SITE_PRINT_FONT_MAX = 14;
const SITE_PRINT_FONT_DEFAULT = 7.2;
type SitePrintWidthMode = 'smart' | 'compact' | 'equal';
type SitePrintWrapMode = 'wrap' | 'single';
type SitePrintOrientation = 'auto' | 'landscape' | 'portrait';
const requestTypeLabels: Record<string, string> = {
  maintenance: 'صيانة', renovation: 'ترميم', equipment: 'تجهيزات', cleaning: 'نظافة', carpet: 'فرش',
  air_conditioning: 'مكيفات', audio: 'أجهزة صوت', lighting: 'إنارة', other: 'أخرى',
};
const ticketTypeLabels: Record<string, string> = {
  cleaning: 'مشكلة نظافة', electrical: 'عطل كهرباء', air_conditioning: 'عطل مكيف', audio: 'مشكلة صوتيات',
  supplies: 'نقص مستلزمات', general: 'ملاحظة عامة', complaint: 'شكوى', other: 'أخرى',
};
const leaveTypeLabels: Record<string, string> = { leave: 'إجازة', apology: 'اعتذار', temporary_absence: 'غياب مؤقت' };
const priorityLabels: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const statusLabels: Record<string, string> = {
  new: 'جديد', pending: 'جديد', under_review: 'تحت المراجعة', approved: 'معتمد', returned_for_edit: 'معاد للتعديل',
  rejected: 'مرفوض', assigned: 'مسند', in_progress: 'قيد التنفيذ', completed: 'مكتمل', resolved: 'تم الحل', closed: 'مغلق',
  shortlisted: 'مرشح مبدئيًا', interview: 'مقابلة', accepted: 'مقبول', archived: 'مؤرشف',
};

const requestTransitions: Record<string, string[]> = {
  new: ['under_review', 'returned_for_edit', 'rejected'], under_review: ['approved', 'returned_for_edit', 'rejected'],
  returned_for_edit: ['new'], approved: ['in_progress'], in_progress: ['completed'], completed: ['closed', 'in_progress'],
};
const ticketTransitions: Record<string, string[]> = {
  new: ['under_review', 'assigned', 'rejected'], under_review: ['assigned', 'in_progress', 'rejected'],
  assigned: ['in_progress', 'rejected'], in_progress: ['resolved'], resolved: ['closed', 'in_progress'],
};
const leaveTransitions: Record<string, string[]> = {
  pending: ['under_review', 'approved', 'returned_for_edit', 'rejected'], under_review: ['approved', 'returned_for_edit', 'rejected'], returned_for_edit: ['pending'],
};
const jobTransitions: Record<string, string[]> = {
  new: ['under_review', 'rejected'], under_review: ['shortlisted', 'rejected'], shortlisted: ['interview', 'rejected'],
  interview: ['accepted', 'rejected'], accepted: ['archived'], rejected: ['archived'],
};

const statusBadgeClass = (status: string) => {
  if (['approved', 'completed', 'resolved', 'accepted', 'closed'].includes(status)) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (['rejected'].includes(status)) return 'border-red-300 bg-red-50 text-red-700';
  if (['urgent', 'returned_for_edit'].includes(status)) return 'border-amber-300 bg-amber-50 text-amber-700';
  return 'border-sky-300 bg-sky-50 text-sky-700';
};

const card3d = 'border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_6px_0_rgba(51,65,85,0.10),0_13px_26px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,1)]';
const button3d = 'shadow-[0_4px_0_rgba(71,85,105,0.13),0_7px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(71,85,105,0.12)]';

const emptySite = {
  name: '', siteType: 'mosque', prayerRoomGender: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',
  status: 'active', imamName: '', muezzinName: '', khateebName: '', contactPhone: '', supervisorUserId: '', notes: '',
};
const emptyRequest = { siteId: '', requestType: 'maintenance', priority: 'medium', description: '', notes: '', file: null as File | null };
const emptyLeave = { siteId: '', requestType: 'leave', startDate: '', endDate: '', reason: '', replacementName: '', notes: '' };

const emptyQuranInventoryForm = () => ({
  siteId: '',
  largeCount: '0',
  mediumCount: '0',
  smallCount: '0',
  damagedCount: '0',
  neededCount: '0',
  countedAt: new Date().toISOString().slice(0, 10),
  notes: '',
});
const emptyQuranSummary: MosqueQuranInventorySummary = { sites: 0, countedSites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0 };

type PendingSiteMedia = { file: File; kind: 'site_image' | 'mosque_image' | 'document' };

const emptySiteMedia = (): MosqueSiteMediaLibrary => ({ photos: [], documents: [] });
const normalizeSiteMedia = (value: MosqueSite['images']): MosqueSiteMediaLibrary => {
  if (Array.isArray(value)) return { photos: value.map((url) => ({ url, category: 'mosque_image' as const })), documents: [] };
  return { photos: value?.photos || [], documents: value?.documents || [] };
};
const drivePreviewUrl = (url: string) => {
  const id = String(url || '').match(/drive\.google\.com\/file\/d\/([^/?#]+)/i)?.[1] || String(url || '').match(/[?&]id=([^&#]+)/i)?.[1];
  return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600` : url;
};

const MosqueMediaImage: React.FC<{ item: { url: string; fileId?: string | null }; alt: string; className?: string }> = ({ item, alt, className }) => {
  const [src, setSrc] = useState<string | null>(() => item.fileId ? null : drivePreviewUrl(item.url));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const fallback = drivePreviewUrl(item.url);

    setFailed(false);
    if (!item.fileId) {
      setSrc(fallback);
      return () => undefined;
    }

    setSrc(null);
    void mosqueApi.mediaBlob(item.fileId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(fallback);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.fileId, item.url]);

  if (failed) {
    return <div className={`${className || ''} flex items-center justify-center bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500`}>تعذر عرض الصورة — يمكن فتح الملف بالضغط على البطاقة</div>;
  }

  if (!src) {
    return <div className={`${className || ''} flex items-center justify-center gap-2 bg-slate-100 text-xs font-semibold text-slate-500`}><RefreshCw className="h-4 w-4 animate-spin" />جاري تحميل الصورة...</div>;
  }

  return <img src={src} alt={alt} className={className} onError={() => {
    const fallback = drivePreviewUrl(item.url);
    if (src !== fallback) setSrc(fallback);
    else setFailed(true);
  }} />;
};

type MediaImportKind = 'site_image' | 'mosque_image' | 'document';
type MediaImportStatus = 'matched' | 'review' | 'manual' | 'unsupported';
type ZipMediaImportRow = {
  id: string;
  path: string;
  fileName: string;
  mimeType: string | null;
  kind: MediaImportKind;
  siteId: string;
  status: MediaImportStatus;
  selected: boolean;
  score: number;
  note: string;
};

const MEDIA_IMPORT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
};

const MEDIA_IMPORT_STOP_WORDS = new Set([
  'صور', 'صوره', 'تقرير', 'التقرير', 'الزياره', 'الميدانيه', 'نهائي', 'واتساب', 'whatsapp', 'image', 'video',
  'كليه', 'مسجد', 'مصلى', 'جامع', 'الحرم', 'الجامعي', 'الجامعه', 'مبنى', 'الموقع', 'موقع', 'at', 'am', 'pm',
]);

const normalizeMediaImportText = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ى]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/\b20\d{2}[-_. ]\d{1,2}[-_. ]\d{1,2}\b/g, ' ')
  .replace(/\b\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\b/g, ' ')
  .replace(/([\u0600-\u06FFa-z])([0-9])/gi, '$1 $2')
  .replace(/([0-9])([\u0600-\u06FFa-z])/gi, '$1 $2')
  .replace(/\.[a-z0-9]{2,5}$/i, ' ')
  .replace(/[_\\/()\[\]{}.,،:;؛\-–—]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const expandMediaImportText = (value: string) => {
  let text = value;
  const replacements: Array<[string, string]> = [
    ['متشفى', 'مستشفى'],
    ['اداره الاعمال', 'كليه اداره الاعمال'],
    ['الكليه الطبيه التطبيقيه', 'كليه العلوم الطبيه التطبيقيه'],
    ['كليه الجبيل الطبيه', 'كليه العلوم الطبيه التطبيقيه بالجبيل'],
    ['عماده السنه التحضيريه', 'السنه التحضيريه والدراسات المسانده'],
    ['مصلى الريان', 'حرم الريان'],
    ['مسجد سكن الطلاب', 'السكن الطلابي'],
    ['مسجد التصميم', 'التصاميم'],
    ['مسجد التصاميم', 'التصاميم'],
    ['التعليم الالكتروني والتعلم عن بعد', 'عماده التعليم الالكتروني والتعلم عن بعد'],
  ];
  for (const [from, to] of replacements) text = text.replaceAll(from, `${from} ${to}`);
  return text;
};

const mediaImportMimeForPath = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return MEDIA_IMPORT_MIME[extension] || null;
};

const canonicalMediaFileName = (value: string) => normalizeMediaImportText(
  String(value || '').replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d+)?Z-?/i, '')
);

const matchMediaImportSite = (path: string, sites: MosqueSite[]) => {
  const source = expandMediaImportText(normalizeMediaImportText(path));
  const sourceTokens = Array.from(new Set(source.split(' ').filter((token) => token.length > 1 && !MEDIA_IMPORT_STOP_WORDS.has(token))));
  if (!sourceTokens.length || !sites.length) return { siteId: '', score: 0, status: 'review' as MediaImportStatus, note: 'تعذر استخراج كلمات مطابقة كافية' };

  const scored = sites.map((site) => {
    const siteName = expandMediaImportText(normalizeMediaImportText(site.name));
    const haystack = expandMediaImportText(normalizeMediaImportText([site.name, site.district, site.campusLocation, site.city].filter(Boolean).join(' ')));
    let totalWeight = 0;
    let matchedWeight = 0;
    for (const token of sourceTokens) {
      const isCode = /^[am]\d+$/i.test(token) || /^\d{1,3}$/.test(token);
      const weight = isCode ? 3.2 : token.length >= 6 ? 2.2 : token.length >= 4 ? 1.6 : 1;
      totalWeight += weight;
      if (haystack.includes(token)) matchedWeight += weight;
    }
    let score = totalWeight ? matchedWeight / totalWeight : 0;
    if (siteName.length >= 3 && source.includes(siteName)) score += 0.5;
    const meaningfulSiteTokens = siteName.split(' ').filter((token) => token.length > 1 && !MEDIA_IMPORT_STOP_WORDS.has(token));
    if (meaningfulSiteTokens.length && meaningfulSiteTokens.every((token) => source.includes(token))) score += 0.25;
    return { site, score: Math.min(score, 1.5) };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  if (!top || top.score < 0.3) return { siteId: '', score: top?.score || 0, status: 'review' as MediaImportStatus, note: 'لا توجد مطابقة موثوقة؛ اختر الموقع يدويًا' };
  const margin = top.score - (second?.score || 0);
  if (top.score >= 0.68 && margin >= 0.12) {
    return { siteId: top.site.id, score: top.score, status: 'matched' as MediaImportStatus, note: `مطابقة تلقائية: ${top.site.name}` };
  }
  return { siteId: top.site.id, score: top.score, status: 'review' as MediaImportStatus, note: `مقترح يحتاج مراجعة: ${top.site.name}` };
};

const mediaImportSitePayload = (site: MosqueSite, images: MosqueSiteMediaLibrary) => ({
  name: site.name,
  siteType: site.siteType,
  prayerRoomGender: site.prayerRoomGender ?? null,
  city: site.city ?? null,
  district: site.district ?? null,
  campusLocation: site.campusLocation ?? null,
  area: site.area ?? null,
  capacity: site.capacity ?? null,
  latitude: site.latitude ?? null,
  longitude: site.longitude ?? null,
  mapUrl: site.mapUrl ?? null,
  status: site.status,
  imamName: site.imamName ?? null,
  muezzinName: site.muezzinName ?? null,
  khateebName: site.khateebName ?? null,
  contactPhone: site.contactPhone ?? null,
  notes: site.notes ?? null,
  images,
  supervisorUserId: site.supervisorUserId ?? null,
});

export const MosquesUnitPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const canAdd = isAdmin || hasPermission('mosques', 'canAdd');
  const canEdit = isAdmin || hasPermission('mosques', 'canEdit');
  const canDelete = isAdmin || hasPermission('mosques', 'canDelete');
  const canPrint = isAdmin || hasPermission('mosques', 'canPrint');
  const canCreateUser = isAdmin || hasPermission('mosques', 'canCreateUser');

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<MosqueModuleRole>('viewer');
  const [linkedSiteId, setLinkedSiteId] = useState<string | null>(null);
  const [myPersonnelRole, setMyPersonnelRole] = useState<string | null>(null);
  const [fullPermissionAccess, setFullPermissionAccess] = useState(false);
  const [dashboard, setDashboard] = useState<MosqueDashboard | null>(null);
  const [sites, setSites] = useState<MosqueSite[]>([]);
  const [requests, setRequests] = useState<MosqueRequest[]>([]);
  const [tickets, setTickets] = useState<MosqueTicket[]>([]);
  const [leaves, setLeaves] = useState<MosqueLeave[]>([]);
  const [jobs, setJobs] = useState<MosqueJobApplication[]>([]);
  const [personnel, setPersonnel] = useState<MosquePersonnel[]>([]);
  const [quranInventoryItems, setQuranInventoryItems] = useState<MosqueQuranInventoryOverviewItem[]>([]);
  const [quranSummary, setQuranSummary] = useState<MosqueQuranInventorySummary>(emptyQuranSummary);
  const [quranSearch, setQuranSearch] = useState('');
  const [quranNeedOnly, setQuranNeedOnly] = useState(false);
  const [quranDialog, setQuranDialog] = useState(false);
  const [quranForm, setQuranForm] = useState<any>(emptyQuranInventoryForm());
  const [quranInventorySite, setQuranInventorySite] = useState<MosqueSite | null>(null);
  const [quranHistorySite, setQuranHistorySite] = useState<MosqueSite | null>(null);
  const [quranHistoryRows, setQuranHistoryRows] = useState<MosqueQuranInventory[]>([]);
  const [quranHistoryLoading, setQuranHistoryLoading] = useState(false);
  const [assignments, setAssignments] = useState<MosqueAssignment[]>([]);
  const [staffUsers, setStaffUsers] = useState<MosqueStaffUser[]>([]);
  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);
  const [search, setSearch] = useState('');
  const [siteFilterCity, setSiteFilterCity] = useState('');
  const [siteFilterType, setSiteFilterType] = useState('all');
  const [siteFilterStatus, setSiteFilterStatus] = useState('all');
  const [siteSortBy, setSiteSortBy] = useState('name');
  const [siteSortDirection, setSiteSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sitePrintColumns, setSitePrintColumns] = useState<SitePrintColumnKey[]>([...DEFAULT_SITE_PRINT_COLUMNS]);
  const [sitePrintFontSize, setSitePrintFontSize] = useState<number>(SITE_PRINT_FONT_DEFAULT);
  const [sitePrintFontAuto, setSitePrintFontAuto] = useState(true);
  const [sitePrintWidthMode, setSitePrintWidthMode] = useState<SitePrintWidthMode>('smart');
  const [sitePrintWrapMode, setSitePrintWrapMode] = useState<SitePrintWrapMode>('wrap');
  const [sitePrintOrientation, setSitePrintOrientation] = useState<SitePrintOrientation>('auto');
  const [activeTab, setActiveTab] = useState('overview');
  const [requestQuickFilter, setRequestQuickFilter] = useState<'all' | 'new' | 'under_review' | 'approved' | 'late'>('all');
  const [ticketQuickFilter, setTicketQuickFilter] = useState<'all' | 'open'>('all');
  const [leaveQuickFilter, setLeaveQuickFilter] = useState<'all' | 'pending'>('all');

  const [siteDialog, setSiteDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<MosqueSite | null>(null);
  const [siteForm, setSiteForm] = useState<any>(emptySite);
  const [siteMediaKind, setSiteMediaKind] = useState<'site_image' | 'mosque_image' | 'document'>('mosque_image');
  const [siteMediaFiles, setSiteMediaFiles] = useState<PendingSiteMedia[]>([]);
  const [siteMediaLibrary, setSiteMediaLibrary] = useState<MosqueSiteMediaLibrary>(emptySiteMedia());
  const [mediaImportDialog, setMediaImportDialog] = useState(false);
  const [mediaImportRows, setMediaImportRows] = useState<ZipMediaImportRow[]>([]);
  const [mediaImportParsing, setMediaImportParsing] = useState(false);
  const [mediaImportSaving, setMediaImportSaving] = useState(false);
  const [mediaImportProgress, setMediaImportProgress] = useState({ done: 0, total: 0, label: '' });
  const mediaImportZipRef = useRef<JSZip | null>(null);
  const [showSiteMap, setShowSiteMap] = useState(false);
  const [locatingSite, setLocatingSite] = useState(false);
  const [requestDialog, setRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState<any>(emptyRequest);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState<any>(emptyLeave);
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ kind: 'request' | 'ticket' | 'leave' | 'job'; item: any } | null>(null);
  const [viewingWorkflow, setViewingWorkflow] = useState<{ kind: 'request' | 'ticket' | 'leave'; item: any } | null>(null);
  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusEvidence, setStatusEvidence] = useState<File | null>(null);
  const [workflowEditTarget, setWorkflowEditTarget] = useState<{ kind: MosqueWorkflowKind; item: any } | null>(null);
  const [workflowEditForm, setWorkflowEditForm] = useState<any>({});
  const [workflowEditSaving, setWorkflowEditSaving] = useState(false);
  const [editingReturnedRequest, setEditingReturnedRequest] = useState<MosqueRequest | null>(null);
  const [editingReturnedLeave, setEditingReturnedLeave] = useState<MosqueLeave | null>(null);
  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);
  const [printingSiteCard, setPrintingSiteCard] = useState(false);
  const [qrSite, setQrSite] = useState<MosqueSite | null>(null);
  const [personnelDialog, setPersonnelDialog] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<MosquePersonnel | null>(null);
  const [viewingPersonnel, setViewingPersonnel] = useState<MosquePersonnel | null>(null);
  const [personnelForm, setPersonnelForm] = useState({ siteId: '', name: '', role: 'imam', mobile: '', email: '' });
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { role: MosqueModuleRole; siteId: string; personnelRole: string }>>({});
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const me = await mosqueApi.me();
      setRole(me.role);
      setLinkedSiteId(me.siteId || null);
      setMyPersonnelRole(me.personnelRole || null);
      setFullPermissionAccess(Boolean(me.fullPermissionAccess && me.accessSource === 'module_permissions'));

      const [dash, siteRows, noticeRows] = await Promise.all([
        mosqueApi.dashboard(), mosqueApi.sites(), mosqueApi.notifications(),
      ]);
      setDashboard(dash);
      setSites(siteRows);
      setNotifications(noticeRows);

      if (['head', 'supervisor', 'personnel'].includes(me.role)) {
        try {
          const quranData = await mosqueApi.quranInventory();
          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
        } catch {
          setQuranInventoryItems([]);
          setQuranSummary(emptyQuranSummary);
        }
      } else {
        setQuranInventoryItems([]);
        setQuranSummary(emptyQuranSummary);
      }

      if (me.role === 'head' || me.role === 'supervisor') {
        const [requestRows, ticketRows, leaveRows, personRows, staffRows] = await Promise.all([
          mosqueApi.requests(),
          mosqueApi.tickets(),
          mosqueApi.leaves(),
          mosqueApi.personnel(),
          isAdmin ? mosqueApi.staffDirectory() : Promise.resolve([] as MosqueStaffUser[]),
        ]);
        setRequests(requestRows);
        setTickets(ticketRows);
        setLeaves(leaveRows);
        setPersonnel(personRows.filter((item) => ['imam', 'muezzin', 'khateeb', 'collaborating_khateeb'].includes(item.role)));
        setStaffUsers(staffRows);
        try { setJobs(await mosqueApi.jobs()); } catch { setJobs([]); }
        if (isAdmin) {
          try {
            const rows = await mosqueApi.assignments();
            setAssignments(rows);
            setAssignmentDrafts(Object.fromEntries(rows.map((item) => [item.userId, { role: item.role, siteId: item.siteId || '', personnelRole: item.personnelRole || 'imam' }])));
          } catch { setAssignments([]); setAssignmentDrafts({}); }
        } else {
          setAssignments([]);
          setAssignmentDrafts({});
        }
      } else if (me.role === 'personnel') {
        const [requestRows, leaveRows] = await Promise.all([mosqueApi.requests(), mosqueApi.leaves()]);
        setRequests(requestRows);
        setLeaves(leaveRows);
        setTickets([]);
        setJobs([]);
        setPersonnel([]);
        setAssignments([]);
        setStaffUsers([]);
      } else {
        setRequests([]);
        setTickets([]);
        setLeaves([]);
        setJobs([]);
        setPersonnel([]);
        setAssignments([]);
        setStaffUsers([]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات وحدة المساجد');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!isAdmin && activeTab === 'roles') setActiveTab('team');
  }, [isAdmin, activeTab]);

  const siteCities = useMemo(
    () => Array.from(new Set(sites.map((site) => site.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [sites]
  );

  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : [...sites];

    if (q) {
      result = result.filter((site) =>
        [site.name, site.city, site.district, site.campusLocation, site.imamName, site.muezzinName, site.khateebName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    if (siteFilterCity) result = result.filter((site) => site.city === siteFilterCity);
    if (siteFilterType !== 'all') result = result.filter((site) => site.siteType === siteFilterType);
    if (siteFilterStatus !== 'all') result = result.filter((site) => site.status === siteFilterStatus);

    const buildingCode = (site: MosqueSite) => String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '';
    const textValue = (site: MosqueSite) => {
      if (siteSortBy === 'building') return buildingCode(site);
      if (siteSortBy === 'city') return site.city || '';
      if (siteSortBy === 'type') return siteTypeDisplayLabel(site);
      if (siteSortBy === 'status') return siteStatusLabels[site.status] || site.status || '';
      return site.name || '';
    };

    result.sort((a, b) => {
      let compared = 0;
      if (siteSortBy === 'area') compared = Number(a.area || 0) - Number(b.area || 0);
      else compared = textValue(a).localeCompare(textValue(b), 'ar', { numeric: true, sensitivity: 'base' });
      if (compared === 0) compared = (a.name || '').localeCompare(b.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      return siteSortDirection === 'desc' ? compared * -1 : compared;
    });

    return result;
  }, [sites, search, role, linkedSiteId, siteFilterCity, siteFilterType, siteFilterStatus, siteSortBy, siteSortDirection]);

  const siteFilterStats = useMemo(() => ({
    total: visibleSites.length,
    mosques: visibleSites.filter((site) => site.siteType === 'mosque' || site.siteType === 'jami').length,
    prayerRooms: visibleSites.filter((site) => site.siteType === 'prayer_room').length,
    totalArea: visibleSites.reduce((sum, site) => sum + (Number(site.area) || 0), 0),
  }), [visibleSites]);

  const resetSiteFilters = () => {
    setSearch('');
    setSiteFilterCity('');
    setSiteFilterType('all');
    setSiteFilterStatus('all');
    setSiteSortBy('name');
    setSiteSortDirection('asc');
  };

  const quranLatestBySite = useMemo(() => Object.fromEntries(quranInventoryItems.map((item) => [item.site.id, item.latest])), [quranInventoryItems]);
  const filteredQuranInventoryItems = useMemo(() => {
    const q = quranSearch.trim().toLowerCase();
    return quranInventoryItems.filter((item) => {
      const matchesSearch = !q || [item.site.name, item.site.city, item.site.district, item.site.campusLocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesNeed = !quranNeedOnly || Number(item.latest?.neededCount || 0) > 0;
      return matchesSearch && matchesNeed;
    });
  }, [quranInventoryItems, quranSearch, quranNeedOnly]);

  const openQuranInventoryDialog = (site: MosqueSite) => {
    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
    setQuranInventorySite(site);
    setQuranForm({
      siteId: site.id,
      largeCount: String(latest?.largeCount ?? 0),
      mediumCount: String(latest?.mediumCount ?? 0),
      smallCount: String(latest?.smallCount ?? 0),
      damagedCount: String(latest?.damagedCount ?? 0),
      neededCount: String(latest?.neededCount ?? 0),
      countedAt: new Date().toISOString().slice(0, 10),
      notes: latest?.notes || '',
    });
    setQuranDialog(true);
  };

  const saveQuranInventory = async () => {
    if (!quranInventorySite) return;
    const values = ['largeCount', 'mediumCount', 'smallCount', 'damagedCount', 'neededCount'] as const;
    const parsed = Object.fromEntries(values.map((key) => [key, Number(quranForm[key] || 0)])) as Record<typeof values[number], number>;
    if (values.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('أعداد المصاحف يجب أن تكون أرقامًا صحيحة غير سالبة');
    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.damagedCount > total) return toast.error('عدد المصاحف التالفة لا يمكن أن يتجاوز إجمالي المصاحف');
    setSaving(true);
    try {
      await mosqueApi.createQuranInventory({
        siteId: quranInventorySite.id,
        ...parsed,
        countedAt: quranForm.countedAt || new Date().toISOString(),
        notes: quranForm.notes || null,
      });
      toast.success('تم حفظ جرد المصاحف وإضافته إلى السجل التاريخي');
      setQuranDialog(false);
      setQuranInventorySite(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ جرد المصاحف'); } finally { setSaving(false); }
  };

  const openQuranHistory = async (site: MosqueSite) => {
    setQuranHistorySite(site);
    setQuranHistoryRows([]);
    setQuranHistoryLoading(true);
    try { setQuranHistoryRows(await mosqueApi.quranInventoryHistory(site.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل الجرد'); }
    finally { setQuranHistoryLoading(false); }
  };

  const printQuranInventory = () => {
    if (!filteredQuranInventoryItems.length) return toast.info('لا توجد بيانات مصاحف للطباعة');
    const printWindow = window.open('', '_blank', 'width=1300,height=900');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const rows = filteredQuranInventoryItems.map((item, index) => {
      const latest = item.latest;
      return `<tr><td>${index + 1}</td><td class="name">${esc(item.site.name)}</td><td>${esc(siteTypeDisplayLabel(item.site as MosqueSite))}</td><td>${latest?.largeCount ?? 0}</td><td>${latest?.mediumCount ?? 0}</td><td>${latest?.smallCount ?? 0}</td><td class="total">${latest?.totalCount ?? 0}</td><td>${latest?.damagedCount ?? 0}</td><td>${latest?.neededCount ?? 0}</td><td>${latest ? esc(new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')) : 'لم يجرد'}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حصر المصاحف</title><style>@page{size:A4 landscape;margin:5mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#172033;font-size:9px}h1{font-size:18px;margin:0 0 4px}.meta{color:#64748b;margin-bottom:10px}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:8px 0}.metric{border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#f8fafc}.metric b{display:block;font-size:14px;margin-top:2px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cbd5e1;padding:4px;text-align:center;vertical-align:middle}th{background:#e0f2fe;font-weight:900}.name{text-align:right;font-weight:800}.total{font-weight:900;background:#ecfdf5}.footer{margin-top:8px;color:#64748b;font-size:8px}@media print{button{display:none}}</style></head><body><h1>حصر المصاحف في المساجد والمصليات الجامعية</h1><div class="meta">تاريخ الاستخراج: ${esc(new Date().toLocaleString('ar-SA-u-ca-gregory'))} — عدد المواقع: ${filteredQuranInventoryItems.length}</div><div class="metrics"><div class="metric">الإجمالي<b>${quranSummary.total}</b></div><div class="metric">الكبيرة<b>${quranSummary.large}</b></div><div class="metric">المتوسطة<b>${quranSummary.medium}</b></div><div class="metric">الصغيرة<b>${quranSummary.small}</b></div><div class="metric">التالفة<b>${quranSummary.damaged}</b></div><div class="metric">الاحتياج<b>${quranSummary.needed}</b></div></div><table><thead><tr><th>م</th><th>المسجد / المصلى</th><th>النوع</th><th>كبيرة</th><th>متوسطة</th><th>صغيرة</th><th>الإجمالي</th><th>تالفة</th><th>الاحتياج</th><th>آخر جرد</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية. المصاحف التالفة محسوبة ضمن إجمالي الأحجام وليست مضافة عليه.</div></body></html>`;
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close(); printWindow.focus(); window.setTimeout(() => printWindow.print(), 250);
  };


  const toggleSitePrintColumn = (key: SitePrintColumnKey) => {
    if (sitePrintColumns.includes(key) && sitePrintColumns.length === 1) {
      toast.info('يجب إبقاء عمود واحد على الأقل للطباعة');
      return;
    }
    setSitePrintColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const selectAllSitePrintColumns = () => setSitePrintColumns(SITE_PRINT_COLUMNS.map((column) => column.key));
  const resetSitePrintColumns = () => setSitePrintColumns([...DEFAULT_SITE_PRINT_COLUMNS]);

  const resetSitePrintLayout = () => {
    setSitePrintFontSize(SITE_PRINT_FONT_DEFAULT);
    setSitePrintFontAuto(true);
    setSitePrintWidthMode('smart');
    setSitePrintWrapMode('wrap');
    setSitePrintOrientation('auto');
  };

  const mapSites = useMemo(() => visibleSites.filter((site) => Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude))), [visibleSites]);
  const mapCenter: [number, number] = useMemo(() => {
    if (!mapSites.length) return [26.3927, 50.0438];
    return [mapSites.reduce((s, x) => s + Number(x.latitude), 0) / mapSites.length, mapSites.reduce((s, x) => s + Number(x.longitude), 0) / mapSites.length];
  }, [mapSites]);

  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;

  const printSitesTable = (rows: MosqueSite[], mode: 'print' | 'preview' = 'print') => {
    if (!rows.length) {
      toast.info('لا توجد مساجد أو مصليات لطباعتها');
      return;
    }

    const selectedColumns = SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key));
    if (!selectedColumns.length) {
      toast.info('حدد عمودًا واحدًا على الأقل للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1300,height=900');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة المعاينة/الطباعة. اسمح بالنوافذ المنبثقة للمنصة ثم أعد المحاولة.');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char] || char));
    const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : escapeHtml(value);
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    const columnValue = (site: MosqueSite, key: SitePrintColumnKey) => {
      const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
      if (key === 'name') return site.name;
      if (key === 'type') return siteTypeDisplayLabel(site);
      if (key === 'building') return buildingCode;
      if (key === 'location') return site.campusLocation || '-';
      if (key === 'cityDistrict') return cityDistrict;
      if (key === 'area') return site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-';
      if (key === 'capacity') return site.capacity ? site.capacity.toLocaleString('ar-SA') : '-';
      if (key === 'imam') return site.imamName || '-';
      if (key === 'muezzin') return site.muezzinName || '-';
      if (key === 'khateeb') return site.khateebName || '-';
      if (key === 'contactPhone') return site.contactPhone || '-';
      if (key === 'coordinates') return site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
      if (key === 'status') return siteStatusLabels[site.status] || site.status;
      if (key === 'notes') return site.notes || '-';
      return '-';
    };

    const compactWeights: Record<SitePrintColumnKey, number> = {
      name: 1.15,
      type: 0.55,
      building: 0.55,
      location: 2.4,
      cityDistrict: 1.5,
      area: 0.65,
      capacity: 0.75,
      imam: 1.05,
      muezzin: 1.05,
      khateeb: 1.05,
      contactPhone: 0.9,
      coordinates: 1.25,
      status: 0.7,
      notes: 2.5,
    };
    const maxColumnTextLength = (key: SitePrintColumnKey, label: string) => Math.max(
      label.length,
      ...rows.slice(0, 120).map((site) => String(columnValue(site, key) ?? '').trim().length)
    );
    const weightForColumn = (key: SitePrintColumnKey, label: string) => {
      if (sitePrintWidthMode === 'equal') return 1;
      const base = compactWeights[key];
      if (sitePrintWidthMode === 'compact') return base;
      const textLength = Math.min(maxColumnTextLength(key, label), 90);
      const lengthFactor = Math.min(1.55, Math.max(0.72, 0.72 + Math.sqrt(textLength) / 10));
      return base * lengthFactor;
    };
    const rowNumberWidth = selectedColumns.length >= 11 ? 2.8 : selectedColumns.length >= 8 ? 3.2 : 3.8;
    const weights = selectedColumns.map((column) => weightForColumn(column.key, column.label));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const availableWidth = 100 - rowNumberWidth;
    const colgroup = `<col style="width:${rowNumberWidth.toFixed(2)}%" />${selectedColumns.map((column, index) => `<col class="col-${column.key}" style="width:${((weights[index] / totalWeight) * availableWidth).toFixed(2)}%" />`).join('')}`;

    const resolvedOrientation: 'landscape' | 'portrait' = sitePrintOrientation === 'auto'
      ? (selectedColumns.length <= 5 ? 'portrait' : 'landscape')
      : sitePrintOrientation;
    const automaticFont = selectedColumns.length >= 12 ? 5.8 : selectedColumns.length >= 9 ? 6.5 : selectedColumns.length >= 6 ? 7.2 : 8.1;
    const printFontNumber = sitePrintFontAuto
      ? automaticFont
      : Math.min(SITE_PRINT_FONT_MAX, Math.max(SITE_PRINT_FONT_MIN, sitePrintFontSize));
    const printFontSize = `${printFontNumber}px`;
    const headerFontSize = `${printFontNumber + 0.25}px`;
    const tableWidth = sitePrintWidthMode === 'equal'
      ? '100%'
      : selectedColumns.length <= 5
        ? `${Math.min(96, sitePrintWidthMode === 'smart' ? 50 + (selectedColumns.length * 8) : 46 + (selectedColumns.length * 7))}%`
        : '100%';
    const cellWhiteSpace = sitePrintWrapMode === 'single' ? 'nowrap' : 'normal';
    const cellOverflow = sitePrintWrapMode === 'single' ? 'hidden' : 'visible';
    const cellTextOverflow = sitePrintWrapMode === 'single' ? 'ellipsis' : 'clip';
    const cellPadding = selectedColumns.length >= 11 ? '0.62mm 0.42mm' : selectedColumns.length >= 8 ? '0.72mm 0.5mm' : '0.88mm 0.65mm';

    const centerColumns = new Set<SitePrintColumnKey>(['type', 'building', 'area', 'capacity', 'contactPhone', 'coordinates', 'status']);
    const tableHeader = selectedColumns.map((column) => `<th class="col-${column.key}">${escapeHtml(column.label)}</th>`).join('');
    const tableRows = rows.map((site, index) => {
      const cells = selectedColumns.map((column) => `<td class="col-${column.key}${column.key === 'name' ? ' name' : ''}${centerColumns.has(column.key) ? ' center' : ''}"${column.key === 'building' || column.key === 'coordinates' || column.key === 'contactPhone' ? ' dir="ltr"' : ''}>${display(columnValue(site, column.key))}</td>`).join('');
      return `<tr><td class="row-number">${index + 1}</td>${cells}</tr>`;
    }).join('');

    const sortLabels: Record<string, string> = { name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' };
    const filterParts = [
      search.trim() ? `بحث: ${search.trim()}` : null,
      siteFilterCity ? `المدينة: ${siteFilterCity}` : null,
      siteFilterType !== 'all' ? `النوع: ${siteTypeLabels[siteFilterType] || siteFilterType}` : null,
      siteFilterStatus !== 'all' ? `الحالة: ${siteStatusLabels[siteFilterStatus] || siteFilterStatus}` : null,
      `الفرز: ${sortLabels[siteSortBy] || siteSortBy} — ${siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}`,
    ].filter(Boolean) as string[];
    const filterNote = filterParts.join(' | ');
    const printedColumnsNote = selectedColumns.map((column) => column.label).join('، ');
    const fontLabel = sitePrintFontAuto ? `تلقائي (${printFontNumber.toFixed(1)}px)` : `${printFontNumber.toFixed(1)}px`;
    const widthLabel = sitePrintWidthMode === 'smart' ? 'ذكي تلقائي' : sitePrintWidthMode === 'compact' ? 'مضغوط' : 'متساوٍ';
    const wrapLabel = sitePrintWrapMode === 'wrap' ? 'التفاف تلقائي' : 'سطر واحد';
    const orientationLabel = sitePrintOrientation === 'auto' ? `تلقائي (${resolvedOrientation === 'portrait' ? 'عمودي' : 'أفقي'})` : resolvedOrientation === 'portrait' ? 'عمودي' : 'أفقي';
    const previewToolbar = mode === 'preview' ? `
      <div class="preview-toolbar">
        <div><strong>معاينة التقرير</strong><span>راجع توزيع الأعمدة وحجم الخط قبل الطباعة.</span></div>
        <div class="preview-actions"><button type="button" onclick="window.print()">طباعة / حفظ PDF</button><button type="button" class="secondary" onclick="window.close()">إغلاق</button></div>
      </div>` : '';
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>جدول المساجد والمصليات الجامعية</title>
  <style>
    @page { size: A4 ${resolvedOrientation}; margin: 5mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { font-size: ${printFontSize}; line-height: 1.2; }
    .preview-toolbar { position: sticky; top: 0; z-index: 20; margin: 0 0 4mm; padding: 10px 14px; border: 1px solid #bae6fd; border-radius: 12px; background: rgba(240,249,255,.96); box-shadow: 0 8px 24px rgba(15,23,42,.10); display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
    .preview-toolbar strong { display: block; color: #0c4a6e; font-size: 14px; }
    .preview-toolbar span { display: block; margin-top: 3px; color: #64748b; }
    .preview-actions { display: flex; gap: 8px; }
    .preview-actions button { border: 0; border-radius: 9px; padding: 8px 13px; background: #0369a1; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    .preview-actions button.secondary { border: 1px solid #cbd5e1; background: #fff; color: #334155; }
    .header { margin: 0 0 1.3mm; padding: 0 0 1.2mm; border-bottom: 1.2px solid #0f6f99; }
    .kicker { color: #587083; font-size: 6.2px; margin-bottom: 0.35mm; }
    h1 { margin: 0; color: #102a43; font-size: 13px; line-height: 1.05; }
    .meta { margin-top: 0.45mm; color: #66788a; font-size: 6.2px; display: flex; justify-content: space-between; gap: 2mm; }
    .filters { margin-top: 0.7mm; padding: 0.75mm 1.1mm; border: 1px solid #dbe7ef; border-radius: 1mm; background: #f8fbfd; color: #50677a; font-size: 6.1px; line-height: 1.2; }
    .columns-note, .layout-note { margin-top: 0.55mm; padding: 0.7mm 1.1mm; border-radius: 1mm; font-size: 6px; line-height: 1.2; }
    .columns-note { border: 1px solid #cfe7d9; background: #f2fbf6; color: #37624b; }
    .layout-note { border: 1px solid #dbeafe; background: #eff6ff; color: #365b7a; }
    table { width: ${tableWidth}; margin: 0 auto; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #cdd9e3; padding: ${cellPadding}; vertical-align: middle; text-align: right; line-height: 1.16; word-break: normal; overflow-wrap: ${sitePrintWrapMode === 'wrap' ? 'anywhere' : 'normal'}; white-space: ${cellWhiteSpace}; overflow: ${cellOverflow}; text-overflow: ${cellTextOverflow}; }
    th { background: #eaf5fb; color: #173a50; font-weight: 900; font-size: ${headerFontSize}; white-space: nowrap; text-align: center; }
    tbody tr:nth-child(even) td { background: #f8fbfd; }
    .row-number { text-align: center; font-weight: 800; }
    td.name { font-weight: 800; color: #183b56; }
    td.center { text-align: center; }
    .footer { margin-top: 1mm; padding-top: 0.8mm; border-top: 1px solid #dce5ec; display: flex; justify-content: space-between; gap: 2mm; color: #718496; font-size: 5.7px; }
    @media print { .preview-toolbar { display: none !important; } }
  </style>
</head>
<body>
  ${previewToolbar}
  <header class="header">
    <div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
    <h1>جدول المساجد والمصليات الجامعية</h1>
    <div class="meta"><span>عدد السجلات: ${rows.length}</span><span>تاريخ الاستخراج: ${escapeHtml(generatedAt)}</span></div>
    <div class="filters"><strong>معايير التصفية والفرز:</strong> ${escapeHtml(filterNote || 'جميع السجلات — الفرز حسب الاسم تصاعديًا')}</div>
    <div class="columns-note"><strong>الأعمدة المطبوعة (${selectedColumns.length}):</strong> ${escapeHtml(printedColumnsNote)}</div>
    <div class="layout-note"><strong>تنسيق التقرير:</strong> الخط ${escapeHtml(fontLabel)} — الأعمدة ${escapeHtml(widthLabel)} — النص ${escapeHtml(wrapLabel)} — الصفحة ${escapeHtml(orientationLabel)}</div>
  </header>
  <table>
    <colgroup>${colgroup}</colgroup>
    <thead><tr><th class="row-number">م</th>${tableHeader}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <footer class="footer"><span>منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية</span><span>يمكن اختيار «حفظ كملف PDF» من نافذة الطباعة.</span></footer>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    if (mode === 'print') {
      printWindow.onafterprint = () => printWindow.close();
      window.setTimeout(() => printWindow.print(), 250);
    }
  };

  const printSiteCard = async (site: MosqueSite) => {
    if (printingSiteCard) return;
    const printWindow = window.open('', '_blank', 'width=1050,height=900');
    if (!printWindow) {
      toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للمنصة ثم أعد المحاولة.');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[char] || char));
    const display = (value: unknown) => value === null || value === undefined || value === '' ? '-' : escapeHtml(value);
    const objectUrls: string[] = [];
    let cleanupTimer: number | undefined;
    const cleanup = () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.splice(0, objectUrls.length);
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
    };

    setPrintingSiteCard(true);
    try {
      printWindow.document.open();
      printWindow.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري تجهيز بطاقة الطباعة</title></head><body style="font-family:Tahoma,Arial,sans-serif;direction:rtl;padding:40px;text-align:center"><h2>جاري تجهيز بطاقة المسجد / المصلى للطباعة...</h2><p>يتم الآن تحميل الصور المرفقة بأمان.</p></body></html>');
      printWindow.document.close();

      const media = normalizeSiteMedia(site.images);
      const photosToPrint = media.photos.slice(0, 6);
      const preparedPhotos = await Promise.all(photosToPrint.map(async (item) => {
        let src = drivePreviewUrl(item.url);
        if (item.fileId) {
          try {
            const blob = await mosqueApi.mediaBlob(item.fileId);
            src = URL.createObjectURL(blob);
            objectUrls.push(src);
          } catch {
            // Keep Google Drive thumbnail as a fallback for legacy/temporarily unavailable media.
          }
        }
        return { ...item, src };
      }));

      const location = [site.campusLocation, site.city, site.district].filter(Boolean).join(' — ') || '-';
      const buildingCode = String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const coordinates = site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
      const infoItems = [
        ['الاسم', site.name],
        ['النوع', siteTypeDisplayLabel(site)],
        ['رقم المبنى', buildingCode],
        ['الحالة', siteStatusLabels[site.status] || site.status],
        ['الموقع داخل الجامعة', location],
        ['المساحة', site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'],
        ['الطاقة الاستيعابية', site.capacity ? site.capacity.toLocaleString('ar-SA') : '-'],
        ['الإمام', site.imamName || '-'],
        ['المؤذن', site.muezzinName || '-'],
        ['الخطيب', site.khateebName || '-'],
        ['رقم التواصل', site.contactPhone || '-'],
        ['الإحداثيات', coordinates],
        ['إجمالي المصاحف', quranInventory?.totalCount?.toLocaleString('ar-SA') || 'لم يتم الجرد'],
        ['مصاحف كبيرة', quranInventory?.largeCount?.toLocaleString('ar-SA') || '-'],
        ['مصاحف متوسطة', quranInventory?.mediumCount?.toLocaleString('ar-SA') || '-'],
        ['مصاحف صغيرة', quranInventory?.smallCount?.toLocaleString('ar-SA') || '-'],
        ['المصاحف التالفة', quranInventory?.damagedCount?.toLocaleString('ar-SA') || '-'],
        ['الاحتياج الحالي', quranInventory?.neededCount?.toLocaleString('ar-SA') || '-'],
      ];
      const infoHtml = infoItems.map(([label, value], index) => `
        <div class="info-item ${index === 4 ? 'wide' : ''}">
          <div class="info-label">${escapeHtml(label)}</div>
          <div class="info-value">${display(value)}</div>
        </div>`).join('');

      const photosHtml = preparedPhotos.length ? preparedPhotos.map((item, index) => `
        <figure class="photo-card">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.fileName || `صورة ${index + 1}`)}" />
          <figcaption>
            <span>${escapeHtml(item.fileName || `صورة ${index + 1}`)}</span>
            <b>${item.category === 'site_image' ? 'صورة الموقع' : 'صورة المسجد / المصلى'}</b>
          </figcaption>
        </figure>`).join('') : '<div class="empty-photos">لا توجد صور مرفقة في سجل الموقع.</div>';
      const extraPhotos = media.photos.length > preparedPhotos.length
        ? `<div class="extra-note">تم إظهار أول ${preparedPhotos.length} صور للمحافظة على تنسيق صفحة A4، ويوجد ${media.photos.length - preparedPhotos.length} صور إضافية في سجل المنصة.</div>`
        : '';

      const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>بطاقة ${escapeHtml(site.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    body { width: 100%; }
    .sheet { width: 100%; min-height: 277mm; border: 1px solid #d9e3ee; border-radius: 5mm; overflow: hidden; background: #fff; }
    .header { padding: 7mm 8mm 5mm; border-bottom: 1px solid #dbe7f1; background: linear-gradient(90deg,#f0f9ff,#ffffff,#ecfdf5); }
    .header-kicker { font-size: 10px; color: #527089; margin-bottom: 2mm; }
    .header-row { display: flex; align-items: center; justify-content: space-between; gap: 6mm; }
    .title { margin: 0; font-size: 23px; font-weight: 900; color: #102a43; }
    .subtitle { margin: 2mm 0 0; font-size: 11px; color: #66788a; }
    .status { flex: 0 0 auto; border: 1px solid #86efac; color: #047857; background: #ecfdf5; border-radius: 999px; padding: 2mm 4mm; font-size: 10px; font-weight: 700; }
    .section { margin: 5mm 7mm 0; border: 1px solid #d8e3ed; border-radius: 4mm; overflow: hidden; break-inside: avoid; }
    .section-title { padding: 3mm 4mm; font-size: 12px; font-weight: 900; color: #1f3a53; background: #f8fbfd; border-bottom: 1px solid #e2eaf1; }
    .info-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
    .info-item { min-height: 17mm; padding: 3mm 4mm; border-bottom: 1px solid #edf2f6; }
    .info-item:nth-child(odd) { border-left: 1px solid #edf2f6; }
    .info-item.wide { grid-column: 1 / -1; border-left: 0; }
    .info-label { margin-bottom: 1mm; font-size: 9px; color: #74879a; }
    .info-value { font-size: 11px; line-height: 1.65; font-weight: 700; color: #172b3a; word-break: break-word; }
    .notes { padding: 4mm; font-size: 10px; line-height: 1.8; color: #334e68; white-space: pre-wrap; min-height: 12mm; }
    .photos-head { display: flex; justify-content: space-between; align-items: center; gap: 4mm; padding: 3mm 4mm; border-bottom: 1px solid #e2eaf1; background: #f8fbfd; }
    .photos-head strong { font-size: 12px; color: #1f3a53; }
    .photos-count { font-size: 9px; color: #526d82; border: 1px solid #cedbe5; border-radius: 999px; padding: 1.2mm 3mm; background: #fff; }
    .photo-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 3mm; padding: 4mm; }
    .photo-card { margin: 0; overflow: hidden; border: 1px solid #dbe5ed; border-radius: 3mm; background: #fff; break-inside: avoid; }
    .photo-card img { display: block; width: 100%; height: 37mm; object-fit: cover; background: #f1f5f9; }
    .photo-card figcaption { display: flex; align-items: center; justify-content: space-between; gap: 2mm; padding: 2mm 2.5mm; font-size: 8px; color: #43586a; }
    .photo-card figcaption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }
    .photo-card figcaption b { font-size: 7px; color: #0f6f99; font-weight: 700; white-space: nowrap; }
    .empty-photos { grid-column: 1 / -1; padding: 12mm; text-align: center; color: #7b8c9a; font-size: 10px; }
    .extra-note { margin: 0 4mm 4mm; border: 1px dashed #cbd9e5; border-radius: 3mm; padding: 2.5mm 3mm; font-size: 8px; color: #61788b; background: #fafcfe; }
    .footer { margin: 5mm 7mm 6mm; padding-top: 3mm; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 5mm; font-size: 8px; color: #728497; }
    @media print { .sheet { border-color: #cad8e3; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="header-kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div>
      <div class="header-row">
        <div>
          <h1 class="title">بطاقة تعريف المسجد / المصلى</h1>
          <p class="subtitle">${escapeHtml(site.name)} — بطاقة A4 مستخرجة من منصة إدارة الأملاك والأراضي</p>
        </div>
        <span class="status">${escapeHtml(siteStatusLabels[site.status] || site.status)}</span>
      </div>
    </header>

    <section class="section">
      <div class="section-title">البيانات الأساسية</div>
      <div class="info-grid">${infoHtml}</div>
    </section>

    ${site.notes ? `<section class="section"><div class="section-title">الملاحظات</div><div class="notes">${escapeHtml(site.notes)}</div></section>` : ''}

    <section class="section">
      <div class="photos-head"><strong>الصور المرفقة</strong><span class="photos-count">${media.photos.length} صورة</span></div>
      <div class="photo-grid">${photosHtml}</div>
      ${extraPhotos}
    </section>

    <footer class="footer"><span>منصة إدارة الأملاك والأراضي — IAU Deeds</span><span>وحدة العناية بالمساجد والمصليات الجامعية</span></footer>
  </main>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        const images = Array.from(printWindow.document.images);
        if (!images.length || images.every((image) => image.complete)) return finish();
        let remaining = images.filter((image) => !image.complete).length;
        const settled = () => {
          remaining -= 1;
          if (remaining <= 0) finish();
        };
        images.filter((image) => !image.complete).forEach((image) => {
          image.addEventListener('load', settled, { once: true });
          image.addEventListener('error', settled, { once: true });
        });
        window.setTimeout(finish, 3500);
      });

      printWindow.onafterprint = () => {
        cleanup();
        printWindow.close();
      };
      cleanupTimer = window.setTimeout(cleanup, 120000);
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      cleanup();
      printWindow.close();
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز بطاقة الطباعة');
    } finally {
      setPrintingSiteCard(false);
    }
  };

  const openSiteDialog = (site?: MosqueSite) => {
    setEditingSite(site || null);
    setShowSiteMap(false);
    setSiteMediaKind('mosque_image');
    setSiteMediaFiles([]);
    setSiteMediaLibrary(normalizeSiteMedia(site?.images || null));
    setSiteForm(site ? {
      name: site.name, siteType: site.siteType, prayerRoomGender: site.prayerRoomGender || '', city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',
      area: site.area ?? '', capacity: site.capacity ?? '', latitude: site.latitude ?? '', longitude: site.longitude ?? '', status: site.status,
      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',
    } : emptySite);
    setSiteDialog(true);
  };

  const sitePickerCoordinates = useMemo(() => {
    const latitude = Number(siteForm.latitude);
    const longitude = Number(siteForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
    return { latitude, longitude };
  }, [siteForm.latitude, siteForm.longitude]);

  const updateSiteCoordinates = React.useCallback((coordinates: { latitude: number; longitude: number }) => {
    setSiteForm((current: any) => ({
      ...current,
      latitude: Number(coordinates.latitude.toFixed(6)),
      longitude: Number(coordinates.longitude.toFixed(6)),
    }));
  }, []);

  const captureCurrentSiteLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }

    setLocatingSite(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateSiteCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setShowSiteMap(true);
        setLocatingSite(false);
        toast.success('تم تحديد الموقع وتعبئة الإحداثيات');
      },
      (error) => {
        setLocatingSite(false);
        const message = error.code === error.PERMISSION_DENIED
          ? 'يرجى السماح للمتصفح باستخدام الموقع الجغرافي ثم إعادة المحاولة'
          : 'تعذر تحديد الموقع الحالي. تأكد من تفعيل خدمة الموقع في الجهاز';
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [updateSiteCoordinates]);

  const saveSite = async () => {
    if (!siteForm.name.trim()) return toast.error('اسم المسجد أو المصلى مطلوب');
    if (siteForm.siteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');
    setSaving(true);
    try {
      const nextMedia: MosqueSiteMediaLibrary = {
        photos: [...siteMediaLibrary.photos],
        documents: [...siteMediaLibrary.documents],
      };

      for (const pending of siteMediaFiles) {
        const uploaded = await mosqueApi.upload(pending.file);
        const media = {
          url: uploaded.driveUrl,
          fileId: uploaded.driveFileId || null,
          fileName: pending.file.name || uploaded.fileName || null,
          mimeType: uploaded.mimeType || pending.file.type || null,
        };
        if (pending.kind === 'document') nextMedia.documents.push(media);
        else nextMedia.photos.push({ ...media, category: pending.kind });
      }

      const payload = {
        ...siteForm,
        // أسماء المسؤولين مصدرها سجل المنسوبين، لذلك لا نحفظ نسخة يدوية قد تصبح قديمة.
        imamName: null,
        muezzinName: null,
        khateebName: null,
        prayerRoomGender: siteForm.siteType === 'prayer_room' ? siteForm.prayerRoomGender : null,
        area: siteForm.area === '' ? null : Number(siteForm.area),
        capacity: siteForm.capacity === '' ? null : Number(siteForm.capacity),
        latitude: siteForm.latitude === '' ? null : Number(siteForm.latitude),
        longitude: siteForm.longitude === '' ? null : Number(siteForm.longitude),
        mapUrl: siteForm.latitude !== '' && siteForm.longitude !== '' ? `https://www.google.com/maps?q=${siteForm.latitude},${siteForm.longitude}` : null,
        images: nextMedia,
      };
      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, payload)
        : await mosqueApi.createSite(payload);
      toast.success(editingSite ? 'تم تحديث بيانات الموقع والمرفقات' : 'تمت إضافة الموقع والمرفقات وإنشاء QR تلقائيًا');
      setSiteDialog(false);
      setSiteMediaFiles([]);
      await loadAll();
      if (!editingSite) setQrSite(savedSite);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر الحفظ'); } finally { setSaving(false); }
  };

  const deleteSite = async (site: MosqueSite) => {
    if (!confirm(`هل تريد حذف ${site.name}؟ إذا كان مرتبطًا بإجراءات فلن يسمح النظام بالحذف.`)) return;
    try { await mosqueApi.deleteSite(site.id); toast.success('تم الحذف'); await loadAll(); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر الحذف'); }
  };

  const openRequestDialog = () => {
    setEditingReturnedRequest(null);
    setRequestForm({ ...emptyRequest, siteId: linkedSiteId || sites[0]?.id || '' });
    setRequestDialog(true);
  };

  const openReturnedRequestEdit = (item: MosqueRequest) => {
    setEditingReturnedRequest(item);
    setRequestForm({
      ...emptyRequest,
      siteId: item.siteId,
      requestType: item.requestType,
      priority: item.priority,
      description: item.description,
      notes: item.notes || '',
      file: null,
    });
    setRequestDialog(true);
  };

  const saveRequest = async () => {
    if (!requestForm.siteId || requestForm.description.trim().length < 5) return toast.error('حدد الموقع واكتب وصفًا واضحًا للطلب');
    setSaving(true);
    try {
      const attachments: string[] = [];
      if (requestForm.file) attachments.push((await mosqueApi.upload(requestForm.file)).driveUrl);
      if (editingReturnedRequest) {
        await mosqueApi.resubmitWorkflow('request', editingReturnedRequest.id, { ...requestForm, file: undefined, attachments, resubmitNote: 'تم التعديل وإعادة الإرسال' });
        toast.success('تم تعديل الطلب وإعادة إرساله للمراجعة');
        setEditingReturnedRequest(null);
      } else {
        await mosqueApi.createRequest({ ...requestForm, file: undefined, attachments });
        toast.success('تم إنشاء الطلب وإرساله للمراجعة');
      }
      setRequestDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الطلب'); } finally { setSaving(false); }
  };

  const openLeaveDialog = () => {
    setEditingReturnedLeave(null);
    setLeaveForm({ ...emptyLeave, siteId: linkedSiteId || sites[0]?.id || '' });
    setLeaveDialog(true);
  };

  const openReturnedLeaveEdit = (item: MosqueLeave) => {
    setEditingReturnedLeave(item);
    setLeaveForm({
      ...emptyLeave,
      siteId: item.siteId,
      requestType: item.requestType,
      startDate: item.startDate ? String(item.startDate).slice(0, 10) : '',
      endDate: item.endDate ? String(item.endDate).slice(0, 10) : '',
      reason: item.reason,
      replacementName: item.replacementName,
      notes: (item as any).notes || '',
    });
    setLeaveDialog(true);
  };

  const saveLeave = async () => {
    if (!leaveForm.siteId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim() || !leaveForm.replacementName.trim()) return toast.error('أكمل بيانات الإجازة والبديل');
    setSaving(true);
    try {
      if (editingReturnedLeave) {
        await mosqueApi.resubmitWorkflow('leave', editingReturnedLeave.id, { ...leaveForm, resubmitNote: 'تم التعديل وإعادة الإرسال' });
        toast.success('تم تعديل الطلب وإعادة إرساله للمراجعة');
        setEditingReturnedLeave(null);
      } else {
        await mosqueApi.createLeave(leaveForm);
        toast.success('تم إرسال طلب الإجازة/الاعتذار');
      }
      setLeaveDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إرسال الطلب'); } finally { setSaving(false); }
  };

  const transitionsFor = (kind: string, status: string) => {
    let allowed = kind === 'request' ? [...(requestTransitions[status] || [])]
      : kind === 'ticket' ? [...(ticketTransitions[status] || [])]
        : kind === 'leave' ? [...(leaveTransitions[status] || [])]
          : [...(jobTransitions[status] || [])];
    if (kind === 'ticket' && ['new', 'under_review', 'assigned'].includes(status)) allowed.push('returned_for_edit');
    if (kind === 'ticket' && status === 'returned_for_edit') allowed.push('new');
    if (kind === 'job' && ['new', 'under_review', 'shortlisted', 'interview'].includes(status)) allowed.push('returned_for_edit');
    if (kind === 'job' && status === 'returned_for_edit') allowed.push('new');
    if (role === 'head' && status !== 'archived') allowed.push('archived');
    return [...new Set(allowed)];
  };

  const openStatusDialog = (kind: 'request' | 'ticket' | 'leave' | 'job', item: any, preferredStatus?: string) => {
    const next = transitionsFor(kind, item.status).filter((s) => !(s === 'approved' && role !== 'head'));
    if (!next.length) return toast.info('لا توجد حالة تالية متاحة لهذا السجل');
    setStatusTarget({ kind, item });
    setStatusValue(preferredStatus && next.includes(preferredStatus) ? preferredStatus : next[0]);
    setStatusNote('');
    setStatusEvidence(null);
    setStatusDialog(true);
  };

  const applyStatus = async () => {
    if (!statusTarget || !statusValue) return;
    if (['rejected', 'returned_for_edit', 'archived'].includes(statusValue) && !statusNote.trim()) return toast.error(statusValue === 'archived' ? 'اكتب سبب الحذف / الأرشفة' : 'اكتب سبب الرفض أو ملاحظة الإعادة');
    if (statusTarget.kind === 'request' && statusValue === 'completed' && !statusEvidence && !statusTarget.item.completionEvidenceUrl) {
      return toast.error('يلزم رفع إثبات الإنجاز قبل إكمال الطلب');
    }
    setSaving(true);
    try {
      let evidenceUrl: string | undefined;
      if (statusTarget.kind === 'request' && statusValue === 'completed') {
        if (statusEvidence) evidenceUrl = (await mosqueApi.upload(statusEvidence)).driveUrl;
      }
      const payload = { status: statusValue, note: statusNote, rejectionReason: statusNote, returnReason: statusNote, completionEvidenceUrl: evidenceUrl };
      await mosqueApi.workflowAction(statusTarget.kind, statusTarget.item.id, payload);
      toast.success('تم تحديث الحالة');
      setStatusDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الحالة'); } finally { setSaving(false); }
  };

  const convertTicket = async (ticket: MosqueTicket) => {
    if (!confirm(`تحويل البلاغ ${ticket.ticketNumber} إلى طلب صيانة مرتبط؟`)) return;
    try { await mosqueApi.convertTicketToRequest(ticket.id, { requestType: 'maintenance', priority: 'medium' }); toast.success('تم إنشاء طلب صيانة مرتبط بالبلاغ'); await loadAll(); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر التحويل'); }
  };


  const openWorkflowEdit = (kind: MosqueWorkflowKind, item: any) => {
    setWorkflowEditTarget({ kind, item });
    if (kind === 'request') setWorkflowEditForm({ siteId: item.siteId, requestType: item.requestType, priority: item.priority, description: item.description, notes: item.notes || '', assignedTo: item.assignedTo || '', adminNote: '' });
    else if (kind === 'ticket') setWorkflowEditForm({ siteId: item.siteId, ticketType: item.ticketType, description: item.description, reporterName: item.reporterName || '', reporterPhone: item.reporterPhone || '', reporterEmail: item.reporterEmail || '', notes: item.notes || '', assignedTo: item.assignedTo || '', adminNote: '' });
    else if (kind === 'leave') setWorkflowEditForm({ siteId: item.siteId, requestType: item.requestType, startDate: String(item.startDate || '').slice(0, 10), endDate: String(item.endDate || '').slice(0, 10), reason: item.reason, replacementName: item.replacementName, notes: item.notes || '', adminNote: '' });
    else setWorkflowEditForm({ fullName: item.fullName, phone: item.phone, email: item.email, qualification: item.qualification, experience: item.experience || '', jobType: item.jobType, preferredLocation: item.preferredLocation || '', internalNotes: item.internalNotes || '', adminNote: '' });
  };

  const saveWorkflowEdit = async () => {
    if (!workflowEditTarget) return;
    setWorkflowEditSaving(true);
    try {
      await mosqueApi.updateWorkflow(workflowEditTarget.kind, workflowEditTarget.item.id, workflowEditForm);
      toast.success('تم حفظ التعديل الإداري وتسجيله في سجل الإجراءات');
      setWorkflowEditTarget(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ التعديل الإداري'); } finally { setWorkflowEditSaving(false); }
  };

  const workflowAdminActions = (kind: MosqueWorkflowKind, item: any) => {
    if (!['head', 'supervisor'].includes(role) || item.status === 'archived') return null;
    const allowed = transitionsFor(kind, item.status);
    return <>
      <Button variant="outline" size="sm" className={button3d} onClick={() => openWorkflowEdit(kind, item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل إداري</Button>
      {allowed.includes('returned_for_edit') && <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openStatusDialog(kind, item, 'returned_for_edit')}><RefreshCw className="ml-1 h-3.5 w-3.5" />إرجاع للتعديل</Button>}
      {role === 'head' && allowed.includes('approved') && <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700" onClick={() => openStatusDialog(kind, item, 'approved')}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />اعتماد</Button>}
      {allowed.includes('rejected') && <Button variant="outline" size="sm" className="border-red-300 text-red-700" onClick={() => openStatusDialog(kind, item, 'rejected')}><X className="ml-1 h-3.5 w-3.5" />رفض</Button>}
      {role === 'head' && <Button variant="outline" size="sm" className="border-red-300 bg-red-50/50 text-red-700" onClick={() => openStatusDialog(kind, item, 'archived')}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف / أرشفة</Button>}
    </>;
  };

  const openPersonnelDialog = (item?: MosquePersonnel) => {
    setEditingPersonnel(item || null);
    setPersonnelForm(item ? {
      siteId: item.siteId,
      name: item.name,
      role: item.role,
      mobile: item.mobile || '',
      email: item.email || '',
    } : { siteId: sites[0]?.id || '', name: '', role: 'imam', mobile: '', email: '' });
    setPersonnelDialog(true);
  };

  const deletePersonnel = async (item: MosquePersonnel) => {
    if (!confirm(`هل تريد حذف ${item.name} من منسوبي المساجد؟ سيتم إلغاء ربطه التشغيلي بالموقع مع الإبقاء على حساب المستخدم الأساسي.`)) return;
    try {
      await mosqueApi.deletePersonnel(item.id);
      toast.success('تم حذف المنسوب وإلغاء ربطه التشغيلي');
      if (viewingPersonnel?.id === item.id) setViewingPersonnel(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حذف المنسوب'); }
  };

  const savePersonnel = async () => {
    if (!personnelForm.siteId || !personnelForm.name.trim() || !personnelForm.email.trim()) return toast.error('الموقع والاسم والبريد الإلكتروني مطلوبة');
    if (!editingPersonnel && !canCreateUser) return toast.error('لا تملك صلاحية إضافة مستخدم جديد وربطه بمنسوبي المساجد');
    setSaving(true);
    try {
      if (editingPersonnel) {
        await mosqueApi.updatePersonnel(editingPersonnel.id, personnelForm);
        toast.success('تم تحديث بيانات المنسوب وربطه التشغيلي');
      } else {
        const result = await mosqueApi.createPersonnelAccount(personnelForm);
        toast.success(result.message || 'تمت إضافة منسوب المسجد وربط حسابه');
      }
      setPersonnelDialog(false);
      setEditingPersonnel(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : editingPersonnel ? 'تعذر تحديث بيانات المنسوب' : 'تعذر إضافة منسوب المسجد'); } finally { setSaving(false); }
  };

  const setUserAssignment = async (userId: string, roleValue: MosqueModuleRole, siteId?: string, personnelRole?: string) => {
    if (!isAdmin) {
      toast.error('إدارة أدوار مستخدمي المنصة متاحة لمسؤول النظام فقط');
      return;
    }
    try {
      if (roleValue === 'personnel' && !siteId) {
        toast.error('حدد المسجد أو المصلى المرتبط بالمنسوب');
        return;
      }
      if (roleValue === 'personnel' && !personnelRole) {
        toast.error('حدد صفة المنسوب: إمام أو مؤذن أو خطيب أو خطيب متعاون');
        return;
      }
      await mosqueApi.setAssignment(userId, {
        role: roleValue,
        siteId: siteId || null,
        personnelRole: roleValue === 'personnel' ? personnelRole : null,
      });
      toast.success(roleValue === 'personnel' ? 'تم ربط المستخدم بالموقع والصفة التشغيلية' : 'تم تحديث الدور التشغيلي');
      const rows = await mosqueApi.assignments();
      setAssignments(rows);
      setAssignmentDrafts(Object.fromEntries(rows.map((item) => [item.userId, { role: item.role, siteId: item.siteId || '', personnelRole: item.personnelRole || 'imam' }])));
      setPersonnel(await mosqueApi.personnel());
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الدور'); }
  };

  const openMediaImportDialog = () => {
    setMediaImportRows([]);
    setMediaImportProgress({ done: 0, total: 0, label: '' });
    mediaImportZipRef.current = null;
    setMediaImportDialog(true);
  };

  const parseMediaImportZip = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) return toast.error('اختر ملف ZIP صالحًا');
    setMediaImportParsing(true);
    setMediaImportRows([]);
    setMediaImportProgress({ done: 0, total: 0, label: 'جاري تحليل الملف...' });
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      mediaImportZipRef.current = zip;
      const entries = Object.values(zip.files).filter((entry) => !entry.dir && !entry.name.startsWith('__MACOSX/'));
      const rows: ZipMediaImportRow[] = entries.map((entry, index) => {
        const mimeType = mediaImportMimeForPath(entry.name);
        const fileName = entry.name.split('/').pop() || entry.name;
        if (!mimeType) {
          return { id: `zip-${index}`, path: entry.name, fileName, mimeType: null, kind: 'document', siteId: '', status: 'unsupported', selected: false, score: 0, note: 'نوع الملف غير مدعوم' };
        }
        const match = matchMediaImportSite(entry.name, sites);
        return {
          id: `zip-${index}`,
          path: entry.name,
          fileName,
          mimeType,
          kind: mimeType.startsWith('image/') ? 'mosque_image' : 'document',
          siteId: match.siteId,
          status: match.status,
          selected: match.status === 'matched',
          score: match.score,
          note: match.note,
        };
      });
      setMediaImportRows(rows);
      const matched = rows.filter((row) => row.status === 'matched').length;
      const review = rows.filter((row) => row.status === 'review').length;
      const unsupported = rows.filter((row) => row.status === 'unsupported').length;
      toast.success(`تم تحليل ${rows.length} ملفًا: ${matched} مطابق تلقائيًا، ${review} يحتاج مراجعة${unsupported ? `، ${unsupported} غير مدعوم` : ''}`);
    } catch (error) {
      mediaImportZipRef.current = null;
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف ZIP');
    } finally {
      setMediaImportParsing(false);
      setMediaImportProgress({ done: 0, total: 0, label: '' });
    }
  };

  const importSelectedMediaZip = async () => {
    const zip = mediaImportZipRef.current;
    if (!zip) return toast.error('اختر ملف ZIP أولًا');
    const selectedRows = mediaImportRows.filter((row) => row.selected && row.siteId && row.status !== 'unsupported');
    if (!selectedRows.length) return toast.error('حدد ملفًا واحدًا على الأقل وحدد الموقع المرتبط به');

    const grouped = new Map<string, ZipMediaImportRow[]>();
    for (const row of selectedRows) grouped.set(row.siteId, [...(grouped.get(row.siteId) || []), row]);

    setMediaImportSaving(true);
    setMediaImportProgress({ done: 0, total: selectedRows.length, label: 'بدء الاستيراد...' });
    let imported = 0;
    let skipped = 0;
    let done = 0;
    const failures: string[] = [];

    for (const [siteId, rows] of grouped.entries()) {
      const site = sites.find((item) => item.id === siteId);
      if (!site) {
        failures.push(`تعذر العثور على الموقع المرتبط بـ ${rows[0]?.fileName || 'ملف'}`);
        done += rows.length;
        continue;
      }
      const nextMedia = normalizeSiteMedia(site.images);
      const existingNames = new Set([
        ...nextMedia.photos.map((item) => canonicalMediaFileName(item.fileName || '')),
        ...nextMedia.documents.map((item) => canonicalMediaFileName(item.fileName || '')),
      ].filter(Boolean));
      const uploadedFileIds: string[] = [];
      let addedToSite = 0;

      try {
        for (const row of rows) {
          const canonicalName = canonicalMediaFileName(row.fileName);
          if (canonicalName && existingNames.has(canonicalName)) {
            skipped += 1;
            done += 1;
            setMediaImportProgress({ done, total: selectedRows.length, label: `تخطي ملف مكرر: ${row.fileName}` });
            continue;
          }
          const entry = zip.file(row.path);
          if (!entry) throw new Error(`تعذر قراءة ${row.fileName} من ملف ZIP`);
          setMediaImportProgress({ done, total: selectedRows.length, label: `رفع ${row.fileName} إلى ${site.name}` });
          const blob = await entry.async('blob');
          const file = new File([blob], row.fileName, { type: row.mimeType || blob.type || 'application/octet-stream' });
          const uploaded = await mosqueApi.upload(file);
          if (uploaded.driveFileId) uploadedFileIds.push(uploaded.driveFileId);
          const media = {
            url: uploaded.driveUrl,
            fileId: uploaded.driveFileId || null,
            fileName: row.fileName,
            mimeType: uploaded.mimeType || row.mimeType || null,
          };
          if (row.kind === 'document') nextMedia.documents.push(media);
          else nextMedia.photos.push({ ...media, category: row.kind });
          if (canonicalName) existingNames.add(canonicalName);
          imported += 1;
          addedToSite += 1;
          done += 1;
          setMediaImportProgress({ done, total: selectedRows.length, label: `تم رفع ${done} من ${selectedRows.length}` });
        }
        if (addedToSite > 0) await mosqueApi.updateSite(site.id, mediaImportSitePayload(site, nextMedia));
      } catch (error) {
        imported -= addedToSite;
        failures.push(`${site.name}: ${error instanceof Error ? error.message : 'تعذر إكمال الاستيراد'}`);
        for (const fileId of uploadedFileIds.reverse()) {
          try { await mosqueApi.deleteUpload(fileId); } catch { /* best-effort rollback */ }
        }
      }
    }

    try { await loadAll(); } catch { /* loadAll reports its own error */ }
    setMediaImportSaving(false);
    setMediaImportProgress({ done: selectedRows.length, total: selectedRows.length, label: failures.length ? 'اكتمل مع ملاحظات' : 'اكتمل الاستيراد' });

    if (failures.length) {
      toast.error(`تم استيراد ${imported} ملفًا${skipped ? ` وتخطي ${skipped} مكرر` : ''}. تعذر إكمال ${failures.length} مجموعة: ${failures.slice(0, 2).join(' | ')}`);
    } else {
      toast.success(`تم استيراد ${imported} ملفًا وربطها بالمواقع${skipped ? `، وتم تخطي ${skipped} ملفًا مكررًا` : ''}`);
      setMediaImportDialog(false);
      setMediaImportRows([]);
      mediaImportZipRef.current = null;
    }
  };

  const mediaImportStats = useMemo(() => ({
    total: mediaImportRows.length,
    matched: mediaImportRows.filter((row) => row.status === 'matched').length,
    review: mediaImportRows.filter((row) => row.status === 'review').length,
    manual: mediaImportRows.filter((row) => row.status === 'manual').length,
    unsupported: mediaImportRows.filter((row) => row.status === 'unsupported').length,
    selected: mediaImportRows.filter((row) => row.selected && row.siteId && row.status !== 'unsupported').length,
  }), [mediaImportRows]);

  const exportReportExcel = async () => {
    try {
      const data = await mosqueApi.reportSummary();
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sites || []), 'المساجد والمصليات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.requests || []), 'الطلبات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.tickets || []), 'البلاغات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.leaves || []), 'الإجازات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.jobs || []), 'التوظيف');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(quranInventoryItems.map((item) => ({ الموقع: item.site.name, النوع: siteTypeDisplayLabel(item.site as MosqueSite), كبير: item.latest?.largeCount || 0, متوسط: item.latest?.mediumCount || 0, صغير: item.latest?.smallCount || 0, الإجمالي: item.latest?.totalCount || 0, تالف: item.latest?.damagedCount || 0, الاحتياج: item.latest?.neededCount || 0, 'آخر جرد': item.latest?.countedAt ? new Date(item.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد' }))), 'حصر المصاحف');
      XLSX.writeFile(workbook, `mosques-unit-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تصدير التقرير'); }
  };

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const linkedSite = dashboard?.linkedSite || visibleSites[0] || null;
  const activeMyRequests = requests.filter((item) => !['closed', 'rejected'].includes(item.status));
  const maintenanceMyRequests = requests.filter((item) => item.requestType === 'maintenance' && !['closed', 'rejected'].includes(item.status));
  const filteredRequests = useMemo(() => {
    if (requestQuickFilter === 'all') return requests;
    if (requestQuickFilter === 'late') {
      const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return requests.filter((item) => ['new', 'under_review', 'approved', 'in_progress'].includes(item.status) && new Date(item.createdAt).getTime() < threshold);
    }
    return requests.filter((item) => item.status === requestQuickFilter);
  }, [requests, requestQuickFilter]);
  const filteredTickets = useMemo(() => ticketQuickFilter === 'open' ? tickets.filter((item) => !['closed', 'rejected'].includes(item.status)) : tickets, [tickets, ticketQuickFilter]);
  const filteredLeaves = useMemo(() => leaveQuickFilter === 'pending' ? leaves.filter((item) => ['pending', 'under_review'].includes(item.status)) : leaves, [leaves, leaveQuickFilter]);

  const goToDashboardSection = (tab: string, filters: { request?: 'all' | 'new' | 'under_review' | 'approved' | 'late'; ticket?: 'all' | 'open'; leave?: 'all' | 'pending' } = {}) => {
    setRequestQuickFilter(filters.request || 'all');
    setTicketQuickFilter(filters.ticket || 'all');
    setLeaveQuickFilter(filters.leave || 'all');
    setActiveTab(tab);
  };

  const handleTabChange = (tab: string) => goToDashboardSection(tab);

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="mr-3 font-semibold">جاري تحميل وحدة المساجد والمصليات...</span></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1760px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[28px] border border-sky-200/70 bg-gradient-to-l from-white via-sky-50/70 to-emerald-50/40 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.08)] md:p-7">
        <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">وحدة تشغيلية متكاملة</Badge>
              <Badge variant="outline" className="border-sky-300 bg-white text-sky-700"><Shield className="ml-1 h-3.5 w-3.5" />{fullPermissionAccess ? 'مسؤول الوحدة — صلاحية كاملة' : role === 'personnel' && myPersonnelRole ? personnelRoleLabels[myPersonnelRole] || myPersonnelRole : roleLabels[role]}</Badge>
            </div>
            <h1 className="text-2xl font-black text-slate-900 md:text-4xl">وحدة العناية بالمساجد والمصليات الجامعية</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600 md:text-base">إدارة المساجد والمصليات، الطلبات والصيانة، البلاغات، الإجازات، التوظيف، الخرائط، التقارير والإشعارات ضمن مسار حوكمة موحد.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><ExternalLink className="ml-2 h-4 w-4" />البوابة العامة</Button>
            {role !== 'personnel' && <Button variant="outline" className={button3d} onClick={() => window.open('https://inspection-vna1.vercel.app/', '_blank', 'noopener,noreferrer')}><ClipboardList className="ml-2 h-4 w-4" />نظام المعاينة</Button>}
            <Button variant="outline" className={button3d} onClick={loadAll}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
            {canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" className={button3d} onClick={openMediaImportDialog}><FileText className="ml-2 h-4 w-4" />استيراد مكتبة ZIP</Button>}
            {canAdd && ['head', 'supervisor'].includes(role) && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}
          </div>
        </div>
      </section>

      {role === 'head' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} onClick={() => goToDashboardSection('sites')} />
        <Stat title="إجمالي المصاحف" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلبات جديدة" value={dashboard?.stats.newRequests || 0} icon={ClipboardList} onClick={() => goToDashboardSection('requests', { request: 'new' })} />
        <Stat title="تحت المراجعة" value={dashboard?.stats.reviewRequests || 0} icon={Clock3} onClick={() => goToDashboardSection('requests', { request: 'under_review' })} />
        <Stat title="معتمدة" value={dashboard?.stats.approvedRequests || 0} icon={CheckCircle2} onClick={() => goToDashboardSection('requests', { request: 'approved' })} />
        <Stat title="طلبات متأخرة" value={dashboard?.stats.lateRequests || 0} icon={AlertTriangle} onClick={() => goToDashboardSection('requests', { request: 'late' })} />
        <Stat title="بلاغات مفتوحة" value={dashboard?.stats.openTickets || 0} icon={MessageSquare} onClick={() => goToDashboardSection('tickets', { ticket: 'open' })} />
        <Stat title="إجازات معلقة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} onClick={() => goToDashboardSection('leaves', { leave: 'pending' })} />
        <Stat title="طلبات توظيف" value={dashboard?.stats.jobs || 0} icon={Briefcase} onClick={() => goToDashboardSection('jobs')} />
      </div>}

      {role === 'supervisor' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <Stat title="المساجد التابعة لي" value={dashboard?.stats.managedSites || 0} icon={Building2} />
        <Stat title="إجمالي المصاحف" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلبات تحتاج متابعة" value={dashboard?.stats.assignedRequests || 0} icon={ClipboardList} />
        <Stat title="بلاغات جديدة" value={dashboard?.stats.newTickets || 0} icon={MessageSquare} />
        <Stat title="طلبات عاجلة" value={dashboard?.stats.urgentRequests || 0} icon={AlertTriangle} />
        <Stat title="إجازات للمراجعة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="التنبيهات" value={unreadNotifications} icon={Bell} />
      </div>}

      {role === 'personnel' && <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat title="الموقع المرتبط" value={linkedSite ? 1 : 0} icon={Building2} />
        <Stat title="مصاحف الموقع" value={quranSummary.total || 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلباتي الحالية" value={dashboard?.stats.myRequests || activeMyRequests.length} icon={ClipboardList} />
        <Stat title="طلبات الصيانة" value={maintenanceMyRequests.length} icon={Wrench} />
        <Stat title="الإجازات الحالية" value={dashboard?.stats.myLeaves || 0} icon={CalendarDays} />
        <Stat title="الإشعارات" value={unreadNotifications} icon={Bell} />
      </div>}



      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="quran">المصاحف</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="requests">الطلبات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="tickets">البلاغات</TabsTrigger>}
          {['head', 'supervisor', 'personnel'].includes(role) && <TabsTrigger value="leaves">الإجازات</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="jobs">التوظيف</TabsTrigger>}
          <TabsTrigger value="map">الخريطة</TabsTrigger>
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="reports">التقارير</TabsTrigger>}
          {['head', 'supervisor'].includes(role) && <TabsTrigger value="team">منسوبو المساجد</TabsTrigger>}
          {isAdmin && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          {role !== 'university_member' && role !== 'viewer' && <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {role === 'head' && <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>آخر طلبات الصيانة والاحتياج</CardTitle><CardDescription>أحدث العمليات داخل منظومة الوحدة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حتى الآن" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>آخر البلاغات</CardTitle><CardDescription>بلاغات الزوار ومنسوبي الجامعة التي تحتاج متابعة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد بلاغات حتى الآن" />}</CardContent></Card>
            </div>
            <Card className={card3d}><CardHeader><CardTitle>إدارة المنظومة</CardTitle><CardDescription>رئيس الوحدة يملك الرؤية الشاملة والتقارير والإعدادات واعتماد الإجراءات.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Rule title="الإشراف الشامل" text="متابعة جميع المساجد والمصليات والطلبات والبلاغات." /><Rule title="الاعتماد" text="اعتماد الطلبات والإجازات والقرارات النهائية." /><Rule title="المؤشرات" text="متابعة الأداء والطلبات المتأخرة والحالات العاجلة." /><Rule title="منسوبو المساجد" text="إدارة ومتابعة الإمام والمؤذن والخطيب والخطيب المتعاون فقط." /></CardContent></Card>
          </>}

          {role === 'supervisor' && <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>الطلبات التي تحتاج متابعة</CardTitle><CardDescription>طلبات المساجد التابعة لك حسب الإسناد التشغيلي.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات معلقة" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>البلاغات الجديدة</CardTitle><CardDescription>متابعة البلاغات والشكاوى للمواقع التابعة لك.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد بلاغات جديدة" />}</CardContent></Card>
            </div>
            <Card className={card3d}><CardHeader><CardTitle>مهام مشرف الوحدة</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Rule title="المراجعة اليومية" text="استقبال الطلبات ومراجعة الصيانة والاحتياجات." /><Rule title="البلاغات" text="متابعة البلاغات والشكاوى وتحديث حالاتها." /><Rule title="المنسوبون" text="التواصل مع منسوبي المساجد وإضافة الحسابات التشغيلية." /><Rule title="التقارير" text="رفع تقارير دورية عن المساجد التابعة لك." /></CardContent></Card>
          </>}

          {role === 'personnel' && <>
            <Card className={card3d}><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />بيانات المسجد أو المصلى المرتبط بحسابي</CardTitle><CardDescription>{myPersonnelRole ? `الصفة التشغيلية: ${personnelRoleLabels[myPersonnelRole] || myPersonnelRole}` : 'منسوب مسجد أو مصلى'}</CardDescription></CardHeader><CardContent>{linkedSite ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="الاسم" value={linkedSite.name} /><Info label="النوع" value={siteTypeDisplayLabel(linkedSite)} /><Info label="الموقع" value={[linkedSite.campusLocation, linkedSite.city, linkedSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="الحالة" value={siteStatusLabels[linkedSite.status] || linkedSite.status} /></div> : <Empty text="لم يتم ربط حسابك بمسجد أو مصلى حتى الآن" />}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>طلباتي الحالية</CardTitle><CardDescription>متابعة طلبات الاحتياج والصيانة التي قدمتها.</CardDescription></CardHeader><CardContent className="space-y-2">{activeMyRequests.length ? activeMyRequests.slice(0, 5).map((item) => <MiniRow key={item.id} title={item.requestNumber} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حالية" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>الخدمات السريعة</CardTitle><CardDescription>تقديم طلب أو إجازة/اعتذار واستقبال الإشعارات.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button className={button3d} onClick={openRequestDialog}><Wrench className="ml-2 h-4 w-4" />تقديم طلب جديد</Button><Button variant="outline" className={button3d} onClick={openLeaveDialog}><CalendarDays className="ml-2 h-4 w-4" />إجازة أو اعتذار</Button>{linkedSite?.mapUrl && <Button variant="outline" className={button3d} onClick={() => window.open(linkedSite.mapUrl!, '_blank')}><MapPin className="ml-2 h-4 w-4" />موقع المسجد</Button>}</CardContent></Card>
            </div>
          </>}

          {(role === 'university_member' || role === 'viewer') && <Card className={card3d}><CardHeader><CardTitle>منسوب الجامعة</CardTitle><CardDescription>الموظف، عضو هيئة التدريس، أو الطالب.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-slate-600">يمكنك الاطلاع على المعلومات العامة ومواقع المساجد والمصليات، وإرسال بلاغ أو شكوى ومتابعته برقم المتابعة. البيانات الداخلية والتقارير وبيانات الموظفين غير متاحة لهذا الدور.</p><div className="flex flex-wrap gap-3"><Button className={button3d} onClick={() => navigate('/mosques/public')}><MessageSquare className="ml-2 h-4 w-4" />إرسال أو متابعة بلاغ</Button><Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><MapPin className="ml-2 h-4 w-4" />معلومات ومواقع المساجد</Button></div></CardContent></Card>}
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <Card className="overflow-hidden border-sky-200/70 bg-white/85 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <CardHeader className="border-b border-sky-100/80 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/75 pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><Filter className="h-5 w-5 text-sky-700" />التصفية والفرز للطباعة</CardTitle>
                  <CardDescription className="mt-1">حدد السجلات ورتبها كما تريد؛ نفس النتائج الظاهرة هي التي ستُطبع أو تحفظ PDF.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className={button3d} onClick={resetSiteFilters}><X className="ml-2 h-4 w-4" />مسح التصفية</Button>
                  {canPrint && visibleSites.length > 0 && <Button variant="outline" className={button3d} onClick={() => printSitesTable(visibleSites, 'preview')}><Eye className="ml-2 h-4 w-4" />معاينة التقرير</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => printSitesTable(visibleSites, 'print')}><Printer className="ml-2 h-4 w-4" />طباعة / PDF كجدول ({visibleSites.length})</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <div className="relative md:col-span-2 xl:col-span-2">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 rounded-xl pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو المدينة أو الحي أو الموقع أو الإمام..." />
                  {search && <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setSearch('')}><X className="h-4 w-4" /></Button>}
                </div>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterCity} onChange={(e) => setSiteFilterCity(e.target.value)}><option value="">جميع المدن</option>{siteCities.map((city) => <option key={city} value={city}>{city}</option>)}</NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterType} onChange={(e) => setSiteFilterType(e.target.value)}><option value="all">جميع الأنواع</option><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterStatus} onChange={(e) => setSiteFilterStatus(e.target.value)}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteSortBy} onChange={(e) => setSiteSortBy(e.target.value)}><option value="name">فرز حسب الاسم</option><option value="building">فرز حسب رقم المبنى</option><option value="city">فرز حسب المدينة</option><option value="type">فرز حسب النوع</option><option value="status">فرز حسب الحالة</option><option value="area">فرز حسب المساحة</option></NativeSelect>
              </div>

              <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-l from-sky-50/80 via-white to-emerald-50/60 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Printer className="h-4 w-4 text-sky-700" /><span className="text-sm font-black text-slate-800">أعمدة الطباعة / PDF</span><Badge variant="outline" className="border-sky-200 bg-white text-sky-700">{sitePrintColumns.length} من {SITE_PRINT_COLUMNS.length} محدد</Badge></div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">ضع علامة على البيانات التي تريد ظهورها في جدول الطباعة. يبقى رقم التسلسل «م» ظاهرًا تلقائيًا.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={selectAllSitePrintColumns}>تحديد الكل</Button>
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={resetSitePrintColumns}>الأعمدة الأساسية</Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
                  {SITE_PRINT_COLUMNS.map((column) => {
                    const checked = sitePrintColumns.includes(column.key);
                    return <label key={column.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${checked ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                      <input type="checkbox" className="h-4 w-4 accent-sky-700" checked={checked} onChange={() => toggleSitePrintColumn(column.key)} />
                      <span>{column.label}</span>
                    </label>;
                  })}
                </div>
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[11px] leading-6 text-emerald-900"><strong>سيتم طباعة:</strong> {SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key)).map((column) => column.label).join('، ')}</div>
              </div>

              <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-l from-indigo-50/70 via-white to-sky-50/60 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Printer className="h-4 w-4 text-indigo-700" /><span className="text-sm font-black text-slate-800">تنسيق الطباعة الذكي</span><Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700">يتكيف مع محتوى الحقول</Badge></div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">الوضع الذكي يمنح الحقول القصيرة مساحة أقل ويعطي الموقع والملاحظات مساحة أكبر، مع إمكانية التحكم اليدوي عند الحاجة.</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className={button3d} onClick={resetSitePrintLayout}>إعادة التنسيق التلقائي</Button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <Label className="mb-1.5 block text-xs font-bold text-slate-600">حجم الخط (px)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" inputMode="decimal" min={SITE_PRINT_FONT_MIN} max={SITE_PRINT_FONT_MAX} step={0.5} className="h-10 rounded-xl bg-white text-center font-bold" value={sitePrintFontSize} onChange={(e) => { const next = Number(e.target.value); if (Number.isFinite(next)) { setSitePrintFontSize(Math.min(SITE_PRINT_FONT_MAX, Math.max(SITE_PRINT_FONT_MIN, next))); setSitePrintFontAuto(false); } }} />
                      <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${sitePrintFontAuto ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                        <input type="checkbox" className="h-4 w-4 accent-sky-700" checked={sitePrintFontAuto} onChange={(e) => setSitePrintFontAuto(e.target.checked)} />
                        تلقائي
                      </label>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">من {SITE_PRINT_FONT_MIN} إلى {SITE_PRINT_FONT_MAX} px — كل تعديل رقمي يلغي الوضع التلقائي.</p>
                  </div>
                  <div><Label className="mb-1.5 block text-xs font-bold text-slate-600">مساحة الأعمدة</Label><NativeSelect className="h-10 rounded-xl bg-white" value={sitePrintWidthMode} onChange={(e) => setSitePrintWidthMode(e.target.value as SitePrintWidthMode)}><option value="smart">تلقائي ذكي حسب المحتوى</option><option value="compact">مضغوط</option><option value="equal">متساوٍ</option></NativeSelect></div>
                  <div><Label className="mb-1.5 block text-xs font-bold text-slate-600">عرض النص داخل الحقل</Label><NativeSelect className="h-10 rounded-xl bg-white" value={sitePrintWrapMode} onChange={(e) => setSitePrintWrapMode(e.target.value as SitePrintWrapMode)}><option value="wrap">التفاف تلقائي للنص</option><option value="single">سطر واحد</option></NativeSelect></div>
                  <div><Label className="mb-1.5 block text-xs font-bold text-slate-600">اتجاه الصفحة</Label><NativeSelect className="h-10 rounded-xl bg-white" value={sitePrintOrientation} onChange={(e) => setSitePrintOrientation(e.target.value as SitePrintOrientation)}><option value="auto">تلقائي حسب عدد الأعمدة</option><option value="landscape">أفقي</option><option value="portrait">عمودي</option></NativeSelect></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-[11px] leading-6 text-sky-900"><strong>التنسيق الحالي:</strong><span>الخط: {sitePrintFontAuto ? 'تلقائي' : `${sitePrintFontSize} px`}</span><span>•</span><span>الأعمدة: {sitePrintWidthMode === 'smart' ? 'ذكية حسب المحتوى' : sitePrintWidthMode === 'compact' ? 'مضغوطة' : 'متساوية'}</span><span>•</span><span>النص: {sitePrintWrapMode === 'wrap' ? 'التفاف' : 'سطر واحد'}</span><span>•</span><span>الصفحة: {sitePrintOrientation === 'auto' ? 'تلقائية' : sitePrintOrientation === 'portrait' ? 'عمودية' : 'أفقية'}</span></div>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">السجلات الظاهرة</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.total.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">المساجد والجوامع</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.mosques.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">المصليات</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.prayerRooms.toLocaleString('ar-SA')}</p></div>
                  <div className="rounded-xl border bg-white px-3 py-2"><p className="text-[11px] text-muted-foreground">إجمالي المساحة</p><p className="mt-1 text-lg font-black text-slate-800">{siteFilterStats.totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</p></div>
                </div>
                <div className="flex min-w-[190px] items-center gap-2 rounded-xl border bg-white p-2">
                  <span className="whitespace-nowrap text-xs font-semibold text-slate-600">اتجاه الفرز</span>
                  <NativeSelect className="h-9 flex-1" value={siteSortDirection} onChange={(e) => setSiteSortDirection(e.target.value as 'asc' | 'desc')}><option value="asc">تصاعدي ↑</option><option value="desc">تنازلي ↓</option></NativeSelect>
                </div>
              </div>

              {(search || siteFilterCity || siteFilterType !== 'all' || siteFilterStatus !== 'all' || siteSortBy !== 'name' || siteSortDirection !== 'asc') && <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">المعايير الحالية:</span>
                {search && <Badge variant="outline">بحث: {search}</Badge>}
                {siteFilterCity && <Badge variant="outline">المدينة: {siteFilterCity}</Badge>}
                {siteFilterType !== 'all' && <Badge variant="outline">النوع: {siteTypeLabels[siteFilterType]}</Badge>}
                {siteFilterStatus !== 'all' && <Badge variant="outline">الحالة: {siteStatusLabels[siteFilterStatus]}</Badge>}
                <Badge variant="outline">الفرز: {{ name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' }[siteSortBy] || siteSortBy} — {siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}</Badge>
              </div>}
            </CardContent>
          </Card>
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} canPrint={canPrint} onPreview={() => setPreviewSite(site)} onPrint={() => void printSiteCard(site)} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined} />)}</div>}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openRequestDialog}><Plus className="ml-2 h-4 w-4" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</Button></div>}
          {requestQuickFilter !== 'all' && <QuickFilterBar label={requestQuickFilter === 'new' ? 'الطلبات الجديدة' : requestQuickFilter === 'under_review' ? 'الطلبات تحت المراجعة' : requestQuickFilter === 'approved' ? 'الطلبات المعتمدة' : 'الطلبات المتأخرة'} onClear={() => setRequestQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredRequests.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} submitterName={item.applicant?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || 'مقدم الطلب'} onView={() => setViewingWorkflow({ kind: 'request', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openReturnedRequestEdit(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('request', item)} />)}</div>
          {!filteredRequests.length && <Empty text="لا توجد طلبات مطابقة" />}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {ticketQuickFilter !== 'all' && <QuickFilterBar label="البلاغات المفتوحة" onClear={() => setTicketQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredTickets.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'بدون وسيلة تواصل']} submitterName={item.reporterName || 'غير محدد'} submitterRole="مقدّم البلاغ" onView={() => setViewingWorkflow({ kind: 'ticket', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={<>{workflowAdminActions('ticket', item)}{['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant="outline" size="sm" className={button3d} onClick={() => convertTicket(item)}><Wrench className="ml-1 h-3.5 w-3.5" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant="outline">مرتبط بطلب صيانة</Badge> : null}</>} />)}</div>
          {!filteredTickets.length && <Empty text="لا توجد بلاغات مطابقة" />}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openLeaveDialog}><Plus className="ml-2 h-4 w-4" />طلب إجازة / اعتذار</Button></div>}
          {leaveQuickFilter !== 'all' && <QuickFilterBar label="الإجازات والاعتذارات المعلقة" onClear={() => setLeaveQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredLeaves.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} submitterName={item.applicant?.name || item.personnel?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || (item.personnel?.role ? personnelRoleLabels[item.personnel.role] || item.personnel.role : 'مقدم الطلب')} onView={() => setViewingWorkflow({ kind: 'leave', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openReturnedLeaveEdit(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('leave', item)} />)}</div>
          {!filteredLeaves.length && <Empty text="لا توجد طلبات إجازة أو اعتذار مطابقة" />}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">بيانات الهوية والجوال والبريد والسيرة الذاتية تظهر فقط للمخولين داخل الوحدة، ولا تظهر في البوابة العامة.</div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{jobs.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} title={item.applicationNumber} subtitle={`${item.fullName} — ${item.jobType}`} description={`${item.qualification}${item.preferredLocation ? ` — ${item.preferredLocation}` : ''}`} status={item.status} meta={[item.email, item.phone]} onStatus={canEdit && role === 'head' ? () => openStatusDialog('job', item) : undefined} extraAction={<>{workflowAdminActions('job', item)}{item.cvUrl ? <Button variant="outline" size="sm" className={button3d} onClick={() => window.open(item.cvUrl!, '_blank')}><Eye className="ml-1 h-3.5 w-3.5" />السيرة الذاتية</Button> : null}</>} />)}</div>
          {!jobs.length && <Empty text="لا توجد طلبات توظيف" />}
        </TabsContent>

        <TabsContent value="quran" className="space-y-4">
          <Card className={`${card3d} overflow-hidden`}>
            <CardHeader className="gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 md:flex-row md:items-center md:justify-between">
              <div><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-700" />إدارة وحصر المصاحف</CardTitle><CardDescription>جرد دوري للمصاحف الكبيرة والمتوسطة والصغيرة مع متابعة التالف والاحتياج والاحتفاظ بسجل تاريخي لكل مسجد ومصلى.</CardDescription></div>
              {canPrint && <Button variant="outline" className={button3d} onClick={printQuranInventory}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <ReportMetric label="إجمالي المصاحف" value={quranSummary.total} />
                <ReportMetric label="المصاحف الكبيرة" value={quranSummary.large} />
                <ReportMetric label="المصاحف المتوسطة" value={quranSummary.medium} />
                <ReportMetric label="المصاحف الصغيرة" value={quranSummary.small} />
                <ReportMetric label="التالفة" value={quranSummary.damaged} />
                <ReportMetric label="الاحتياج الحالي" value={quranSummary.needed} />
              </div>
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 pr-10" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." /></div>
                <label className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${quranNeedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={quranNeedOnly} onChange={(e) => setQuranNeedOnly(e.target.checked)} />المواقع التي لديها احتياج فقط</label>
                <Badge variant="outline" className="h-9 justify-center border-sky-200 bg-white px-3">تم جرد {quranSummary.countedSites} من {quranSummary.sites}</Badge>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3 text-center">كبيرة</th><th className="p-3 text-center">متوسطة</th><th className="p-3 text-center">صغيرة</th><th className="p-3 text-center">الإجمالي</th><th className="p-3 text-center">تالفة</th><th className="p-3 text-center">الاحتياج</th><th className="p-3 text-center">آخر جرد</th><th className="p-3 text-center">الإجراءات</th></tr></thead>
                  <tbody>{filteredQuranInventoryItems.map((item) => {
                    const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                    const latest = item.latest;
                    return <tr key={item.site.id} className="border-t border-slate-100 hover:bg-slate-50/60"><td className="p-3"><p className="font-black text-slate-800">{item.site.name}</p><p className="mt-1 text-xs text-muted-foreground">{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</p></td><td className="p-3 text-center font-bold">{latest?.largeCount ?? 0}</td><td className="p-3 text-center font-bold">{latest?.mediumCount ?? 0}</td><td className="p-3 text-center font-bold">{latest?.smallCount ?? 0}</td><td className="p-3 text-center text-lg font-black text-emerald-700">{latest?.totalCount ?? 0}</td><td className="p-3 text-center font-bold text-red-600">{latest?.damagedCount ?? 0}</td><td className="p-3 text-center font-bold text-amber-700">{latest?.neededCount ?? 0}</td><td className="p-3 text-center text-xs">{latest ? new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : <Badge variant="outline">لم يجرد</Badge>}</td><td className="p-3"><div className="flex justify-center gap-2"><Button size="sm" variant="outline" className={button3d} onClick={() => openQuranInventoryDialog(site)}><Pencil className="ml-1 h-3.5 w-3.5" />تحديث الجرد</Button><Button size="sm" variant="outline" className={button3d} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-3.5 w-3.5" />السجل</Button></div></td></tr>;
                  })}</tbody>
                </table>
              </div>
              {!filteredQuranInventoryItems.length && <Empty text="لا توجد مواقع مطابقة لبحث حصر المصاحف" />}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-900">ملاحظة محاسبية للجرد: <strong>إجمالي المصاحف = كبيرة + متوسطة + صغيرة</strong>. عدد المصاحف التالفة يعتبر جزءًا من هذا الإجمالي ويظهر كمؤشر حالة، بينما «الاحتياج» هو العدد المطلوب توفيره للموقع.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className={`${card3d} overflow-hidden`}><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />خريطة المساجد والمصليات</CardTitle><CardDescription>OpenStreetMap / Leaflet — اضغط على أي نقطة لعرض بيانات الموقع.</CardDescription></CardHeader><CardContent><div className="h-[560px] overflow-hidden rounded-2xl border"><MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapSites.length}`} center={mapCenter} zoom={13} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mapSites.map((site) => <CircleMarker key={site.id} center={[Number(site.latitude), Number(site.longitude)]} radius={10} pathOptions={{ fillOpacity: 0.85 }}><Popup><div dir="rtl" className="min-w-[180px]"><strong>{site.name}</strong><div>{siteTypeDisplayLabel(site)} — {siteStatusLabels[site.status]}</div><div>{site.city || ''} {site.district || ''}</div><div>بلاغات: {site._count?.tickets || 0}</div><button onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')} className="mt-2 underline">فتح في Google Maps</button></div></Popup></CircleMarker>)}</MapContainer></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className={card3d}><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />التقارير والإحصائيات</CardTitle><CardDescription>تجميع بيانات الوحدة للتقارير الشهرية والسنوية مع التصدير.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-3"><ReportMetric label="إجمالي الطلبات" value={requests.length} /><ReportMetric label="المكتملة والمغلقة" value={requests.filter((x) => ['completed', 'closed'].includes(x.status)).length} /><ReportMetric label="البلاغات المفتوحة" value={tickets.filter((x) => !['closed', 'rejected'].includes(x.status)).length} /></div><div className="mt-5 flex flex-wrap gap-2">{canPrint && <Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / حفظ PDF</Button>}<Button variant="outline" className={button3d} onClick={exportReportExcel}><FileText className="ml-2 h-4 w-4" />تصدير Excel</Button></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {canCreateUser && ['head', 'supervisor'].includes(role) && <div className="flex justify-end"><Button className={button3d} onClick={() => openPersonnelDialog()}><UserPlus className="ml-2 h-4 w-4" />إضافة منسوب + حساب دخول</Button></div>}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {personnel.map((item) => (
              <Card key={item.id} className={`${card3d} overflow-hidden`}>
                <div className="h-1.5 bg-gradient-to-l from-emerald-400 via-sky-500 to-blue-800" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-black">{item.name}</h3><p className="text-sm text-muted-foreground">{item.site?.name || '-'}</p></div>
                    <div className="flex flex-col items-end gap-1"><Badge variant="outline">{personnelRoleLabels[item.role] || item.role}</Badge><Badge variant="outline" className={item.active ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600'}>{item.active ? 'نشط' : 'غير نشط'}</Badge></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Info label="الجوال" value={item.mobile || '-'} /><Info label="البريد" value={item.email || '-'} /></div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    <Button variant="outline" size="sm" className={button3d} onClick={() => setViewingPersonnel(item)}><Eye className="ml-1 h-3.5 w-3.5" />عرض</Button>
                    {canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" size="sm" className={button3d} onClick={() => openPersonnelDialog(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل</Button>}
                    {canDelete && role === 'head' && <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deletePersonnel(item)}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!personnel.length && <Empty text="لا يوجد منسوبون مسجلون" />}
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className={card3d}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />الأدوار التشغيلية وربط منسوبي المساجد</CardTitle>
              <CardDescription>اربط حساب المستخدم بمسجد أو مصلى وحدد صفته التشغيلية بدقة: إمام، مؤذن، خطيب، أو خطيب متعاون.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {staffUsers.map((user) => {
                const current = assignments.find((item) => item.userId === user.uid);
                const draft = assignmentDrafts[user.uid] || { role: current?.role || 'viewer', siteId: current?.siteId || '', personnelRole: current?.personnelRole || 'imam' };
                return (
                  <div key={user.uid} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <div><p className="font-bold text-slate-900">{user.username}</p><p className="text-xs text-muted-foreground" dir="ltr">{user.email}</p></div>
                      {current && <Badge variant="outline" className="w-fit">{roleLabels[current.role]}{current.role === 'personnel' && current.personnelRole ? ' — ' + (personnelRoleLabels[current.personnelRole] || current.personnelRole) : ''}</Badge>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <Field label="الدور داخل الوحدة">
                        <NativeSelect value={draft.role} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, role: e.target.value as MosqueModuleRole } }))}>
                          <option value="university_member">منسوب الجامعة</option><option value="personnel">منسوب المسجد أو المصلى</option><option value="supervisor">مشرف الوحدة</option><option value="head">رئيس الوحدة</option>
                        </NativeSelect>
                      </Field>
                      <Field label="المسجد / المصلى">
                        <NativeSelect value={draft.siteId} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, siteId: e.target.value } }))} disabled={draft.role !== 'personnel'}>
                          <option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                        </NativeSelect>
                      </Field>
                      <Field label="الصفة التشغيلية">
                        <NativeSelect value={draft.personnelRole} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, personnelRole: e.target.value } }))} disabled={draft.role !== 'personnel'}>
                          <option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option>
                        </NativeSelect>
                      </Field>
                      <div className="flex items-end"><Button className={button3d} onClick={() => setUserAssignment(user.uid, draft.role, draft.siteId, draft.personnelRole)}><Save className="ml-2 h-4 w-4" />حفظ الربط</Button></div>
                    </div>
                  </div>
                );
              })}
              {!staffUsers.length && <Empty text="لا توجد حسابات مستخدمين للربط" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-3">
          {notifications.map((notice) => <button key={notice.id} onClick={async () => { if (!notice.isRead) { await mosqueApi.readNotification(notice.id); setNotifications((current) => current.map((x) => x.id === notice.id ? { ...x, isRead: true } : x)); } }} className={`w-full rounded-2xl border p-4 text-right transition ${notice.isRead ? 'bg-white' : 'border-sky-300 bg-sky-50 shadow-sm'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{notice.title}</p><p className="mt-1 text-sm text-muted-foreground">{notice.message}</p></div><Bell className={`h-5 w-5 ${notice.isRead ? 'text-slate-400' : 'text-sky-600'}`} /></div><p className="mt-2 text-xs text-muted-foreground">{new Date(notice.createdAt).toLocaleString('ar-SA')}</p></button>)}
          {!notifications.length && <Empty text="لا توجد إشعارات" />}
        </TabsContent>
      </Tabs>

      <Dialog open={mediaImportDialog} onOpenChange={(open) => { if (!mediaImportSaving) { setMediaImportDialog(open); if (!open) { setMediaImportRows([]); mediaImportZipRef.current = null; setMediaImportProgress({ done: 0, total: 0, label: '' }); } } }}>
        <DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 sm:max-w-[1220px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><FileText className="h-5 w-5 text-sky-700" />استيراد جماعي لمكتبة صور ومستندات المساجد</DialogTitle>
            <DialogDescription>اختر ملف ZIP؛ يتم تحليل أسماء المجلدات والملفات محليًا واقتراح المسجد أو المصلى المناسب قبل رفع أي ملف. الملفات غير الواضحة تبقى بحاجة للمراجعة ولا تُرفع تلقائيًا.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(94vh-160px)] space-y-4 overflow-y-auto p-4 md:p-6">
            <Card className="border-sky-200/70 bg-white/90">
              <CardHeader className="pb-3"><CardTitle className="text-base">1. اختيار ملف ZIP</CardTitle><CardDescription>يدعم الصور، PDF، Word، Excel، PowerPoint وMP4 حتى 20 MB لكل ملف داخلي.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept=".zip,application/zip" disabled={mediaImportParsing || mediaImportSaving} onChange={(e) => { const file = e.target.files?.[0] || null; void parseMediaImportZip(file); e.currentTarget.value = ''; }} />
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs leading-6 text-emerald-900">مرحلة التحليل لا ترفع أي ملفات إلى الخادم. الرفع يبدأ فقط بعد مراجعة المطابقة والضغط على «استيراد الملفات المحددة».</div>
              </CardContent>
            </Card>

            {mediaImportRows.length > 0 && <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <ReportMetric label="إجمالي الملفات" value={mediaImportStats.total} />
                <ReportMetric label="مطابقة تلقائية" value={mediaImportStats.matched} />
                <ReportMetric label="بحاجة للمراجعة" value={mediaImportStats.review} />
                <ReportMetric label="مطابقة يدوية" value={mediaImportStats.manual} />
                <ReportMetric label="غير مدعوم" value={mediaImportStats.unsupported} />
                <ReportMetric label="محدد للاستيراد" value={mediaImportStats.selected} />
              </div>

              <Card className="border-sky-200/70 bg-white/90">
                <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                  <div><CardTitle className="text-base">2. مراجعة المطابقة والتصنيف</CardTitle><CardDescription>يمكن تغيير الموقع المقترح أو تصنيف الصورة قبل الاستيراد.</CardDescription></div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => row.status === 'matched' ? { ...row, selected: true } : row))}>تحديد المطابق تلقائيًا</Button>
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => row.status === 'review' && row.siteId ? { ...row, selected: true } : row))}>اعتماد كل المقترحات</Button>
                    <Button type="button" size="sm" variant="outline" className={button3d} onClick={() => setMediaImportRows((rows) => rows.map((row) => ({ ...row, selected: false })))}>إلغاء التحديد</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mediaImportRows.map((row) => {
                    const folder = row.path.split('/').slice(-2, -1)[0] || '-';
                    const imageFile = Boolean(row.mimeType?.startsWith('image/'));
                    return <div key={row.id} className={`grid gap-3 rounded-2xl border p-3 lg:grid-cols-[34px_minmax(230px,1.4fr)_minmax(230px,1fr)_190px_140px] ${row.selected ? 'border-emerald-300 bg-emerald-50/40' : 'bg-white'}`}>
                      <div className="flex items-center justify-center"><input type="checkbox" className="h-4 w-4" disabled={row.status === 'unsupported' || !row.siteId || mediaImportSaving} checked={row.selected} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, selected: e.target.checked } : item))} /></div>
                      <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{row.fileName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{folder}</p><p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{row.note}</p></div>
                      <NativeSelect value={row.siteId} disabled={row.status === 'unsupported' || mediaImportSaving} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, siteId: e.target.value, status: e.target.value ? 'manual' : 'review', selected: Boolean(e.target.value) } : item))}><option value="">اختر المسجد / المصلى</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {site.campusLocation || site.district || ''}</option>)}</NativeSelect>
                      <NativeSelect value={row.kind} disabled={row.status === 'unsupported' || mediaImportSaving} onChange={(e) => setMediaImportRows((rows) => rows.map((item) => item.id === row.id ? { ...item, kind: e.target.value as MediaImportKind } : item))}>{imageFile && <option value="mosque_image">صورة المسجد / المصلى</option>}{imageFile && <option value="site_image">صورة الموقع / المبنى</option>}<option value="document">مستند / ملف</option></NativeSelect>
                      <div className="flex items-center justify-end"><Badge variant="outline" className={row.status === 'matched' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : row.status === 'manual' ? 'border-sky-300 bg-sky-50 text-sky-700' : row.status === 'unsupported' ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>{row.status === 'matched' ? 'مطابق تلقائيًا' : row.status === 'manual' ? 'اختيار يدوي' : row.status === 'unsupported' ? 'غير مدعوم' : 'راجع المطابقة'}</Badge></div>
                    </div>;
                  })}
                </CardContent>
              </Card>
            </>}

            {(mediaImportParsing || mediaImportSaving || mediaImportProgress.label) && <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-900"><div className="flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${mediaImportParsing || mediaImportSaving ? 'animate-spin' : ''}`} /><strong>{mediaImportProgress.label || (mediaImportParsing ? 'جاري تحليل الملف...' : 'جاري الاستيراد...')}</strong></div>{mediaImportProgress.total > 0 && <p className="mt-2 text-xs">{mediaImportProgress.done} من {mediaImportProgress.total}</p>}</div>}
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} disabled={mediaImportSaving} onClick={() => setMediaImportDialog(false)}>إلغاء</Button><Button className={'min-w-44 ' + button3d} disabled={mediaImportSaving || mediaImportStats.selected === 0} onClick={importSelectedMediaZip}>{mediaImportSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}{mediaImportSaving ? 'جاري الاستيراد...' : `استيراد الملفات المحددة (${mediaImportStats.selected})`}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>
        <DialogContent className="grid h-[94dvh] max-h-[94dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-violet-50/30 sm:max-w-[1180px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100/90 bg-gradient-to-l from-sky-50 via-white to-violet-50/70 p-5 text-right md:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-white text-sky-700 shadow-sm"><Building2 className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 md:text-2xl">{editingSite ? 'تعديل بيانات المسجد / الجامع / المصلى' : 'إضافة مسجد / جامع / مصلى جديد'}</DialogTitle>
                <DialogDescription className="mt-1 leading-6">نموذج موحد لتسجيل البيانات الأساسية والموقع والطاقة الاستيعابية وبيانات المسؤولين الرئيسيين.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 pb-6 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />المعلومات الأساسية</CardTitle><CardDescription>تعريف المسجد أو الجامع أو المصلى وحالته وموقعه الإداري داخل الجامعة.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 lg:grid-cols-3">
                <Field label="اسم المسجد / الجامع / المصلى *"><Input className="h-11" autoFocus value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="مثال: مسجد الحرم الجامعي" /></Field>
                <Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value, prayerRoomGender: e.target.value === 'prayer_room' ? siteForm.prayerRoomGender : '' })}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect></Field>
                {siteForm.siteType === 'prayer_room' && <Field label="فئة المصلى *"><NativeSelect className="h-11" value={siteForm.prayerRoomGender || ''} onChange={(e) => setSiteForm({ ...siteForm, prayerRoomGender: e.target.value })}><option value="">اختر الفئة</option><option value="men">رجال</option><option value="women">نساء</option></NativeSelect></Field>}
                <Field label="الحالة"><NativeSelect className="h-11" value={siteForm.status} onChange={(e) => setSiteForm({ ...siteForm, status: e.target.value })}><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect></Field>
                <Field label="المدينة"><Input className="h-11" value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} /></Field>
                <Field label="الحي"><Input className="h-11" value={siteForm.district} onChange={(e) => setSiteForm({ ...siteForm, district: e.target.value })} /></Field>
                <Field label="الموقع داخل الجامعة"><Input className="h-11" value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>
                {isAdmin && <Field label="المشرف المسؤول عن الموقع"><NativeSelect className="h-11" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value="">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Building2 className="h-5 w-5" />السعة وبيانات التواصل</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="المساحة م²"><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={siteForm.area} onChange={(e) => setSiteForm({ ...siteForm, area: e.target.value })} /></Field>
                <Field label="الطاقة الاستيعابية"><Input className="h-11" type="number" min="0" inputMode="numeric" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} /></Field>
                <Field label="رقم التواصل"><Input className="h-11" type="tel" inputMode="tel" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder="05xxxxxxxx" /></Field>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-blue-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle><CardDescription>يمكن إدخال الإحداثيات يدويًا أو التقاط الموقع الحالي من الجهاز.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="خط العرض"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.latitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, latitude: e.target.value }))} placeholder="26.3927" /></Field>
                  <Field label="خط الطول"><Input className="h-11" type="number" step="any" inputMode="decimal" value={siteForm.longitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, longitude: e.target.value }))} placeholder="50.0438" /></Field>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button type="button" variant="outline" className={'h-11 ' + button3d} onClick={captureCurrentSiteLocation} disabled={locatingSite}>
                    {locatingSite ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <MapPin className="ml-2 h-4 w-4" />}
                    {locatingSite ? 'جاري تحديد الموقع...' : 'تحديد موقعي الحالي'}
                  </Button>
                  <Button type="button" variant="outline" className={'h-11 ' + button3d} onClick={() => setShowSiteMap((current) => !current)}>
                    <MapPin className="ml-2 h-4 w-4" />
                    {showSiteMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
                  </Button>
                  {sitePickerCoordinates && (
                    <div className="flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800" dir="ltr">
                      {sitePickerCoordinates.latitude.toFixed(6)}, {sitePickerCoordinates.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
                {showSiteMap && (
                  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white p-1 shadow-sm">
                    <MapCoordinatePicker coordinates={sitePickerCoordinates} onChange={updateSiteCoordinates} />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />المسؤولون الرئيسيون</CardTitle><CardDescription>الأسماء مرتبطة تلقائيًا بسجل «منسوبي المساجد» حسب المسجد/المصلى والصفة التشغيلية؛ لا يتم إدخالها يدويًا من بطاقة الموقع.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="الإمام — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.imamName || 'غير مسجل في المنسوبين'} /></Field>
                <Field label="المؤذن — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.muezzinName || 'غير مسجل في المنسوبين'} /></Field>
                <Field label="الخطيب — مرتبط تلقائيًا"><Input className="h-11 bg-slate-50 font-semibold" readOnly value={siteForm.khateebName || 'غير مسجل في المنسوبين'} /></Field>
                <div className="md:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-900">لتغيير الإمام أو المؤذن أو الخطيب، عدّل سجل الشخص من تبويب <strong>«منسوبو المساجد»</strong> وحدد المسجد/المصلى والصفة الصحيحة. ستتحدث بطاقة الموقع والمعاينة والطباعة تلقائيًا.</div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-amber-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />صور ومرفقات المسجد / المصلى</CardTitle><CardDescription>يمكن رفع عدة صور للمسجد أو للموقع، إضافة إلى PDF وWord وExcel وPowerPoint وMP4. الحد الأقصى 20 MB لكل ملف.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                  <Field label="تصنيف المرفق"><NativeSelect className="h-11" value={siteMediaKind} onChange={(e) => setSiteMediaKind(e.target.value as any)}><option value="mosque_image">صورة المسجد / المصلى</option><option value="site_image">صورة الموقع / المبنى</option><option value="document">مستند / ملف</option></NativeSelect></Field>
                  <Field label="اختيار الملفات"><Input className="h-11 file:ml-3" type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/mp4" onChange={(e) => { const files = Array.from(e.target.files || []); if (!files.length) return; setSiteMediaFiles((current) => [...current, ...files.map((file) => ({ file, kind: file.type.startsWith('image/') ? siteMediaKind === 'document' ? 'mosque_image' : siteMediaKind : 'document' }))]); e.currentTarget.value = ''; }} /></Field>
                </div>
                {siteMediaFiles.length > 0 && <div className="space-y-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-3"><p className="text-xs font-bold text-sky-800">ملفات بانتظار الرفع ({siteMediaFiles.length})</p>{siteMediaFiles.map((item, index) => <div key={`pending-${index}-${item.file.name}`} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 text-sm"><span className="min-w-0 truncate">{item.file.name} — {item.kind === 'document' ? 'مستند' : item.kind === 'site_image' ? 'صورة الموقع' : 'صورة المسجد'}</span><Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setSiteMediaFiles((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
                {siteMediaLibrary.photos.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-slate-700">الصور المحفوظة ({siteMediaLibrary.photos.length})</p><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{siteMediaLibrary.photos.map((item, index) => <div key={`photo-${index}`} className="overflow-hidden rounded-2xl border bg-white"><img src={drivePreviewUrl(item.url)} alt={item.fileName || 'صورة المسجد'} className="h-28 w-full object-cover" /><div className="flex items-center justify-between gap-1 p-2"><a className="min-w-0 truncate text-xs text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.fileName || `صورة ${index + 1}`}</a><Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => setSiteMediaLibrary((current) => ({ ...current, photos: current.photos.filter((_, i) => i !== index) }))}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div></div>}
                {siteMediaLibrary.documents.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-slate-700">المستندات والملفات ({siteMediaLibrary.documents.length})</p>{siteMediaLibrary.documents.map((item, index) => <div key={`document-${index}`} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 text-sm"><a className="min-w-0 truncate text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer"><ExternalLink className="ml-1 inline h-3.5 w-3.5" />{item.fileName || `مستند ${index + 1}`}</a><Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setSiteMediaLibrary((current) => ({ ...current, documents: current.documents.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/50 pb-4"><CardTitle className="text-base md:text-lg">ملاحظات إضافية</CardTitle></CardHeader><CardContent className="pt-5"><Field label="الملاحظات"><Textarea rows={4} value={siteForm.notes} onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })} placeholder="أي معلومات تنظيمية أو تشغيلية إضافية..." /></Field></CardContent></Card>
          </div>
          <DialogFooter className="relative z-20 shrink-0 border-t border-sky-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.10)] md:px-6"><Button variant="outline" className={button3d} onClick={() => setSiteDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveSite} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : editingSite ? 'حفظ التعديلات' : 'إضافة الموقع'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranDialog} onOpenChange={setQuranDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/25 to-sky-50/25 sm:max-w-[860px]" dir="rtl">
          <DialogHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />تحديث جرد المصاحف</DialogTitle><DialogDescription>{quranInventorySite?.name || ''} — كل حفظ ينشئ سجل جرد جديدًا ويحافظ على السجلات السابقة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
            <Card className="border-emerald-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">المصاحف حسب الحجم</CardTitle><CardDescription>أدخل العدد الفعلي الموجود حاليًا بالموقع.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.largeCount} onChange={(e) => setQuranForm({ ...quranForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.mediumCount} onChange={(e) => setQuranForm({ ...quranForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.smallCount} onChange={(e) => setQuranForm({ ...quranForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <Card className="border-amber-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">الحالة والاحتياج</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف التالفة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.damagedCount} onChange={(e) => setQuranForm({ ...quranForm, damagedCount: e.target.value })} /></Field><Field label="المطلوب توفيره"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.neededCount} onChange={(e) => setQuranForm({ ...quranForm, neededCount: e.target.value })} /></Field><Field label="تاريخ الجرد"><Input type="date" value={quranForm.countedAt} onChange={(e) => setQuranForm({ ...quranForm, countedAt: e.target.value })} /></Field></CardContent></Card>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-4"><Info label="الإجمالي الحالي" value={(Number(quranForm.largeCount || 0) + Number(quranForm.mediumCount || 0) + Number(quranForm.smallCount || 0)).toLocaleString('ar-SA')} /><Info label="الكبيرة" value={Number(quranForm.largeCount || 0).toLocaleString('ar-SA')} /><Info label="المتوسطة" value={Number(quranForm.mediumCount || 0).toLocaleString('ar-SA')} /><Info label="الصغيرة" value={Number(quranForm.smallCount || 0).toLocaleString('ar-SA')} /></div>
            <Field label="ملاحظات الجرد"><Textarea rows={4} value={quranForm.notes} onChange={(e) => setQuranForm({ ...quranForm, notes: e.target.value })} placeholder="مثال: استبعاد مصاحف تالفة، حاجة إلى توفير مصاحف إضافية، موقع التخزين..." /></Field>
          </div>
          <DialogFooter className="border-t border-emerald-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setQuranDialog(false)}>إلغاء</Button><Button className={'min-w-36 ' + button3d} onClick={saveQuranInventory} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ الجرد'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quranHistorySite)} onOpenChange={(open) => !open && setQuranHistorySite(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="border-b bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Clock3 className="h-5 w-5 text-sky-700" />سجل جرد المصاحف</DialogTitle><DialogDescription>{quranHistorySite?.name || ''} — سجل زمني غير مستبدل لعمليات الجرد السابقة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-125px)] overflow-y-auto p-5">{quranHistoryLoading ? <div className="flex items-center justify-center gap-2 py-12"><RefreshCw className="h-5 w-5 animate-spin" />جاري تحميل السجل...</div> : quranHistoryRows.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-sky-50"><tr><th className="p-3">تاريخ الجرد</th><th className="p-3">كبيرة</th><th className="p-3">متوسطة</th><th className="p-3">صغيرة</th><th className="p-3">الإجمالي</th><th className="p-3">تالفة</th><th className="p-3">الاحتياج</th><th className="p-3">مسجل الجرد</th><th className="p-3">ملاحظات</th></tr></thead><tbody>{quranHistoryRows.map((row) => <tr key={row.id} className="border-t"><td className="p-3 text-center">{new Date(row.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 text-center">{row.largeCount}</td><td className="p-3 text-center">{row.mediumCount}</td><td className="p-3 text-center">{row.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{row.totalCount}</td><td className="p-3 text-center text-red-600">{row.damagedCount}</td><td className="p-3 text-center text-amber-700">{row.neededCount}</td><td className="p-3 text-center">{row.countedByName || '-'}</td><td className="max-w-[260px] p-3 text-xs leading-5">{row.notes || '-'}</td></tr>)}</tbody></table></div> : <Empty text="لا يوجد سجل جرد سابق لهذا الموقع" />}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Wrench className="h-5 w-5 text-sky-700" />{editingReturnedRequest ? 'تعديل الطلب وإعادة الإرسال' : 'الإبلاغ عن مشكلة / طلب صيانة أو احتياج'}</DialogTitle>
            <DialogDescription>هذه الخدمة مخصصة للإمام والمؤذن والخطيب والخطيب المتعاون للإبلاغ عن مشكلة في المسجد أو الجامع أو المصلى وطلب الصيانة أو الاحتياج.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/50 pb-4"><CardTitle className="text-base md:text-lg">بيانات الطلب</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2">
                <div className="md:col-span-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={requestForm.siteId} onChange={(e) => setRequestForm({ ...requestForm, siteId: e.target.value })} disabled={role === 'personnel'}>{sites.filter((s) => role !== 'personnel' || !linkedSiteId || s.id === linkedSiteId).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field></div>
                <Field label="نوع الطلب"><NativeSelect className="h-11" value={requestForm.requestType} onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value })}>{Object.entries(requestTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
                <Field label="الأولوية"><NativeSelect className="h-11" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>{Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-amber-50/40 pb-4"><CardTitle className="text-base md:text-lg">وصف الاحتياج</CardTitle><CardDescription>اكتب وصفًا محددًا يساعد على المراجعة والإسناد والتنفيذ.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5"><Field label="وصف المشكلة / الاحتياج *"><Textarea rows={6} value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} placeholder="اشرح المشكلة أو الاحتياج ومكانه داخل المسجد أو المصلى..." /></Field><Field label="ملاحظات إضافية"><Textarea rows={3} value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} /></Field></CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />المرفقات</CardTitle></CardHeader>
              <CardContent className="pt-5"><Field label="صورة أو ملف PDF"><Input className="h-11 file:ml-3" type="file" accept="image/*,application/pdf" onChange={(e) => setRequestForm({ ...requestForm, file: e.target.files?.[0] || null })} /></Field><p className="mt-2 text-xs text-muted-foreground">يفضل إرفاق صورة واضحة للمشكلة عند توفرها لتسريع المعالجة.</p></CardContent>
            </Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setRequestDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveRequest} disabled={saving}>{saving ? 'جاري الإرسال...' : editingReturnedRequest ? 'حفظ وإعادة الإرسال' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><CalendarDays className="h-5 w-5 text-sky-700" />{editingReturnedLeave ? 'تعديل الإجازة / الاعتذار وإعادة الإرسال' : 'طلب إجازة / اعتذار'}</DialogTitle>
            <DialogDescription>حدد الفترة والبديل بوضوح ليتمكن النظام من فحص التعارضات ومراجعة الطلب.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">بيانات الطلب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={leaveForm.siteId} onChange={(e) => setLeaveForm({ ...leaveForm, siteId: e.target.value })} disabled={role === 'personnel'}>{sites.filter((s) => role !== 'personnel' || !linkedSiteId || s.id === linkedSiteId).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect className="h-11" value={leaveForm.requestType} onChange={(e) => setLeaveForm({ ...leaveForm, requestType: e.target.value })}>{Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="text-base md:text-lg">الفترة والبديل</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="من *"><Input className="h-11" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field><Field label="إلى *"><Input className="h-11" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></Field><div className="md:col-span-2"><Field label="اسم النائب / البديل *"><Input className="h-11" value={leaveForm.replacementName} onChange={(e) => setLeaveForm({ ...leaveForm, replacementName: e.target.value })} placeholder="الاسم الكامل للبديل" /></Field></div></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-amber-50/40 pb-4"><CardTitle className="text-base md:text-lg">سبب الطلب والملاحظات</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><Field label="السبب *"><Textarea rows={5} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></Field><Field label="ملاحظات"><Textarea rows={3} value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setLeaveDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveLeave} disabled={saving}>{saving ? 'جاري الإرسال...' : editingReturnedLeave ? 'حفظ وإعادة الإرسال' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={Boolean(workflowEditTarget)} onOpenChange={(open) => !open && !workflowEditSaving && setWorkflowEditTarget(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Pencil className="h-5 w-5 text-sky-700" />تعديل إداري للمعاملة</DialogTitle><DialogDescription>يتم حفظ التعديل في سجل الإجراءات دون حذف تاريخ المعاملة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-4 overflow-y-auto p-5 md:p-6">
            {workflowEditTarget?.kind === 'request' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect value={workflowEditForm.requestType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, requestType: e.target.value })}>{Object.entries(requestTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="الأولوية"><NativeSelect value={workflowEditForm.priority || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, priority: e.target.value })}>{Object.entries(priorityLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><div className="md:col-span-2"><Field label="الوصف"><Textarea rows={5} value={workflowEditForm.description || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, description: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'ticket' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع البلاغ"><NativeSelect value={workflowEditForm.ticketType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, ticketType: e.target.value })}>{Object.entries(ticketTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="اسم المبلغ"><Input value={workflowEditForm.reporterName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reporterName: e.target.value })} /></Field><Field label="الجوال"><Input value={workflowEditForm.reporterPhone || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reporterPhone: e.target.value })} /></Field><div className="md:col-span-2"><Field label="الوصف"><Textarea rows={5} value={workflowEditForm.description || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, description: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'leave' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الموقع"><NativeSelect value={workflowEditForm.siteId || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, siteId: e.target.value })}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect value={workflowEditForm.requestType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, requestType: e.target.value })}>{Object.entries(leaveTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field><Field label="من"><Input type="date" value={workflowEditForm.startDate || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, startDate: e.target.value })} /></Field><Field label="إلى"><Input type="date" value={workflowEditForm.endDate || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, endDate: e.target.value })} /></Field><Field label="البديل"><Input value={workflowEditForm.replacementName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, replacementName: e.target.value })} /></Field><div className="md:col-span-2"><Field label="السبب"><Textarea rows={4} value={workflowEditForm.reason || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, reason: e.target.value })} /></Field></div><div className="md:col-span-2"><Field label="الملاحظات"><Textarea rows={3} value={workflowEditForm.notes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, notes: e.target.value })} /></Field></div></CardContent></Card>}
            {workflowEditTarget?.kind === 'job' && <Card><CardContent className="grid gap-4 pt-5 md:grid-cols-2"><Field label="الاسم"><Input value={workflowEditForm.fullName || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, fullName: e.target.value })} /></Field><Field label="الجوال"><Input value={workflowEditForm.phone || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, phone: e.target.value })} /></Field><Field label="البريد"><Input value={workflowEditForm.email || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, email: e.target.value })} /></Field><Field label="نوع الوظيفة"><Input value={workflowEditForm.jobType || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, jobType: e.target.value })} /></Field><Field label="المؤهل"><Input value={workflowEditForm.qualification || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, qualification: e.target.value })} /></Field><Field label="الموقع المفضل"><Input value={workflowEditForm.preferredLocation || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, preferredLocation: e.target.value })} /></Field><div className="md:col-span-2"><Field label="ملاحظات داخلية"><Textarea rows={4} value={workflowEditForm.internalNotes || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, internalNotes: e.target.value })} /></Field></div></CardContent></Card>}
            <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-5"><Field label="ملاحظة التعديل الإداري"><Textarea rows={3} value={workflowEditForm.adminNote || ''} onChange={(e) => setWorkflowEditForm({ ...workflowEditForm, adminNote: e.target.value })} placeholder="مثال: تصحيح بيانات التصنيف بناءً على المستند المرفق" /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white p-4 md:px-6"><Button variant="outline" className={button3d} disabled={workflowEditSaving} onClick={() => setWorkflowEditTarget(null)}>إلغاء</Button><Button className={'min-w-36 ' + button3d} disabled={workflowEditSaving} onClick={saveWorkflowEdit}><Save className="ml-2 h-4 w-4" />{workflowEditSaving ? 'جاري الحفظ...' : 'حفظ التعديل الإداري'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowDetailsDialog target={viewingWorkflow} onOpenChange={(open) => !open && setViewingWorkflow(null)} />

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[760px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="text-xl font-black">إجراء رسمي على المعاملة</DialogTitle><DialogDescription>{statusTarget?.item?.requestNumber || statusTarget?.item?.ticketNumber || statusTarget?.item?.leaveNumber || statusTarget?.item?.applicationNumber}</DialogDescription></DialogHeader>
          <div className="space-y-5 overflow-y-auto p-5 md:p-6"><Card className="border-sky-200/70 bg-white/90"><CardContent className="space-y-4 pt-5"><Field label="الحالة الجديدة"><NativeSelect className="h-11" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>{statusTarget ? transitionsFor(statusTarget.kind, statusTarget.item.status).filter((s) => !(s === 'approved' && role !== 'head')).map((s) => <option key={s} value={s}>{statusLabels[s] || s}</option>) : null}</NativeSelect></Field><Field label={['rejected', 'returned_for_edit', 'archived'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'}><Textarea rows={5} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="دوّن المبرر أو الملاحظة المرتبطة بالإجراء..." /></Field>{statusTarget?.kind === 'request' && statusValue === 'completed' && <Field label="إثبات الإنجاز *"><Input className="h-11" type="file" accept="image/*,application/pdf" onChange={(e) => setStatusEvidence(e.target.files?.[0] || null)} /></Field>}</CardContent></Card></div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setStatusDialog(false)}>إلغاء</Button><Button className={button3d} onClick={applyStatus} disabled={saving}>{saving ? 'جاري التنفيذ...' : statusValue === 'archived' ? 'تأكيد الحذف / الأرشفة' : 'تنفيذ الإجراء'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewSite)} onOpenChange={(open) => !open && setPreviewSite(null)}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-sky-700" />معاينة — {previewSite?.name}</DialogTitle>
            <DialogDescription>عرض بيانات المسجد أو الجامع أو المصلى دون الدخول في وضع التعديل.</DialogDescription>
          </DialogHeader>
          {previewSite && <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
              <div><p className="text-xs text-muted-foreground">الموقع داخل الجامعة</p><p className="mt-1 font-black text-slate-800">{[previewSite.campusLocation, previewSite.city, previewSite.district].filter(Boolean).join(' — ') || '-'}</p></div>
              <Badge variant="outline" className={previewSite.status === 'active' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : previewSite.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-300 bg-slate-50'}>{siteStatusLabels[previewSite.status] || previewSite.status}</Badge>
            </div>
            <div className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2">
              <Info label="النوع" value={siteTypeDisplayLabel(previewSite)} />
              <Info label="المساحة" value={previewSite.area ? `${previewSite.area.toLocaleString('ar-SA')} م²` : '-'} />
              <Info label="الطاقة الاستيعابية" value={previewSite.capacity ? previewSite.capacity.toLocaleString('ar-SA') : '-'} />
              <Info label="الإمام" value={previewSite.imamName || '-'} />
              <Info label="المؤذن" value={previewSite.muezzinName || '-'} />
              <Info label="الخطيب" value={previewSite.khateebName || '-'} />
              <Info label="رقم التواصل" value={previewSite.contactPhone || '-'} />
              <Info label="الإحداثيات" value={previewSite.latitude != null && previewSite.longitude != null ? `${previewSite.latitude}, ${previewSite.longitude}` : '-'} />
            </div>
            {previewSite.notes && <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-muted-foreground">ملاحظات</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewSite.notes}</p></div>}
            {(() => { const media = normalizeSiteMedia(previewSite.images); return media.photos.length || media.documents.length ? <div className="space-y-4 rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><p className="font-black text-slate-800">الصور والمرفقات</p><Badge variant="outline">{media.photos.length + media.documents.length} ملف</Badge></div>{media.photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{media.photos.map((item, index) => <a key={`preview-photo-${index}`} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border bg-slate-50"><MosqueMediaImage item={item} alt={item.fileName || 'صورة الموقع'} className="h-32 w-full object-cover" /><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs font-semibold text-slate-700">{item.fileName || `صورة ${index + 1}`}</span><Badge variant="outline" className="shrink-0 text-[10px]">{item.category === 'site_image' ? 'الموقع' : 'المسجد'}</Badge></div></a>)}</div>}{media.documents.length > 0 && <div className="space-y-2">{media.documents.map((item, index) => <a key={`preview-doc-${index}`} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm hover:bg-sky-50"><span className="min-w-0 truncate font-semibold text-slate-700"><FileText className="ml-2 inline h-4 w-4 text-sky-700" />{item.fileName || `مستند ${index + 1}`}</span><ExternalLink className="h-4 w-4 shrink-0 text-sky-700" /></a>)}</div>}</div> : null; })()}
            {(canPrint || (previewSite.latitude != null && previewSite.longitude != null)) && <div className="flex flex-wrap justify-end gap-2">
              {canPrint && <Button variant="outline" className={button3d} onClick={() => void printSiteCard(previewSite)} disabled={printingSiteCard}>{printingSiteCard ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{printingSiteCard ? 'جاري تجهيز الطباعة...' : 'طباعة بطاقة A4'}</Button>}
              {previewSite.latitude != null && previewSite.longitude != null && <Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${previewSite.latitude},${previewSite.longitude}`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button>}
            </div>}
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[620px]">
          <DialogHeader><DialogTitle>QR / الباركود التلقائي — {qrSite?.name}</DialogTitle><DialogDescription>يُنشأ الرمز تلقائيًا مع سجل المسجد أو الجامع أو المصلى، ويرتبط بالسجل الدائم لعرض أحدث بياناته وتقديم البلاغات.</DialogDescription></DialogHeader>
          {qrSite && <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /></div>
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="النوع" value={siteTypeDisplayLabel(qrSite)} /><Info label="الموقع" value={[qrSite.campusLocation, qrSite.city, qrSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="المساحة" value={qrSite.area ? `${qrSite.area} م²` : '-'} /><Info label="الإحداثيات" value={qrSite.latitude != null && qrSite.longitude != null ? `${qrSite.latitude}, ${qrSite.longitude}` : '-'} /></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">الرمز دائم ولا يحتاج إلى إعادة إنشائه عند تعديل بيانات الموقع؛ لأنه يفتح السجل الحالي عبر رمز عام آمن، ولا يضع بيانات الموظفين أو البيانات الداخلية داخل الباركود.</div>
            <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة الرمز</Button></div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingPersonnel)} onOpenChange={(open) => !open && setViewingPersonnel(null)}>
        <DialogContent className="sm:max-w-[720px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-sky-700" />عرض بيانات منسوب المسجد</DialogTitle>
            <DialogDescription>بيانات الارتباط التشغيلي والحساب المسجل للمنسوب.</DialogDescription>
          </DialogHeader>
          {viewingPersonnel && <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border bg-slate-50/80 p-4 sm:grid-cols-2">
              <Info label="الاسم الكامل" value={viewingPersonnel.name} />
              <Info label="الصفة التشغيلية" value={personnelRoleLabels[viewingPersonnel.role] || viewingPersonnel.role} />
              <Info label="المسجد / المصلى" value={viewingPersonnel.site?.name || sites.find((site) => site.id === viewingPersonnel.siteId)?.name || '-'} />
              <Info label="حالة السجل" value={viewingPersonnel.active ? 'نشط' : 'غير نشط'} />
              <Info label="رقم الجوال" value={viewingPersonnel.mobile || '-'} />
              <Info label="البريد الإلكتروني" value={viewingPersonnel.email || '-'} />
              <Info label="حساب مستخدم مرتبط" value={viewingPersonnel.userId ? 'نعم' : 'لا'} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" className={button3d} onClick={() => { const item = viewingPersonnel; setViewingPersonnel(null); openPersonnelDialog(item); }}><Pencil className="ml-2 h-4 w-4" />تعديل</Button>}
              {canDelete && role === 'head' && <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deletePersonnel(viewingPersonnel)}><Trash2 className="ml-2 h-4 w-4" />حذف</Button>}
            </div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={personnelDialog} onOpenChange={(open) => { setPersonnelDialog(open); if (!open) setEditingPersonnel(null); }}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6"><DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl">{editingPersonnel ? <Pencil className="h-5 w-5 text-sky-700" /> : <UserPlus className="h-5 w-5 text-sky-700" />}{editingPersonnel ? 'تعديل بيانات منسوب المسجد / الجامع / المصلى' : 'إضافة منسوب مسجد / جامع / مصلى'}</DialogTitle><DialogDescription>{editingPersonnel ? 'يمكن للمسؤول تحديث بيانات المنسوب والموقع والصفة التشغيلية، وتنعكس التغييرات على ربط حسابه.' : 'إجراء موحد: إضافة المنسوب وتحديد المسجد والصفة، ثم إنشاء حساب دخول جديد تلقائيًا أو ربط الحساب الموجود وإرسال بيانات التفعيل بالبريد.'}</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">الارتباط والصفة</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={personnelForm.siteId} onChange={(e) => setPersonnelForm({ ...personnelForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="الصفة *"><NativeSelect className="h-11" value={personnelForm.role} onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}><option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option></NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />بيانات المنسوب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><div className="md:col-span-2"><Field label="الاسم الكامل *"><Input className="h-11" autoFocus value={personnelForm.name} onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })} placeholder="الاسم الرباعي" /></Field></div><Field label="رقم الجوال"><Input className="h-11" type="tel" inputMode="tel" value={personnelForm.mobile} onChange={(e) => setPersonnelForm({ ...personnelForm, mobile: e.target.value })} placeholder="05xxxxxxxx" /></Field><Field label="البريد الإلكتروني *"><Input className="h-11" type="email" inputMode="email" value={personnelForm.email} onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })} placeholder="name@iau.edu.sa" /></Field></CardContent></Card>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700"><strong>{editingPersonnel ? 'تعديل حساب منسوب المسجد:' : 'حساب منسوب المسجد:'}</strong> {editingPersonnel ? 'يتم تحديث بيانات السجل والربط التشغيلي وحساب المستخدم المرتبط دون إنشاء حساب جديد أو إعادة إرسال دعوة التفعيل.' : 'عند الحفظ يتم إنشاء حساب دخول جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. الحساب يمنح المنسوب الدخول إلى موقعه فقط لتقديم طلب صيانة/احتياج، إجازة أو اعتذار، متابعة طلباته واستقبال الإشعارات. ويستلم الحساب الجديد رابط التفعيل وبيانات الدخول عبر البريد الإلكتروني.'}</div>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => { setPersonnelDialog(false); setEditingPersonnel(null); }}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={savePersonnel} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : editingPersonnel ? 'حفظ التعديلات' : 'حفظ المنسوب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

          </div>
  );
};

const Stat = ({ title, value, icon: Icon, onClick }: { title: string; value: number; icon: React.ElementType; onClick?: () => void }) => {
  const card = <Card className={`${card3d} h-full ${onClick ? 'transition-transform duration-150 hover:-translate-y-0.5' : ''}`}><CardContent className="flex h-full items-center justify-between gap-3 p-4"><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-black text-slate-800">{value}</p></div><div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-sky-700 shadow-sm"><Icon className="h-5 w-5" /></div></CardContent></Card>;
  return onClick ? <button type="button" className="block h-full w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" onClick={onClick}>{card}</button> : card;
};
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-muted-foreground"><Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>{text}</p></div>;
const Rule = ({ title, text }: { title: string; text: string }) => <div className="rounded-2xl border bg-white p-4"><p className="font-bold text-slate-800">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>;
const ReportMetric = ({ label, value }: { label: string; value: number }) => <div className="rounded-2xl border bg-gradient-to-b from-white to-sky-50 p-5 text-center shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black text-slate-800">{value}</p></div>;
const MiniRow = ({ title, subtitle, status }: { title: string; subtitle: string; status: string }) => <div className="flex items-start justify-between gap-3 rounded-2xl border bg-white p-3"><div className="min-w-0"><p className="truncate font-bold">{title}</p><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div>;

const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-emerald-400 via-sky-500 to-blue-800" /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2">{siteTypeDisplayLabel(site)}</Badge><h3 className="text-lg font-black text-slate-800">{site.name}</h3><p className="mt-1 text-sm text-muted-foreground">{site.city || '-'} — {site.district || '-'}</p></div><Badge variant="outline" className={site.status === 'active' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : site.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-300 bg-slate-50'}>{siteStatusLabels[site.status]}</Badge></div><div className="my-4 grid grid-cols-2 gap-3 rounded-2xl border bg-slate-50/70 p-3 text-sm"><Info label="الموقع داخل الجامعة" value={site.campusLocation || '-'} /><Info label="المساحة" value={site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'} /><Info label="الإمام" value={site.imamName || '-'} /><Info label="المؤذن" value={site.muezzinName || '-'} /><Info label="الطلبات" value={site._count?.requests || 0} /><Info label="البلاغات" value={site._count?.tickets || 0} /></div><div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/55 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-black text-emerald-900"><BookOpen className="h-4 w-4" />المصاحف</div><Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">{quranInventory ? `${quranInventory.totalCount} مصحف` : 'لم يتم الجرد'}</Badge></div>{quranInventory && <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs"><div><span className="text-muted-foreground">كبير</span><b className="mr-1">{quranInventory.largeCount}</b></div><div><span className="text-muted-foreground">متوسط</span><b className="mr-1">{quranInventory.mediumCount}</b></div><div><span className="text-muted-foreground">صغير</span><b className="mr-1">{quranInventory.smallCount}</b></div><div><span className="text-muted-foreground">احتياج</span><b className="mr-1 text-amber-700">{quranInventory.neededCount}</b></div></div>}</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"><Button variant="outline" className={button3d} onClick={onQr}><QrCode className="ml-1 h-4 w-4" />QR</Button>{site.latitude != null && site.longitude != null && <Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')}><MapPin className="ml-1 h-4 w-4" />الخريطة</Button>}<Button variant="outline" className={button3d} onClick={onPreview}><Eye className="ml-1 h-4 w-4" />معاينة</Button>{canPrint && <Button variant="outline" className={button3d} onClick={onPrint}><Printer className="ml-1 h-4 w-4" />طباعة / PDF</Button>}{canEdit && <Button variant="outline" className={button3d} onClick={onEdit}>تعديل</Button>}{canDelete && <Button variant="outline" className="border-red-300 text-red-600" onClick={onDelete}>حذف</Button>}</div></CardContent></Card>;

const QuickFilterBar = ({ label, onClear }: { label: string; onClear: () => void }) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm"><span>العرض الحالي: <strong>{label}</strong></span><Button variant="outline" size="sm" className={button3d} onClick={onClear}>عرض الكل</Button></div>;

const WorkflowCard = ({ title, subtitle, description, status, meta, submitterName, submitterRole, onView, onStatus, extraAction }: { title: string; subtitle: string; description: string; status: string; meta: string[]; submitterName?: string; submitterRole?: string; onView?: () => void; onStatus?: () => void; extraAction?: React.ReactNode }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-sky-400 via-blue-600 to-slate-800" /><CardContent className="flex min-h-[315px] flex-col p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{title}</p><h3 className="mt-1 font-black text-slate-800">{subtitle}</h3></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div>{submitterName && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white/90 p-3"><div><p className="text-[11px] text-muted-foreground">مقدم الإجراء</p><p className="mt-1 font-bold text-slate-800">{submitterName}</p></div>{submitterRole && <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{submitterRole}</Badge>}</div>}<p className="mt-3 line-clamp-3 rounded-2xl border bg-slate-50/80 p-3 text-sm leading-6 text-slate-700">{description}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">{meta.map((x, i) => <span key={i} className="rounded-xl border bg-white p-2">{x || '-'}</span>)}</div><div className="mt-auto flex flex-wrap gap-2 border-t pt-4">{onView && <Button variant="outline" size="sm" className={button3d} onClick={onView}><Eye className="ml-1 h-3.5 w-3.5" />عرض التفاصيل</Button>}{onStatus && <Button variant="outline" size="sm" className={button3d} onClick={onStatus}><RefreshCw className="ml-1 h-3.5 w-3.5" />إجراء رسمي</Button>}{extraAction}</div></CardContent></Card>;

const WorkflowDetailsDialog = ({ target, onOpenChange }: { target: { kind: 'request' | 'ticket' | 'leave'; item: any } | null; onOpenChange: (open: boolean) => void }) => {
  const [history, setHistory] = useState<MosqueWorkflowHistoryEntry[]>([]);
  useEffect(() => {
    if (!target) { setHistory([]); return; }
    let cancelled = false;
    void mosqueApi.workflowHistory(target.kind, target.item.id).then((rows) => { if (!cancelled) setHistory(rows); }).catch(() => { if (!cancelled) setHistory([]); });
    return () => { cancelled = true; };
  }, [target?.kind, target?.item?.id]);
  if (!target) return null;
  const { kind, item } = target;
  const isRequest = kind === 'request';
  const isTicket = kind === 'ticket';
  const applicant = isTicket
    ? { name: item.reporterName || 'غير محدد', roleLabel: 'مقدّم البلاغ', email: item.reporterEmail || null, mobile: item.reporterPhone || null }
    : item.applicant || {
        name: item.personnel?.name || 'غير محدد',
        roleLabel: item.personnel?.role ? (personnelRoleLabels[item.personnel.role] || item.personnel.role) : 'غير محدد',
        email: item.personnel?.email || null,
        mobile: item.personnel?.mobile || null,
      };
  const recordNumber = item.requestNumber || item.ticketNumber || item.leaveNumber || '-';
  const attachmentUrls = isRequest && Array.isArray(item.attachments) ? item.attachments.filter(Boolean) : isTicket && item.attachmentUrl ? [item.attachmentUrl] : !isRequest && !isTicket && item.attachmentUrl ? [item.attachmentUrl] : [];

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[900px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-sky-700" />{isRequest ? 'تفاصيل طلب الصيانة / الاحتياج' : isTicket ? 'تفاصيل البلاغ' : 'تفاصيل الإجازة / الاعتذار'}</DialogTitle>
          <DialogDescription>{recordNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border bg-slate-50/80 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="رقم الإجراء" value={recordNumber} />
            <Info label="الحالة" value={<Badge variant="outline" className={statusBadgeClass(item.status)}>{statusLabels[item.status] || item.status}</Badge>} />
            <Info label="المسجد / المصلى" value={item.site?.name || '-'} />
            <Info label="تاريخ التقديم" value={item.createdAt ? new Date(item.createdAt).toLocaleString('ar-SA') : '-'} />
          </div>

          <Card className="border-sky-200/70 bg-white/90"><CardHeader className="pb-3"><CardTitle className="text-base">بيانات مقدم الإجراء</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="الاسم" value={applicant.name || '-'} /><Info label="الصفة" value={applicant.roleLabel || '-'} /><Info label="الجوال" value={applicant.mobile || '-'} /><Info label="البريد الإلكتروني" value={applicant.email || '-'} /></CardContent></Card>

          {isRequest && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">بيانات الطلب</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Info label="نوع الطلب" value={requestTypeLabels[item.requestType] || item.requestType} /><Info label="الأولوية" value={priorityLabels[item.priority] || item.priority} /></div><div><p className="text-[11px] text-muted-foreground">الوصف</p><p className="mt-1 rounded-xl border bg-slate-50 p-3 text-sm leading-7">{item.description || '-'}</p></div>{item.notes && <Info label="الملاحظات" value={item.notes} />}{item.returnReason && <Info label="ملاحظة الإعادة" value={item.returnReason} />}{item.rejectionReason && <Info label="سبب الرفض" value={item.rejectionReason} />}</CardContent></Card>}

          {isTicket && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">بيانات البلاغ</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Info label="نوع البلاغ" value={ticketTypeLabels[item.ticketType] || item.ticketType} /><Info label="الطلب المرتبط" value={item.convertedRequestId ? 'تم التحويل إلى طلب صيانة' : 'غير محول'} /></div><div><p className="text-[11px] text-muted-foreground">الوصف</p><p className="mt-1 rounded-xl border bg-slate-50 p-3 text-sm leading-7">{item.description || '-'}</p></div>{item.resolutionNote && <Info label="ملاحظة الحل" value={item.resolutionNote} />}{item.rejectionReason && <Info label="سبب الرفض" value={item.rejectionReason} />}{item.notes && <Info label="الملاحظات" value={item.notes} />}</CardContent></Card>}

          {!isRequest && !isTicket && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">بيانات الإجازة / الاعتذار</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="نوع الطلب" value={leaveTypeLabels[item.requestType] || item.requestType} /><Info label="من" value={item.startDate ? new Date(item.startDate).toLocaleDateString('ar-SA') : '-'} /><Info label="إلى" value={item.endDate ? new Date(item.endDate).toLocaleDateString('ar-SA') : '-'} /><Info label="البديل" value={item.replacementName || '-'} /></div><div><p className="text-[11px] text-muted-foreground">السبب</p><p className="mt-1 rounded-xl border bg-slate-50 p-3 text-sm leading-7">{item.reason || '-'}</p></div>{item.notes && <Info label="الملاحظات" value={item.notes} />}{item.reviewerNote && <Info label="ملاحظة المراجع" value={item.reviewerNote} />}{item.returnReason && <Info label="ملاحظة الإعادة" value={item.returnReason} />}{item.rejectionReason && <Info label="سبب الرفض" value={item.rejectionReason} />}</CardContent></Card>}

          <Card className="border-indigo-200 bg-indigo-50/30"><CardHeader className="pb-3"><CardTitle className="text-base">سجل الإجراءات الرسمي</CardTitle><CardDescription>تسلسل زمني للتعديلات والقرارات المسجلة على المعاملة.</CardDescription></CardHeader><CardContent className="space-y-2">{history.length ? history.map((entry) => <div key={entry.id} className="rounded-xl border bg-white p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{entry.action === 'administrative_edit' ? 'تعديل إداري' : entry.action === 'archive' ? 'حذف / أرشفة' : entry.action === 'resubmitted_after_return' ? 'إعادة إرسال بعد التعديل' : 'تغيير حالة'}</strong><span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString('ar-SA')}</span></div><p className="mt-1 text-xs text-muted-foreground">{entry.username || entry.userEmail || 'النظام'}{entry.details?.fromStatus || entry.details?.toStatus ? ` — ${statusLabels[entry.details?.fromStatus || ''] || entry.details?.fromStatus || '-'} ← ${statusLabels[entry.details?.toStatus || ''] || entry.details?.toStatus || '-'}` : ''}</p>{entry.details?.note && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs leading-6">{entry.details.note}</p>}</div>) : <p className="text-sm text-muted-foreground">لا توجد إجراءات مسجلة بعد.</p>}</CardContent></Card>

          {(attachmentUrls.length > 0 || item.completionEvidenceUrl) && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">المرفقات</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{attachmentUrls.map((url: string, index: number) => <Button key={`${url}-${index}`} variant="outline" size="sm" className={button3d} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}><ExternalLink className="ml-1 h-3.5 w-3.5" />مرفق {index + 1}</Button>)}{item.completionEvidenceUrl && <Button variant="outline" size="sm" className={button3d} onClick={() => window.open(item.completionEvidenceUrl, '_blank', 'noopener,noreferrer')}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />إثبات الإنجاز</Button>}</CardContent></Card>}
        </div>
      </DialogContent>
    </Dialog>
  );
};