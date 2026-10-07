import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import quranLibrary3dIcon from '../../assets/quran-library-3d.svg';
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
  FileSpreadsheet,
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
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { MosqueFieldVisitsPanel } from '../components/MosqueFieldVisitsPanel';
import { MosqueReportsCenter } from '../components/MosqueReportsCenter';
import { BuildingCoverageReportsDialog } from '../components/BuildingCoverageReportsDialog';
import { isPendingImportedBuilding } from '../components/BuildingExcelImportManager';
import { appendExcelReportSheet, excelReportDateStamp, writeProfessionalExcel } from '../utils/excelReport';
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
  type MosqueQuranOpeningBaselineStatus,
  type MosqueQuranStockDashboard,
  type MosqueQuranStockMovement,
  type MosqueQuranWarehouse,
  type MosqueRequest,
  type MosqueBuilding,
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
const MosqueSideNavButton = ({ label, icon: Icon, active, onClick, badge }: { label: string; icon: React.ElementType; active: boolean; onClick: () => void; badge?: number }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-[13px] font-extrabold leading-5 transition-all ${active ? 'bg-[#006b63] text-white shadow-[0_8px_18px_rgba(0,107,99,0.18)]' : 'text-slate-600 hover:bg-white hover:text-[#006b63]'}`}
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${active ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-white text-[#006b63]'}`}><Icon className="h-[18px] w-[18px]" /></span>
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {badge != null && badge > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>{badge}</span>}
  </button>
);

const roleScopeLabel = (role: MosqueModuleRole) => role === 'head'
  ? 'إدارة كاملة للوحدة'
  : role === 'supervisor'
    ? 'إشراف تشغيلي على الوحدة'
    : role === 'personnel'
      ? 'وصول مقيد بالموقع المرتبط'
      : 'وصول خدمات منسوب الجامعة';

const notificationCategory = (notice: MosqueNotification): 'request' | 'ticket' | 'site' | 'leave' | 'quran' | 'other' => {
  const type = String(notice.entityType || '').toLowerCase();
  const text = `${notice.title || ''} ${notice.message || ''}`.toLowerCase();
  if (type.includes('request') || text.includes('طلب صيانة') || text.includes('طلب احتياج')) return 'request';
  if (type.includes('ticket') || text.includes('بلاغ')) return 'ticket';
  if (type.includes('leave') || text.includes('إجاز') || text.includes('اعتذار')) return 'leave';
  if (type.includes('quran') || text.includes('مصحف') || text.includes('مصاحف')) return 'quran';
  if (type.includes('site') || type.includes('mosque') || text.includes('مسجد') || text.includes('مصلى')) return 'site';
  return 'other';
};

const notificationCategoryLabel: Record<'request' | 'ticket' | 'site' | 'leave' | 'quran' | 'other', string> = {
  request: 'طلب صيانة / احتياج',
  ticket: 'بلاغ',
  site: 'مسجد / مصلى',
  leave: 'إجازة / اعتذار',
  quran: 'المصاحف',
  other: 'إشعار عام',
};
const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى' };
const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };
const prayerRoomGenderLabels: Record<string, string> = { men: 'رجال', women: 'نساء' };
const buildingCoverageStatusLabels: Record<string, string> = {
  unassessed: 'لم يتم التقييم',
  covered: 'مغطى بخدمة الصلاة',
  needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إمكانية الإنشاء',
  not_feasible_alternative: 'تعذر الإنشاء / بديل معتمد',
  under_implementation: 'مصلى تحت التنفيذ',
};
const buildingFeasibilityLabels: Record<string, string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};

// PRAYER_ROOM_ABSENCE_WORKFLOW_V1
// عدم وجود سجل مصلى لا يعني تلقائيًا أن المصلى غير موجود ميدانيًا.
// يعتبر الغياب مؤكدًا فقط بعد تقييم ملف خدمة الصلاة للمبنى (أي عندما لا تكون الحالة "لم يتم التقييم").
type BuildingPrayerRoomPresence = 'present' | 'absent' | 'unknown';
const buildingPrayerRoomPresenceLabels: Record<BuildingPrayerRoomPresence, string> = {
  present: 'موجود',
  absent: 'غير موجود — تم التحقق',
  unknown: 'لم يتم التحقق',
};
const buildingPrayerRoomPresence = (building: MosqueBuilding | null | undefined, gender: 'men' | 'women'): BuildingPrayerRoomPresence => {
  if (!building) return 'unknown';
  const linked = Boolean(building.sites?.some((site) =>
    site.siteType === 'prayer_room' && site.prayerRoomGender === gender && site.status !== 'temporarily_closed'
  ));
  if (linked) return 'present';
  return building.coverageStatus === 'unassessed' ? 'unknown' : 'absent';
};
const prayerRoomPresenceClass = (presence: BuildingPrayerRoomPresence) =>
  presence === 'present'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
    : presence === 'absent'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-slate-300 bg-slate-50 text-slate-600';
const siteTypeDisplayLabel = (site: Pick<MosqueSite, 'siteType' | 'prayerRoomGender'>) =>
  site.siteType === 'prayer_room' && site.prayerRoomGender
    ? `مصلى ${prayerRoomGenderLabels[site.prayerRoomGender] || site.prayerRoomGender}`
    : siteTypeLabels[site.siteType] || site.siteType;

type WomenPrayerPresence = 'present' | 'verified_absent' | 'unverified';

const womenPrayerPresence = (site: Pick<MosqueSite, 'siteType' | 'hasWomenPrayerArea' | 'womenPrayerArea'>): WomenPrayerPresence => {
  if (site.hasWomenPrayerArea) return 'present';
  return site.womenPrayerArea?.presenceStatus === 'verified_absent' ? 'verified_absent' : 'unverified';
};
const womenPrayerPresenceLabels: Record<WomenPrayerPresence, string> = {
  present: 'يوجد مصلى نساء',
  verified_absent: 'لا يوجد — تم التحقق',
  unverified: 'لم يتم التحقق',
};
const womenPrayerPresenceClass = (presence: WomenPrayerPresence) =>
  presence === 'present'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
    : presence === 'verified_absent'
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-slate-300 bg-slate-50 text-slate-600';
const hasAttachedWomenPrayerArea = (site: Pick<MosqueSite, 'siteType' | 'hasWomenPrayerArea'>) =>
  ['mosque', 'jami'].includes(site.siteType) && Boolean(site.hasWomenPrayerArea);
const womenPrayerAreaStatusLabel = (site: Pick<MosqueSite, 'hasWomenPrayerArea' | 'womenPrayerArea'>) =>
  site.hasWomenPrayerArea ? (siteStatusLabels[site.womenPrayerArea?.status || 'active'] || site.womenPrayerArea?.status || 'نشط') : womenPrayerPresenceLabels[womenPrayerPresence(site)];


type SitePrintColumnKey = 'name' | 'type' | 'building' | 'location' | 'cityDistrict' | 'area' | 'capacity' | 'womenPrayerArea' | 'womenCapacity' | 'womenStatus' | 'imam' | 'muezzin' | 'khateeb' | 'coordinatorName' | 'contactPhone' | 'coordinates' | 'status' | 'notes';
const SITE_PRINT_COLUMNS: Array<{ key: SitePrintColumnKey; label: string }> = [
  { key: 'name', label: 'الاسم' },
  { key: 'type', label: 'النوع' },
  { key: 'building', label: 'رقم المبنى' },
  { key: 'location', label: 'الموقع داخل الجامعة' },
  { key: 'cityDistrict', label: 'المدينة / الحي' },
  { key: 'area', label: 'المساحة' },
  { key: 'capacity', label: 'الطاقة الاستيعابية' },
  { key: 'womenPrayerArea', label: 'مصلى النساء' },
  { key: 'womenCapacity', label: 'سعة مصلى النساء' },
  { key: 'womenStatus', label: 'حالة مصلى النساء' },
  { key: 'imam', label: 'الإمام' },
  { key: 'muezzin', label: 'المؤذن' },
  { key: 'khateeb', label: 'الخطيب' },
  { key: 'coordinatorName', label: 'اسم المنسق' },
  { key: 'contactPhone', label: 'رقم التواصل' },
  { key: 'coordinates', label: 'الإحداثيات' },
  { key: 'status', label: 'الحالة' },
  { key: 'notes', label: 'الملاحظات' },
];
const DEFAULT_SITE_PRINT_COLUMNS: SitePrintColumnKey[] = ['name', 'type', 'building', 'location', 'cityDistrict', 'area', 'womenPrayerArea', 'imam', 'muezzin', 'status'];

const SITE_PRINT_FONT_MIN = 5;
const SITE_PRINT_FONT_MAX = 14;
const SITE_PRINT_FONT_DEFAULT = 7.2;
type SitePrintWidthMode = 'smart' | 'compact' | 'equal';
type SitePrintWrapMode = 'wrap' | 'single';
type SitePrintOrientation = 'auto' | 'landscape' | 'portrait';
const requestTypeLabels: Record<string, string> = {
  maintenance: 'صيانة', renovation: 'ترميم', equipment: 'تجهيزات', cleaning: 'نظافة', carpet: 'فرش',
  air_conditioning: 'مكيفات', audio: 'أجهزة صوت', lighting: 'إنارة', quran_supply: 'تزويد مصاحف', other: 'أخرى',
};

const QURAN_SUPPLY_REQUEST_MARKER = 'QURAN_SUPPLY_REQUEST=1';
const quranSupplyStatusLabels: Record<string, string> = {
  new: 'جديد',
  under_review: 'تحت المراجعة',
  approved: 'معتمد',
  in_progress: 'قيد التجهيز والصرف',
  completed: 'تم الصرف',
  closed: 'تم التحقق والإغلاق',
  returned_for_edit: 'معاد للتعديل',
  rejected: 'مرفوض',
};
const isQuranSupplyRequest = (request: MosqueRequest) =>
  request.requestType === 'quran_supply' || String(request.notes || '').includes(QURAN_SUPPLY_REQUEST_MARKER);
const quranRequestStatusLabel = (request: MosqueRequest) =>
  isQuranSupplyRequest(request) ? (quranSupplyStatusLabels[request.status] || statusLabels[request.status] || request.status) : undefined;

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

const workflowNextActionLabel = (kind: 'request' | 'ticket' | 'leave' | 'job' | undefined, status: string) => {
  if (kind === 'request') return ({
    new: 'المراجعة الأولية',
    under_review: 'الاعتماد أو الإعادة',
    approved: 'بدء التنفيذ',
    in_progress: 'توثيق الإنجاز',
    completed: 'التحقق والإغلاق',
    returned_for_edit: 'انتظار إعادة الإرسال',
    closed: 'مكتمل',
    rejected: 'مغلق بالرفض',
  } as Record<string, string>)[status] || 'متابعة الحالة';
  if (kind === 'ticket') return ({
    new: 'المراجعة أو الإسناد',
    under_review: 'الإسناد أو بدء المعالجة',
    assigned: 'بدء المعالجة',
    in_progress: 'توثيق الحل',
    resolved: 'التحقق والإغلاق',
    closed: 'مكتمل',
    rejected: 'مغلق بالرفض',
  } as Record<string, string>)[status] || 'متابعة الحالة';
  if (kind === 'leave') return ['pending', 'under_review'].includes(status) ? 'المراجعة والاعتماد' : status === 'returned_for_edit' ? 'انتظار إعادة الإرسال' : 'متابعة الحالة';
  if (kind === 'job') return 'متابعة مرحلة الطلب';
  return 'متابعة الحالة';
};

const card3d = 'border-[#dcc58e]/70 bg-gradient-to-b from-white via-[#fffdf7] to-[#f8f2e5]/90 shadow-[0_7px_0_rgba(10,74,63,0.08),0_16px_34px_rgba(6,60,51,0.10),inset_0_1px_0_rgba(255,255,255,1)]';
const button3d = 'shadow-[0_4px_0_rgba(8,63,53,0.14),0_8px_16px_rgba(8,63,53,0.08),inset_0_1px_0_rgba(255,255,255,0.96)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(8,63,53,0.12)]';
const siteActionButton = `${button3d} h-10 w-full min-w-0 justify-center gap-1.5 whitespace-nowrap px-2 text-xs font-bold leading-none`;

const emptyWomenPrayerArea = () => ({
  presenceStatus: 'unverified' as WomenPrayerPresence,
  verificationNotes: '',
  verifiedAt: '',
  verifiedBy: '',
  verifiedByName: '',
  capacity: '',
  floor: '',
  locationDescription: '',
  separateEntrance: false,
  hasAblution: false,
  hasRestrooms: false,
  status: 'active',
  notes: '',
});

const emptySite = {
  name: '', siteType: 'mosque', prayerRoomGender: '', spatialRelation: 'independent', buildingId: '', floor: '', roomNumber: '', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', quranTargetCount: '',
  hasWomenPrayerArea: false, womenPrayerArea: emptyWomenPrayerArea(), latitude: '', longitude: '',
  status: 'active', imamName: '', muezzinName: '', khateebName: '', coordinatorName: '', supervisorName: '', contactPhone: '', supervisorUserId: '', notes: '',
};
const emptyBuilding = {
  buildingNumber: '', name: '', campusLocation: '', city: 'الدمام', district: '', latitude: '', longitude: '', expectedUsers: '',
  coverageStatus: 'unassessed', creationFeasibility: 'under_study', unavailableReason: '', approvedAlternative: '', notes: '',
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

const emptyQuranOpeningBaselineForm = () => ({
  largeCount: '0',
  mediumCount: '0',
  smallCount: '0',
  recommendedWithdrawalCount: '0',
  countedAt: new Date().toISOString().slice(0, 10),
  notes: '',
});

type QuranPrintSiteFilter = 'all' | 'mosque' | 'jami' | 'prayer_room_men' | 'prayer_room_women';
type QuranPrintStateFilter = 'all' | 'with_stock' | 'without_stock' | 'need' | 'damaged' | 'not_counted';
type QuranPrintActivityFilter = 'all' | 'with_activity' | 'added' | 'withdrawn' | 'returned' | 'without_activity';
type QuranPrintSortKey = 'name' | 'total' | 'large' | 'medium' | 'small' | 'damaged' | 'needed' | 'added' | 'withdrawn' | 'returned' | 'netMovement' | 'last_count';
type QuranPrintSortDirection = 'asc' | 'desc';

const quranStockMovementTypeLabels: Record<string, string> = {
  receipt: 'إضافة رصيد للمكتبة',
  distribution: 'إضافة مصاحف لمسجد / مصلى',
  return: 'إرجاع إلى مكتبة المصاحف',
  site_withdrawal: 'سحب مصاحف من مسجد / مصلى',
  warehouse_damage: 'استبعاد مصاحف من المكتبة',
  adjustment_in: 'تسوية زيادة',
  adjustment_out: 'تسوية نقص',
};
const quranStockMovementDisplayLabel = (movement: MosqueQuranStockMovement) =>
  movement.movementType === 'return' && movement.notes?.startsWith('تراجع عن حركة الصرف')
    ? 'تراجع عن إضافة مصاحف'
    : quranStockMovementTypeLabels[movement.movementType] || movement.movementType;
const emptyQuranWarehouseForm = () => ({ code: '', name: 'مكتبة المصاحف', location: '', active: true, minLargeCount: '0', minMediumCount: '0', minSmallCount: '0', notes: '' });
const emptyQuranStockMovementForm = () => ({ movementType: 'receipt', warehouseId: '', siteId: '', largeCount: '0', mediumCount: '0', smallCount: '0', withdrawalReason: '', referenceNumber: '', movementAt: new Date().toISOString().slice(0, 10), notes: '' });

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
  spatialRelation: site.spatialRelation ?? 'independent',
  buildingId: site.buildingId ?? null,
  floor: site.floor ?? null,
  roomNumber: site.roomNumber ?? null,
  city: site.city ?? null,
  district: site.district ?? null,
  campusLocation: site.campusLocation ?? null,
  area: site.area ?? null,
  capacity: site.capacity ?? null,
  quranTargetCount: site.quranTargetCount ?? null,
  hasWomenPrayerArea: site.hasWomenPrayerArea ?? false,
  womenPrayerArea: site.womenPrayerArea ?? null,
  latitude: site.latitude ?? null,
  longitude: site.longitude ?? null,
  mapUrl: site.mapUrl ?? null,
  status: site.status,
  imamName: site.imamName ?? null,
  muezzinName: site.muezzinName ?? null,
  khateebName: site.khateebName ?? null,
  coordinatorName: site.coordinatorName ?? null,
  supervisorName: site.supervisorName ?? null,
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [role, setRole] = useState<MosqueModuleRole>('viewer');
  const [currentUsername, setCurrentUsername] = useState('مستخدم');
  const [linkedSiteId, setLinkedSiteId] = useState<string | null>(null);
  const [myPersonnelRole, setMyPersonnelRole] = useState<string | null>(null);
  const [fullPermissionAccess, setFullPermissionAccess] = useState(false);
  const [dashboard, setDashboard] = useState<MosqueDashboard | null>(null);
  const [sites, setSites] = useState<MosqueSite[]>([]);
  const [buildings, setBuildings] = useState<MosqueBuilding[]>([]);
  const officialBuildings = useMemo(() => buildings.filter((building) => !isPendingImportedBuilding(building)), [buildings]);
  const [requests, setRequests] = useState<MosqueRequest[]>([]);
  const [tickets, setTickets] = useState<MosqueTicket[]>([]);
  const [leaves, setLeaves] = useState<MosqueLeave[]>([]);
  const [jobs, setJobs] = useState<MosqueJobApplication[]>([]);
  const [personnel, setPersonnel] = useState<MosquePersonnel[]>([]);
  const [quranInventoryItems, setQuranInventoryItems] = useState<MosqueQuranInventoryOverviewItem[]>([]);
  const [quranSummary, setQuranSummary] = useState<MosqueQuranInventorySummary>(emptyQuranSummary);
  const [quranSearch, setQuranSearch] = useState('');
  const [quranNeedOnly, setQuranNeedOnly] = useState(false);
  const [quranPrintDialog, setQuranPrintDialog] = useState(false);
  const [quranPrintSearch, setQuranPrintSearch] = useState('');
  const [quranPrintSiteFilter, setQuranPrintSiteFilter] = useState<QuranPrintSiteFilter>('all');
  const [quranPrintStateFilter, setQuranPrintStateFilter] = useState<QuranPrintStateFilter>('all');
  const [quranPrintActivityFilter, setQuranPrintActivityFilter] = useState<QuranPrintActivityFilter>('all');
  const [quranPrintFrom, setQuranPrintFrom] = useState('');
  const [quranPrintTo, setQuranPrintTo] = useState('');
  const [quranPrintSortKey, setQuranPrintSortKey] = useState<QuranPrintSortKey>('name');
  const [quranPrintSortDirection, setQuranPrintSortDirection] = useState<QuranPrintSortDirection>('asc');
  const [quranDialog, setQuranDialog] = useState(false);
  const [quranForm, setQuranForm] = useState<any>(emptyQuranInventoryForm());
  const [quranInventorySite, setQuranInventorySite] = useState<MosqueSite | null>(null);
  const [quranHistorySite, setQuranHistorySite] = useState<MosqueSite | null>(null);
  const [quranHistoryRows, setQuranHistoryRows] = useState<MosqueQuranInventory[]>([]);
  const [quranHistoryLoading, setQuranHistoryLoading] = useState(false);
  const [quranStockDashboard, setQuranStockDashboard] = useState<MosqueQuranStockDashboard | null>(null);
  const [quranStockMovements, setQuranStockMovements] = useState<MosqueQuranStockMovement[]>([]);
  const [quranMovementsLoading, setQuranMovementsLoading] = useState(false);
  const [quranOpeningBaselineStatus, setQuranOpeningBaselineStatus] = useState<MosqueQuranOpeningBaselineStatus | null>(null);
  const [quranOpeningBaselineDialog, setQuranOpeningBaselineDialog] = useState(false);
  const [quranOpeningBaselineSite, setQuranOpeningBaselineSite] = useState<MosqueSite | null>(null);
  const [quranOpeningBaselineForm, setQuranOpeningBaselineForm] = useState<any>(emptyQuranOpeningBaselineForm());
  const [quranWarehouseDialog, setQuranWarehouseDialog] = useState(false);
  const [quranWarehouseForm, setQuranWarehouseForm] = useState<any>(emptyQuranWarehouseForm());
  const [editingQuranWarehouse, setEditingQuranWarehouse] = useState<MosqueQuranWarehouse | null>(null);
  const [quranWarehousePreview, setQuranWarehousePreview] = useState<MosqueQuranWarehouse | null>(null);
  const [quranStockMovementDialog, setQuranStockMovementDialog] = useState(false);
  const [quranStockMovementForm, setQuranStockMovementForm] = useState<any>(emptyQuranStockMovementForm());
  const [quranStockContextSiteId, setQuranStockContextSiteId] = useState<string | null>(null);
  const [quranStockSaving, setQuranStockSaving] = useState(false);
  const [assignments, setAssignments] = useState<MosqueAssignment[]>([]);
  const [staffUsers, setStaffUsers] = useState<MosqueStaffUser[]>([]);
  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);
  const [search, setSearch] = useState('');
  const [siteFilterCity, setSiteFilterCity] = useState('');
  const [siteFilterType, setSiteFilterType] = useState('all');
  const [siteFilterPrayerRoomGender, setSiteFilterPrayerRoomGender] = useState<'all' | 'men' | 'women'>('all');
  const [siteFilterWomenPrayerArea, setSiteFilterWomenPrayerArea] = useState<'all' | WomenPrayerPresence>('all');
  const [siteFilterStatus, setSiteFilterStatus] = useState('all');
  const [buildingCoverageSearch, setBuildingCoverageSearch] = useState('');
  const [buildingCoverageFilter, setBuildingCoverageFilter] = useState('all');
  const [mapSearch, setMapSearch] = useState('');
  const [mapLayer, setMapLayer] = useState<'all' | 'sites' | 'buildings'>('all');
  const [mapSiteType, setMapSiteType] = useState('all');
  const [mapSiteStatus, setMapSiteStatus] = useState('all');
  const [mapBuildingCoverage, setMapBuildingCoverage] = useState('all');
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
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState('all');
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleUserSearch, setRoleUserSearch] = useState('');
  const [roleUserFilter, setRoleUserFilter] = useState<'all' | MosqueModuleRole>('all');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationReadFilter, setNotificationReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notificationTypeFilter, setNotificationTypeFilter] = useState<'all' | 'request' | 'ticket' | 'site' | 'leave' | 'quran' | 'other'>('all');

  const [buildingDialog, setBuildingDialog] = useState(false);
  const [buildingCoverageReportOpen, setBuildingCoverageReportOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<MosqueBuilding | null>(null);
  const [buildingForm, setBuildingForm] = useState<any>(emptyBuilding);
  const [showBuildingMap, setShowBuildingMap] = useState(false);
  const [locatingBuilding, setLocatingBuilding] = useState(false);
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
      setCurrentUsername(me.username || 'مستخدم');
      setLinkedSiteId(me.siteId || null);
      setMyPersonnelRole(me.personnelRole || null);
      setFullPermissionAccess(Boolean(me.fullPermissionAccess && me.accessSource === 'module_permissions'));

      const [dash, siteRows, buildingRows, noticeRows] = await Promise.all([
        mosqueApi.dashboard(), mosqueApi.sites(), mosqueApi.buildings(), mosqueApi.notifications(),
      ]);
      setDashboard(dash);
      setSites(siteRows);
      setBuildings(buildingRows);
      setNotifications(noticeRows);

      if (['head', 'supervisor', 'personnel'].includes(me.role)) {
        try {
          const [quranData, quranStockData] = await Promise.all([mosqueApi.quranInventory(), mosqueApi.quranStockDashboard()]);
          setQuranInventoryItems(quranData.items || []);
          setQuranSummary(quranData.summary || emptyQuranSummary);
          setQuranStockDashboard(quranStockData);
          if (me.role === 'head') {
            try { setQuranOpeningBaselineStatus(await mosqueApi.quranOpeningBaselineStatus()); }
            catch { setQuranOpeningBaselineStatus(null); }
          } else {
            setQuranOpeningBaselineStatus(null);
          }
        } catch {
          setQuranInventoryItems([]);
          setQuranSummary(emptyQuranSummary);
          setQuranStockDashboard(null);
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
      setLastUpdatedAt(new Date());
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

  // CENTRAL_BUILDING_GOVERNANCE_V1: when a mosque/prayer room is inside a university building,
  // the central building registry is the authoritative source for shared location data.
  useEffect(() => {
    if (!siteDialog || siteForm.spatialRelation !== 'inside_building' || !siteForm.buildingId) return;
    const building = officialBuildings.find((item) => item.id === siteForm.buildingId);
    if (!building) return;
    setSiteForm((current: any) => {
      const next = {
        ...current,
        city: building.city || '',
        district: building.district || '',
        campusLocation: building.campusLocation || '',
        latitude: building.latitude ?? '',
        longitude: building.longitude ?? '',
      };
      if (
        current.city === next.city &&
        current.district === next.district &&
        current.campusLocation === next.campusLocation &&
        current.latitude === next.latitude &&
        current.longitude === next.longitude
      ) return current;
      return next;
    });
    setShowSiteMap(false);
  }, [siteDialog, siteForm.spatialRelation, siteForm.buildingId, officialBuildings]);

  const siteCities = useMemo(
    () => Array.from(new Set(sites.map((site) => site.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [sites]
  );

  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : [...sites];

    if (q) {
      result = result.filter((site) =>
        [site.name, site.city, site.district, site.campusLocation, site.imamName, site.muezzinName, site.khateebName, site.womenPrayerArea?.locationDescription, site.womenPrayerArea?.floor]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    if (siteFilterCity) result = result.filter((site) => site.city === siteFilterCity);
    if (siteFilterType !== 'all') result = result.filter((site) => site.siteType === siteFilterType);
    if (siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all') {
      result = result.filter((site) => site.prayerRoomGender === siteFilterPrayerRoomGender);
    }
    if (siteFilterWomenPrayerArea !== 'all') {
      result = result.filter((site) => ['mosque', 'jami'].includes(site.siteType)
        && womenPrayerPresence(site) === siteFilterWomenPrayerArea);
    }
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
  }, [sites, search, role, linkedSiteId, siteFilterCity, siteFilterType, siteFilterPrayerRoomGender, siteFilterWomenPrayerArea, siteFilterStatus, siteSortBy, siteSortDirection]);

  const siteFilterStats = useMemo(() => ({
    total: visibleSites.length,
    mosques: visibleSites.filter((site) => site.siteType === 'mosque' || site.siteType === 'jami').length,
    prayerRooms: visibleSites.filter((site) => site.siteType === 'prayer_room').length,
    womenPrayerAreas: visibleSites.filter(hasAttachedWomenPrayerArea).length,
    totalArea: visibleSites.reduce((sum, site) => sum + (Number(site.area) || 0), 0),
  }), [visibleSites]);

  const womenDataQualityStats = useMemo(() => {
    const accessibleSites = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : sites;
    const mosqueSites = accessibleSites.filter((site) => ['mosque', 'jami'].includes(site.siteType));
    const present = mosqueSites.filter((site) => womenPrayerPresence(site) === 'present').length;
    const verifiedAbsent = mosqueSites.filter((site) => womenPrayerPresence(site) === 'verified_absent').length;
    const unverified = mosqueSites.filter((site) => womenPrayerPresence(site) === 'unverified').length;
    const verified = present + verifiedAbsent;
    return {
      total: mosqueSites.length,
      present,
      verifiedAbsent,
      unverified,
      verified,
      completionPercent: mosqueSites.length ? Math.round((verified / mosqueSites.length) * 100) : 100,
    };
  }, [sites, role, linkedSiteId]);

  const resetSiteFilters = () => {
    setSearch('');
    setSiteFilterCity('');
    setSiteFilterType('all');
    setSiteFilterPrayerRoomGender('all');
    setSiteFilterWomenPrayerArea('all');
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
      const calculatedNeed = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0;
      const matchesNeed = !quranNeedOnly || calculatedNeed > 0;
      return matchesSearch && matchesNeed;
    });
  }, [quranInventoryItems, quranStockDashboard, quranSearch, quranNeedOnly]);

  const isQuranDistributionReversed = (movementNumber: string) => Boolean(
    quranStockDashboard?.recentMovements.some((item) => item.movementType === 'return' && item.referenceNumber === movementNumber)
  );

  const openQuranInventoryDialog = (site: MosqueSite) => {
    const latest = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
    const systemStock = quranStockDashboard?.sites.find((item) => item.site.id === site.id)?.systemStock;
    setQuranInventorySite(site);
    setQuranForm({
      siteId: site.id,
      largeCount: String(systemStock?.largeCount ?? latest?.largeCount ?? 0),
      mediumCount: String(systemStock?.mediumCount ?? latest?.mediumCount ?? 0),
      smallCount: String(systemStock?.smallCount ?? latest?.smallCount ?? 0),
      damagedCount: String(latest?.damagedCount ?? 0),
      neededCount: String(latest?.neededCount ?? 0),
      countedAt: new Date().toISOString().slice(0, 10),
      notes: latest?.notes || '',
    });
    setQuranDialog(true);
  };

  const saveQuranInventory = async () => {
    if (!quranInventorySite) return;
    const values = ['largeCount', 'mediumCount', 'smallCount', 'neededCount'] as const;
    const parsed = Object.fromEntries(values.map((key) => [key, Number(quranForm[key] || 0)])) as Record<typeof values[number], number>;
    if (values.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('أعداد المصاحف يجب أن تكون أرقامًا صحيحة غير سالبة');
    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    const currentSystemStock = quranStockDashboard?.sites.find((item) => item.site.id === quranInventorySite.id)?.systemStock;
    const hasPreviousInventory = Boolean(quranLatestBySite[quranInventorySite.id]);
    if (hasPreviousInventory && currentSystemStock && (
      parsed.largeCount > currentSystemStock.largeCount ||
      parsed.mediumCount > currentSystemStock.mediumCount ||
      parsed.smallCount > currentSystemStock.smallCount
    )) return toast.error('زيادة رصيد المسجد أو المصلى تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من مكتبة المصاحف');
    setSaving(true);
    try {
      await mosqueApi.createQuranInventory({
        siteId: quranInventorySite.id,
        ...parsed,
        damagedCount: 0,
        countedAt: quranForm.countedAt || new Date().toISOString(),
        notes: quranForm.notes || null,
      });
      toast.success('تم حفظ جرد المصاحف وإضافته إلى السجل التاريخي');
      setQuranDialog(false);
      setQuranInventorySite(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حفظ جرد المصاحف'); } finally { setSaving(false); }
  };

  const openQuranWarehouse = () => {
    setEditingQuranWarehouse(null);
    setQuranWarehouseForm(emptyQuranWarehouseForm());
    setQuranWarehouseDialog(true);
  };

  const openEditQuranWarehouse = (warehouse: MosqueQuranWarehouse) => {
    setEditingQuranWarehouse(warehouse);
    setQuranWarehouseForm({
      code: warehouse.code || '',
      name: warehouse.name || '',
      location: warehouse.location || '',
      active: warehouse.active !== false,
      minLargeCount: String(warehouse.minLargeCount ?? 0),
      minMediumCount: String(warehouse.minMediumCount ?? 0),
      minSmallCount: String(warehouse.minSmallCount ?? 0),
      notes: warehouse.notes || '',
    });
    setQuranWarehouseDialog(true);
  };

  const saveQuranWarehouse = async () => {
    const counts = ['minLargeCount', 'minMediumCount', 'minSmallCount'] as const;
    const parsed = Object.fromEntries(counts.map((key) => [key, Number(quranWarehouseForm[key] || 0)]));
    if (!String(quranWarehouseForm.name || '').trim()) return toast.error('اسم المكتبة إلزامي');
    if (counts.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('الحدود الدنيا يجب أن تكون أرقامًا صحيحة غير سالبة');
    setQuranStockSaving(true);
    try {
      const payload = {
        code: editingQuranWarehouse ? (quranWarehouseForm.code || editingQuranWarehouse.code) : (quranWarehouseForm.code || null),
        name: quranWarehouseForm.name,
        location: quranWarehouseForm.location || null,
        active: quranWarehouseForm.active !== false,
        ...parsed,
        notes: quranWarehouseForm.notes || null,
      };
      if (editingQuranWarehouse) {
        await mosqueApi.updateQuranWarehouse(editingQuranWarehouse.id, payload);
        toast.success('تم حفظ تعديلات مكتبة المصاحف');
      } else {
        await mosqueApi.createQuranWarehouse(payload);
        toast.success('تم إنشاء مكتبة المصاحف');
      }
      setQuranWarehouseDialog(false);
      setEditingQuranWarehouse(null);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : editingQuranWarehouse ? 'تعذر تعديل مكتبة المصاحف' : 'تعذر إنشاء مكتبة المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

  const deleteQuranWarehouse = async (warehouse: MosqueQuranWarehouse) => {
    if (!window.confirm(`هل تريد حذف المكتبة «${warehouse.name}»؟\n\nلن يسمح النظام بالحذف إذا كانت المكتبة مرتبطة بحركات محفوظة. إذا أردت البدء من الصفر استخدم زر «تصفير المكتبة».`)) return;
    setQuranStockSaving(true);
    try {
      await mosqueApi.deleteQuranWarehouse(warehouse.id);
      if (quranWarehousePreview?.id === warehouse.id) setQuranWarehousePreview(null);
      toast.success('تم حذف مكتبة المصاحف');
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر حذف مكتبة المصاحف'); }
    finally { setQuranStockSaving(false); }
  };

  const exportQuranWarehouseExcel = async (warehouse: MosqueQuranWarehouse) => {
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص المكتبة', [{
      'رمز المكتبة': warehouse.code || '-',
      'اسم المكتبة': warehouse.name,
      'الموقع': warehouse.location || '-',
      'الحالة': warehouse.active ? 'مفعّلة' : 'غير مفعّلة',
      'حالة الرصيد': warehouse.lowStock ? 'رصيد منخفض' : 'الرصيد آمن',
      'إجمالي الرصيد': warehouse.balance.totalCount,
      'الكبيرة': warehouse.balance.largeCount,
      'المتوسطة': warehouse.balance.mediumCount,
      'الصغيرة': warehouse.balance.smallCount,
      'الحد الأدنى - كبيرة': warehouse.minLargeCount,
      'الحد الأدنى - متوسطة': warehouse.minMediumCount,
      'الحد الأدنى - صغيرة': warehouse.minSmallCount,
      'النقص - كبيرة': warehouse.shortage.largeCount,
      'النقص - متوسطة': warehouse.shortage.mediumCount,
      'النقص - صغيرة': warehouse.shortage.smallCount,
      'الملاحظات': warehouse.notes || '-',
      'تاريخ التصدير': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    const movements = (quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === warehouse.id);
    appendExcelReportSheet(workbook, 'حركات المكتبة', movements.map((movement, index) => ({
      'م': index + 1,
      'رقم الحركة': movement.movementNumber,
      'نوع الحركة': quranStockMovementDisplayLabel(movement),
      'الموقع المستفيد': movement.site?.name || '-',
      'كبيرة': movement.largeCount,
      'متوسطة': movement.mediumCount,
      'صغيرة': movement.smallCount,
      'الإجمالي': movement.totalCount,
      'التاريخ': new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'),
    })), 'لا توجد حركات مصاحف ظاهرة لهذه المكتبة');
    await writeProfessionalExcel(workbook, `quran-warehouse-${warehouse.code || warehouse.id}-${excelReportDateStamp()}.xlsx`, { title: `بطاقة مكتبة المصاحف — ${warehouse.name}`, subtitle: 'الرصيد الحالي وحدود الأمان وحركة المكتبة', orientation: 'landscape', imageLoader: async (fileId, url) => fileId ? mosqueApi.mediaBlob(fileId) : (url ? fetch(url).then((response) => response.ok ? response.blob() : null) : null) });
    toast.success('تم تجهيز ملف Excel للمكتبة');
  };

  const printQuranWarehouse = (warehouse: MosqueQuranWarehouse) => {
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const movements = (quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === warehouse.id).slice(0, 30);
    const movementRows = movements.length
      ? movements.map((movement, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(movement.movementNumber)}</td><td>${escapeHtml(quranStockMovementDisplayLabel(movement))}</td><td>${escapeHtml(movement.site?.name || '-')}</td><td>${movement.largeCount}</td><td>${movement.mediumCount}</td><td>${movement.smallCount}</td><td><b>${movement.totalCount}</b></td><td>${escapeHtml(new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'))}</td></tr>`).join('')
      : '<tr><td colspan="9">لا توجد حركات مصاحف ظاهرة لهذه المكتبة.</td></tr>';
    const status = warehouse.active ? 'مفعّل' : 'غير مفعّل';
    const stockStatus = warehouse.lowStock ? 'رصيد منخفض' : 'الرصيد آمن';
    printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقة مكتبة المصاحف - ${escapeHtml(warehouse.name)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;padding:0;direction:rtl}.head{border:2px solid #d6a84b;border-radius:18px;padding:18px;background:linear-gradient(135deg,#fff9e8,#fff,#edfdf5)}h1{margin:0 0 8px;font-size:24px}.meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px}.pill{padding:6px 10px;border:1px solid #d8dee8;border-radius:999px;background:#fff}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.box{border:1px solid #cbd5e1;border-radius:14px;padding:12px;text-align:center}.box small{display:block;color:#64748b;margin-bottom:5px}.box b{font-size:22px}.section{margin-top:18px}.section h2{font-size:16px;margin:0 0 8px}.notes{border:1px solid #e2e8f0;border-radius:12px;padding:10px;min-height:42px;white-space:pre-wrap}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:center}th{background:#f8fafc}.warning{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:12px;padding:10px;margin-top:12px;font-weight:bold}.footer{margin-top:14px;font-size:10px;color:#64748b;text-align:left}@media print{button{display:none}}</style></head><body><div class="head"><h1>بطاقة مكتبة المصاحف</h1><div class="meta"><span class="pill"><b>${escapeHtml(warehouse.name)}</b></span><span class="pill">الرمز: ${escapeHtml(warehouse.code)}</span><span class="pill">الموقع: ${escapeHtml(warehouse.location || '-')}</span><span class="pill">الحالة: ${status}</span><span class="pill">حالة الرصيد: ${stockStatus}</span></div>${warehouse.lowStock ? `<div class="warning">الناقص حتى حد الأمان: كبير ${warehouse.shortage.largeCount} — متوسط ${warehouse.shortage.mediumCount} — صغير ${warehouse.shortage.smallCount}</div>` : ''}</div><div class="grid"><div class="box"><small>الإجمالي</small><b>${warehouse.balance.totalCount}</b></div><div class="box"><small>كبير — الحد الأدنى ${warehouse.minLargeCount}</small><b>${warehouse.balance.largeCount}</b></div><div class="box"><small>متوسط — الحد الأدنى ${warehouse.minMediumCount}</small><b>${warehouse.balance.mediumCount}</b></div><div class="box"><small>صغير — الحد الأدنى ${warehouse.minSmallCount}</small><b>${warehouse.balance.smallCount}</b></div></div><div class="section"><h2>الملاحظات</h2><div class="notes">${escapeHtml(warehouse.notes || 'لا توجد ملاحظات')}</div></div><div class="section"><h2>آخر حركات المصاحف الظاهرة</h2><table><thead><tr><th>م</th><th>رقم الحركة</th><th>النوع</th><th>المسجد / المصلى</th><th>كبير</th><th>متوسط</th><th>صغير</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>${movementRows}</tbody></table></div><div class="footer">تاريخ الطباعة: ${escapeHtml(new Date().toLocaleString('ar-SA-u-ca-gregory'))} — جامعة الإمام عبدالرحمن بن فيصل / وحدة العناية بالمساجد والمصليات الجامعية</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    printWindow.document.close();
  };

  const resetQuranLibrary = async () => {
    const confirmationPhrase = 'تصفير مكتبة المصاحف';
    const entered = window.prompt(
      `عملية التصفير ستحذف نهائيًا:\n\n• مكتبة المصاحف ورصيدها\n• جميع حركات إضافة وإرجاع المصاحف\n• جميع سجلات الجرد السابقة للمساجد والمصليات\n\nلن يتم حذف المساجد أو المصليات أو بياناتها الأساسية.\n\nللتأكيد اكتب العبارة التالية كما هي:\n${confirmationPhrase}`,
      ''
    );
    if (entered === null) return;
    if (entered.trim() !== confirmationPhrase) {
      toast.error('لم يتم التصفير لأن عبارة التأكيد غير مطابقة');
      return;
    }

    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.resetQuranLibrary(confirmationPhrase);
      setQuranWarehousePreview(null);
      setQuranWarehouseDialog(false);
      setQuranStockMovementDialog(false);
      toast.success(result.message || 'تم تصفير مكتبة المصاحف ويمكن البدء من الصفر');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تصفير مكتبة المصاحف');
    } finally {
      setQuranStockSaving(false);
    }
  };

  const openQuranStockMovement = (movementType: string) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    setQuranStockContextSiteId(null);
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType,
      warehouseId: activeWarehouse?.id || '',
      siteId: ['distribution', 'return', 'site_withdrawal'].includes(movementType) ? (sites[0]?.id || '') : '',
    });
    setQuranStockMovementDialog(true);
  };

  const openQuranOpeningBaselineForSite = (site: MosqueSite) => {
    if (quranOpeningBaselineStatus?.closed) {
      toast.info('الجرد التأسيسي معتمد ومقفل، ولا يمكن تعديل الرصيد الافتتاحي');
      return;
    }
    const existing = quranOpeningBaselineStatus?.items.find((item) => item.site.id === site.id)?.baseline;
    setQuranOpeningBaselineSite(site);
    setQuranOpeningBaselineForm({
      ...emptyQuranOpeningBaselineForm(),
      largeCount: String(existing?.largeCount ?? 0),
      mediumCount: String(existing?.mediumCount ?? 0),
      smallCount: String(existing?.smallCount ?? 0),
      recommendedWithdrawalCount: String(existing?.recommendedWithdrawalCount ?? 0),
      countedAt: existing?.countedAt ? String(existing.countedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: existing?.notes || '',
    });
    setQuranOpeningBaselineDialog(true);
  };

  const saveQuranOpeningBaseline = async () => {
    if (!quranOpeningBaselineSite) return;
    const keys = ['largeCount', 'mediumCount', 'smallCount', 'recommendedWithdrawalCount'] as const;
    const parsed = Object.fromEntries(keys.map((key) => [key, Number(quranOpeningBaselineForm[key] || 0)])) as Record<typeof keys[number], number>;
    if (keys.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('أعداد الجرد التأسيسي يجب أن تكون أرقامًا صحيحة غير سالبة');
    const total = parsed.largeCount + parsed.mediumCount + parsed.smallCount;
    if (parsed.recommendedWithdrawalCount > total) return toast.error('عدد المصاحف الموصى بسحبها لا يمكن أن يتجاوز إجمالي الموجود في الموقع');
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.saveQuranOpeningBaseline({
        siteId: quranOpeningBaselineSite.id,
        ...parsed,
        countedAt: quranOpeningBaselineForm.countedAt || new Date().toISOString(),
        notes: quranOpeningBaselineForm.notes || null,
      });
      setQuranOpeningBaselineStatus(result.state);
      setQuranOpeningBaselineDialog(false);
      setQuranOpeningBaselineSite(null);
      toast.success(result.message || 'تم حفظ الجرد التأسيسي دون التأثير على رصيد مكتبة المصاحف');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ الجرد التأسيسي');
    } finally {
      setQuranStockSaving(false);
    }
  };

  const closeQuranOpeningBaseline = async () => {
    if (!quranOpeningBaselineStatus || quranOpeningBaselineStatus.closed) return;
    if (quranOpeningBaselineStatus.remainingSites > 0) {
      toast.error(`لا يمكن الإقفال قبل حصر جميع المواقع. المتبقي ${quranOpeningBaselineStatus.remainingSites} موقعًا`);
      return;
    }
    const phrase = 'اعتماد الجرد التأسيسي';
    const entered = window.prompt(`سيتم إقفال الأرصدة الافتتاحية نهائيًا. اكتب العبارة التالية للتأكيد:

${phrase}`);
    if (entered === null) return;
    if (entered.trim() !== phrase) return toast.error('عبارة التأكيد غير مطابقة');
    if (!window.confirm('بعد الإقفال، أي إضافة جديدة للمساجد ستتم من مكتبة المصاحف وأي سحب سيتم كحركة مستقلة. هل تريد اعتماد الجرد التأسيسي؟')) return;
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.closeQuranOpeningBaseline(phrase);
      setQuranOpeningBaselineStatus(result.state);
      toast.success(result.message || 'تم اعتماد وإقفال الجرد التأسيسي');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إقفال الجرد التأسيسي');
    } finally {
      setQuranStockSaving(false);
    }
  };

  const openQuranDistributionForSite = (site: MosqueSite) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    if (!activeWarehouse) {
      toast.error('لا توجد مكتبة مصاحف مفعّلة لإضافة المصاحف');
      return;
    }

    const linkedRequest = [...requests]
      .filter((request) => isQuranSupplyRequest(request) && request.siteId === site.id && !['closed', 'rejected'].includes(request.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;

    if (linkedRequest && !['approved', 'in_progress', 'completed'].includes(linkedRequest.status)) {
      toast.error('يوجد طلب تزويد ' + linkedRequest.requestNumber + ' وحالته «' + (quranSupplyStatusLabels[linkedRequest.status] || linkedRequest.status) + '». يجب اعتماد الطلب قبل تنفيذ الصرف من المكتبة.');
      setActiveTab('requests');
      return;
    }

    setQuranStockContextSiteId(site.id);
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType: 'distribution',
      warehouseId: activeWarehouse.id,
      siteId: site.id,
      referenceNumber: linkedRequest?.requestNumber || '',
      notes: linkedRequest ? 'تنفيذ طلب تزويد المصاحف ' + linkedRequest.requestNumber : '',
    });
    setQuranStockMovementDialog(true);
  };

  const openQuranWithdrawalForSite = (site: MosqueSite) => {
    const activeWarehouse = quranStockDashboard?.warehouses.find((item) => item.active) || quranStockDashboard?.warehouses[0];
    if (!activeWarehouse) {
      toast.error('لا توجد مكتبة مصاحف مفعّلة لتسجيل حركة السحب');
      return;
    }
    const current = quranStockDashboard?.sites.find((item) => item.site.id === site.id)?.systemStock;
    if (!current?.totalCount) {
      toast.info('لا يوجد رصيد مصاحف في هذا المسجد أو المصلى يمكن سحبه');
      return;
    }
    setQuranStockContextSiteId(site.id);
    setQuranStockMovementForm({
      ...emptyQuranStockMovementForm(),
      movementType: 'site_withdrawal',
      warehouseId: activeWarehouse.id,
      siteId: site.id,
    });
    setQuranStockMovementDialog(true);
  };

  const saveQuranStockMovement = async () => {
    const values = ['largeCount', 'mediumCount', 'smallCount'] as const;
    const parsed = Object.fromEntries(values.map((key) => [key, Number(quranStockMovementForm[key] || 0)])) as Record<typeof values[number], number>;
    if (!quranStockMovementForm.warehouseId) return toast.error('اختر مكتبة المصاحف');
    if (values.some((key) => !Number.isInteger(parsed[key]) || parsed[key] < 0)) return toast.error('الكميات يجب أن تكون أرقامًا صحيحة غير سالبة');
    if ((parsed.largeCount + parsed.mediumCount + parsed.smallCount) <= 0) return toast.error('أدخل كمية واحدة على الأقل');
    if (['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && !quranStockMovementForm.siteId) return toast.error('اختر المسجد أو المصلى');
    if (quranStockMovementForm.movementType === 'site_withdrawal' && !String(quranStockMovementForm.withdrawalReason || '').trim()) return toast.error('حدد سبب سحب المصاحف من المسجد أو المصلى');

    const linkedQuranRequest = quranStockMovementForm.movementType === 'distribution'
      ? (
          requests.find((request) => isQuranSupplyRequest(request) && request.requestNumber === quranStockMovementForm.referenceNumber)
          || [...requests]
            .filter((request) => isQuranSupplyRequest(request) && request.siteId === quranStockMovementForm.siteId && !['closed', 'rejected'].includes(request.status))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          || null
        )
      : null;

    if (linkedQuranRequest && !['approved', 'in_progress', 'completed'].includes(linkedQuranRequest.status)) {
      return toast.error('طلب التزويد ' + linkedQuranRequest.requestNumber + ' لم يعتمد بعد. اعتمد الطلب أولًا ثم نفذ الصرف.');
    }

    setQuranStockSaving(true);
    try {
      const movement = await mosqueApi.createQuranStockMovement({
        movementType: quranStockMovementForm.movementType,
        warehouseId: quranStockMovementForm.warehouseId,
        siteId: ['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) ? quranStockMovementForm.siteId : null,
        ...parsed,
        referenceNumber: quranStockMovementForm.referenceNumber || null,
        movementAt: quranStockMovementForm.movementAt || new Date().toISOString(),
        notes: quranStockMovementForm.movementType === 'site_withdrawal'
          ? `سبب السحب: ${String(quranStockMovementForm.withdrawalReason || '').trim()}${quranStockMovementForm.notes ? `
${quranStockMovementForm.notes}` : ''}`
          : (quranStockMovementForm.notes || null),
      });

      if (quranStockMovementForm.movementType === 'distribution' && linkedQuranRequest) {
        try {
          let requestState = linkedQuranRequest;
          if (requestState.status === 'approved') {
            requestState = await mosqueApi.workflowAction<MosqueRequest>('request', requestState.id, {
              status: 'in_progress',
              note: 'بدأ تنفيذ طلب التزويد من مكتبة المصاحف بموجب الحركة ' + movement.movementNumber + '.',
            });
          }

          const stockBefore = quranStockDashboard?.sites.find((item) => item.site.id === quranStockMovementForm.siteId);
          const needBefore = Number(stockBefore?.needCount || 0);
          const remainingNeed = Math.max(0, needBefore - movement.totalCount);

          if (remainingNeed === 0 && requestState.status === 'in_progress') {
            requestState = await mosqueApi.workflowAction<MosqueRequest>('request', requestState.id, {
              status: 'completed',
              note: 'تم صرف كامل الاحتياج بموجب حركة المصاحف ' + movement.movementNumber + ' بعدد ' + movement.totalCount.toLocaleString('ar-SA') + ' مصحف. يبقى الإغلاق النهائي بعد التحقق في زيارة ميدانية لاحقة.',
            });
          } else if (remainingNeed > 0) {
            toast.info('تم تنفيذ صرف جزئي لطلب ' + requestState.requestNumber + '، والمتبقي حسب الاحتياج المسجل ' + remainingNeed.toLocaleString('ar-SA') + ' مصحف.');
          }

          setRequests((current) => current.map((request) => request.id === requestState.id ? requestState : request));
        } catch (workflowError) {
          toast.warning('تم تسجيل حركة المصاحف، لكن تعذر تحديث حالة طلب التزويد تلقائيًا: ' + (workflowError instanceof Error ? workflowError.message : 'خطأ غير معروف'));
        }
      }

      toast.success(quranStockMovementForm.movementType === 'distribution'
        ? 'تمت إضافة المصاحف للموقع وخصمها تلقائيًا من رصيد المكتبة'
        : quranStockMovementForm.movementType === 'site_withdrawal'
          ? 'تم سحب المصاحف من رصيد المسجد أو المصلى وتسجيل سبب السحب في السجل'
          : quranStockMovementForm.movementType === 'receipt'
            ? 'تمت إضافة الكمية إلى رصيد مكتبة المصاحف'
            : 'تم تسجيل حركة المصاحف بنجاح');
      setQuranStockMovementDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تسجيل حركة مصاحف المكتبة'); }
    finally { setQuranStockSaving(false); }
  };

  const reverseQuranStockMovement = async (movement: MosqueQuranStockMovement) => {
    if (movement.movementType !== 'distribution') return;
    if (isQuranDistributionReversed(movement.movementNumber)) return toast.info('تم التراجع عن إضافة المصاحف هذه مسبقًا');
    const reason = window.prompt(`سبب التراجع عن إضافة المصاحف ${movement.movementNumber}:`, 'إضافة المصاحف للموقع بالخطأ');
    if (reason === null) return;
    if (reason.trim().length < 3) return toast.error('اكتب سببًا واضحًا للتراجع');
    if (!window.confirm(`سيتم عكس إضافة المصاحف ${movement.movementNumber} وإعادة ${movement.totalCount} مصحفًا إلى المكتبة مع إبقاء الحركة الأصلية في السجل. هل تريد المتابعة؟`)) return;
    setQuranStockSaving(true);
    try {
      const result = await mosqueApi.reverseQuranStockMovement(movement.id, { reason: reason.trim() });
      toast.success(`تم التراجع عن الإضافة وإعادة الكمية للمكتبة بموجب ${result.reversal.movementNumber}`);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر التراجع عن إضافة المصاحف');
    } finally {
      setQuranStockSaving(false);
    }
  };

  const openQuranHistory = async (site: MosqueSite) => {
    setQuranHistorySite(site);
    setQuranHistoryRows([]);
    setQuranHistoryLoading(true);
    try { setQuranHistoryRows(await mosqueApi.quranInventoryHistory(site.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل الجرد'); }
    finally { setQuranHistoryLoading(false); }
  };

  const quranPeriodMovements = useMemo(() => {
    return quranStockMovements.filter((movement) => {
      if (!movement.siteId) return false;
      const movementDate = String(movement.movementAt || movement.createdAt || '').slice(0, 10);
      if (quranPrintFrom && movementDate && movementDate < quranPrintFrom) return false;
      if (quranPrintTo && movementDate && movementDate > quranPrintTo) return false;
      return true;
    });
  }, [quranStockMovements, quranPrintFrom, quranPrintTo]);

  const quranMovementStatsBySite = useMemo(() => {
    const stats = new Map<string, { added: number; withdrawn: number; returned: number; netMovement: number; movements: number }>();
    for (const movement of quranPeriodMovements) {
      if (!movement.siteId) continue;
      const current = stats.get(movement.siteId) || { added: 0, withdrawn: 0, returned: 0, netMovement: 0, movements: 0 };
      const quantity = Number(movement.totalCount || 0);
      if (movement.movementType === 'distribution') current.added += quantity;
      if (movement.movementType === 'site_withdrawal') current.withdrawn += quantity;
      if (movement.movementType === 'return') current.returned += quantity;
      current.netMovement = current.added - current.withdrawn - current.returned;
      current.movements += 1;
      stats.set(movement.siteId, current);
    }
    return stats;
  }, [quranPeriodMovements]);

  const quranPrintRows = useMemo(() => {
    const q = quranPrintSearch.trim().toLowerCase();
    const rows = quranInventoryItems.map((item) => {
      const site = (sites.find((row) => row.id === item.site.id) || item.site) as MosqueSite;
      const latest = item.latest;
      const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);
      const systemStock = stockRow?.systemStock;
      const large = Number(systemStock?.largeCount ?? latest?.largeCount ?? 0);
      const medium = Number(systemStock?.mediumCount ?? latest?.mediumCount ?? 0);
      const small = Number(systemStock?.smallCount ?? latest?.smallCount ?? 0);
      const total = large + medium + small;
      const damaged = Number(stockRow?.withdrawnStock?.totalCount ?? 0);
      const target = Number(stockRow?.targetCount ?? site.quranTargetCount ?? 0);
      const needed = Number(stockRow?.needCount ?? 0);
      const coverage = stockRow?.coveragePercent ?? (target > 0 ? Math.min(100, Math.round((total / target) * 100)) : null);
      const lastCountAt = latest?.countedAt ? new Date(latest.countedAt).getTime() : 0;
      const movement = quranMovementStatsBySite.get(site.id) || { added: 0, withdrawn: 0, returned: 0, netMovement: 0, movements: 0 };
      return { item, site, latest, large, medium, small, total, damaged, target, needed, coverage, lastCountAt, ...movement };
    }).filter((row) => {
      const matchesSearch = !q || [row.site.name, row.site.city, row.site.district, row.site.campusLocation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesSite = quranPrintSiteFilter === 'all'
        || (quranPrintSiteFilter === 'mosque' && row.site.siteType === 'mosque')
        || (quranPrintSiteFilter === 'jami' && row.site.siteType === 'jami')
        || (quranPrintSiteFilter === 'prayer_room_men' && row.site.siteType === 'prayer_room' && row.site.prayerRoomGender === 'men')
        || (quranPrintSiteFilter === 'prayer_room_women' && row.site.siteType === 'prayer_room' && row.site.prayerRoomGender === 'women');
      const matchesState = quranPrintStateFilter === 'all'
        || (quranPrintStateFilter === 'with_stock' && row.total > 0)
        || (quranPrintStateFilter === 'without_stock' && row.total === 0)
        || (quranPrintStateFilter === 'need' && row.needed > 0)
        || (quranPrintStateFilter === 'damaged' && row.damaged > 0)
        || (quranPrintStateFilter === 'not_counted' && !row.latest);
      const activityTotal = row.added + row.withdrawn + row.returned;
      const matchesActivity = quranPrintActivityFilter === 'all'
        || (quranPrintActivityFilter === 'with_activity' && activityTotal > 0)
        || (quranPrintActivityFilter === 'without_activity' && activityTotal === 0)
        || (quranPrintActivityFilter === 'added' && row.added > 0)
        || (quranPrintActivityFilter === 'withdrawn' && row.withdrawn > 0)
        || (quranPrintActivityFilter === 'returned' && row.returned > 0);
      return matchesSearch && matchesSite && matchesState && matchesActivity;
    });

    rows.sort((a, b) => {
      let compared = 0;
      if (quranPrintSortKey === 'name') compared = (a.site.name || '').localeCompare(b.site.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      else if (quranPrintSortKey === 'last_count') compared = a.lastCountAt - b.lastCountAt;
      else compared = Number(a[quranPrintSortKey]) - Number(b[quranPrintSortKey]);
      if (compared === 0) compared = (a.site.name || '').localeCompare(b.site.name || '', 'ar', { numeric: true, sensitivity: 'base' });
      return quranPrintSortDirection === 'desc' ? compared * -1 : compared;
    });
    return rows;
  }, [quranInventoryItems, sites, quranStockDashboard, quranPrintSearch, quranPrintSiteFilter, quranPrintStateFilter, quranPrintActivityFilter, quranPrintSortKey, quranPrintSortDirection, quranMovementStatsBySite]);

  const quranPrintStats = useMemo(() => quranPrintRows.reduce((stats, row) => ({
    sites: stats.sites + 1,
    total: stats.total + row.total,
    large: stats.large + row.large,
    medium: stats.medium + row.medium,
    small: stats.small + row.small,
    damaged: stats.damaged + row.damaged,
    needed: stats.needed + row.needed,
    added: stats.added + row.added,
    withdrawn: stats.withdrawn + row.withdrawn,
    returned: stats.returned + row.returned,
    netMovement: stats.netMovement + row.netMovement,
  }), { sites: 0, total: 0, large: 0, medium: 0, small: 0, damaged: 0, needed: 0, added: 0, withdrawn: 0, returned: 0, netMovement: 0 }), [quranPrintRows]);

  const quranPrintMovementRows = useMemo(() => {
    const allowedSiteIds = new Set(quranPrintRows.map((row) => row.site.id));
    return quranPeriodMovements
      .filter((movement) => {
        if (!movement.siteId || !allowedSiteIds.has(movement.siteId)) return false;
        if (quranPrintActivityFilter === 'added') return movement.movementType === 'distribution';
        if (quranPrintActivityFilter === 'withdrawn') return movement.movementType === 'site_withdrawal';
        if (quranPrintActivityFilter === 'returned') return movement.movementType === 'return';
        if (quranPrintActivityFilter === 'without_activity') return false;
        return ['distribution', 'site_withdrawal', 'return'].includes(movement.movementType);
      })
      .sort((a, b) => new Date(b.movementAt).getTime() - new Date(a.movementAt).getTime());
  }, [quranPeriodMovements, quranPrintRows, quranPrintActivityFilter]);

  const openQuranPrintDialog = async () => {
    setQuranPrintSearch(quranSearch);
    setQuranPrintSiteFilter('all');
    setQuranPrintStateFilter(quranNeedOnly ? 'need' : 'all');
    setQuranPrintActivityFilter('all');
    setQuranPrintFrom('');
    setQuranPrintTo('');
    setQuranPrintSortKey('name');
    setQuranPrintSortDirection('asc');
    setQuranPrintDialog(true);
    setQuranMovementsLoading(true);
    try {
      setQuranStockMovements(await mosqueApi.quranStockMovements());
    } catch (error) {
      setQuranStockMovements([]);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل حركات المصاحف للتقرير');
    } finally {
      setQuranMovementsLoading(false);
    }
  };

  const resetQuranPrintFilters = () => {
    setQuranPrintSearch('');
    setQuranPrintSiteFilter('all');
    setQuranPrintStateFilter('all');
    setQuranPrintActivityFilter('all');
    setQuranPrintFrom('');
    setQuranPrintTo('');
    setQuranPrintSortKey('name');
    setQuranPrintSortDirection('asc');
  };

  const exportQuranInventoryExcel = async () => {
    if (!quranPrintRows.length) return toast.info('لا توجد بيانات مصاحف مطابقة لمعايير التقرير');
    if (quranMovementsLoading) return toast.info('جاري تحميل حركات المصاحف، انتظر لحظة ثم أعد التصدير');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'ملخص المواقع', quranPrintRows.map((row, index) => ({
      'م': index + 1,
      'المسجد / المصلى': row.site.name,
      'النوع': siteTypeDisplayLabel(row.site),
      'الموقع': [row.site.campusLocation, row.site.city, row.site.district].filter(Boolean).join(' — ') || '-',
      'كبيرة': row.large,
      'متوسطة': row.medium,
      'صغيرة': row.small,
      'الرصيد الحالي': row.total,
      'المضاف خلال الفترة': row.added,
      'المسحوب خلال الفترة': row.withdrawn,
      'المرتجع خلال الفترة': row.returned,
      'صافي الحركة': row.netMovement,
      'المسحوب التراكمي': row.damaged,
      'المستهدف': row.target || 0,
      'التغطية %': row.coverage ?? '-',
      'الاحتياج': row.needed,
      'آخر جرد': row.latest ? new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد',
    })));
    appendExcelReportSheet(workbook, 'حركات الفترة', quranPrintMovementRows.map((movement, index) => ({
      'م': index + 1,
      'رقم الحركة': movement.movementNumber,
      'التاريخ': new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'),
      'المسجد / المصلى': movement.site?.name || sites.find((site) => site.id === movement.siteId)?.name || '-',
      'نوع الحركة': quranStockMovementDisplayLabel(movement),
      'كبير': movement.largeCount,
      'متوسط': movement.mediumCount,
      'صغير': movement.smallCount,
      'الإجمالي': movement.totalCount,
      'المرجع': movement.referenceNumber || '-',
      'نفذت بواسطة': movement.createdByName || '-',
      'الملاحظات': movement.notes || '-',
    })), 'لا توجد حركات مصاحف مطابقة للفترة والمعايير المحددة');
    appendExcelReportSheet(workbook, 'ملخص التقرير', [{
      'عدد المواقع': quranPrintStats.sites,
      'الرصيد الحالي': quranPrintStats.total,
      'المضاف خلال الفترة': quranPrintStats.added,
      'المسحوب خلال الفترة': quranPrintStats.withdrawn,
      'المرتجع خلال الفترة': quranPrintStats.returned,
      'صافي الحركة': quranPrintStats.netMovement,
      'الاحتياج': quranPrintStats.needed,
      'من تاريخ': quranPrintFrom || 'بداية السجل',
      'إلى تاريخ': quranPrintTo || 'حتى الآن',
      'عدد الحركات': quranPrintMovementRows.length,
      'تاريخ التصدير': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(quranPrintRows.map((row) => row.site)), 'لا توجد صور أو مرفقات للمواقع الظاهرة في التقرير');
    await writeProfessionalExcel(workbook, `quran-movement-report-${excelReportDateStamp()}.xlsx`, {
      title: 'تقرير المصاحف والحركات',
      subtitle: `المواقع: ${quranPrintRows.length} — الفترة: ${quranPrintFrom || 'بداية السجل'} إلى ${quranPrintTo || 'الآن'}`,
      orientation: 'landscape',
      metrics: [
        { label: 'المواقع', value: quranPrintStats.sites, tone: 'blue' },
        { label: 'الرصيد الحالي', value: quranPrintStats.total, tone: 'green' },
        { label: 'المضاف', value: quranPrintStats.added, tone: 'green' },
        { label: 'المسحوب', value: quranPrintStats.withdrawn, tone: 'red' },
        { label: 'المرتجع', value: quranPrintStats.returned, tone: 'amber' },
        { label: 'الاحتياج', value: quranPrintStats.needed, tone: 'amber' },
      ],
      imageLoader: async (fileId, url) => fileId ? mosqueApi.mediaBlob(fileId) : (url ? fetch(url).then((response) => response.ok ? response.blob() : null) : null),
    });
    toast.success('تم تجهيز تقرير المصاحف والحركات بصيغة Excel');
  };

  const printQuranInventory = () => {
    if (!quranPrintRows.length) return toast.info('لا توجد بيانات مصاحف مطابقة لمعايير الطباعة');
    if (quranMovementsLoading) return toast.info('جاري تحميل حركات المصاحف، انتظر لحظة ثم أعد الطباعة');
    const printWindow = window.open('', '_blank', 'width=1450,height=950');
    if (!printWindow) return toast.error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
    const siteFilterLabels = { all: 'جميع المواقع', mosque: 'المساجد', jami: 'الجوامع', prayer_room_men: 'مصليات الرجال', prayer_room_women: 'مصليات النساء' };
    const stateFilterLabels = { all: 'جميع الحالات', with_stock: 'لديه رصيد', without_stock: 'بدون رصيد', need: 'لديه احتياج', damaged: 'لديه مصاحف مسحوبة', not_counted: 'لم يسبق جرده' };
    const activityFilterLabels = { all: 'جميع المواقع', with_activity: 'لديها حركة خلال الفترة', added: 'تمت إضافة مصاحف', withdrawn: 'تم سحب مصاحف', returned: 'تم إرجاع مصاحف', without_activity: 'بدون حركة خلال الفترة' };
    const sortLabels = { name: 'اسم الموقع', total: 'الرصيد الحالي', large: 'الكبيرة', medium: 'المتوسطة', small: 'الصغيرة', damaged: 'المسحوب التراكمي', needed: 'الاحتياج', added: 'المضاف', withdrawn: 'المسحوب', returned: 'المرتجع', netMovement: 'صافي الحركة', last_count: 'آخر جرد' };
    const rows = quranPrintRows.map((row, index) => {
      const location = [row.site.campusLocation, row.site.city, row.site.district].filter(Boolean).join(' — ') || '-';
      return `<tr><td>${index + 1}</td><td class="name">${esc(row.site.name)}</td><td>${esc(siteTypeDisplayLabel(row.site))}</td><td class="location">${esc(location)}</td><td>${row.total}</td><td class="added">${row.added}</td><td class="withdrawn">${row.withdrawn}</td><td class="returned">${row.returned}</td><td class="net">${row.netMovement}</td><td>${row.target || '-'}</td><td>${row.coverage == null ? '-' : `${row.coverage}%`}</td><td class="needed">${row.needed}</td><td>${row.latest ? esc(new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')) : 'لم يجرد'}</td></tr>`;
    }).join('');
    const movementRows = quranPrintMovementRows.map((movement, index) => `<tr><td>${index + 1}</td><td>${esc(movement.movementNumber)}</td><td>${esc(new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory'))}</td><td class="name">${esc(movement.site?.name || sites.find((site) => site.id === movement.siteId)?.name || '-')}</td><td>${esc(quranStockMovementDisplayLabel(movement))}</td><td>${movement.largeCount}</td><td>${movement.mediumCount}</td><td>${movement.smallCount}</td><td class="total">${movement.totalCount}</td><td>${esc(movement.referenceNumber || '-')}</td></tr>`).join('');
    const filterSummary = [
      quranPrintSearch.trim() ? `بحث: ${quranPrintSearch.trim()}` : '',
      siteFilterLabels[quranPrintSiteFilter],
      stateFilterLabels[quranPrintStateFilter],
      activityFilterLabels[quranPrintActivityFilter],
      `الفترة: ${quranPrintFrom || 'بداية السجل'} إلى ${quranPrintTo || 'الآن'}`,
      `الترتيب: ${sortLabels[quranPrintSortKey]} (${quranPrintSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'})`,
    ].filter(Boolean).join(' — ');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير المصاحف والحركات</title><style>
      @page{size:A4 landscape;margin:6mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#172033;font-size:8px;direction:rtl}.head{border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;background:linear-gradient(90deg,#f0fdfa,#fff,#eff6ff)}.kicker{font-size:8px;color:#64748b;margin-bottom:3px}.title-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}h1{font-size:18px;margin:0;color:#123047}.count{border:1px solid #93c5fd;background:#eff6ff;border-radius:999px;padding:4px 10px;font-weight:800}.meta{color:#64748b;margin-top:4px}.filters{margin-top:7px;border-top:1px solid #dbeafe;padding-top:6px;color:#334155;font-size:8px}.metrics{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin:8px 0}.metric{border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#f8fafc;text-align:center}.metric span{display:block;color:#64748b;font-size:7px}.metric b{display:block;font-size:13px;margin-top:2px}.metric.emerald{border-color:#a7f3d0;background:#ecfdf5}.metric.red{border-color:#fecaca;background:#fef2f2}.metric.amber{border-color:#fde68a;background:#fffbeb}.section-title{margin:12px 0 5px;font-size:13px;font-weight:900;color:#123047}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:4px 3px;text-align:center;vertical-align:middle;line-height:1.4}th{background:#e0f2fe;font-weight:900;font-size:7.2px}.name{text-align:right;font-weight:800}.location{text-align:right;font-size:7px}.total,.added{font-weight:900;color:#047857}.withdrawn{font-weight:900;color:#b91c1c}.returned{font-weight:900;color:#b45309}.net{font-weight:900;color:#0369a1}.needed{color:#b45309;font-weight:800}.footer{margin-top:7px;padding-top:5px;border-top:1px solid #e2e8f0;color:#64748b;font-size:7px;display:flex;justify-content:space-between;gap:10px}.movements{margin-top:12px;break-before:auto}@media print{body{print-color-adjust:exact}}
    </style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title-row"><h1>تقرير المصاحف والحركات</h1><span class="count">${quranPrintRows.length} موقع</span></div><div class="meta">تاريخ الاستخراج: ${esc(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</div><div class="filters"><strong>معايير التقرير:</strong> ${esc(filterSummary)}</div></div><div class="metrics"><div class="metric"><span>المواقع</span><b>${quranPrintStats.sites}</b></div><div class="metric emerald"><span>الرصيد الحالي</span><b>${quranPrintStats.total}</b></div><div class="metric emerald"><span>المضاف</span><b>${quranPrintStats.added}</b></div><div class="metric red"><span>المسحوب</span><b>${quranPrintStats.withdrawn}</b></div><div class="metric amber"><span>المرتجع</span><b>${quranPrintStats.returned}</b></div><div class="metric"><span>صافي الحركة</span><b>${quranPrintStats.netMovement}</b></div><div class="metric amber"><span>الاحتياج</span><b>${quranPrintStats.needed}</b></div></div><div class="section-title">ملخص المساجد والمصليات</div><table><thead><tr><th>م</th><th>المسجد / المصلى</th><th>النوع</th><th>الموقع</th><th>الرصيد الحالي</th><th>المضاف</th><th>المسحوب</th><th>المرتجع</th><th>صافي الحركة</th><th>المستهدف</th><th>التغطية</th><th>الاحتياج</th><th>آخر جرد</th></tr></thead><tbody>${rows}</tbody></table>${movementRows ? `<div class="movements"><div class="section-title">تفاصيل الحركات خلال الفترة (${quranPrintMovementRows.length})</div><table><thead><tr><th>م</th><th>رقم الحركة</th><th>التاريخ</th><th>المسجد / المصلى</th><th>نوع الحركة</th><th>كبير</th><th>متوسط</th><th>صغير</th><th>الإجمالي</th><th>المرجع</th></tr></thead><tbody>${movementRows}</tbody></table></div>` : ''}<div class="footer"><span>منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية</span><span>الرصيد الحالي قيمة لحظية، بينما المضاف والمسحوب والمرتجع تحسب حسب الفترة المحددة.</span></div></body></html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setQuranPrintDialog(false);
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
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

  const filteredCoverageBuildings = useMemo(() => {
    const q = buildingCoverageSearch.trim().toLowerCase();
    return officialBuildings.filter((building) => {
      const matchesSearch = !q || [building.buildingNumber, building.name, building.campusLocation, building.city, building.district]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesCoverage = buildingCoverageFilter === 'all' || building.coverageStatus === buildingCoverageFilter;
      return matchesSearch && matchesCoverage;
    });
  }, [officialBuildings, buildingCoverageSearch, buildingCoverageFilter]);

  const spatialMapSites = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return sites.filter((site) => {
      if (!Number.isFinite(Number(site.latitude)) || !Number.isFinite(Number(site.longitude))) return false;
      const matchesSearch = !q || [site.name, site.campusLocation, site.city, site.district, site.building?.buildingNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesType = mapSiteType === 'all' || site.siteType === mapSiteType;
      const matchesStatus = mapSiteStatus === 'all' || site.status === mapSiteStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [sites, mapSearch, mapSiteType, mapSiteStatus]);

  const spatialMapBuildings = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return officialBuildings.filter((building) => {
      if (!Number.isFinite(Number(building.latitude)) || !Number.isFinite(Number(building.longitude))) return false;
      const matchesSearch = !q || [building.buildingNumber, building.name, building.campusLocation, building.city, building.district]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesCoverage = mapBuildingCoverage === 'all' || building.coverageStatus === mapBuildingCoverage;
      return matchesSearch && matchesCoverage;
    });
  }, [officialBuildings, mapSearch, mapBuildingCoverage]);

  const mapSites = mapLayer === 'buildings' ? [] : spatialMapSites;
  const mapBuildings = ['head', 'supervisor'].includes(role) && mapLayer !== 'sites' ? spatialMapBuildings : [];
  const mapCenter: [number, number] = useMemo(() => {
    const points = [
      ...mapSites.map((site) => [Number(site.latitude), Number(site.longitude)] as [number, number]),
      ...mapBuildings.map((building) => [Number(building.latitude), Number(building.longitude)] as [number, number]),
    ];
    if (!points.length) return [26.3927, 50.0438];
    return [
      points.reduce((sum, point) => sum + point[0], 0) / points.length,
      points.reduce((sum, point) => sum + point[1], 0) / points.length,
    ];
  }, [mapSites, mapBuildings]);

  const buildingCoveragePercent = officialBuildings.length
    ? Math.round((officialBuildings.filter((building) => building.coverageStatus === 'covered').length / officialBuildings.length) * 100)
    : 0;

  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;

  const siteExcelValue = (site: MosqueSite, key: SitePrintColumnKey) => {
    const buildingCode = site.building?.buildingNumber || String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
    const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
    if (key === 'name') return site.name;
    if (key === 'type') return siteTypeDisplayLabel(site);
    if (key === 'building') return buildingCode;
    if (key === 'location') return site.campusLocation || '-';
    if (key === 'cityDistrict') return cityDistrict;
    if (key === 'area') return site.area ?? '-';
    if (key === 'capacity') return site.capacity ?? '-';
    if (key === 'womenPrayerArea') return ['mosque', 'jami'].includes(site.siteType) ? (site.hasWomenPrayerArea ? 'موجود' : 'غير مسجل') : '-';
    if (key === 'womenCapacity') return site.hasWomenPrayerArea ? (site.womenPrayerArea?.capacity ?? '-') : '-';
    if (key === 'womenStatus') return site.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(site) : '-';
    if (key === 'imam') return site.imamName || '-';
    if (key === 'muezzin') return site.muezzinName || '-';
    if (key === 'khateeb') return site.khateebName || '-';
    if (key === 'coordinatorName') return site.coordinatorName || '-';
    if (key === 'contactPhone') return site.contactPhone || '-';
    if (key === 'coordinates') return site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
    if (key === 'status') return siteStatusLabels[site.status] || site.status;
    if (key === 'notes') return site.notes || '-';
    return '-';
  };

  const siteMediaExcelRows = (rows: MosqueSite[]) => rows.flatMap((site) => {
    const media = normalizeSiteMedia(site.images || null);
    return [
      ...media.photos.map((item, index) => ({
        'المسجد / المصلى': site.name,
        'نوع الموقع': siteTypeDisplayLabel(site),
        'نوع المرفق': 'صورة',
        'التصنيف': item.category === 'site_image' ? 'صورة الموقع / المبنى' : 'صورة المسجد / المصلى',
        'الترتيب': index + 1,
        'اسم الملف': item.fileName || `صورة ${index + 1}`,
        'الوصف': item.description || '-',
        'نوع الملف': item.mimeType || '-',
        'الرابط': item.url || '-',
        'معرف الملف': item.fileId || '-',
      })),
      ...media.documents.map((item, index) => ({
        'المسجد / المصلى': site.name,
        'نوع الموقع': siteTypeDisplayLabel(site),
        'نوع المرفق': 'مستند',
        'التصنيف': 'مستند / ملف',
        'الترتيب': index + 1,
        'اسم الملف': item.fileName || `مستند ${index + 1}`,
        'الوصف': '-',
        'نوع الملف': item.mimeType || '-',
        'الرابط': item.url || '-',
        'معرف الملف': item.fileId || '-',
      })),
    ];
  });

  const exportSitesExcel = async (rows: MosqueSite[], filePrefix = 'mosques-sites-report') => {
    if (!rows.length) return toast.info('لا توجد مساجد أو مصليات لتصديرها');
    const selectedColumns = SITE_PRINT_COLUMNS.filter((column) => sitePrintColumns.includes(column.key));
    if (!selectedColumns.length) return toast.info('حدد عمودًا واحدًا على الأقل للتقرير');
    const workbook = XLSX.utils.book_new();
    appendExcelReportSheet(workbook, 'المساجد والمصليات', rows.map((site, index) => Object.fromEntries([
      ['م', index + 1],
      ...selectedColumns.map((column) => [column.label, siteExcelValue(site, column.key)]),
    ])));
    appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(rows), 'لا توجد صور أو مرفقات للمواقع المحددة');
    await writeProfessionalExcel(workbook, `${filePrefix}-${excelReportDateStamp()}.xlsx`, { title: rows.length === 1 ? `بطاقة ${rows[0].name}` : 'جدول المساجد والمصليات الجامعية', subtitle: `عدد المواقع: ${rows.length}`, orientation: selectedColumns.length > 6 ? 'landscape' : 'portrait', imageLoader: async (fileId, url) => fileId ? mosqueApi.mediaBlob(fileId) : (url ? fetch(url).then((response) => response.ok ? response.blob() : null) : null) });
    toast.success(`تم تجهيز Excel ويشمل ${rows.length} موقعًا وورقة مستقلة للصور والمرفقات`);
  };

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
      const buildingCode = site.building?.buildingNumber || String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const cityDistrict = [site.city, site.district].filter(Boolean).join(' — ') || '-';
      if (key === 'name') return site.name;
      if (key === 'type') return siteTypeDisplayLabel(site);
      if (key === 'building') return buildingCode;
      if (key === 'location') return site.campusLocation || '-';
      if (key === 'cityDistrict') return cityDistrict;
      if (key === 'area') return site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-';
      if (key === 'capacity') return site.capacity ? site.capacity.toLocaleString('ar-SA') : '-';
      if (key === 'womenPrayerArea') return ['mosque', 'jami'].includes(site.siteType) ? (site.hasWomenPrayerArea ? 'موجود' : 'غير مسجل') : '-';
      if (key === 'womenCapacity') return site.hasWomenPrayerArea && site.womenPrayerArea?.capacity ? Number(site.womenPrayerArea.capacity).toLocaleString('ar-SA') : '-';
      if (key === 'womenStatus') return site.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(site) : '-';
      if (key === 'imam') return site.imamName || '-';
      if (key === 'muezzin') return site.muezzinName || '-';
      if (key === 'khateeb') return site.khateebName || '-';
      if (key === 'coordinatorName') return site.coordinatorName || '-';
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
      womenPrayerArea: 0.8,
      womenCapacity: 0.8,
      womenStatus: 0.95,
      imam: 1.05,
      muezzin: 1.05,
      khateeb: 1.05,
      coordinatorName: 1.15,
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

    const centerColumns = new Set<SitePrintColumnKey>(['type', 'building', 'area', 'capacity', 'womenPrayerArea', 'womenCapacity', 'womenStatus', 'contactPhone', 'coordinates', 'status']);
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
      siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all'
        ? `فئة المصلى: ${prayerRoomGenderLabels[siteFilterPrayerRoomGender] || siteFilterPrayerRoomGender}`
        : null,
      siteFilterWomenPrayerArea !== 'all'
        ? `مصلى النساء: ${siteFilterWomenPrayerArea === 'with' ? 'موجود' : 'غير مسجل'}`
        : null,
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
      const buildingCode = site.building?.buildingNumber || String(site.campusLocation || '').match(/\b(?:M|A|H)\d+\b/i)?.[0]?.toUpperCase() || '-';
      const coordinates = site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-';
      const quranInventory = quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined;
      const quranStockRow = quranStockDashboard?.sites.find((row) => row.site.id === site.id);
      const quranWithdrawn = quranStockRow?.withdrawnStock?.totalCount || 0;
      const infoItems = [
        ['الاسم', site.name],
        ['النوع', siteTypeDisplayLabel(site)],
        ['رقم المبنى', buildingCode],
        ['الحالة', siteStatusLabels[site.status] || site.status],
        ['الموقع داخل الجامعة', location],
        ['المساحة', site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'],
        ['الطاقة الاستيعابية', site.capacity ? site.capacity.toLocaleString('ar-SA') : '-'],
        ...(['mosque', 'jami'].includes(site.siteType) ? [
          ['مصلى النساء', site.hasWomenPrayerArea ? 'موجود' : 'غير مسجل'],
          ['حالة مصلى النساء', site.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(site) : '-'],
          ['سعة مصلى النساء', site.hasWomenPrayerArea && site.womenPrayerArea?.capacity ? Number(site.womenPrayerArea.capacity).toLocaleString('ar-SA') : '-'],
          ['الدور / المستوى لمصلى النساء', site.hasWomenPrayerArea ? (site.womenPrayerArea?.floor || '-') : '-'],
          ['موقع مصلى النساء', site.hasWomenPrayerArea ? (site.womenPrayerArea?.locationDescription || '-') : '-'],
        ] : []),
        ['الإمام', site.imamName || '-'],
        ['المؤذن', site.muezzinName || '-'],
        ['الخطيب', site.khateebName || '-'],
        ['اسم المشرف', site.supervisorName || '-'],
        ['اسم المنسق', site.coordinatorName || '-'],
        ['رقم التواصل', site.contactPhone || '-'],
        ['الإحداثيات', coordinates],
        ['إجمالي المصاحف', quranInventory?.totalCount?.toLocaleString('ar-SA') || 'لم يتم الجرد'],
        ['مصاحف كبيرة', quranInventory?.largeCount?.toLocaleString('ar-SA') || '-'],
        ['مصاحف متوسطة', quranInventory?.mediumCount?.toLocaleString('ar-SA') || '-'],
        ['مصاحف صغيرة', quranInventory?.smallCount?.toLocaleString('ar-SA') || '-'],
        ['المصاحف المسحوبة', quranWithdrawn.toLocaleString('ar-SA')],
        ['العدد المستهدف للمصاحف', quranStockRow?.targetCount ? quranStockRow.targetCount.toLocaleString('ar-SA') : '-'],
        ['نسبة التغطية', quranStockRow?.coveragePercent != null ? `${quranStockRow.coveragePercent}%` : '-'],
        ['الاحتياج الحالي', (quranStockRow?.needCount || 0).toLocaleString('ar-SA')],
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

  const openBuildingDialog = (building?: MosqueBuilding) => {
    setEditingBuilding(building || null);
    setBuildingForm(building ? {
      buildingNumber: building.buildingNumber || '',
      name: building.name || '',
      campusLocation: building.campusLocation || '',
      city: building.city || '',
      district: building.district || '',
      latitude: building.latitude ?? '',
      longitude: building.longitude ?? '',
      expectedUsers: building.expectedUsers ?? '',
      coverageStatus: building.coverageStatus || 'unassessed',
      creationFeasibility: building.creationFeasibility || 'under_study',
      unavailableReason: building.unavailableReason || '',
      approvedAlternative: building.approvedAlternative || '',
      notes: building.notes || '',
    } : emptyBuilding);
    setShowBuildingMap(Boolean(building?.latitude != null && building?.longitude != null));
    setBuildingDialog(true);
  };

  const buildingPickerCoordinates = useMemo(() => {
    const latitude = Number(buildingForm.latitude);
    const longitude = Number(buildingForm.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined;
    return { latitude, longitude };
  }, [buildingForm.latitude, buildingForm.longitude]);

  const updateBuildingCoordinates = React.useCallback((coordinates: { latitude: number; longitude: number }) => {
    setBuildingForm((current: any) => ({
      ...current,
      latitude: Number(coordinates.latitude.toFixed(6)),
      longitude: Number(coordinates.longitude.toFixed(6)),
    }));
  }, []);

  const captureCurrentBuildingLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocatingBuilding(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateBuildingCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setShowBuildingMap(true);
        setLocatingBuilding(false);
        toast.success('تم تحديد موقع المبنى وتعبئة الإحداثيات');
      },
      (error) => {
        setLocatingBuilding(false);
        toast.error(error.code === error.PERMISSION_DENIED
          ? 'يرجى السماح للمتصفح باستخدام الموقع الجغرافي ثم إعادة المحاولة'
          : 'تعذر تحديد الموقع الحالي. تأكد من تفعيل خدمة الموقع في الجهاز');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [updateBuildingCoordinates]);

  // MOSQUE_BUILDING_PUT_PAYLOAD_FIX_V1
  // The buildings endpoint uses PUT and requires buildingNumber even when only coverage fields change.
  const saveBuilding = async () => {
    if (!editingBuilding) return toast.error('تعريف المبنى وتعديل بياناته الأساسية يتم من السجل المركزي للمباني');
    if (buildingForm.creationFeasibility === 'unavailable' && !String(buildingForm.unavailableReason || '').trim()) {
      return toast.error('سبب تعذر إنشاء المصلى مطلوب');
    }
    setSaving(true);
    try {
      await mosqueApi.updateBuilding(editingBuilding.id, {
        buildingNumber: editingBuilding.buildingNumber,
        expectedUsers: buildingForm.expectedUsers === '' ? null : Number(buildingForm.expectedUsers),
        coverageStatus: buildingForm.coverageStatus,
        creationFeasibility: buildingForm.creationFeasibility,
        unavailableReason: buildingForm.creationFeasibility === 'unavailable' ? (String(buildingForm.unavailableReason || '').trim() || null) : null,
        approvedAlternative: String(buildingForm.approvedAlternative || '').trim() || null,
      });
      toast.success('تم تحديث ملف خدمة الصلاة للمبنى دون تعديل بياناته المركزية');
      setBuildingDialog(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ ملف خدمة الصلاة');
    } finally { setSaving(false); }
  };

  const deleteBuilding = async (building: MosqueBuilding) => {
    if (!window.confirm(`حذف المبنى رقم ${building.buildingNumber} من سجل التغطية؟`)) return;
    try {
      await mosqueApi.deleteBuilding(building.id);
      toast.success('تم حذف المبنى من سجل التغطية');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المبنى');
    }
  };

  const selectedSiteBuilding = officialBuildings.find((building) => building.id === siteForm.buildingId) || null;
  const selectedBuildingHasMen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed'));
  const selectedBuildingHasWomen = Boolean(selectedSiteBuilding?.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed'));
  const selectedBuildingMenPresence = buildingPrayerRoomPresence(selectedSiteBuilding, 'men');
  const selectedBuildingWomenPresence = buildingPrayerRoomPresence(selectedSiteBuilding, 'women');
  const duplicatePrayerRoom = siteForm.spatialRelation === 'inside_building' && siteForm.buildingId && siteForm.prayerRoomGender
    ? sites.find((site) => site.id !== editingSite?.id && site.buildingId === siteForm.buildingId && site.siteType === 'prayer_room' && site.prayerRoomGender === siteForm.prayerRoomGender) || null
    : null;

  const confirmNoPrayerRoomInBuilding = async (building: MosqueBuilding) => {
    const hasPrayerRoom = Boolean(building.sites?.some((site) =>
      site.siteType === 'prayer_room' && site.status !== 'temporarily_closed'
    ));
    if (hasPrayerRoom) {
      toast.error('يوجد مصلى فعلي مرتبط بهذا المبنى. عدّل سجل المصلى الموجود بدل تسجيل عدم وجود مصلى.');
      return;
    }
    if (!window.confirm(`سيتم إثبات أن المبنى رقم ${building.buildingNumber} لا يوجد به مصلى حاليًا، وتحديث ملف خدمة الصلاة دون إنشاء سجل مصلى وهمي. هل تريد المتابعة؟`)) return;

    const nextCoverageStatus: MosqueBuilding['coverageStatus'] = ['needs_prayer_room', 'under_feasibility_study', 'under_implementation', 'not_feasible_alternative'].includes(building.coverageStatus)
      ? building.coverageStatus
      : 'needs_prayer_room';

    setSaving(true);
    try {
      await mosqueApi.updateBuilding(building.id, {
        buildingNumber: building.buildingNumber,
        coverageStatus: nextCoverageStatus,
      });
      toast.success('تم إثبات عدم وجود مصلى في المبنى ضمن ملف خدمة الصلاة، دون إنشاء موقع وهمي');
      setSiteDialog(false);
      setBuildingDialog(false);
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة خدمة الصلاة للمبنى');
    } finally {
      setSaving(false);
    }
  };

  const openSiteDialog = (site?: MosqueSite) => {
    setEditingSite(site || null);
    setShowSiteMap(false);
    setSiteMediaKind('mosque_image');
    setSiteMediaFiles([]);
    setSiteMediaLibrary(normalizeSiteMedia(site?.images || null));
    setSiteForm(site ? {
      name: site.name, siteType: site.siteType, prayerRoomGender: site.prayerRoomGender || '', spatialRelation: site.spatialRelation || 'independent', buildingId: site.buildingId || '', floor: site.floor || '', roomNumber: site.roomNumber || '', city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',
      area: site.area ?? '', capacity: site.capacity ?? '', quranTargetCount: site.quranTargetCount ?? '',
      hasWomenPrayerArea: Boolean(site.hasWomenPrayerArea),
      womenPrayerArea: {
        presenceStatus: womenPrayerPresence(site),
        verificationNotes: site.womenPrayerArea?.verificationNotes || '',
        verifiedAt: site.womenPrayerArea?.verifiedAt || '',
        verifiedBy: site.womenPrayerArea?.verifiedBy || '',
        verifiedByName: site.womenPrayerArea?.verifiedByName || '',
        capacity: site.womenPrayerArea?.capacity ?? '',
        floor: site.womenPrayerArea?.floor || '',
        locationDescription: site.womenPrayerArea?.locationDescription || '',
        separateEntrance: site.womenPrayerArea?.separateEntrance === true,
        hasAblution: site.womenPrayerArea?.hasAblution === true,
        hasRestrooms: site.womenPrayerArea?.hasRestrooms === true,
        status: site.womenPrayerArea?.status || 'active',
        notes: site.womenPrayerArea?.notes || '',
      },
      latitude: site.latitude ?? '', longitude: site.longitude ?? '', status: site.status,
      imamName: site.imamName || '', muezzinName: site.muezzinName || '', khateebName: site.khateebName || '', coordinatorName: site.coordinatorName || '', supervisorName: site.supervisorName || '', contactPhone: site.contactPhone || '', supervisorUserId: site.supervisorUserId || '', notes: site.notes || '',
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
    const effectiveSiteType = siteForm.spatialRelation === 'inside_building' ? 'prayer_room' : siteForm.siteType;
    if (effectiveSiteType === 'prayer_room' && !siteForm.prayerRoomGender) return toast.error('حدد فئة المصلى: رجال أو نساء');
    if (siteForm.spatialRelation === 'inside_building' && !siteForm.buildingId) return toast.error('اختر رقم المبنى للموقع الموجود داخل مبنى');
    const linkedBuilding = siteForm.spatialRelation === 'inside_building'
      ? officialBuildings.find((building) => building.id === siteForm.buildingId) || null
      : null;
    if (siteForm.spatialRelation === 'inside_building' && !linkedBuilding) return toast.error('المبنى المحدد غير موجود أو غير معتمد في السجل المركزي');
    if (siteForm.spatialRelation === 'inside_building' && /^(لا\s*يوجد|غير\s*موجود)/.test(siteForm.name.trim())) {
      return toast.error('لا تنشئ سجل مصلى باسم «لا يوجد». استخدم إجراء «تسجيل: لا يوجد مصلى في المبنى» ليحفظ الحالة في ملف خدمة الصلاة.');
    }
    if (siteForm.spatialRelation === 'inside_building' && siteForm.prayerRoomGender) {
      const duplicate = sites.find((site) =>
        site.id !== editingSite?.id &&
        site.buildingId === siteForm.buildingId &&
        site.siteType === 'prayer_room' &&
        site.prayerRoomGender === siteForm.prayerRoomGender
      );
      if (duplicate) return toast.error(`يوجد بالفعل مصلى ${siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} مرتبط بهذا المبنى باسم «${duplicate.name}». عدّل السجل الموجود بدل إنشاء سجل مكرر.`);
    }
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

      const effectiveLatitude = linkedBuilding ? linkedBuilding.latitude ?? null : (siteForm.latitude === '' ? null : Number(siteForm.latitude));
      const effectiveLongitude = linkedBuilding ? linkedBuilding.longitude ?? null : (siteForm.longitude === '' ? null : Number(siteForm.longitude));
      const payload = {
        ...siteForm,
        siteType: effectiveSiteType,
        spatialRelation: siteForm.spatialRelation || 'independent',
        buildingId: linkedBuilding?.id || null,
        floor: linkedBuilding ? (siteForm.floor || null) : null,
        roomNumber: linkedBuilding ? (siteForm.roomNumber || null) : null,
        city: linkedBuilding ? (linkedBuilding.city || null) : (siteForm.city || null),
        district: linkedBuilding ? (linkedBuilding.district || null) : (siteForm.district || null),
        campusLocation: linkedBuilding ? (linkedBuilding.campusLocation || null) : (siteForm.campusLocation || null),
        // أسماء المسؤولين مصدرها سجل المنسوبين، لذلك لا نحفظ نسخة يدوية قد تصبح قديمة.
        imamName: null,
        muezzinName: null,
        khateebName: null,
        prayerRoomGender: effectiveSiteType === 'prayer_room' ? siteForm.prayerRoomGender : null,
        hasWomenPrayerArea: ['mosque', 'jami'].includes(effectiveSiteType) && siteForm.womenPrayerArea?.presenceStatus === 'present',
        womenPrayerArea: ['mosque', 'jami'].includes(effectiveSiteType)
          ? siteForm.womenPrayerArea?.presenceStatus === 'present'
            ? {
                presenceStatus: 'present',
                verificationNotes: siteForm.womenPrayerArea?.verificationNotes || null,
                capacity: siteForm.womenPrayerArea?.capacity === '' ? null : Number(siteForm.womenPrayerArea?.capacity),
                floor: siteForm.womenPrayerArea?.floor || null,
                locationDescription: siteForm.womenPrayerArea?.locationDescription || null,
                separateEntrance: Boolean(siteForm.womenPrayerArea?.separateEntrance),
                hasAblution: Boolean(siteForm.womenPrayerArea?.hasAblution),
                hasRestrooms: Boolean(siteForm.womenPrayerArea?.hasRestrooms),
                status: siteForm.womenPrayerArea?.status || 'active',
                notes: siteForm.womenPrayerArea?.notes || null,
              }
            : siteForm.womenPrayerArea?.presenceStatus === 'verified_absent'
              ? {
                  presenceStatus: 'verified_absent',
                  verificationNotes: siteForm.womenPrayerArea?.verificationNotes || null,
                }
              : null
          : null,
        area: siteForm.area === '' ? null : Number(siteForm.area),
        capacity: siteForm.capacity === '' ? null : Number(siteForm.capacity),
        quranTargetCount: siteForm.quranTargetCount === '' ? null : Number(siteForm.quranTargetCount),
        latitude: effectiveLatitude,
        longitude: effectiveLongitude,
        mapUrl: effectiveLatitude != null && effectiveLongitude != null ? `https://www.google.com/maps?q=${effectiveLatitude},${effectiveLongitude}` : null,
        images: nextMedia,
      };
      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, payload)
        : await mosqueApi.createSite(payload);
      if (linkedBuilding && savedSite.status !== 'temporarily_closed' && linkedBuilding.coverageStatus !== 'covered') {
        try {
          await mosqueApi.updateBuilding(linkedBuilding.id, {
            buildingNumber: linkedBuilding.buildingNumber,
            coverageStatus: 'covered',
          });
        }
        catch { /* حفظ المصلى نجح؛ تحديث مؤشر التغطية يعاد احتسابه عند المراجعة التالية إن تعذر الطلب */ }
      }
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
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(quranInventoryItems.map((item) => ({ الموقع: item.site.name, النوع: siteTypeDisplayLabel(item.site as MosqueSite), كبير: item.latest?.largeCount || 0, متوسط: item.latest?.mediumCount || 0, صغير: item.latest?.smallCount || 0, الإجمالي: item.latest?.totalCount || 0, المسحوبة: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.withdrawnStock?.totalCount || 0, المستهدف: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.targetCount || 0, التغطية: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent != null ? `${quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.coveragePercent}%` : '-', الاحتياج: quranStockDashboard?.sites.find((row) => row.site.id === item.site.id)?.needCount || 0, 'آخر جرد': item.latest?.countedAt ? new Date(item.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد' }))), 'حصر المصاحف');
      appendExcelReportSheet(workbook, 'الصور والمرفقات', siteMediaExcelRows(sites), 'لا توجد صور أو مرفقات مسجلة');
      await writeProfessionalExcel(workbook, `mosques-unit-report-${excelReportDateStamp()}.xlsx`, { title: 'التقرير الشامل لوحدة العناية بالمساجد والمصليات الجامعية', subtitle: 'تجميع بيانات المواقع والطلبات والبلاغات والإجازات والتوظيف والمصاحف', orientation: 'landscape', imageLoader: async (fileId, url) => fileId ? mosqueApi.mediaBlob(fileId) : (url ? fetch(url).then((response) => response.ok ? response.blob() : null) : null) });
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
  const filteredPersonnel = useMemo(() => {
    const q = personnelSearch.trim().toLowerCase();
    return personnel.filter((item) => {
      const matchesSearch = !q || [item.name, item.mobile, item.email, item.site?.name, sites.find((site) => site.id === item.siteId)?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesRole = personnelRoleFilter === 'all' || item.role === personnelRoleFilter;
      const matchesStatus = personnelStatusFilter === 'all' || (personnelStatusFilter === 'active' ? item.active : !item.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [personnel, personnelSearch, personnelRoleFilter, personnelStatusFilter, sites]);

  const filteredStaffUsers = useMemo(() => {
    const q = roleUserSearch.trim().toLowerCase();
    return staffUsers.filter((user) => {
      const current = assignments.find((item) => item.userId === user.uid);
      const effectiveRole = current?.role || user.moduleRole || 'viewer';
      const siteName = current?.site?.name || sites.find((site) => site.id === (current?.siteId || user.siteId))?.name || '';
      const matchesSearch = !q || [user.username, user.email, siteName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesRole = roleUserFilter === 'all' || effectiveRole === roleUserFilter || (roleUserFilter === 'university_member' && effectiveRole === 'viewer');
      return matchesSearch && matchesRole;
    });
  }, [staffUsers, assignments, sites, roleUserSearch, roleUserFilter]);

  const filteredNotifications = useMemo(() => {
    const q = notificationSearch.trim().toLowerCase();
    return notifications.filter((notice) => {
      const category = notificationCategory(notice);
      const matchesSearch = !q || [notice.title, notice.message, notice.entityType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesRead = notificationReadFilter === 'all'
        || (notificationReadFilter === 'unread' ? !notice.isRead : notice.isRead);
      const matchesType = notificationTypeFilter === 'all' || category === notificationTypeFilter;
      return matchesSearch && matchesRead && matchesType;
    });
  }, [notifications, notificationSearch, notificationReadFilter, notificationTypeFilter]);

  const openNotificationTarget = async (notice: MosqueNotification) => {
    if (!notice.isRead) {
      try {
        await mosqueApi.readNotification(notice.id);
        setNotifications((current) => current.map((item) => item.id === notice.id ? { ...item, isRead: true } : item));
      } catch {
        // Navigation should still work even if marking the notification as read fails.
      }
    }

    const category = notificationCategory(notice);
    const entityId = notice.entityId || '';

    if (category === 'request') {
      const item = requests.find((row) => row.id === entityId);
      setActiveTab('requests');
      if (item) setViewingWorkflow({ kind: 'request', item });
      return;
    }
    if (category === 'ticket') {
      const item = tickets.find((row) => row.id === entityId);
      setActiveTab('tickets');
      if (item) setViewingWorkflow({ kind: 'ticket', item });
      return;
    }
    if (category === 'leave') {
      const item = leaves.find((row) => row.id === entityId);
      setActiveTab('leaves');
      if (item) setViewingWorkflow({ kind: 'leave', item });
      return;
    }
    if (category === 'site') {
      const site = sites.find((row) => row.id === entityId);
      setActiveTab('sites');
      if (site) setPreviewSite(site);
      return;
    }
    if (category === 'quran') {
      setActiveTab('quran');
      return;
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((notice) => !notice.isRead);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map((notice) => mosqueApi.readNotification(notice.id)));
      setNotifications((current) => current.map((notice) => ({ ...notice, isRead: true })));
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث جميع الإشعارات');
    }
  };

  const goToDashboardSection = (tab: string, filters: { request?: 'all' | 'new' | 'under_review' | 'approved' | 'late'; ticket?: 'all' | 'open'; leave?: 'all' | 'pending' } = {}) => {
    setRequestQuickFilter(filters.request || 'all');
    setTicketQuickFilter(filters.ticket || 'all');
    setLeaveQuickFilter(filters.leave || 'all');
    setActiveTab(tab);
  };

  const referenceMosqueCount = sites.filter((site) => ['mosque', 'jami'].includes(site.siteType)).length;
  const referencePrayerRoomCount = sites.filter((site) => site.siteType === 'prayer_room').length;
  const referenceMenPrayerRooms = sites.filter((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men').length;
  const referenceWomenPrayerRooms = sites.filter((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women').length;
  const referenceActiveSites = sites.filter((site) => site.status === 'active').length;
  const referenceCoveredBuildings = officialBuildings.filter((building) => building.coverageStatus === 'covered').length;
  const referenceActivePersonnel = personnel.filter((item) => item.active).length;
  const referenceTrackedRequests = requests.filter((item) => item.status !== 'archived');
  const referenceCompletedRequests = referenceTrackedRequests.filter((item) => ['completed', 'closed'].includes(item.status)).length;
  const referenceInProgressRequests = referenceTrackedRequests.filter((item) => ['approved', 'in_progress', 'under_review'].includes(item.status)).length;
  const referenceLateRequests = referenceTrackedRequests.filter((item) => ['new', 'under_review', 'approved', 'in_progress'].includes(item.status) && new Date(item.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000).length;
  const referenceCompletionPercent = referenceTrackedRequests.length ? Math.round((referenceCompletedRequests / referenceTrackedRequests.length) * 100) : 0;

  const handleTabChange = (tab: string) => goToDashboardSection(tab);

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="mr-3 font-semibold">جاري تحميل وحدة المساجد والمصليات...</span></div>;
  }

  return (
    <div className="mx-auto w-full max-w-[1880px] rounded-[30px] bg-[#eef3f6] p-2 sm:p-3 md:p-4" dir="rtl">
      <section className="mb-5 overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
        <div dir="ltr" className="grid gap-4 px-4 py-4 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)_360px] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img src="/platform-logo.png" alt="جامعة الإمام عبدالرحمن بن فيصل" className="h-11 w-11 object-contain" />
            </div>
            <div dir="rtl" className="min-w-0 text-right">
              <p className="text-[10px] font-black text-[#006b63]">جامعة الإمام عبدالرحمن بن فيصل</p>
              <p className="mt-1 text-[10px] leading-5 text-slate-400">وحدة العناية بالمساجد والمصليات الجامعية</p>
            </div>
          </div>
          <div dir="rtl" className="min-w-0 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f5f2] text-[#006b63]"><Building2 className="h-4 w-4" /></span>
              <h1 className="truncate text-xl font-black text-slate-900 md:text-2xl">وحدة العناية بالمساجد والمصليات الجامعية</h1>
            </div>
            <p className="mt-1 hidden text-xs text-slate-500 md:block">لوحة تشغيل وإدارة موحدة للمساجد والمصليات والخدمات المرتبطة بها.</p>
          </div>
          <div dir="rtl" className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="h-10 rounded-xl border-slate-200 bg-[#f7f9fb] pr-9 text-sm focus-visible:border-[#006b63] focus-visible:ring-[#006b63]/15" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') goToDashboardSection('sites'); }} placeholder="ابحث عن مسجد أو مصلى..." />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {lastUpdatedAt && <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-400"><Clock3 className="h-3 w-3" />آخر تحديث {lastUpdatedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>}
              <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-[#006b63]" onClick={loadAll}><RefreshCw className="ml-1 h-3.5 w-3.5" />تحديث</Button>
              <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-[#006b63]" onClick={() => navigate('/mosques/public')}><ExternalLink className="ml-1 h-3.5 w-3.5" />البوابة العامة</Button>
              {canAdd && ['head', 'supervisor'].includes(role) && <Button size="sm" className="h-8 bg-[#006b63] px-3 font-black text-white shadow-sm hover:bg-[#005a53]" onClick={() => openSiteDialog()}><Plus className="ml-1 h-3.5 w-3.5" />إضافة موقع</Button>}
            </div>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div dir="ltr" className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[285px_minmax(0,1fr)]">
          <aside dir="rtl" className="hidden lg:block">
            <div className="sticky top-4 overflow-hidden rounded-[24px] border border-slate-200 bg-[#e7edf2] shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200/80 bg-white px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006b63] text-white"><Building2 className="h-5 w-5" /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-black text-slate-800">إدارة الوحدة</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{fullPermissionAccess ? 'رئيس الوحدة — صلاحية كاملة' : role === 'personnel' && myPersonnelRole ? personnelRoleLabels[myPersonnelRole] || myPersonnelRole : roleLabels[role]}</p></div>
                </div>
              </div>

              <nav className="space-y-4 p-3">
                <div className="space-y-1">
                  <p className="px-2 pb-1 text-[10px] font-black tracking-wide text-slate-400">التشغيل اليومي</p>
                  <MosqueSideNavButton label="الرئيسية" icon={BarChart3} active={activeTab === 'overview'} onClick={() => goToDashboardSection('overview')} />
                  <MosqueSideNavButton label="المساجد والمصليات" icon={Building2} active={activeTab === 'sites'} onClick={() => goToDashboardSection('sites')} />
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="الجولات والزيارات" icon={ClipboardList} active={activeTab === 'field-visits'} onClick={() => goToDashboardSection('field-visits')} />}
                  {['head', 'supervisor', 'personnel'].includes(role) && <MosqueSideNavButton label="الطلبات والصيانة" icon={Wrench} active={activeTab === 'requests'} onClick={() => goToDashboardSection('requests')} badge={dashboard?.stats.newRequests || 0} />}
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="البلاغات" icon={MessageSquare} active={activeTab === 'tickets'} onClick={() => goToDashboardSection('tickets')} badge={dashboard?.stats.openTickets || 0} />}
                  {['head', 'supervisor', 'personnel'].includes(role) && <MosqueSideNavButton label="الإجازات والاعتذارات" icon={CalendarDays} active={activeTab === 'leaves'} onClick={() => goToDashboardSection('leaves')} />}
                </div>

                <div className="space-y-1 border-t border-slate-200 pt-3">
                  <p className="px-2 pb-1 text-[10px] font-black tracking-wide text-slate-400">المحتوى والمتابعة</p>
                  {['head', 'supervisor', 'personnel'].includes(role) && <MosqueSideNavButton label="المصاحف" icon={BookOpen} active={activeTab === 'quran'} onClick={() => goToDashboardSection('quran')} />}
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="التقارير" icon={FileText} active={activeTab === 'reports'} onClick={() => goToDashboardSection('reports')} />}
                  <MosqueSideNavButton label="الخريطة" icon={MapPin} active={activeTab === 'map'} onClick={() => goToDashboardSection('map')} />
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="تغطية المباني" icon={MapPin} active={activeTab === 'buildings'} onClick={() => goToDashboardSection('buildings')} />}
                </div>

                <div className="space-y-1 border-t border-slate-200 pt-3">
                  <p className="px-2 pb-1 text-[10px] font-black tracking-wide text-slate-400">الإدارة</p>
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="منسوبو المساجد" icon={Users} active={activeTab === 'team'} onClick={() => goToDashboardSection('team')} />}
                  {['head', 'supervisor'].includes(role) && <MosqueSideNavButton label="طلبات التعاون" icon={Briefcase} active={activeTab === 'jobs'} onClick={() => goToDashboardSection('jobs')} />}
                  {isAdmin && <MosqueSideNavButton label="الأدوار التشغيلية" icon={Shield} active={activeTab === 'roles'} onClick={() => goToDashboardSection('roles')} />}
                  {role !== 'university_member' && role !== 'viewer' && <MosqueSideNavButton label="الإشعارات" icon={Bell} active={activeTab === 'notifications'} onClick={() => goToDashboardSection('notifications')} badge={unreadNotifications} />}
                </div>
              </nav>

              <div className="border-t border-slate-200 p-3">
                <div className="rounded-2xl border border-white/80 bg-white/75 p-3">
                  <p className="text-[10px] font-bold text-slate-400">الوصول السريع</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => goToDashboardSection('reports')} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-[#006b63]">التقارير</button>
                    <button type="button" onClick={() => goToDashboardSection('map')} className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-[#006b63]">الخريطة</button>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main dir="rtl" className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div><p className="text-[11px] font-bold text-[#006b63]">التنقل بين أقسام الوحدة</p><p className="mt-0.5 text-xs text-slate-500">اختر القسم المطلوب</p></div>
                {unreadNotifications > 0 && role !== 'university_member' && role !== 'viewer' && <Badge className="shrink-0 bg-amber-500 text-white">{unreadNotifications} إشعار</Badge>}
              </div>
              <NativeSelect className="h-12 w-full rounded-xl border-slate-200 bg-[#f7f9fb] px-3 text-sm font-bold text-slate-700" value={activeTab} onChange={(e) => handleTabChange(e.target.value)}>
                <option value="overview">الرئيسية</option>
                <option value="sites">المساجد والمصليات</option>
                {['head', 'supervisor'].includes(role) && <option value="buildings">تغطية المباني بخدمة الصلاة</option>}
                {['head', 'supervisor'].includes(role) && <option value="field-visits">الجولات والزيارات</option>}
                {['head', 'supervisor', 'personnel'].includes(role) && <option value="quran">المصاحف</option>}
                {['head', 'supervisor', 'personnel'].includes(role) && <option value="requests">الطلبات</option>}
                {['head', 'supervisor'].includes(role) && <option value="tickets">البلاغات</option>}
                {['head', 'supervisor', 'personnel'].includes(role) && <option value="leaves">الإجازات</option>}
                {['head', 'supervisor'].includes(role) && <option value="jobs">طلبات التعاون</option>}
                <option value="map">الخريطة</option>
                {['head', 'supervisor'].includes(role) && <option value="reports">التقارير</option>}
                {['head', 'supervisor'].includes(role) && <option value="team">منسوبو المساجد</option>}
                {isAdmin && <option value="roles">الأدوار التشغيلية</option>}
                {role !== 'university_member' && role !== 'viewer' && <option value="notifications">الإشعارات{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}</option>}
              </NativeSelect>
            </div>

        {/* Quran inventory search — filters the operational inventory cards below. */}
        {activeTab === 'quran' && <div className="grid gap-3 rounded-2xl border border-[#e2d4b4] bg-[#fffdf8] p-3 shadow-[0_8px_22px_rgba(6,60,51,0.06)] md:grid-cols-[1fr_240px_auto] md:items-center">
          <div className="relative"><Search className="absolute right-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-12 rounded-xl border-[#d9c9a5] bg-white pr-11 text-sm font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-500 focus-visible:border-[#0b5a49] focus-visible:ring-[#0b5a49]/20" value={quranSearch} onChange={(e) => setQuranSearch(e.target.value)} placeholder="بحث باسم المسجد أو المصلى أو المدينة أو الموقع..." />{quranSearch && <Button type="button" size="icon" variant="ghost" className="absolute left-1.5 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400" onClick={() => setQuranSearch('')}><X className="h-4 w-4" /></Button>}</div>
          <label className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold ${quranNeedOnly ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#d9c9a5] bg-white text-slate-700'}`}><input type="checkbox" className="h-4 w-4 accent-amber-600" checked={quranNeedOnly} onChange={(e) => setQuranNeedOnly(e.target.checked)} />المواقع التي لديها احتياج فقط</label>
          <Badge variant="outline" className="h-10 justify-center border-[#d6b46a]/55 bg-white px-3 font-bold text-[#0b4a3f]">تم جرد {quranSummary.countedSites} من {quranSummary.sites}</Badge>
        </div>}



      {activeTab !== 'overview' && activeTab !== 'quran' && role === 'head' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-9">
        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} onClick={() => goToDashboardSection('sites')} />
        <Stat title="إجمالي المصاحف" value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total ?? 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلبات جديدة" value={dashboard?.stats.newRequests || 0} icon={ClipboardList} onClick={() => goToDashboardSection('requests', { request: 'new' })} />
        <Stat title="تحت المراجعة" value={dashboard?.stats.reviewRequests || 0} icon={Clock3} onClick={() => goToDashboardSection('requests', { request: 'under_review' })} />
        <Stat title="معتمدة" value={dashboard?.stats.approvedRequests || 0} icon={CheckCircle2} onClick={() => goToDashboardSection('requests', { request: 'approved' })} />
        <Stat title="طلبات متأخرة" value={dashboard?.stats.lateRequests || 0} icon={AlertTriangle} onClick={() => goToDashboardSection('requests', { request: 'late' })} />
        <Stat title="بلاغات مفتوحة" value={dashboard?.stats.openTickets || 0} icon={MessageSquare} onClick={() => goToDashboardSection('tickets', { ticket: 'open' })} />
        <Stat title="إجازات معلقة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} onClick={() => goToDashboardSection('leaves', { leave: 'pending' })} />
        <Stat title="طلبات توظيف" value={dashboard?.stats.jobs || 0} icon={Briefcase} onClick={() => goToDashboardSection('jobs')} />
      </div>}

      {activeTab !== 'overview' && activeTab !== 'quran' && role === 'supervisor' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <Stat title="المساجد التابعة لي" value={dashboard?.stats.managedSites || 0} icon={Building2} />
        <Stat title="إجمالي المصاحف" value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total ?? 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلبات تحتاج متابعة" value={dashboard?.stats.assignedRequests || 0} icon={ClipboardList} />
        <Stat title="بلاغات جديدة" value={dashboard?.stats.newTickets || 0} icon={MessageSquare} />
        <Stat title="طلبات عاجلة" value={dashboard?.stats.urgentRequests || 0} icon={AlertTriangle} />
        <Stat title="إجازات للمراجعة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="التنبيهات" value={unreadNotifications} icon={Bell} />
      </div>}

      {activeTab !== 'overview' && activeTab !== 'quran' && role === 'personnel' && <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat title="الموقع المرتبط" value={linkedSite ? 1 : 0} icon={Building2} />
        <Stat title="مصاحف الموقع" value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total ?? 0} icon={BookOpen} onClick={() => goToDashboardSection('quran')} />
        <Stat title="طلباتي الحالية" value={dashboard?.stats.myRequests || activeMyRequests.length} icon={ClipboardList} />
        <Stat title="طلبات الصيانة" value={maintenanceMyRequests.length} icon={Wrench} />
        <Stat title="الإجازات الحالية" value={dashboard?.stats.myLeaves || 0} icon={CalendarDays} />
        <Stat title="الإشعارات" value={unreadNotifications} icon={Bell} />
      </div>}



        <TabsContent value="overview" className="space-y-4">
          {role === 'head' && <>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div><p className="text-xs font-black text-[#006b63]">لوحة المعلومات الرئيسية</p><h2 className="mt-1 text-2xl font-black text-slate-900">نظرة عامة على المساجد والمصليات</h2><p className="mt-1 text-sm text-slate-500">ملخص تشغيلي مباشر مستوحى من الواجهة المرجعية مع إبقاء جميع البيانات والوظائف الفعلية.</p></div>
                <Badge variant="outline" className="w-fit border-slate-200 bg-[#f7f9fb] px-3 py-1.5 text-slate-600">محدث من بيانات المنصة</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <button type="button" onClick={() => goToDashboardSection('sites')} className="flex min-h-[166px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#006b63]/35 hover:shadow-md"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6f4] text-[#006b63]"><Building2 className="h-7 w-7" /></span><p className="mt-3 text-sm font-black text-slate-700">عدد المساجد والجوامع</p><span className="mt-2 text-[2.6rem] font-black leading-none text-slate-900">{referenceMosqueCount}</span></button>
                <button type="button" onClick={() => goToDashboardSection('sites')} className="flex min-h-[166px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#006b63]/35 hover:shadow-md"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6f4] text-[#006b63]"><MapPin className="h-7 w-7" /></span><p className="mt-3 text-sm font-black text-slate-700">عدد المصليات</p><span className="mt-2 text-[2.6rem] font-black leading-none text-slate-900">{referencePrayerRoomCount}</span></button>
                <button type="button" onClick={() => { setSiteFilterType('prayer_room'); setSiteFilterPrayerRoomGender('men'); goToDashboardSection('sites'); }} className="flex min-h-[166px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#006b63]/35 hover:shadow-md"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf7f1] text-[#16704c]"><Users className="h-7 w-7" /></span><p className="mt-3 text-sm font-black text-slate-700">المصليات الرجالية</p><span className="mt-2 text-[2.6rem] font-black leading-none text-slate-900">{referenceMenPrayerRooms}</span></button>
                <button type="button" onClick={() => { setSiteFilterType('prayer_room'); setSiteFilterPrayerRoomGender('women'); goToDashboardSection('sites'); }} className="flex min-h-[166px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-[0_5px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[#006b63]/35 hover:shadow-md"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f0fb] text-[#7561a8]"><Users className="h-7 w-7" /></span><p className="mt-3 text-sm font-black text-slate-700">المصليات النسائية</p><span className="mt-2 text-[2.6rem] font-black leading-none text-slate-900">{referenceWomenPrayerRooms}</span></button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <CardHeader className="border-b border-slate-100 pb-3"><CardTitle className="text-base font-black text-slate-800">ملخص التغطية التشغيلية</CardTitle><CardDescription>مقارنة نسبية للمؤشرات الرئيسية.</CardDescription></CardHeader>
                <CardContent className="p-5">
                  <div className="relative h-[250px] overflow-hidden rounded-2xl bg-[#fbfcfd] px-4 pb-4 pt-6">
                    <div className="pointer-events-none absolute inset-x-4 top-6 bottom-10 flex flex-col justify-between">
                      {[100, 75, 50, 25, 0].map((tick) => <div key={tick} className="flex items-center gap-2"><span className="w-7 text-[9px] font-bold text-slate-300">{tick}%</span><span className="h-px flex-1 bg-slate-100" /></div>)}
                    </div>
                    <div className="relative z-10 flex h-full items-end justify-around gap-4 pr-8">
                      {[
                        ['المواقع', referenceActiveSites, Math.max(sites.length, 1), '#006b63'],
                        ['المباني', referenceCoveredBuildings, Math.max(officialBuildings.length, 1), '#2e8b57'],
                        ['الجرد', quranSummary.countedSites, Math.max(quranSummary.sites, 1), '#d4a72c'],
                        ['المنسوبون', referenceActivePersonnel, Math.max(personnel.length, 1), '#7aa984'],
                      ].map(([label, value, total, color]) => {
                        const percent = Math.max(4, Math.min(100, Math.round((Number(value) / Number(total)) * 100)));
                        return <div key={String(label)} title={`${label}: ${Number(value).toLocaleString('ar-SA')} من ${Number(total).toLocaleString('ar-SA')} (${percent}%)`} className="flex h-full flex-1 flex-col items-center justify-end">
                          <span className="mb-2 text-xs font-black text-slate-700">{Number(value).toLocaleString('ar-SA')}</span>
                          <div className="flex h-[165px] w-full max-w-[50px] items-end overflow-hidden rounded-t-xl bg-slate-100">
                            <div className="w-full rounded-t-xl transition-all duration-300" style={{ height: `${percent}%`, backgroundColor: String(color) }} />
                          </div>
                          <span className="mt-2 text-[10px] font-bold text-slate-500">{label}</span>
                        </div>;
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <CardHeader className="border-b border-slate-100 pb-3"><CardTitle className="text-base font-black text-slate-800">حالة الطلبات</CardTitle><CardDescription>نسبة الإنجاز وتوزيع الطلبات الحالية.</CardDescription></CardHeader>
                <CardContent className="grid gap-5 p-5 sm:grid-cols-[180px_1fr] sm:items-center">
                  {referenceTrackedRequests.length ? <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(#006b63 0 ${referenceCompletionPercent}%, #d9a400 ${referenceCompletionPercent}% ${Math.min(100, referenceCompletionPercent + Math.round((referenceInProgressRequests / referenceTrackedRequests.length) * 100))}%, #e5534b 0)` }}>
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner"><span className="text-3xl font-black text-slate-900">{referenceCompletionPercent}%</span><span className="mt-1 text-[10px] font-bold text-slate-500">نسبة الإنجاز</span></div>
                  </div> : <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-slate-100 bg-white"><div className="text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" /><span className="mt-2 block text-xs font-black text-slate-600">لا توجد طلبات حالية</span></div></div>}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafb] px-3 py-2.5"><span className="flex items-center gap-2 text-sm font-bold text-slate-600"><span className="h-3 w-3 rounded-full bg-[#006b63]" />مكتملة</span><strong className="text-slate-900">{referenceCompletedRequests}</strong></div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafb] px-3 py-2.5"><span className="flex items-center gap-2 text-sm font-bold text-slate-600"><span className="h-3 w-3 rounded-full bg-[#d9a400]" />قيد المتابعة</span><strong className="text-slate-900">{referenceInProgressRequests}</strong></div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-[#f8fafb] px-3 py-2.5"><span className="flex items-center gap-2 text-sm font-bold text-slate-600"><span className="h-3 w-3 rounded-full bg-[#e5534b]" />متأخرة</span><strong className="text-slate-900">{referenceLateRequests}</strong></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base font-black text-slate-800">آخر طلبات الصيانة والاحتياج</CardTitle><CardDescription>أحدث المعاملات التي تحتاج متابعة.</CardDescription></div><Button variant="ghost" size="sm" className="text-[#006b63]" onClick={() => goToDashboardSection('requests')}>عرض الكل</Button></div></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.slice(0, 4).map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <EmptyCompact text="لا توجد طلبات حتى الآن" />}</CardContent></Card>
              <Card className="rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]"><CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="text-base font-black text-slate-800">آخر البلاغات</CardTitle><CardDescription>بلاغات الزوار ومنسوبي الجامعة.</CardDescription></div><Button variant="ghost" size="sm" className="text-[#006b63]" onClick={() => goToDashboardSection('tickets')}>عرض الكل</Button></div></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.slice(0, 4).map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <EmptyCompact text="لا توجد بلاغات حتى الآن" />}</CardContent></Card>
            </div>
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
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">سجل المواقع</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]"><Building2 className="h-5 w-5" />المساجد والمصليات الجامعية</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">استعرض كل مسجد ومصلى كبطاقة تشغيلية تجمع الموقع والمنسوبين والطلبات والبلاغات والمصاحف، مع أدوات البحث والتقرير في نفس الصفحة.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canAdd && ['head', 'supervisor'].includes(role) && <Button className={`${button3d} border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}
                  <Button variant="outline" className={`${button3d} border-[#d9c9a5] bg-white text-[#0b4a3f]`} onClick={resetSiteFilters}><X className="ml-2 h-4 w-4" />مسح التصفية</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <SiteRegistryMetric label="السجلات الظاهرة" value={siteFilterStats.total} />
                <SiteRegistryMetric label="المساجد والجوامع" value={siteFilterStats.mosques} />
                <SiteRegistryMetric label="بها مصلى نساء" value={siteFilterStats.womenPrayerAreas} />
                <SiteRegistryMetric label="المصليات المستقلة" value={siteFilterStats.prayerRooms} />
                <SiteRegistryMetric label="إجمالي المساحة" value={siteFilterStats.totalArea} suffix="م²" />
              </div>
              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">البحث والتصفية</p><p className="mt-1 text-xs text-slate-500">تتحدث البطاقات والنتائج والتقارير مباشرة وفق المعايير المختارة.</p></div>
                  <div className="flex items-center gap-2 rounded-xl border border-[#dfcfaa] bg-white p-2">
                    <span className="whitespace-nowrap text-xs font-semibold text-slate-600">اتجاه الفرز</span>
                    <NativeSelect className="h-9 min-w-[120px]" value={siteSortDirection} onChange={(e) => setSiteSortDirection(e.target.value as 'asc' | 'desc')}><option value="asc">تصاعدي ↑</option><option value="desc">تنازلي ↓</option></NativeSelect>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
                <div className="relative md:col-span-2 xl:col-span-2">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="h-11 rounded-xl pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو المدينة أو الحي أو الموقع أو الإمام..." />
                  {search && <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setSearch('')}><X className="h-4 w-4" /></Button>}
                </div>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterCity} onChange={(e) => setSiteFilterCity(e.target.value)}><option value="">جميع المدن</option>{siteCities.map((city) => <option key={city} value={city}>{city}</option>)}</NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteFilterType} onChange={(e) => {
                  const nextType = e.target.value;
                  setSiteFilterType(nextType);
                  if (nextType !== 'prayer_room') setSiteFilterPrayerRoomGender('all');
                  if (nextType === 'prayer_room') setSiteFilterWomenPrayerArea('all');
                }}><option value="all">جميع الأنواع</option><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect>
                {siteFilterType === 'prayer_room' && <NativeSelect className="h-11 rounded-xl border-emerald-200 bg-emerald-50/40" value={siteFilterPrayerRoomGender} onChange={(e) => setSiteFilterPrayerRoomGender(e.target.value as 'all' | 'men' | 'women')}><option value="all">كل المصليات</option><option value="men">مصلى رجال</option><option value="women">مصلى نساء</option></NativeSelect>}
                {siteFilterType !== 'prayer_room' && <NativeSelect className="h-11 rounded-xl border-emerald-200 bg-emerald-50/40" value={siteFilterWomenPrayerArea} onChange={(e) => setSiteFilterWomenPrayerArea(e.target.value as 'all' | 'with' | 'without')}>
                  <option value="all">كل حالات مصلى النساء</option>
                  <option value="with">بها مصلى نساء</option>
                  <option value="without">بدون مصلى نساء مسجل</option>
                </NativeSelect>}
                <NativeSelect className="h-11 rounded-xl" value={siteFilterStatus} onChange={(e) => setSiteFilterStatus(e.target.value)}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect>
                <NativeSelect className="h-11 rounded-xl" value={siteSortBy} onChange={(e) => setSiteSortBy(e.target.value)}><option value="name">فرز حسب الاسم</option><option value="building">فرز حسب رقم المبنى</option><option value="city">فرز حسب المدينة</option><option value="type">فرز حسب النوع</option><option value="status">فرز حسب الحالة</option><option value="area">فرز حسب المساحة</option></NativeSelect>
                </div>
                {siteFilterType !== 'prayer_room' && <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/45 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black text-emerald-950">فلتر سريع لمصلى النساء</p><p className="mt-0.5 text-[11px] text-emerald-800">يطبق على المساجد والجوامع فقط، ولا يخلط بينها وبين المصليات النسائية المستقلة.</p></div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['all', 'الكل'],
                      ['with', 'بها مصلى نساء'],
                      ['without', 'بدون مصلى نساء مسجل'],
                    ] as const).map(([value, label]) => <Button key={value} type="button" size="sm" variant={siteFilterWomenPrayerArea === value ? 'default' : 'outline'} className={siteFilterWomenPrayerArea === value ? 'border border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-900' : 'border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-50'} onClick={() => setSiteFilterWomenPrayerArea(value)}>{label}</Button>)}
                  </div>
                </div>}
              </div>

              <details className="group overflow-hidden rounded-2xl border border-[#e3d6b9] bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fffdf8] px-4 py-3">
                  <div><p className="font-black text-[#0b4a3f]">إعدادات التقرير والطباعة</p><p className="mt-1 text-xs text-slate-500">اختياري — افتح هذا القسم فقط عند الحاجة لتخصيص الأعمدة والخط واتجاه الصفحة.</p></div>
                  <span className="rounded-full border border-[#d6b46a]/50 bg-white px-3 py-1 text-xs font-bold text-[#8a6a1f] group-open:hidden">إظهار الإعدادات</span>
                  <span className="hidden rounded-full border border-[#d6b46a]/50 bg-white px-3 py-1 text-xs font-bold text-[#8a6a1f] group-open:inline">إخفاء الإعدادات</span>
                </summary>
                <div className="space-y-4 border-t border-[#eee4ce] p-3 sm:p-4">
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
                </div>
              </details>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#e3d6b9] bg-[#fffdf8] p-3 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-black text-[#0b4a3f]">التقرير الحالي</p><p className="mt-1 text-xs text-slate-500">سيستخدم نفس السجلات الظاهرة ونفس ترتيبها الحالي.</p></div>
                <div className="flex flex-wrap gap-2">
                  {canPrint && visibleSites.length > 0 && <Button variant="outline" className={`${button3d} border-[#d9c9a5] bg-white text-[#0b4a3f]`} onClick={() => printSitesTable(visibleSites, 'preview')}><Eye className="ml-2 h-4 w-4" />معاينة التقرير</Button>}
                  {canPrint && visibleSites.length > 0 && <Button variant="outline" className={`${button3d} border-[#d9c9a5] bg-white text-[#0b4a3f]`} onClick={() => exportSitesExcel(visibleSites)}><FileSpreadsheet className="ml-2 h-4 w-4" />Excel ({visibleSites.length})</Button>}
                  {canPrint && visibleSites.length > 0 && <Button className={`${button3d} border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]`} onClick={() => printSitesTable(visibleSites, 'print')}><Printer className="ml-2 h-4 w-4" />طباعة / PDF ({visibleSites.length})</Button>}
                </div>
              </div>

              {(search || siteFilterCity || siteFilterType !== 'all' || siteFilterPrayerRoomGender !== 'all' || siteFilterWomenPrayerArea !== 'all' || siteFilterStatus !== 'all' || siteSortBy !== 'name' || siteSortDirection !== 'asc') && <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">المعايير الحالية:</span>
                {search && <Badge variant="outline">بحث: {search}</Badge>}
                {siteFilterCity && <Badge variant="outline">المدينة: {siteFilterCity}</Badge>}
                {siteFilterType !== 'all' && <Badge variant="outline">النوع: {siteTypeLabels[siteFilterType]}</Badge>}
                {siteFilterType === 'prayer_room' && siteFilterPrayerRoomGender !== 'all' && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">فئة المصلى: {prayerRoomGenderLabels[siteFilterPrayerRoomGender]}</Badge>}
                {siteFilterWomenPrayerArea !== 'all' && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">مصلى النساء: {siteFilterWomenPrayerArea === 'with' ? 'موجود' : 'غير مسجل'}</Badge>}
                {siteFilterStatus !== 'all' && <Badge variant="outline">الحالة: {siteStatusLabels[siteFilterStatus]}</Badge>}
                <Badge variant="outline">الفرز: {{ name: 'الاسم', building: 'رقم المبنى', city: 'المدينة', type: 'النوع', status: 'الحالة', area: 'المساحة' }[siteSortBy] || siteSortBy} — {siteSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}</Badge>
              </div>}
            </CardContent>
          </Card>
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} canPrint={canPrint} onPreview={() => setPreviewSite(site)} onPrint={() => void printSiteCard(site)} onExcel={() => exportSitesExcel([site], `mosque-${site.publicToken || site.id}`)} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} quranInventory={quranLatestBySite[site.id] as MosqueQuranInventory | null | undefined} />)}</div>}
        </TabsContent>

        {['head', 'supervisor'].includes(role) && <TabsContent value="buildings" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">التغطية المكانية</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Building2 className="h-5 w-5" />تغطية المباني بخدمة الصلاة</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">تقييم خدمة الصلاة في المباني الجامعية، توثيق وجود مصليات الرجال والنساء، وتحديد الاحتياج وإمكانية الإنشاء أو البديل المعتمد.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canPrint && <Button variant="outline" className="border-[#d6b46a] bg-[#fff8e8] font-bold text-[#7b5b16]" onClick={() => setBuildingCoverageReportOpen(true)}><FileSpreadsheet className="ml-2 h-4 w-4" />تقارير التغطية</Button>}
                  <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => setActiveTab('map')}><MapPin className="ml-2 h-4 w-4" />الخريطة المكانية</Button>
                  <Button variant="outline" className="border-[#d9c9a5] bg-white font-bold text-[#0b4a3f]" onClick={() => navigate('/buildings/registry')}><Building2 className="ml-2 h-4 w-4" />السجل المركزي</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
                <div className="rounded-[22px] border border-[#e2d4b4] bg-[#fbf8f1] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-black text-[#0b4a3f]">نسبة تغطية المباني بخدمة الصلاة</p><p className="mt-1 text-xs text-slate-500">النسبة تحسب من المباني المعتمدة المصنفة «مغطاة بخدمة الصلاة».</p></div>
                    <div className="text-left"><span className="text-3xl font-black text-[#0b4a3f]">{buildingCoveragePercent}%</span><p className="text-[10px] text-slate-500">{officialBuildings.filter((x) => x.coverageStatus === 'covered').length} من {officialBuildings.length}</p></div>
                  </div>
                  <Progress value={buildingCoveragePercent} className="mt-4 h-3" />
                </div>

                <div className="rounded-[22px] border border-[#d6b46a]/45 bg-[#fff8e8] p-4 text-sm leading-7 text-slate-700">
                  <div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 shrink-0 text-[#0b5a49]" /><div><strong className="text-[#0b4a3f]">مصدر بيانات المباني: السجل المركزي.</strong><p className="mt-1 text-xs leading-6 text-slate-600">تعريف المبنى ورقمه وموقعه وإحداثياته تُدار مركزيًا؛ هذه الصفحة تختص فقط بحالة تغطية خدمة الصلاة والاحتياج والبدائل.</p></div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SpatialMetric label="إجمالي المباني" value={officialBuildings.length} icon={Building2} />
                <SpatialMetric label="مغطاة بالخدمة" value={officialBuildings.filter((x) => x.coverageStatus === 'covered').length} icon={CheckCircle2} />
                <SpatialMetric label="تحتاج مصلى" value={officialBuildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length} icon={AlertTriangle} tone="warning" />
                <SpatialMetric label="قيد الدراسة / التنفيذ" value={officialBuildings.filter((x) => ['under_feasibility_study', 'under_implementation'].includes(x.coverageStatus)).length} icon={Clock3} />
              </div>

              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">البحث والتصفية</p><p className="mt-1 text-xs text-slate-500">ابحث برقم المبنى أو اسمه أو موقعه، ثم صفِّ حسب حالة التغطية.</p></div>
                  <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{filteredCoverageBuildings.length} مبنى</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
                  <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-11 border-[#d9c9a5] bg-white pr-9" value={buildingCoverageSearch} onChange={(e) => setBuildingCoverageSearch(e.target.value)} placeholder="رقم المبنى، الاسم، الموقع، المدينة..." /></div>
                  <NativeSelect className="h-11 bg-white" value={buildingCoverageFilter} onChange={(e) => setBuildingCoverageFilter(e.target.value)}><option value="all">جميع حالات التغطية</option>{Object.entries(buildingCoverageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                  <Button variant="outline" className="h-11 border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => { setBuildingCoverageSearch(''); setBuildingCoverageFilter('all'); }}><X className="ml-1 h-4 w-4" />مسح</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {!filteredCoverageBuildings.length ? <Empty text="لا توجد مبانٍ مطابقة للبحث والتصفية" /> : <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filteredCoverageBuildings.map((building) => {
            const men = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'men' && site.status !== 'temporarily_closed');
            const women = building.sites?.some((site) => site.siteType === 'prayer_room' && site.prayerRoomGender === 'women' && site.status !== 'temporarily_closed');
            const menPresence = buildingPrayerRoomPresence(building, 'men');
            const womenPresence = buildingPrayerRoomPresence(building, 'women');
            const mosque = building.sites?.some((site) => ['mosque', 'jami'].includes(site.siteType) && site.status !== 'temporarily_closed');
            const hasCoordinates = Number.isFinite(Number(building.latitude)) && Number.isFinite(Number(building.longitude));
            const linkedCount = building._count?.sites ?? building.sites?.length ?? 0;

            return <Card key={building.id} className="group overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-[0_8px_24px_rgba(6,60,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_14px_28px_rgba(6,60,51,0.10)]">
              <div className={`h-1.5 ${building.coverageStatus === 'covered' ? 'bg-emerald-600' : building.coverageStatus === 'needs_prayer_room' ? 'bg-amber-500' : 'bg-[#d6b46a]'}`} />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><Badge variant="outline" className="mb-2 border-[#d6b46a]/45 bg-[#fffdf8] text-[#7b5b16]">مبنى رقم {building.buildingNumber}</Badge><CardTitle className="truncate text-lg font-black text-[#0b4a3f]">{building.name || ('مبنى ' + building.buildingNumber)}</CardTitle><CardDescription className="mt-1 line-clamp-2">{[building.campusLocation, building.city, building.district].filter(Boolean).join(' — ') || 'لم يحدد الموقع'}</CardDescription></div>
                  <Badge variant="outline" className={building.coverageStatus === 'covered' ? 'shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700' : building.coverageStatus === 'needs_prayer_room' ? 'shrink-0 border-amber-300 bg-amber-50 text-amber-800' : 'shrink-0 border-slate-300 bg-slate-50 text-slate-700'}>{buildingCoverageStatusLabels[building.coverageStatus] || building.coverageStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs"><div className={'rounded-xl border p-2.5 text-center ' + prayerRoomPresenceClass(menPresence)}><p className="text-[10px] font-bold opacity-75">مصلى الرجال</p><p className="mt-1 font-black">{buildingPrayerRoomPresenceLabels[menPresence]}</p></div><div className={'rounded-xl border p-2.5 text-center ' + prayerRoomPresenceClass(womenPresence)}><p className="text-[10px] font-bold opacity-75">مصلى النساء</p><p className="mt-1 font-black">{buildingPrayerRoomPresenceLabels[womenPresence]}</p></div></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">إمكانية الإنشاء</p><p className="mt-1 text-xs font-black text-[#0b4a3f]">{buildingFeasibilityLabels[building.creationFeasibility] || building.creationFeasibility}</p></div>
                  <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">المواقع المرتبطة</p><p className="mt-1 text-xs font-black text-[#0b4a3f]">{linkedCount}</p></div>
                </div>
                {!men && !women && building.coverageStatus === 'needs_prayer_room' && <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-900">تم التحقق من عدم وجود مصلى — المبنى يحتاج خدمة صلاة</div>}
                {mosque && <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-xs font-bold text-red-800">سجل قديم يحتاج مراجعة: يوجد مسجد / جامع مرتبط بالمبنى.</div>}
                {building.unavailableReason && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><p className="font-bold text-slate-500">سبب عدم الإمكانية</p><p className="mt-1 leading-6 text-slate-700">{building.unavailableReason}</p></div>}
                {building.approvedAlternative && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs"><p className="font-bold text-emerald-700">البديل المعتمد</p><p className="mt-1 leading-6 text-emerald-800">{building.approvedAlternative}</p></div>}
                <div className="flex flex-wrap gap-2 border-t border-[#eee5d2] pt-3">
                  {canEdit && <Button size="sm" className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => openBuildingDialog(building)}><Pencil className="ml-1 h-3.5 w-3.5" />ملف خدمة الصلاة</Button>}
                  {hasCoordinates && <Button size="sm" variant="outline" className="border-[#d9c9a5] text-[#0b4a3f]" onClick={() => window.open('https://www.google.com/maps?q=' + building.latitude + ',' + building.longitude, '_blank')}><MapPin className="ml-1 h-3.5 w-3.5" />الموقع</Button>}
                  <Button size="sm" variant="ghost" className="text-slate-600" onClick={() => navigate('/buildings/registry')}><Building2 className="ml-1 h-3.5 w-3.5" />السجل المركزي</Button>
                </div>
              </CardContent>
            </Card>;
          })}</div>}
        </TabsContent>}

        {['head', 'supervisor'].includes(role) && <TabsContent value="field-visits" className="space-y-4">
          <MosqueFieldVisitsPanel sites={sites} currentUsername={currentUsername} canAdd={canAdd} canEdit={canEdit} canDelete={canDelete && role === 'head'} canPrint={canPrint} />
        </TabsContent>}

        <TabsContent value="requests" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">مركز المعاملات</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Wrench className="h-5 w-5" />طلبات الصيانة والاحتياج</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">متابعة الطلب من التقديم والمراجعة والاعتماد حتى التنفيذ والتحقق والإغلاق، مع إبراز الأولوية والإجراء المطلوب لكل معاملة.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => setActiveTab('requests')}><ClipboardList className="ml-2 h-4 w-4" />الطلبات</Button>
                  {['head', 'supervisor'].includes(role) && <Button variant="outline" className="border-[#d9c9a5] bg-white font-bold text-[#0b4a3f]" onClick={() => setActiveTab('tickets')}><MessageSquare className="ml-2 h-4 w-4" />البلاغات</Button>}
                  {role === 'personnel' && <Button variant="outline" className="border-[#d6b46a] bg-[#fff8e8] font-bold text-[#7b5b16]" onClick={openRequestDialog}><Plus className="ml-2 h-4 w-4" />طلب جديد</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TransactionMetric label="إجمالي الطلبات" value={requests.filter((item) => item.status !== 'archived').length} icon={ClipboardList} />
                <TransactionMetric label="قيد المتابعة" value={requests.filter((item) => !['closed', 'rejected', 'archived'].includes(item.status)).length} icon={Clock3} />
                <TransactionMetric label="عاجلة" value={requests.filter((item) => item.priority === 'urgent' && !['closed', 'rejected', 'archived'].includes(item.status)).length} icon={AlertTriangle} tone="urgent" />
                <TransactionMetric label="متأخرة +7 أيام" value={requests.filter((item) => ['new', 'under_review', 'approved', 'in_progress'].includes(item.status) && new Date(item.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000).length} icon={CalendarDays} tone="warning" />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-black text-[#0b4a3f]">عرض الطلبات حسب الحالة</p>
                  <p className="mt-1 text-xs text-slate-500">اختر الحالة لتقليل القائمة والتركيز على المعاملات التي تحتاج إجراء.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'الكل'],
                    ['new', 'جديد'],
                    ['under_review', 'تحت المراجعة'],
                    ['approved', 'معتمد'],
                    ['late', 'متأخر'],
                  ] as const).map(([value, label]) => <Button key={value} size="sm" variant={requestQuickFilter === value ? 'default' : 'outline'} className={requestQuickFilter === value ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setRequestQuickFilter(value)}>{label}</Button>)}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-black text-[#0b4a3f]">قائمة المعاملات</p><p className="mt-1 text-xs text-slate-500">كل بطاقة توضح صاحب الطلب، الأولوية، الحالة الحالية، والإجراء التالي المقترح وفق سير العمل.</p></div>
                <Badge variant="outline" className="border-[#d6b46a]/55 bg-[#fffdf8] px-3 py-1.5 font-black text-[#0b4a3f]">{filteredRequests.filter((item) => item.status !== 'archived').length} طلب</Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filteredRequests.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} kind="request" title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} statusLabel={quranRequestStatusLabel(item)} priority={item.priority} createdAt={item.createdAt} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} submitterName={item.applicant?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || 'مقدم الطلب'} onView={() => setViewingWorkflow({ kind: 'request', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openReturnedRequestEdit(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('request', item)} />)}</div>
              {!filteredRequests.filter((item) => item.status !== 'archived').length && <Empty text="لا توجد طلبات مطابقة" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">مركز المعاملات</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><MessageSquare className="h-5 w-5" />البلاغات والملاحظات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">استقبال البلاغ، مراجعته وإسناده ومعالجته، مع إمكانية تحويله إلى طلب صيانة عند الحاجة والمحافظة على الارتباط بين السجلين.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="border-[#d9c9a5] bg-white font-bold text-[#0b4a3f]" onClick={() => setActiveTab('requests')}><ClipboardList className="ml-2 h-4 w-4" />الطلبات</Button>
                  <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => setActiveTab('tickets')}><MessageSquare className="ml-2 h-4 w-4" />البلاغات</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TransactionMetric label="إجمالي البلاغات" value={tickets.filter((item) => item.status !== 'archived').length} icon={MessageSquare} />
                <TransactionMetric label="مفتوحة" value={tickets.filter((item) => !['closed', 'rejected', 'archived'].includes(item.status)).length} icon={Clock3} />
                <TransactionMetric label="قيد المعالجة" value={tickets.filter((item) => ['assigned', 'in_progress'].includes(item.status)).length} icon={Wrench} />
                <TransactionMetric label="محولة إلى صيانة" value={tickets.filter((item) => Boolean(item.convertedRequestId)).length} icon={CheckCircle2} />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-black text-[#0b4a3f]">حالة البلاغات</p>
                  <p className="mt-1 text-xs text-slate-500">اعرض جميع البلاغات أو ركّز على البلاغات التي ما زالت تحتاج متابعة.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={ticketQuickFilter === 'all' ? 'default' : 'outline'} className={ticketQuickFilter === 'all' ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setTicketQuickFilter('all')}>الكل</Button>
                  <Button size="sm" variant={ticketQuickFilter === 'open' ? 'default' : 'outline'} className={ticketQuickFilter === 'open' ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setTicketQuickFilter('open')}>المفتوحة</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-black text-[#0b4a3f]">قائمة البلاغات</p><p className="mt-1 text-xs text-slate-500">الحالة الحالية والإجراء التالي ظاهرين مباشرة على البطاقة؛ تفاصيل السجل والتسلسل الزمني داخل «عرض التفاصيل».</p></div>
                <Badge variant="outline" className="border-[#d6b46a]/55 bg-[#fffdf8] px-3 py-1.5 font-black text-[#0b4a3f]">{filteredTickets.filter((item) => item.status !== 'archived').length} بلاغ</Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filteredTickets.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} kind="ticket" title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} createdAt={item.createdAt} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'بدون وسيلة تواصل']} submitterName={item.reporterName || 'غير محدد'} submitterRole="مقدّم البلاغ" onView={() => setViewingWorkflow({ kind: 'ticket', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={<>{workflowAdminActions('ticket', item)}{['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant="outline" size="sm" className="border-[#d6b46a] bg-[#fff8e8] text-[#7b5b16]" onClick={() => convertTicket(item)}><Wrench className="ml-1 h-3.5 w-3.5" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">مرتبط بطلب صيانة</Badge> : null}</>} />)}</div>
              {!filteredTickets.filter((item) => item.status !== 'archived').length && <Empty text="لا توجد بلاغات مطابقة" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">المناوبات والتغطية</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><CalendarDays className="h-5 w-5" />الإجازات والاعتذارات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">متابعة إجازات واعتذارات منسوبي المساجد والمصليات، البديل المقترح، وحالة الاعتماد لضمان استمرار التغطية التشغيلية.</CardDescription>
                </div>
                {role === 'personnel' && <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={openLeaveDialog}><Plus className="ml-2 h-4 w-4" />طلب إجازة / اعتذار</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TransactionMetric label="إجمالي الطلبات" value={leaves.filter((item) => item.status !== 'archived').length} icon={CalendarDays} />
                <TransactionMetric label="قيد المراجعة" value={leaves.filter((item) => ['pending', 'under_review'].includes(item.status)).length} icon={Clock3} tone="warning" />
                <TransactionMetric label="المعتمدة" value={leaves.filter((item) => item.status === 'approved').length} icon={CheckCircle2} />
                <TransactionMetric label="معادة للتعديل" value={leaves.filter((item) => item.status === 'returned_for_edit').length} icon={RefreshCw} />
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="font-black text-[#0b4a3f]">عرض طلبات التغطية</p><p className="mt-1 text-xs text-slate-500">ركّز على المعلّق فقط أو اعرض جميع الإجازات والاعتذارات.</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant={leaveQuickFilter === 'all' ? 'default' : 'outline'} className={leaveQuickFilter === 'all' ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setLeaveQuickFilter('all')}>الكل</Button>
                  <Button size="sm" variant={leaveQuickFilter === 'pending' ? 'default' : 'outline'} className={leaveQuickFilter === 'pending' ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setLeaveQuickFilter('pending')}>قيد المراجعة</Button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{filteredLeaves.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} kind="leave" title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} createdAt={item.createdAt} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} submitterName={item.applicant?.name || item.personnel?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || (item.personnel?.role ? personnelRoleLabels[item.personnel.role] || item.personnel.role : 'مقدم الطلب')} onView={() => setViewingWorkflow({ kind: 'leave', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} extraAction={role === 'personnel' && item.status === 'returned_for_edit' ? <Button variant="outline" size="sm" className="border-amber-300 text-amber-700" onClick={() => openReturnedLeaveEdit(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل وإعادة الإرسال</Button> : workflowAdminActions('leave', item)} />)}</div>
              {!filteredLeaves.filter((item) => item.status !== 'archived').length && <Empty text="لا توجد طلبات إجازة أو اعتذار مطابقة" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div>
                <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">طلبات التعاون</Badge>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Briefcase className="h-5 w-5" />طلبات الوظائف والتعاون</CardTitle>
                <CardDescription className="mt-1 max-w-3xl leading-6">متابعة المتقدمين لمهام الإمام والمؤذن والخطيب والخطيب المتعاون، من التسجيل والمراجعة حتى المقابلة والقبول.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TransactionMetric label="إجمالي الطلبات" value={jobs.filter((item) => item.status !== 'archived').length} icon={Briefcase} />
                <TransactionMetric label="طلبات جديدة" value={jobs.filter((item) => item.status === 'new').length} icon={Plus} />
                <TransactionMetric label="تحت المراجعة" value={jobs.filter((item) => item.status === 'under_review').length} icon={Clock3} />
                <TransactionMetric label="المرشحون / المقابلات" value={jobs.filter((item) => ['shortlisted', 'interview'].includes(item.status)).length} icon={Users} />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-7 text-amber-900"><div className="flex items-start gap-3"><Shield className="mt-1 h-5 w-5 shrink-0" /><div><strong>خصوصية البيانات:</strong> بيانات الهوية والجوال والبريد والسيرة الذاتية تظهر فقط للمخولين داخل الوحدة، ولا تظهر في البوابة العامة.</div></div></div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">{jobs.filter((item) => item.status !== 'archived').map((item) => <WorkflowCard key={item.id} kind="job" title={item.applicationNumber} subtitle={`${item.fullName} — ${item.jobType}`} description={`${item.qualification}${item.preferredLocation ? ` — ${item.preferredLocation}` : ''}`} status={item.status} createdAt={item.createdAt} meta={[item.email, item.phone]} onStatus={canEdit && role === 'head' ? () => openStatusDialog('job', item) : undefined} extraAction={<>{workflowAdminActions('job', item)}{item.cvUrl ? <Button variant="outline" size="sm" className="border-[#d9c9a5] text-[#0b4a3f]" onClick={() => window.open(item.cvUrl!, '_blank')}><Eye className="ml-1 h-3.5 w-3.5" />السيرة الذاتية</Button> : null}</>} />)}</div>
              {!jobs.filter((item) => item.status !== 'archived').length && <Empty text="لا توجد طلبات توظيف" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quran" className="space-y-4">
          <section className="grid gap-5 xl:grid-cols-[1.6fr_0.85fr]">
            <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
              <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
                <div className="flex items-center gap-3">
                  <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-white shadow-sm">
                    <img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="h-10 w-10 rounded-xl object-cover" />
                  </span>
                  <div>
                    <Badge variant="outline" className="mb-1 border-[#d6b46a]/55 bg-white text-[#8a6a1f]">المخزون المركزي</Badge>
                    <CardTitle className="text-xl font-black text-[#0b4a3f] md:text-2xl">مكتبة المصاحف</CardTitle>
                    <CardDescription className="mt-1 max-w-3xl leading-6">إدارة الرصيد المركزي وتوزيعه على المساجد والمصليات مع حفظ كل حركة ومتابعة الاحتياج الفعلي للمواقع.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#e2d4b4] bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-500">رصيد المكتبة</p><p className="mt-1 text-3xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.warehouseTotal || 0}</p><p className="mt-1 text-[10px] text-slate-400">الرصيد المتاح للتوزيع</p></div>
                  <div className="rounded-2xl border border-[#e2d4b4] bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-500">الرصيد بالمواقع</p><p className="mt-1 text-3xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.siteSystemTotal || 0}</p><p className="mt-1 text-[10px] text-slate-400">الموجود حاليًا في المساجد والمصليات</p></div>
                  <div className="rounded-2xl border border-[#e2d4b4] bg-white p-4 shadow-sm"><p className="text-[11px] font-bold text-slate-500">إجمالي النظام</p><p className="mt-1 text-3xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.systemTotal || 0}</p><p className="mt-1 text-[10px] text-slate-400">المكتبة + المواقع</p></div>
                  <div className={`rounded-2xl border p-4 shadow-sm ${(quranStockDashboard?.summary.siteNeedTotal || 0) > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/60'}`}><p className="text-[11px] font-bold text-slate-500">احتياج المواقع</p><p className={`mt-1 text-3xl font-black ${(quranStockDashboard?.summary.siteNeedTotal || 0) > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{quranStockDashboard?.summary.siteNeedTotal || 0}</p><p className="mt-1 text-[10px] text-slate-500">وفق المستهدفات المسجلة</p></div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-stretch">
                  <div className="rounded-2xl border border-[#e5d9bd] bg-[#fbf8f1] p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div><p className="font-black text-[#0b4a3f]">تكوين رصيد المكتبة</p><p className="mt-1 text-xs text-slate-500">توزيع الرصيد الحالي حسب حجم المصحف.</p></div>
                      <Badge variant="outline" className="border-[#d6b46a]/50 bg-white text-[#8a6a1f]">رصيد لحظي</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">كبير</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.warehouseLarge || 0}</p></div>
                      <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">متوسط</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.warehouseMedium || 0}</p></div>
                      <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">صغير</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{quranStockDashboard?.summary.warehouseSmall || 0}</p></div>
                    </div>
                  </div>

                  <div className={`flex min-w-[210px] flex-col justify-center rounded-2xl border p-4 text-center ${(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50/70'}`}>
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl ${(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</div>
                    <p className="mt-2 text-xs font-bold text-slate-500">حالة المخزون</p>
                    <p className={`mt-1 font-black ${(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 ? 'يحتاج تزويد' : 'الرصيد ضمن الحد الآمن'}</p>
                    {(quranStockDashboard?.summary.lowStockWarehouses || 0) > 0 && <p className="mt-1 text-[10px] leading-5 text-red-600">الناقص حتى حد الأمان: {quranStockDashboard?.summary.shortageTotal || 0}</p>}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-[#0b4a3f]">المكتبات المسجلة</p><p className="mt-1 text-xs text-slate-500">الرصيد الفعلي لكل مكتبة مع الحدود الدنيا والتنبيهات.</p></div><Badge variant="outline" className="border-[#d6b46a]/50 bg-[#fffdf8] text-[#0b4a3f]">{quranStockDashboard?.warehouses.length || 0} مكتبة</Badge></div>
                  {!quranStockDashboard?.warehouses.length ? <div className="rounded-2xl border border-dashed border-[#d6b46a] bg-[#fffaf0] p-7 text-center">
                    <img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="mx-auto h-14 w-14 rounded-2xl object-cover shadow-sm" />
                    <p className="mt-3 font-black text-[#0b4a3f]">لم يتم إنشاء مكتبة المصاحف بعد</p>
                    <p className="mt-1 text-sm text-slate-500">أنشئ المكتبة أولًا، ثم أضف الرصيد ليصبح متاحًا للتوزيع على المواقع.</p>
                    {role === 'head' && <Button className="mt-4 border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={openQuranWarehouse}><Plus className="ml-2 h-4 w-4" />إنشاء مكتبة المصاحف</Button>}
                  </div> : <div className="grid gap-3 lg:grid-cols-2">{quranStockDashboard.warehouses.map((warehouse) => (
                    <div key={warehouse.id} className={`rounded-2xl border bg-white p-4 shadow-[0_6px_18px_rgba(6,60,51,0.05)] ${warehouse.lowStock ? 'border-red-200' : 'border-[#e2d4b4]'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><div className="flex items-center gap-2"><h3 className="font-black text-[#0b4a3f]">{warehouse.name}</h3><Badge variant="outline" className="border-[#d6b46a]/45">{warehouse.code}</Badge></div><p className="mt-1 text-xs text-slate-500">{warehouse.location || 'لم يحدد موقع المكتبة'}</p></div>
                        {warehouse.lowStock ? <Badge className="bg-red-600">رصيد منخفض</Badge> : <Badge className="bg-emerald-600">الرصيد آمن</Badge>}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] text-slate-500">الإجمالي</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{warehouse.balance.totalCount}</p></div>
                        <div className="rounded-xl border bg-white p-2.5"><p className="text-[10px] text-slate-500">كبير</p><p className="mt-1 font-black">{warehouse.balance.largeCount}</p><p className="text-[9px] text-slate-400">حد {warehouse.minLargeCount}</p></div>
                        <div className="rounded-xl border bg-white p-2.5"><p className="text-[10px] text-slate-500">متوسط</p><p className="mt-1 font-black">{warehouse.balance.mediumCount}</p><p className="text-[9px] text-slate-400">حد {warehouse.minMediumCount}</p></div>
                        <div className="rounded-xl border bg-white p-2.5"><p className="text-[10px] text-slate-500">صغير</p><p className="mt-1 font-black">{warehouse.balance.smallCount}</p><p className="text-[9px] text-slate-400">حد {warehouse.minSmallCount}</p></div>
                      </div>
                      {warehouse.lowStock && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">الناقص حتى حد الأمان: كبير {warehouse.shortage.largeCount} — متوسط {warehouse.shortage.mediumCount} — صغير {warehouse.shortage.smallCount}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#eee5d2] pt-3">
                        <Button size="sm" variant="outline" className="border-[#d9c9a5] text-[#0b4a3f]" onClick={() => setQuranWarehousePreview(warehouse)}><Eye className="ml-1 h-4 w-4" />معاينة</Button>
                        <Button size="sm" variant="ghost" className="text-slate-600" onClick={() => exportQuranWarehouseExcel(warehouse)}><FileSpreadsheet className="ml-1 h-4 w-4" />Excel</Button>
                        <Button size="sm" variant="ghost" className="text-slate-600" onClick={() => printQuranWarehouse(warehouse)}><Printer className="ml-1 h-4 w-4" />طباعة</Button>
                        {role === 'head' && <><Button size="sm" variant="ghost" className="text-[#0b5a49]" onClick={() => openEditQuranWarehouse(warehouse)}><Pencil className="ml-1 h-4 w-4" />تعديل</Button><Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={quranStockSaving} onClick={() => deleteQuranWarehouse(warehouse)}><Trash2 className="ml-1 h-4 w-4" />حذف</Button></>}
                      </div>
                    </div>
                  ))}</div>}
                </div>

                {quranStockDashboard && <details className="group overflow-hidden rounded-2xl border border-[#e2d4b4] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fffdf8] px-4 py-3">
                    <div><p className="font-black text-[#0b4a3f]">ملخص حركة المكتبة</p><p className="mt-1 text-xs text-slate-500">الوارد والخارج والتوزيع والمرتجع والتسويات المسجلة.</p></div>
                    <span className="rounded-full border border-[#d6b46a]/50 bg-white px-3 py-1 text-xs font-bold text-[#8a6a1f] group-open:hidden">عرض</span>
                    <span className="hidden rounded-full border border-[#d6b46a]/50 bg-white px-3 py-1 text-xs font-bold text-[#8a6a1f] group-open:inline">إخفاء</span>
                  </summary>
                  <div className="space-y-3 border-t border-[#eee5d2] p-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                      <ReportMetric label="الوارد للمكتبة" value={quranStockDashboard.summary.warehouseInflowTotal || 0} />
                      <ReportMetric label="الخارج من المكتبة" value={quranStockDashboard.summary.warehouseOutflowTotal || 0} />
                      <ReportMetric label="المضاف للمواقع" value={quranStockDashboard.summary.distributedTotal || 0} />
                      <ReportMetric label="المرتجع للمكتبة" value={quranStockDashboard.summary.returnedTotal || 0} />
                      <ReportMetric label="المستبعد / التسويات" value={(quranStockDashboard.summary.damagedTotal || 0) + (quranStockDashboard.summary.adjustmentOutTotal || 0)} />
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${quranStockDashboard.summary.warehouseNetMovement === quranStockDashboard.summary.warehouseTotal ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                      معادلة الرصيد: {quranStockDashboard.summary.warehouseInflowTotal || 0} وارد − {quranStockDashboard.summary.warehouseOutflowTotal || 0} خارج = {quranStockDashboard.summary.warehouseNetMovement || 0}، والرصيد الحالي للمكتبة = {quranStockDashboard.summary.warehouseTotal || 0}.
                    </div>
                  </div>
                </details>}

                <details className="group overflow-hidden rounded-2xl border border-[#e2d4b4] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fffdf8] px-4 py-3">
                    <div><p className="font-black text-[#0b4a3f]">سجل حركات المصاحف</p><p className="mt-1 text-xs text-slate-500">آخر الحركات المسجلة؛ السجل غير قابل للمحو حفاظًا على التدقيق.</p></div>
                    <Badge variant="outline" className="border-[#d6b46a]/50 bg-white text-[#0b4a3f]">{quranStockDashboard?.recentMovements.length || 0} حركة</Badge>
                  </summary>
                  <div className="border-t border-[#eee5d2] p-3">
                    {quranStockDashboard?.recentMovements.length ? <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1120px] text-sm"><thead className="bg-[#fbf8f1]"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">المكتبة</th><th className="p-3">المسجد / المصلى</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th><th className="p-3">الإجراء</th></tr></thead><tbody>{quranStockDashboard.recentMovements.slice(0, 20).map((movement) => { const reversed = movement.movementType === 'distribution' && isQuranDistributionReversed(movement.movementNumber); return <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center"><Badge variant="outline" className={movement.notes?.startsWith('تراجع عن حركة الصرف') ? 'border-amber-300 bg-amber-50 text-amber-800' : ''}>{quranStockMovementDisplayLabel(movement)}</Badge></td><td className="p-3 text-center">{movement.warehouse?.name || '-'}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black text-[#0b4a3f]">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 text-center">{movement.movementType === 'distribution' ? reversed ? <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">تم التراجع</Badge> : role === 'head' ? <Button size="sm" variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" disabled={quranStockSaving} onClick={() => void reverseQuranStockMovement(movement)}><RefreshCw className="ml-1 h-3.5 w-3.5" />تراجع</Button> : '-' : movement.notes?.startsWith('تراجع عن حركة الصرف') ? <span className="text-xs text-slate-500">حركة عكسية</span> : '-'}</td></tr>; })}</tbody></table></div> : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">لا توجد حركات مصاحف مسجلة حتى الآن.</div>}
                  </div>
                </details>
              </CardContent>
            </Card>

            <aside className="grid content-start gap-4">
              <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_8px_24px_rgba(6,60,51,0.07)]">
                <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">إجراءات المخزون</CardTitle><CardDescription>الإجراءات الرئيسية لمكتبة المصاحف.</CardDescription></CardHeader>
                <CardContent className="grid gap-2">
                  {role === 'head' && !quranStockDashboard?.warehouses.length && <Button className="h-11 justify-start border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={openQuranWarehouse}><Plus className="ml-2 h-4 w-4" />إنشاء مكتبة المصاحف</Button>}
                  {role === 'head' && <Button className="h-11 justify-start border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => openQuranStockMovement('receipt')} disabled={!quranStockDashboard?.warehouses.length}><Plus className="ml-2 h-4 w-4" />إضافة رصيد للمكتبة</Button>}
                  {role === 'head' && <Button variant="outline" className="h-11 justify-start border-[#d9c9a5] bg-[#fffdf8] font-bold text-[#0b4a3f]" onClick={() => openQuranStockMovement('return')} disabled={!quranStockDashboard?.warehouses.length}><RefreshCw className="ml-2 h-4 w-4" />إرجاع للمكتبة</Button>}
                  {canPrint && <Button variant="outline" className="h-11 justify-start border-[#d9c9a5] bg-white font-bold text-[#0b4a3f]" onClick={openQuranPrintDialog}><Printer className="ml-2 h-4 w-4" />تقرير المصاحف / PDF</Button>}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-[#fffdf8] shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">الجرد التأسيسي</CardTitle><CardDescription>حالة حصر المصاحف الموجودة قبل تشغيل حركة المكتبة.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">تم الحصر</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{quranOpeningBaselineStatus?.countedSites ?? quranSummary.countedSites}</p></div>
                    <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">إجمالي المواقع</p><p className="mt-1 text-xl font-black text-[#0b4a3f]">{quranOpeningBaselineStatus?.totalSites ?? quranSummary.sites}</p></div>
                  </div>
                  {quranOpeningBaselineStatus && <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${quranOpeningBaselineStatus.closed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{quranOpeningBaselineStatus.closed ? 'الجرد التأسيسي معتمد ومقفل' : `متبقي ${quranOpeningBaselineStatus.remainingSites} موقع قبل الاعتماد`}</div>}
                </CardContent>
              </Card>

              {role === 'head' && <details className="group overflow-hidden rounded-[24px] border border-red-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-red-700">إجراءات إدارية حساسة</summary>
                <div className="border-t border-red-100 p-3"><Button variant="outline" className="w-full border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800" onClick={() => void resetQuranLibrary()} disabled={quranStockSaving || (!quranStockDashboard?.warehouses.length && !quranStockDashboard?.summary.siteSystemTotal && quranSummary.countedSites === 0)}><RefreshCw className="ml-2 h-4 w-4" />تصفير المكتبة</Button></div>
              </details>}
            </aside>
          </section>

          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_12px_32px_rgba(6,60,51,0.07)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/55 bg-white text-[#8a6a1f]">رصيد المواقع والجرد</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]"><BookOpen className="h-5 w-5" />المصاحف في المساجد والمصليات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">متابعة الرصيد والمستهدف ونسبة التغطية والاحتياج لكل موقع، مع الجرد والحركات من بطاقة واحدة.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="h-9 border-[#d6b46a]/50 bg-white px-3 font-black text-[#0b4a3f]">{filteredQuranInventoryItems.length} موقع ظاهر</Badge>
                  {canPrint && <Button variant="outline" className={`${button3d} border-[#d9c9a5] bg-white text-[#0b4a3f]`} onClick={openQuranPrintDialog}><Printer className="ml-2 h-4 w-4" />تقرير / PDF</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {role === 'head' && quranOpeningBaselineStatus && <div className={`rounded-2xl border p-4 shadow-sm ${quranOpeningBaselineStatus.closed ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">الجرد التأسيسي للمصاحف</p><Badge className={quranOpeningBaselineStatus.closed ? 'bg-emerald-600' : 'bg-amber-500'}>{quranOpeningBaselineStatus.closed ? 'معتمد ومقفل' : 'مرحلة الحصر الميداني'}</Badge></div>
                    <p className="mt-1 text-xs leading-6 text-slate-600">يسجل المصاحف الموجودة فعليًا في المساجد والمصليات قبل تشغيل النظام كنقطة بداية، ولا يخصم أي كمية من مكتبة المصاحف.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="bg-white px-3 py-2">تم الحصر {quranOpeningBaselineStatus.countedSites} / {quranOpeningBaselineStatus.totalSites}</Badge>{!quranOpeningBaselineStatus.closed && <Button className={`${button3d} bg-emerald-700 hover:bg-emerald-600`} disabled={quranOpeningBaselineStatus.remainingSites > 0 || quranStockSaving} onClick={closeQuranOpeningBaseline}><CheckCircle2 className="ml-2 h-4 w-4" />اعتماد وإقفال الجرد التأسيسي</Button>}</div>
                </div>
                {!quranOpeningBaselineStatus.closed && quranOpeningBaselineStatus.remainingSites > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-xs font-bold text-amber-800">متبقي {quranOpeningBaselineStatus.remainingSites} موقعًا قبل إمكانية الاعتماد والإقفال.</div>}
                {quranOpeningBaselineStatus.closed && <div className="mt-3 text-xs text-emerald-800">تم الإقفال {quranOpeningBaselineStatus.closedAt ? new Date(quranOpeningBaselineStatus.closedAt).toLocaleString('ar-SA-u-ca-gregory') : ''}{quranOpeningBaselineStatus.closedByName ? ` — بواسطة ${quranOpeningBaselineStatus.closedByName}` : ''}.</div>}
              </div>}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <ReportMetric label="إجمالي المصاحف" value={quranStockDashboard?.summary.siteSystemTotal ?? quranSummary.total} />
                <ReportMetric label="المصاحف الكبيرة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.largeCount, 0) ?? quranSummary.large} />
                <ReportMetric label="المصاحف المتوسطة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.mediumCount, 0) ?? quranSummary.medium} />
                <ReportMetric label="المصاحف الصغيرة" value={quranStockDashboard?.sites.reduce((sum, row) => sum + row.systemStock.smallCount, 0) ?? quranSummary.small} />
                <ReportMetric label="المسحوبة" value={quranStockDashboard?.summary.withdrawnTotal ?? 0} />
                <ReportMetric label="الاحتياج الحالي" value={quranStockDashboard?.summary.siteNeedTotal ?? 0} />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredQuranInventoryItems.map((item) => {
                  const site = sites.find((row) => row.id === item.site.id) || item.site as MosqueSite;
                  const latest = item.latest;
                  const media = normalizeSiteMedia(site.images || null);
                  const cover = media.photos.find((photo) => photo.category === 'mosque_image') || media.photos[0];
                  const stockRow = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);
                  const systemStock = stockRow?.systemStock;
                  const withdrawnStock = stockRow?.withdrawnStock;
                  const largeCount = systemStock?.largeCount ?? latest?.largeCount ?? 0;
                  const mediumCount = systemStock?.mediumCount ?? latest?.mediumCount ?? 0;
                  const smallCount = systemStock?.smallCount ?? latest?.smallCount ?? 0;
                  const totalCount = systemStock?.totalCount ?? latest?.totalCount ?? 0;
                  const needCount = Number(stockRow?.needCount || 0);
                  const baselineCounted = Boolean(quranOpeningBaselineStatus?.items.find((row) => row.site.id === site.id)?.counted);
                  const canManageTarget = canEdit && ['head', 'supervisor'].includes(role);
                  const canManageBaseline = role === 'head' && quranOpeningBaselineStatus && !quranOpeningBaselineStatus.closed;
                  const coverageClass = stockRow?.needLevel === 'complete'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : stockRow?.needLevel === 'low'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : stockRow?.needLevel === 'medium'
                        ? 'border-orange-200 bg-orange-50 text-orange-800'
                        : 'border-red-200 bg-red-50 text-red-700';

                  return <Card key={item.site.id} className="group overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-[0_8px_24px_rgba(6,60,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_14px_28px_rgba(6,60,51,0.10)]">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {cover ? <MosqueMediaImage item={cover} alt={cover.fileName || site.name} className="h-12 w-14 shrink-0 rounded-xl object-cover shadow-sm" /> : <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border border-[#e2d4b4] bg-[#fff8e8] text-[#0b5a49]"><Building2 className="h-5 w-5" /></div>}
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-900 sm:text-lg">{item.site.name}</p>
                            <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{siteTypeDisplayLabel(item.site as MosqueSite)} — {item.site.campusLocation || item.site.city || '-'}</span>
                            </p>
                          </div>
                        </div>
                        {needCount > 0
                          ? <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800">احتياج {needCount}</Badge>
                          : <Badge variant="outline" className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700">مكتمل</Badge>}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">الإجمالي</p>
                          <p className="mt-1 text-2xl font-black text-emerald-700">{totalCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">كبيرة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{largeCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">متوسطة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{mediumCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                          <p className="text-[11px] font-bold text-slate-500">صغيرة</p>
                          <p className="mt-1 text-xl font-black text-slate-800">{smallCount}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500">المسحوبة</p>
                          <p className="mt-1 font-black text-red-600">{withdrawnStock?.totalCount ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500">المستهدف</p>
                          <p className="mt-1 font-black text-slate-800">{stockRow?.targetCount ? stockRow.targetCount : 'غير محدد'}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-center ${stockRow?.coveragePercent != null ? coverageClass : 'border-slate-200 bg-slate-50/70 text-slate-500'}`}>
                          <p className="text-[10px] font-bold opacity-80">التغطية</p>
                          <p className="mt-1 font-black">{stockRow?.coveragePercent != null ? `${stockRow.coveragePercent}%` : '-'}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-center ${needCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                          <p className="text-[10px] font-bold opacity-80">الاحتياج</p>
                          <p className="mt-1 font-black">{needCount}</p>
                        </div>
                        <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-center sm:col-span-1">
                          <p className="text-[10px] font-bold text-slate-500">آخر جرد</p>
                          <p className="mt-1 text-xs font-black text-slate-700">{latest ? new Date(latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد'}</p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {(canManageTarget || canManageBaseline) && <div className={`grid gap-2 ${canManageTarget && canManageBaseline ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {canManageTarget && <Button size="sm" variant="outline" className={`${button3d} h-11 border-[#d9c9a5] bg-[#fffdf8] text-[#0b4a3f] hover:bg-[#fff4da]`} onClick={() => openSiteDialog(site)}><Pencil className="ml-1 h-4 w-4" />ضبط المستهدف</Button>}
                          {canManageBaseline && <Button size="sm" className={`${button3d} h-11 border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-900`} onClick={() => openQuranOpeningBaselineForSite(site)}><ClipboardList className="ml-1 h-4 w-4" />{baselineCounted ? 'تحديث الجرد التأسيسي' : 'الجرد التأسيسي'}</Button>}
                        </div>}
                        {role === 'head' && <Button size="sm" className={`${button3d} mt-2 h-12 w-full border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]`} onClick={() => openQuranDistributionForSite(site)}><BookOpen className="ml-1 h-4 w-4" />إضافة مصاحف من المكتبة</Button>}
                        <div className={`mt-2 grid gap-2 ${role === 'head' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {role === 'head' && <Button size="sm" className={`${button3d} h-11 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900`} onClick={() => openQuranWithdrawalForSite(site)}><RefreshCw className="ml-1 h-4 w-4" />سحب مصاحف</Button>}
                          <Button size="sm" variant="outline" className={`${button3d} h-11`} onClick={() => openQuranHistory(site)}><Clock3 className="ml-1 h-4 w-4" />السجل</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>
              {!filteredQuranInventoryItems.length && <Empty text="لا توجد مواقع مطابقة لبحث حصر المصاحف" />}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-900">ملاحظة: خلال مرحلة البداية يستخدم «الجرد التأسيسي» لتسجيل المصاحف الموجودة أصلًا دون الخصم من المكتبة. <strong>بعد اعتماد وإقفال الجرد التأسيسي، إضافة أي مصحف جديد للمسجد أو المصلى تتم من زر «إضافة مصحف من المكتبة» فقط</strong> ليتم الخصم التلقائي وحفظ الحركة.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">اللوحة المكانية</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><MapPin className="h-5 w-5" />الخريطة وتغطية خدمة الصلاة</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">عرض جغرافي للمساجد والمصليات، ومع صلاحيات الإشراف تظهر أيضًا مباني الجامعة وحالة تغطية خدمة الصلاة والاحتياج.</CardDescription>
                </div>
                {['head', 'supervisor'].includes(role) && <Button variant="outline" className="border-[#d6b46a] bg-[#fff8e8] font-bold text-[#7b5b16]" onClick={() => setActiveTab('buildings')}><Building2 className="ml-2 h-4 w-4" />تغطية المباني</Button>}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SpatialMetric label="مواقع بإحداثيات" value={spatialMapSites.length} icon={MapPin} />
                <SpatialMetric label="المباني على الخريطة" value={['head', 'supervisor'].includes(role) ? spatialMapBuildings.length : 0} icon={Building2} />
                <SpatialMetric label="مبانٍ تحتاج مصلى" value={['head', 'supervisor'].includes(role) ? officialBuildings.filter((x) => x.coverageStatus === 'needs_prayer_room').length : 0} icon={AlertTriangle} tone="warning" />
                <SpatialMetric label="سجلات بلا إحداثيات" value={sites.filter((site) => !Number.isFinite(Number(site.latitude)) || !Number.isFinite(Number(site.longitude))).length + (['head', 'supervisor'].includes(role) ? officialBuildings.filter((building) => !Number.isFinite(Number(building.latitude)) || !Number.isFinite(Number(building.longitude))).length : 0)} icon={FileText} />
              </div>

              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">طبقات الخريطة والتصفية</p><p className="mt-1 text-xs text-slate-500">غيّر الطبقة أو النوع أو الحالة لتحديث النقاط والبطاقات الجانبية مباشرة.</p></div>
                  <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{mapSites.length + mapBuildings.length} نقطة ظاهرة</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="relative xl:col-span-2"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-11 border-[#d9c9a5] bg-white pr-9" value={mapSearch} onChange={(e) => setMapSearch(e.target.value)} placeholder="اسم الموقع، رقم المبنى، المدينة، الحرم..." /></div>
                  <NativeSelect className="h-11 bg-white" value={mapLayer} onChange={(e) => setMapLayer(e.target.value as 'all' | 'sites' | 'buildings')}>
                    <option value="all">{['head', 'supervisor'].includes(role) ? 'كل الطبقات' : 'المساجد والمصليات'}</option>
                    <option value="sites">المساجد والمصليات</option>
                    {['head', 'supervisor'].includes(role) && <option value="buildings">المباني الجامعية</option>}
                  </NativeSelect>
                  <NativeSelect className="h-11 bg-white" value={mapSiteType} disabled={mapLayer === 'buildings'} onChange={(e) => setMapSiteType(e.target.value)}><option value="all">كل أنواع المواقع</option><option value="mosque">مساجد</option><option value="jami">جوامع</option><option value="prayer_room">مصليات</option></NativeSelect>
                  <NativeSelect className="h-11 bg-white" value={mapSiteStatus} disabled={mapLayer === 'buildings'} onChange={(e) => setMapSiteStatus(e.target.value)}><option value="all">كل حالات المواقع</option>{Object.entries(siteStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                </div>
                {['head', 'supervisor'].includes(role) && <div className="mt-3 grid gap-3 md:grid-cols-[280px_auto]">
                  <NativeSelect className="h-11 bg-white" value={mapBuildingCoverage} disabled={mapLayer === 'sites'} onChange={(e) => setMapBuildingCoverage(e.target.value)}><option value="all">كل حالات تغطية المباني</option>{Object.entries(buildingCoverageStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                  <div className="flex justify-end"><Button variant="outline" className="h-11 border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => { setMapSearch(''); setMapLayer('all'); setMapSiteType('all'); setMapSiteStatus('all'); setMapBuildingCoverage('all'); }}><X className="ml-1 h-4 w-4" />مسح مرشحات الخريطة</Button></div>
                </div>}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-[1.75fr_0.75fr]">
            <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_10px_28px_rgba(6,60,51,0.06)]">
              <CardHeader className="border-b border-[#eee5d2] bg-[#fffdf8] pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><CardTitle className="text-base font-black text-[#0b4a3f]">الخريطة التفاعلية</CardTitle><CardDescription className="mt-1">اضغط على أي نقطة لعرض بيانات السجل وفتح الموقع أو الملف المرتبط.</CardDescription></div>
                  <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-600"><span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#0b5a49]" />مسجد / مصلى</span>{['head', 'supervisor'].includes(role) && <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#d6b46a]" />مبنى جامعي</span>}</div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="h-[620px] overflow-hidden rounded-[20px] border border-[#e2d4b4]">
                  <MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapSites.length}-${mapBuildings.length}-${mapLayer}`} center={mapCenter} zoom={13} className="h-full w-full">
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {mapSites.map((site) => <CircleMarker key={`site-${site.id}`} center={[Number(site.latitude), Number(site.longitude)]} radius={9} pathOptions={{ color: '#0b5a49', fillColor: '#0b5a49', fillOpacity: 0.85, weight: 2 }}>
                      <Popup><div dir="rtl" className="min-w-[210px] space-y-2"><div><strong className="text-sm">{site.name}</strong><div className="mt-1 text-xs">{siteTypeDisplayLabel(site)} — {siteStatusLabels[site.status]}</div><div className="mt-1 text-xs">{[site.campusLocation, site.city, site.district].filter(Boolean).join(' — ') || '-'}</div>{hasAttachedWomenPrayerArea(site) && <div className="mt-1 text-xs font-bold text-emerald-700">مصلى نساء — {womenPrayerAreaStatusLabel(site)}</div>}</div><div className="flex gap-2"><button onClick={() => setPreviewSite(site)} className="rounded border px-2 py-1 text-xs font-bold">فتح السجل</button><button onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')} className="rounded border px-2 py-1 text-xs font-bold">Google Maps</button></div></div></Popup>
                    </CircleMarker>)}
                    {mapBuildings.map((building) => <CircleMarker key={`building-${building.id}`} center={[Number(building.latitude), Number(building.longitude)]} radius={8} pathOptions={{ color: '#a67c1e', fillColor: '#d6b46a', fillOpacity: 0.78, weight: 2 }}>
                      <Popup><div dir="rtl" className="min-w-[220px] space-y-2"><div><strong className="text-sm">{building.name || ('مبنى ' + building.buildingNumber)}</strong><div className="mt-1 text-xs">مبنى رقم {building.buildingNumber}</div><div className="mt-1 text-xs">{buildingCoverageStatusLabels[building.coverageStatus] || building.coverageStatus}</div></div><div className="flex gap-2"><button onClick={() => openBuildingDialog(building)} className="rounded border px-2 py-1 text-xs font-bold">ملف التغطية</button><button onClick={() => window.open('https://www.google.com/maps?q=' + building.latitude + ',' + building.longitude, '_blank')} className="rounded border px-2 py-1 text-xs font-bold">Google Maps</button></div></div></Popup>
                    </CircleMarker>)}
                  </MapContainer>
                </div>
              </CardContent>
            </Card>

            <aside className="grid content-start gap-4">
              {['head', 'supervisor'].includes(role) && <Card className="overflow-hidden rounded-[22px] border border-amber-200 bg-amber-50/45 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base font-black text-amber-900"><AlertTriangle className="h-4 w-4" />أولوية التغطية</CardTitle><CardDescription>مبانٍ مصنفة بأنها تحتاج مصلى.</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {officialBuildings.filter((building) => building.coverageStatus === 'needs_prayer_room').slice(0, 6).map((building) => <button key={building.id} type="button" onClick={() => openBuildingDialog(building)} className="w-full rounded-xl border border-amber-200 bg-white p-3 text-right transition hover:border-amber-400"><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-[#0b4a3f]">{building.name || ('مبنى ' + building.buildingNumber)}</strong><Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800">#{building.buildingNumber}</Badge></div><p className="mt-1 truncate text-xs text-slate-500">{building.campusLocation || building.city || 'لم يحدد الموقع'}</p></button>)}
                  {!officialBuildings.some((building) => building.coverageStatus === 'needs_prayer_room') && <p className="rounded-xl border border-dashed border-emerald-200 bg-white p-4 text-center text-xs text-emerald-700">لا توجد مبانٍ مصنفة حاليًا بأنها تحتاج مصلى.</p>}
                </CardContent>
              </Card>}

              <Card className="overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">المواقع الظاهرة</CardTitle><CardDescription>وصول سريع إلى السجلات الموجودة على الخريطة الحالية.</CardDescription></CardHeader>
                <CardContent className="space-y-2">
                  {mapSites.slice(0, 7).map((site) => <button key={site.id} type="button" onClick={() => setPreviewSite(site)} className="w-full rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-3 text-right transition hover:border-[#d6b46a]"><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-[#0b4a3f]">{site.name}</strong><div className="flex shrink-0 flex-wrap gap-1"><Badge variant="outline" className="border-[#d6b46a]/45 bg-white text-[#7b5b16]">{siteTypeDisplayLabel(site)}</Badge>{hasAttachedWomenPrayerArea(site) && <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">مصلى نساء</Badge>}</div></div><p className="mt-1 truncate text-xs text-slate-500">{site.campusLocation || site.city || '-'}</p></button>)}
                  {!mapSites.length && <p className="rounded-xl border border-dashed border-[#d9c9a5] bg-[#fffdf8] p-4 text-center text-xs text-slate-500">لا توجد مساجد أو مصليات مطابقة للمرشحات الحالية.</p>}
                </CardContent>
              </Card>

              {['head', 'supervisor'].includes(role) && <Card className="overflow-hidden rounded-[22px] border border-[#ded3b8] bg-[#fffdf8] shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">تغطية المباني</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">نسبة التغطية</span><span className="text-xl font-black text-[#0b4a3f]">{buildingCoveragePercent}%</span></div>
                  <Progress value={buildingCoveragePercent} className="h-2.5" />
                  <Button variant="outline" className="w-full border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => setActiveTab('buildings')}><Building2 className="ml-2 h-4 w-4" />فتح سجل التغطية</Button>
                </CardContent>
              </Card>}
            </aside>
          </section>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <MosqueReportsCenter
            sites={sites}
            buildings={officialBuildings}
            requests={requests}
            tickets={tickets}
            leaves={leaves}
            jobs={jobs}
            personnel={personnel}
            quranInventoryItems={quranInventoryItems}
            quranStockDashboard={quranStockDashboard}
            canPrint={canPrint}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">الكوادر التشغيلية</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Users className="h-5 w-5" />منسوبو المساجد والمصليات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">سجل موحد للأئمة والمؤذنين والخطباء والخطباء المتعاونين، مرتبط بالموقع والحساب التشغيلي وطلبات الإجازة والاعتذار.</CardDescription>
                </div>
                {canCreateUser && ['head', 'supervisor'].includes(role) && <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => openPersonnelDialog()}><UserPlus className="ml-2 h-4 w-4" />إضافة منسوب</Button>}
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PersonnelMetric label="إجمالي المنسوبين" value={personnel.length} icon={Users} />
                <PersonnelMetric label="السجلات النشطة" value={personnel.filter((item) => item.active).length} icon={CheckCircle2} />
                <PersonnelMetric label="حسابات دخول مرتبطة" value={personnel.filter((item) => Boolean(item.userId)).length} icon={Shield} />
                <PersonnelMetric label="إجازات / اعتذارات معلقة" value={leaves.filter((item) => ['pending', 'under_review'].includes(item.status)).length} icon={CalendarDays} />
              </div>

              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">البحث والتصفية</p><p className="mt-1 text-xs text-slate-500">ابحث بالاسم أو الجوال أو البريد أو المسجد، ثم صفِّ حسب الصفة والحالة.</p></div>
                  <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{filteredPersonnel.length} نتيجة</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_210px_180px_auto]">
                  <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-11 border-[#d9c9a5] bg-white pr-9" value={personnelSearch} onChange={(e) => setPersonnelSearch(e.target.value)} placeholder="الاسم، الجوال، البريد، المسجد / المصلى..." /></div>
                  <NativeSelect className="h-11 bg-white" value={personnelRoleFilter} onChange={(e) => setPersonnelRoleFilter(e.target.value)}><option value="all">جميع الصفات</option><option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option></NativeSelect>
                  <NativeSelect className="h-11 bg-white" value={personnelStatusFilter} onChange={(e) => setPersonnelStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="inactive">غير نشط</option></NativeSelect>
                  <Button variant="outline" className="h-11 border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => { setPersonnelSearch(''); setPersonnelRoleFilter('all'); setPersonnelStatusFilter('all'); }}><X className="ml-1 h-4 w-4" />مسح</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-black text-[#0b4a3f]">الملفات التشغيلية</p><p className="mt-1 text-xs text-slate-500">كل بطاقة مرتبطة مباشرة بالمسجد أو المصلى وحالة الحساب والتواصل.</p></div>
                {isAdmin && <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => setActiveTab('roles')}><Shield className="ml-2 h-4 w-4" />إدارة الأدوار والربط</Button>}
              </div>

              <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredPersonnel.map((item) => {
                  const site = sites.find((row) => row.id === item.siteId);
                  const media = normalizeSiteMedia(site?.images || null);
                  const cover = media.photos.find((photo) => photo.category === 'mosque_image') || media.photos[0];
                  const personnelLeaves = leaves.filter((leave) => leave.personnelId === item.id);
                  const pendingLeaves = personnelLeaves.filter((leave) => ['pending', 'under_review'].includes(leave.status)).length;
                  const initials = item.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

                  return <Card key={item.id} className="group overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-[0_9px_26px_rgba(6,60,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_14px_30px_rgba(6,60,51,0.10)]">
                    <div className="relative h-24 overflow-hidden bg-[#f2ecdf]">
                      {cover ? <MosqueMediaImage item={cover} alt={cover.fileName || site?.name || item.name} className="h-full w-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,#fff8e8,#e9e0cf)]" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#073f35]/80 via-[#073f35]/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-2 flex items-end justify-between gap-3 px-4">
                        <div className="min-w-0 text-white"><p className="truncate text-xs font-bold text-emerald-50/85">{site?.name || item.site?.name || 'بدون موقع محدد'}</p><p className="mt-0.5 text-[10px] text-white/70">{site ? siteTypeDisplayLabel(site) : 'موقع تشغيلي'}</p></div>
                        <Badge variant="outline" className={item.active ? 'border-emerald-200/60 bg-emerald-50/90 text-emerald-800' : 'border-white/40 bg-white/85 text-slate-600'}>{item.active ? 'نشط' : 'غير نشط'}</Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/55 bg-[#fff8e8] text-base font-black text-[#0b4a3f] shadow-sm">{initials || 'م'}</div>
                        <div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black text-[#0b4a3f]">{item.name}</h3><div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline" className="border-[#d6b46a]/45 bg-[#fffdf8] text-[#7b5b16]">{personnelRoleLabels[item.role] || item.role}</Badge>{item.userId ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">حساب مرتبط</Badge> : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">بدون حساب</Badge>}</div></div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">الجوال</p><p dir="ltr" className="mt-1 truncate text-right text-xs font-black text-slate-700">{item.mobile || '-'}</p></div>
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">البريد</p><p dir="ltr" className="mt-1 truncate text-right text-xs font-black text-slate-700">{item.email || '-'}</p></div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-xl border border-[#e4d8bd] bg-white p-2.5"><p className="text-[10px] font-bold text-slate-500">إجمالي الإجازات</p><p className="mt-1 text-lg font-black text-[#0b4a3f]">{personnelLeaves.length}</p></div>
                        <div className={`rounded-xl border p-2.5 ${pendingLeaves > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/55'}`}><p className="text-[10px] font-bold text-slate-500">قيد المراجعة</p><p className={`mt-1 text-lg font-black ${pendingLeaves > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{pendingLeaves}</p></div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee5d2] pt-4">
                        <Button size="sm" className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => setViewingPersonnel(item)}><Eye className="ml-1 h-3.5 w-3.5" />فتح الملف</Button>
                        {canEdit && ['head', 'supervisor'].includes(role) && <Button variant="outline" size="sm" className="border-[#d6b46a] bg-[#fff8e8] text-[#7b5b16]" onClick={() => openPersonnelDialog(item)}><Pencil className="ml-1 h-3.5 w-3.5" />تعديل</Button>}
                        {canDelete && role === 'head' && <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deletePersonnel(item)}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</Button>}
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>
              {!filteredPersonnel.length && <Empty text="لا يوجد منسوبون مطابقون للبحث والتصفية" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">التحكم بالوصول</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Shield className="h-5 w-5" />الأدوار التشغيلية وربط الحسابات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">إدارة نطاق وصول حسابات الوحدة وربط منسوبي المساجد والمصليات بالموقع والصفة التشغيلية من شاشة واحدة.</CardDescription>
                </div>
                <div className="rounded-2xl border border-[#d6b46a]/45 bg-[#0b4a3f] px-4 py-3 text-white">
                  <p className="text-[10px] font-bold text-[#efd18a]">إدارة هذه الشاشة</p>
                  <p className="mt-1 text-sm font-black">متاحة لمسؤول النظام فقط</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <RoleMetric label="الحسابات المتاحة" value={staffUsers.length} icon={Users} />
                <RoleMetric label="الحسابات النشطة" value={staffUsers.filter((user) => user.isActive).length} icon={CheckCircle2} />
                <RoleMetric label="روابط تشغيلية محفوظة" value={assignments.length} icon={Shield} />
                <RoleMetric label="منسوبون مرتبطون بموقع" value={assignments.filter((item) => item.role === 'personnel' && Boolean(item.siteId)).length} icon={MapPin} />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <RoleDefinitionCard title="رئيس الوحدة" description="إدارة كاملة للوحدة والاعتمادات والمتابعة الشاملة." count={assignments.filter((item) => item.role === 'head').length} icon={Shield} />
                <RoleDefinitionCard title="مشرف الوحدة" description="إشراف تشغيلي ومتابعة الأعمال وفق الصلاحيات الممنوحة." count={assignments.filter((item) => item.role === 'supervisor').length} icon={ClipboardList} />
                <RoleDefinitionCard title="منسوب المسجد / المصلى" description="وصول مقيد بالموقع المرتبط وصفة إمام أو مؤذن أو خطيب." count={assignments.filter((item) => item.role === 'personnel').length} icon={Users} />
                <RoleDefinitionCard title="منسوب الجامعة" description="وصول خدمات عام دون ارتباط تشغيلي بمسجد أو مصلى." count={assignments.filter((item) => ['university_member', 'viewer'].includes(item.role)).length} icon={Building2} />
              </div>

              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">البحث والتصفية</p><p className="mt-1 text-xs text-slate-500">ابحث باسم المستخدم أو البريد أو الموقع، ثم صفِّ حسب الدور الحالي.</p></div>
                  <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{filteredStaffUsers.length} حساب</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
                  <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-11 border-[#d9c9a5] bg-white pr-9" value={roleUserSearch} onChange={(e) => setRoleUserSearch(e.target.value)} placeholder="اسم المستخدم، البريد، المسجد / المصلى..." /></div>
                  <NativeSelect className="h-11 bg-white" value={roleUserFilter} onChange={(e) => setRoleUserFilter(e.target.value as 'all' | MosqueModuleRole)}><option value="all">جميع الأدوار</option><option value="head">رئيس الوحدة</option><option value="supervisor">مشرف الوحدة</option><option value="personnel">منسوب المسجد أو المصلى</option><option value="university_member">منسوب الجامعة</option></NativeSelect>
                  <Button variant="outline" className="h-11 border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => { setRoleUserSearch(''); setRoleUserFilter('all'); }}><X className="ml-1 h-4 w-4" />مسح</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-black text-[#0b4a3f]">الحسابات ونطاقات الوصول</p><p className="mt-1 text-xs text-slate-500">أي تغيير لا يُحفظ إلا عند الضغط على «حفظ الربط» داخل بطاقة الحساب.</p></div>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">تأكد من الموقع والصفة قبل حفظ دور «منسوب المسجد أو المصلى»</Badge>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {filteredStaffUsers.map((user) => {
                  const current = assignments.find((item) => item.userId === user.uid);
                  const baseRole = current?.role || (user.moduleRole === 'viewer' ? 'university_member' : user.moduleRole) || 'university_member';
                  const draft = assignmentDrafts[user.uid] || { role: baseRole, siteId: current?.siteId || user.siteId || '', personnelRole: current?.personnelRole || user.personnelRole || 'imam' };
                  const currentSite = current?.site?.name || sites.find((site) => site.id === (current?.siteId || user.siteId))?.name || '';
                  const initials = user.username.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
                  const changed = draft.role !== baseRole
                    || (draft.role === 'personnel' && ((draft.siteId || '') !== (current?.siteId || user.siteId || '') || (draft.personnelRole || 'imam') !== (current?.personnelRole || user.personnelRole || 'imam')));

                  return <Card key={user.uid} className="overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-[0_8px_24px_rgba(6,60,51,0.06)]">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/55 bg-[#fff8e8] text-base font-black text-[#0b4a3f]">{initials || 'م'}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-black text-[#0b4a3f]">{user.username}</h3><Badge variant="outline" className={user.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600'}>{user.isActive ? 'حساب نشط' : 'حساب غير نشط'}</Badge></div>
                          <p dir="ltr" className="mt-1 truncate text-right text-xs text-slate-500">{user.email}</p>
                        </div>
                        {changed && <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-800">تغييرات غير محفوظة</Badge>}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">الدور الحالي</p><p className="mt-1 text-xs font-black text-[#0b4a3f]">{roleLabels[baseRole]}</p></div>
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">نطاق الوصول</p><p className="mt-1 text-xs font-black text-[#0b4a3f]">{roleScopeLabel(baseRole)}</p></div>
                        <div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-2.5"><p className="text-[10px] font-bold text-slate-500">الموقع المرتبط</p><p className="mt-1 truncate text-xs font-black text-[#0b4a3f]">{baseRole === 'personnel' ? (currentSite || 'غير محدد') : 'لا يتطلب موقعًا'}</p></div>
                      </div>

                      <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                        <div className="mb-3 flex items-center justify-between gap-2"><p className="font-black text-[#0b4a3f]">تعديل الربط</p><Badge variant="outline" className="border-[#d6b46a]/45 bg-white text-[#7b5b16]">{roleLabels[draft.role]}</Badge></div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="الدور داخل الوحدة">
                            <NativeSelect className="h-11 bg-white" value={draft.role} onChange={(e) => {
                              const nextRole = e.target.value as MosqueModuleRole;
                              setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, role: nextRole, siteId: nextRole === 'personnel' ? draft.siteId : '', personnelRole: nextRole === 'personnel' ? draft.personnelRole : 'imam' } }));
                            }}>
                              <option value="university_member">منسوب الجامعة</option><option value="personnel">منسوب المسجد أو المصلى</option><option value="supervisor">مشرف الوحدة</option><option value="head">رئيس الوحدة</option>
                            </NativeSelect>
                          </Field>
                          <Field label="المسجد / المصلى">
                            <NativeSelect className="h-11 bg-white" value={draft.siteId} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, siteId: e.target.value } }))} disabled={draft.role !== 'personnel'}>
                              <option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                            </NativeSelect>
                          </Field>
                          <Field label="الصفة التشغيلية">
                            <NativeSelect className="h-11 bg-white" value={draft.personnelRole} onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [user.uid]: { ...draft, personnelRole: e.target.value } }))} disabled={draft.role !== 'personnel'}>
                              <option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option>
                            </NativeSelect>
                          </Field>
                          <div className="flex items-end"><Button className="h-11 w-full border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" disabled={draft.role === 'personnel' && !draft.siteId} onClick={() => setUserAssignment(user.uid, draft.role, draft.siteId, draft.personnelRole)}><Save className="ml-2 h-4 w-4" />حفظ الربط</Button></div>
                        </div>
                        {draft.role === 'personnel' && !draft.siteId && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">يجب تحديد المسجد أو المصلى قبل حفظ هذا الدور.</div>}
                        {draft.role === 'personnel' && draft.siteId && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800"><MapPin className="h-3.5 w-3.5" /><strong>{sites.find((site) => site.id === draft.siteId)?.name || 'الموقع المحدد'}</strong><span>•</span><span>{personnelRoleLabels[draft.personnelRole] || draft.personnelRole}</span></div>}
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>

              {!filteredStaffUsers.length && <Empty text="لا توجد حسابات مطابقة للبحث والتصفية" />}

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-7 text-amber-900">
                <div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" /><div><strong>تنبيه صلاحيات:</strong> تغيير الدور هنا يغير نطاق وصول الحساب داخل وحدة المساجد. ربط «منسوب المسجد أو المصلى» يتطلب تحديد الموقع والصفة التشغيلية، بينما أدوار رئيس الوحدة والمشرف ومنسوب الجامعة لا تحتاج ربطًا بموقع محدد.</div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
            <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8] pb-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">مركز التنبيهات</Badge>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><Bell className="h-5 w-5" />الإشعارات والتنبيهات</CardTitle>
                  <CardDescription className="mt-1 max-w-3xl leading-6">متابعة الإشعارات غير المقروءة وربطها بالطلبات والبلاغات والمواقع والمصاحف، مع انتقال مباشر إلى السجل المرتبط عند توفره.</CardDescription>
                </div>
                <Button variant="outline" className="border-[#d6b46a] bg-[#fff8e8] font-bold text-[#7b5b16]" disabled={!notifications.some((notice) => !notice.isRead)} onClick={() => void markAllNotificationsRead()}><CheckCircle2 className="ml-2 h-4 w-4" />تحديد الكل كمقروء</Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NotificationMetric label="إجمالي الإشعارات" value={notifications.length} icon={Bell} />
                <NotificationMetric label="غير مقروء" value={notifications.filter((notice) => !notice.isRead).length} icon={AlertTriangle} tone="warning" />
                <NotificationMetric label="إشعارات اليوم" value={notifications.filter((notice) => new Date(notice.createdAt).toDateString() === new Date().toDateString()).length} icon={CalendarDays} />
                <NotificationMetric label="مرتبطة بمعاملة / موقع" value={notifications.filter((notice) => Boolean(notice.entityType || notice.entityId)).length} icon={ExternalLink} />
              </div>

              <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-black text-[#0b4a3f]">البحث والتصفية</p><p className="mt-1 text-xs text-slate-500">صفِّ الإشعارات حسب حالة القراءة أو نوع السجل المرتبط.</p></div>
                  <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{filteredNotifications.length} إشعار</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_190px_230px_auto]">
                  <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" /><Input className="h-11 border-[#d9c9a5] bg-white pr-9" value={notificationSearch} onChange={(e) => setNotificationSearch(e.target.value)} placeholder="بحث في عنوان الإشعار أو محتواه..." /></div>
                  <NativeSelect className="h-11 bg-white" value={notificationReadFilter} onChange={(e) => setNotificationReadFilter(e.target.value as 'all' | 'unread' | 'read')}><option value="all">الكل</option><option value="unread">غير مقروء</option><option value="read">مقروء</option></NativeSelect>
                  <NativeSelect className="h-11 bg-white" value={notificationTypeFilter} onChange={(e) => setNotificationTypeFilter(e.target.value as 'all' | 'request' | 'ticket' | 'site' | 'leave' | 'quran' | 'other')}><option value="all">جميع الأنواع</option><option value="request">طلبات الصيانة والاحتياج</option><option value="ticket">البلاغات</option><option value="site">المساجد والمصليات</option><option value="leave">الإجازات والاعتذارات</option><option value="quran">المصاحف</option><option value="other">إشعارات عامة</option></NativeSelect>
                  <Button variant="outline" className="h-11 border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => { setNotificationSearch(''); setNotificationReadFilter('all'); setNotificationTypeFilter('all'); }}><X className="ml-1 h-4 w-4" />مسح</Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-black text-[#0b4a3f]">سجل الإشعارات</p><p className="mt-1 text-xs text-slate-500">الإشعارات الأحدث تظهر أولًا، والبطاقة غير المقروءة مميزة بصريًا.</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant={notificationReadFilter === 'unread' ? 'default' : 'outline'} className={notificationReadFilter === 'unread' ? 'border border-[#0b4a3f] bg-[#0b4a3f] text-white' : 'border-[#d9c9a5] bg-white text-[#0b4a3f]'} onClick={() => setNotificationReadFilter(notificationReadFilter === 'unread' ? 'all' : 'unread')}><Bell className="ml-1 h-3.5 w-3.5" />غير المقروء فقط</Button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredNotifications.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((notice) => {
                  const category = notificationCategory(notice);
                  const urgent = /عاجل|urgent|طارئ/i.test(`${notice.title} ${notice.message}`);
                  const targetAvailable = Boolean(notice.entityType || notice.entityId) && category !== 'other';
                  const categoryIcon = category === 'request' ? <Wrench className="h-4 w-4" /> : category === 'ticket' ? <MessageSquare className="h-4 w-4" /> : category === 'site' ? <Building2 className="h-4 w-4" /> : category === 'leave' ? <CalendarDays className="h-4 w-4" /> : category === 'quran' ? <BookOpen className="h-4 w-4" /> : <Bell className="h-4 w-4" />;

                  return <div key={notice.id} className={`relative overflow-hidden rounded-[20px] border p-4 transition-all ${notice.isRead ? 'border-[#e2d4b4] bg-white' : 'border-[#d6b46a] bg-[#fffaf0] shadow-[0_8px_22px_rgba(6,60,51,0.07)]'}`}>
                    {!notice.isRead && <span className="absolute bottom-0 right-0 top-0 w-1.5 bg-[#0b5a49]" />}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${notice.isRead ? 'border-[#e2d4b4] bg-[#fffdf8] text-[#0b5a49]' : 'border-[#d6b46a]/55 bg-[#0b4a3f] text-[#f0d18b]'}`}>{categoryIcon}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-[#0b4a3f]">{notice.title}</h3>
                            <Badge variant="outline" className="border-[#d6b46a]/45 bg-white text-[#7b5b16]">{notificationCategoryLabel[category]}</Badge>
                            {urgent && <Badge className="bg-red-600 text-white">عاجل</Badge>}
                            {!notice.isRead && <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">جديد</Badge>}
                          </div>
                          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">{notice.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(notice.createdAt).toLocaleString('ar-SA')}</span>
                            {notice.entityType && <span>النوع المرجعي: {notice.entityType}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!notice.isRead && <Button size="sm" variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={async () => { try { await mosqueApi.readNotification(notice.id); setNotifications((current) => current.map((item) => item.id === notice.id ? { ...item, isRead: true } : item)); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الإشعار'); } }}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />مقروء</Button>}
                        {targetAvailable && <Button size="sm" className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => void openNotificationTarget(notice)}><ExternalLink className="ml-1 h-3.5 w-3.5" />فتح السجل</Button>}
                      </div>
                    </div>
                  </div>;
                })}
              </div>

              {!filteredNotifications.length && <Empty text="لا توجد إشعارات مطابقة للبحث والتصفية" />}
            </CardContent>
          </Card>
        </TabsContent>
          </main>
        </div>
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

      <BuildingCoverageReportsDialog
        open={buildingCoverageReportOpen}
        onOpenChange={setBuildingCoverageReportOpen}
        buildings={officialBuildings}
        canPrint={canPrint}
      />

      <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="text-right"><DialogTitle>ملف خدمة الصلاة للمبنى</DialogTitle><DialogDescription>بيانات تعريف المبنى مصدرها السجل المركزي ولا تعدل من وحدة العناية. هنا يتم تحديث بيانات التغطية والاحتياج فقط.</DialogDescription></DialogHeader>
          {editingBuilding && <div className="space-y-4 py-3">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-sky-950">البيانات المركزية للمبنى — للقراءة فقط</p><p className="mt-1 text-xs text-sky-800">أي تعديل على رقم المبنى أو مسماه أو موقعه أو إحداثياته يتم من السجل المركزي لينعكس على جميع الوحدات.</p></div><Button type="button" variant="outline" className={button3d} onClick={() => navigate('/buildings/registry')}><Building2 className="ml-2 h-4 w-4" />فتح السجل المركزي</Button></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Info label="رقم المبنى" value={editingBuilding.buildingNumber} />
                <Info label="اسم المبنى" value={editingBuilding.name || '-'} />
                <Info label="الحرم / الموقع" value={editingBuilding.campusLocation || '-'} />
                <Info label="المدينة" value={editingBuilding.city || '-'} />
                <Info label="الحي" value={editingBuilding.district || '-'} />
                <Info label="الإحداثيات" value={editingBuilding.latitude != null && editingBuilding.longitude != null ? `${editingBuilding.latitude}, ${editingBuilding.longitude}` : '-'} />
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div><p className="font-black text-emerald-950">التحقق من وجود المصليات</p><p className="mt-1 text-xs leading-6 text-emerald-800">وجود المصلى يثبت من سجل مصلى فعلي مرتبط بالمبنى. عدم وجود سجل لا يعد إثباتًا للغياب قبل تقييم المبنى.</p></div>
                {!editingBuilding.sites?.some((site) => site.siteType === 'prayer_room' && site.status !== 'temporarily_closed') && <Button type="button" variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={saving} onClick={() => void confirmNoPrayerRoomInBuilding(editingBuilding)}><AlertTriangle className="ml-2 h-4 w-4" />تسجيل: لا يوجد مصلى في المبنى</Button>}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(['men', 'women'] as const).map((gender) => { const presence = buildingPrayerRoomPresence(editingBuilding, gender); return <div key={gender} className={'rounded-xl border p-3 text-center text-sm font-bold ' + prayerRoomPresenceClass(presence)}>مصلى {gender === 'men' ? 'رجال' : 'نساء'}: {buildingPrayerRoomPresenceLabels[presence]}</div>; })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عدد المستفيدين المتوقع لخدمة الصلاة"><Input type="number" min="0" value={buildingForm.expectedUsers} onChange={(e) => setBuildingForm({ ...buildingForm, expectedUsers: e.target.value })} /></Field>
              <Field label="حالة التغطية"><NativeSelect value={buildingForm.coverageStatus} onChange={(e) => setBuildingForm({ ...buildingForm, coverageStatus: e.target.value })}><option value="unassessed">لم يتم التقييم</option><option value="covered">مغطى بخدمة الصلاة</option><option value="needs_prayer_room">يحتاج مصلى</option><option value="under_feasibility_study">قيد دراسة إمكانية الإنشاء</option><option value="under_implementation">مصلى تحت التنفيذ</option><option value="not_feasible_alternative">تعذر الإنشاء / بديل معتمد</option></NativeSelect></Field>
              <Field label="إمكانية إنشاء مصلى"><NativeSelect value={buildingForm.creationFeasibility} onChange={(e) => setBuildingForm({ ...buildingForm, creationFeasibility: e.target.value })}><option value="under_study">قيد الدراسة</option><option value="available">متاح إنشاء مصلى</option><option value="unavailable">غير متاح إنشاء مصلى</option></NativeSelect></Field>
              {buildingForm.creationFeasibility === 'unavailable' && <Field label="سبب عدم إمكانية الإنشاء *"><Textarea rows={3} value={buildingForm.unavailableReason} onChange={(e) => setBuildingForm({ ...buildingForm, unavailableReason: e.target.value })} placeholder="عدم توفر مساحة، اشتراطات السلامة، طبيعة المبنى..." /></Field>}
              <div className="md:col-span-2"><Field label="البديل المعتمد"><Textarea rows={3} value={buildingForm.approvedAlternative} onChange={(e) => setBuildingForm({ ...buildingForm, approvedAlternative: e.target.value })} placeholder="ربط بأقرب مصلى، مساحة متعددة الاستخدام، لوحات إرشادية..." /></Field></div>
            </div>
            {editingBuilding.notes && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm"><strong>ملاحظات السجل المركزي:</strong><p className="mt-1 whitespace-pre-wrap text-slate-600">{editingBuilding.notes}</p></div>}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>إلغاء</Button><Button className={button3d} disabled={saving || !editingBuilding} onClick={saveBuilding}>{saving ? 'جاري الحفظ...' : 'حفظ ملف خدمة الصلاة'}</Button></DialogFooter>
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
                <Field label="النوع">
                  {siteForm.spatialRelation === 'inside_building'
                    ? <div className="space-y-1"><Input className="h-11 bg-emerald-50 font-bold text-emerald-800" readOnly value="مصلى" /><p className="text-[11px] leading-5 text-emerald-700">داخل المباني الجامعية يسمح بتسجيل المصليات فقط، ولا يمكن إنشاء مسجد أو جامع داخل المبنى.</p></div>
                    : <NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => {
                      const nextType = e.target.value;
                      setSiteForm({
                        ...siteForm,
                        siteType: nextType,
                        prayerRoomGender: nextType === 'prayer_room' ? siteForm.prayerRoomGender : '',
                        hasWomenPrayerArea: ['mosque', 'jami'].includes(nextType) ? Boolean(siteForm.hasWomenPrayerArea) : false,
                        womenPrayerArea: ['mosque', 'jami'].includes(nextType) ? siteForm.womenPrayerArea : emptyWomenPrayerArea(),
                      });
                    }}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect>}
                </Field>
                {siteForm.siteType === 'prayer_room' && <Field label="فئة المصلى *"><NativeSelect className="h-11" value={siteForm.prayerRoomGender || ''} onChange={(e) => setSiteForm({ ...siteForm, prayerRoomGender: e.target.value })}><option value="">اختر الفئة</option><option value="men">رجال</option><option value="women">نساء</option></NativeSelect></Field>}
                <Field label="الارتباط المكاني *"><NativeSelect className="h-11" value={siteForm.spatialRelation || 'independent'} onChange={(e) => {
                  const insideBuilding = e.target.value === 'inside_building';
                  setSiteForm({
                    ...siteForm,
                    spatialRelation: e.target.value,
                    siteType: insideBuilding ? 'prayer_room' : siteForm.siteType,
                    prayerRoomGender: insideBuilding ? siteForm.prayerRoomGender : siteForm.prayerRoomGender,
                    buildingId: insideBuilding ? siteForm.buildingId : '',
                    floor: insideBuilding ? siteForm.floor : '',
                    roomNumber: insideBuilding ? siteForm.roomNumber : '',
                  });
                }}><option value="independent">موقع مستقل</option><option value="inside_building">داخل مبنى جامعي — مصلى فقط</option></NativeSelect></Field>
                {siteForm.spatialRelation === 'inside_building' && <>
                  <Field label="رقم المبنى * — من السجل المركزي"><NativeSelect className="h-11" value={siteForm.buildingId || ''} onChange={(e) => setSiteForm({ ...siteForm, buildingId: e.target.value })}><option value="">اختر المبنى المعتمد</option>{officialBuildings.map((building) => <option key={building.id} value={building.id}>{building.buildingNumber}{building.name ? (' — ' + building.name) : ''}</option>)}</NativeSelect></Field>
                  <Field label="الدور"><Input className="h-11" value={siteForm.floor || ''} onChange={(e) => setSiteForm({ ...siteForm, floor: e.target.value })} placeholder="مثال: الأرضي" /></Field>
                  <Field label="رقم الغرفة / الموقع الداخلي"><Input className="h-11" value={siteForm.roomNumber || ''} onChange={(e) => setSiteForm({ ...siteForm, roomNumber: e.target.value })} placeholder="مثال: 012 أو الجناح الشرقي" /></Field>
                </>}
                {siteForm.spatialRelation === 'inside_building' && selectedSiteBuilding && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-3"><div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">المبنى الجامعي يرتبط بمصلى رجال و/أو مصلى نساء فقط. المسجد والجامع يسجلان كموقع مستقل.</div><div className="flex flex-wrap items-center gap-2 text-sm"><b>المبنى {selectedSiteBuilding.buildingNumber}</b><Badge variant="outline" className={prayerRoomPresenceClass(selectedBuildingMenPresence)}>مصلى رجال: {buildingPrayerRoomPresenceLabels[selectedBuildingMenPresence]}</Badge><Badge variant="outline" className={prayerRoomPresenceClass(selectedBuildingWomenPresence)}>مصلى نساء: {buildingPrayerRoomPresenceLabels[selectedBuildingWomenPresence]}</Badge><Badge variant="outline">{buildingFeasibilityLabels[selectedSiteBuilding.creationFeasibility] || selectedSiteBuilding.creationFeasibility}</Badge></div><div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-6 text-amber-900"><strong>إذا لم يوجد مصلى فعليًا:</strong> لا تنشئ موقعًا باسم «لا يوجد مصلى». سجّل النتيجة في ملف خدمة الصلاة للمبنى.</p>{!selectedBuildingHasMen && !selectedBuildingHasWomen && <Button type="button" size="sm" variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" disabled={saving} onClick={() => void confirmNoPrayerRoomInBuilding(selectedSiteBuilding)}><AlertTriangle className="ml-1 h-3.5 w-3.5" />تسجيل: لا يوجد مصلى في المبنى</Button>}</div><p className="mt-2 text-xs text-slate-600">يعرض النظام المواقع المرتبطة بهذا المبنى لتفادي التكرار. المدينة والحي والحرم والإحداثيات تورث تلقائيًا من السجل المركزي ولا تعدل من هنا.</p></div>}{duplicatePrayerRoom && <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-800"><strong>لا يمكن إنشاء سجل مكرر:</strong> يوجد بالفعل مصلى {siteForm.prayerRoomGender === 'men' ? 'رجال' : 'نساء'} في هذا المبنى باسم «{duplicatePrayerRoom.name}». استخدم تعديل السجل الموجود بدل إنشاء مصلى آخر من الفئة نفسها.</div>}
                <Field label="الحالة"><NativeSelect className="h-11" value={siteForm.status} onChange={(e) => setSiteForm({ ...siteForm, status: e.target.value })}><option value="active">نشط</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect></Field>
                <Field label={siteForm.spatialRelation === 'inside_building' ? 'المدينة — موروثة من السجل المركزي' : 'المدينة'}><Input className={`h-11 ${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} /></Field>
                <Field label={siteForm.spatialRelation === 'inside_building' ? 'الحي — موروث من السجل المركزي' : 'الحي'}><Input className={`h-11 ${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.district} onChange={(e) => setSiteForm({ ...siteForm, district: e.target.value })} /></Field>
                <Field label={siteForm.spatialRelation === 'inside_building' ? 'الحرم / الموقع — موروث من السجل المركزي' : 'الموقع داخل الجامعة'}><Input className={`h-11 ${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}`} readOnly={siteForm.spatialRelation === 'inside_building'} value={siteForm.campusLocation} onChange={(e) => setSiteForm({ ...siteForm, campusLocation: e.target.value })} placeholder="الحرم / المبنى / الكلية" /></Field>
                {isAdmin && <Field label="المشرف المسؤول عن الموقع"><NativeSelect className="h-11" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value="">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}
                <Field label="اسم المشرف (يدوي)"><Input className="h-11" value={siteForm.supervisorName} onChange={(e) => setSiteForm({ ...siteForm, supervisorName: e.target.value })} placeholder="اكتب اسم المشرف يدويًا" /><p className="mt-1 text-[11px] leading-5 text-muted-foreground">للتوثيق الاسمي فقط؛ لا ينشئ حسابًا ولا يمنح صلاحيات دخول.</p></Field>
              </CardContent>
            </Card>
            {siteForm.spatialRelation !== 'inside_building' && ['mosque', 'jami'].includes(siteForm.siteType) && <Card className="overflow-hidden border-emerald-200/80 bg-white/95 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-teal-50/60 pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5 text-emerald-700" />مصلى النساء</CardTitle>
                <CardDescription>يسجل مصلى النساء كقسم تابع للمسجد أو الجامع، وتدخل بياناته في الجولات والزيارات والتقارير دون إنشاء موقع مستقل.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700" checked={Boolean(siteForm.hasWomenPrayerArea)} onChange={(e) => setSiteForm((current: any) => ({
                    ...current,
                    hasWomenPrayerArea: e.target.checked,
                    womenPrayerArea: current.womenPrayerArea || emptyWomenPrayerArea(),
                  }))} />
                  <span><span className="block font-black text-emerald-950">يوجد مصلى للنساء داخل {siteForm.siteType === 'jami' ? 'الجامع' : 'المسجد'}</span><span className="mt-1 block text-xs leading-6 text-emerald-800">عند التفعيل تظهر بيانات القسم ويصبح متاحًا كنطاق مستقل في الزيارات الميدانية والتقارير.</span></span>
                </label>
                {siteForm.hasWomenPrayerArea && <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-white p-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="السعة التقريبية"><Input className="h-11" type="number" min="0" step="1" value={siteForm.womenPrayerArea?.capacity ?? ''} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, capacity: e.target.value } }))} placeholder="مثال: 80" /></Field>
                  <Field label="الدور / المستوى"><Input className="h-11" value={siteForm.womenPrayerArea?.floor || ''} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, floor: e.target.value } }))} placeholder="مثال: الدور العلوي" /></Field>
                  <Field label="الحالة"><NativeSelect className="h-11" value={siteForm.womenPrayerArea?.status || 'active'} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, status: e.target.value } }))}><option value="active">مفتوح وجاهز</option><option value="maintenance">تحت الصيانة</option><option value="temporarily_closed">مغلق مؤقتًا</option></NativeSelect></Field>
                  <div className="md:col-span-2 lg:col-span-3"><Field label="وصف موقع مصلى النساء داخل المسجد / الجامع"><Input className="h-11" value={siteForm.womenPrayerArea?.locationDescription || ''} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, locationDescription: e.target.value } }))} placeholder="مثال: الجهة الشمالية — مدخل مستقل بجوار البوابة الشرقية" /></Field></div>
                  {([
                    ['separateEntrance', 'مدخل مستقل'],
                    ['hasAblution', 'مواضئ خاصة بالنساء'],
                    ['hasRestrooms', 'دورات مياه خاصة بالنساء'],
                  ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700"><input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={Boolean(siteForm.womenPrayerArea?.[key])} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, [key]: e.target.checked } }))} />{label}</label>)}
                  <div className="md:col-span-2 lg:col-span-3"><Field label="ملاحظات مصلى النساء"><Textarea rows={3} value={siteForm.womenPrayerArea?.notes || ''} onChange={(e) => setSiteForm((current: any) => ({ ...current, womenPrayerArea: { ...current.womenPrayerArea, notes: e.target.value } }))} placeholder="أي ملاحظات تشغيلية أو تجهيزات خاصة بالقسم..." /></Field></div>
                </div>}
              </CardContent>
            </Card>}
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Building2 className="h-5 w-5" />السعة وبيانات التواصل</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:grid-cols-5">
                <Field label="المساحة م²"><Input className="h-11" type="number" min="0" step="any" inputMode="decimal" value={siteForm.area} onChange={(e) => setSiteForm({ ...siteForm, area: e.target.value })} /></Field>
                <Field label="الطاقة الاستيعابية"><Input className="h-11" type="number" min="0" inputMode="numeric" value={siteForm.capacity} onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })} /></Field>
                <Field label="العدد المستهدف للمصاحف"><Input className="h-11" type="number" min="0" step="1" inputMode="numeric" value={siteForm.quranTargetCount} onChange={(e) => setSiteForm({ ...siteForm, quranTargetCount: e.target.value })} placeholder="مثال: 100" /><p className="mt-1 text-[11px] leading-5 text-muted-foreground">العدد المناسب توفره في الموقع؛ يحسب النظام الاحتياج تلقائيًا من الرصيد الحالي.</p></Field>
                <Field label="اسم المنسق"><Input className="h-11" value={siteForm.coordinatorName} onChange={(e) => setSiteForm({ ...siteForm, coordinatorName: e.target.value })} placeholder="اسم منسق الموقع" /></Field>
                <Field label="رقم التواصل"><Input className="h-11" type="tel" inputMode="tel" value={siteForm.contactPhone} onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })} placeholder="05xxxxxxxx" /></Field>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-blue-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><MapPin className="h-5 w-5" />الموقع الجغرافي</CardTitle><CardDescription>{siteForm.spatialRelation === 'inside_building' ? 'الإحداثيات موروثة تلقائيًا من السجل المركزي للمبنى. لتعديلها حدّث المبنى المركزي.' : 'يمكن إدخال الإحداثيات يدويًا أو التقاط الموقع الحالي من الجهاز.'}</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="خط العرض"><Input className={`h-11 ${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}`} readOnly={siteForm.spatialRelation === 'inside_building'} type="number" step="any" inputMode="decimal" value={siteForm.latitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, latitude: e.target.value }))} placeholder="26.3927" /></Field>
                  <Field label="خط الطول"><Input className={`h-11 ${siteForm.spatialRelation === 'inside_building' ? 'bg-slate-50' : ''}`} readOnly={siteForm.spatialRelation === 'inside_building'} type="number" step="any" inputMode="decimal" value={siteForm.longitude} onChange={(e) => setSiteForm((current: any) => ({ ...current, longitude: e.target.value }))} placeholder="50.0438" /></Field>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button type="button" variant="outline" className={'h-11 ' + button3d} onClick={captureCurrentSiteLocation} disabled={locatingSite || siteForm.spatialRelation === 'inside_building'}>
                    {locatingSite ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <MapPin className="ml-2 h-4 w-4" />}
                    {locatingSite ? 'جاري تحديد الموقع...' : 'تحديد موقعي الحالي'}
                  </Button>
                  <Button type="button" variant="outline" className={'h-11 ' + button3d} onClick={() => setShowSiteMap((current) => !current)} disabled={siteForm.spatialRelation === 'inside_building'}>
                    <MapPin className="ml-2 h-4 w-4" />
                    {showSiteMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
                  </Button>
                  {sitePickerCoordinates && (
                    <div className="flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800" dir="ltr">
                      {sitePickerCoordinates.latitude.toFixed(6)}, {sitePickerCoordinates.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
                {showSiteMap && siteForm.spatialRelation !== 'inside_building' && (
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

      <Dialog open={Boolean(quranWarehousePreview)} onOpenChange={(open) => !open && setQuranWarehousePreview(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-amber-200/80 sm:max-w-[980px]" dir="rtl">
          {quranWarehousePreview && <>
            <DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Eye className="h-5 w-5 text-emerald-700" />معاينة مكتبة المصاحف</DialogTitle><DialogDescription>{quranWarehousePreview.name} — {quranWarehousePreview.code}</DialogDescription></DialogHeader>
            <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="اسم المكتبة" value={quranWarehousePreview.name} /><Info label="الرمز" value={quranWarehousePreview.code} /><Info label="الموقع" value={quranWarehousePreview.location || '-'} /><Info label="الحالة" value={quranWarehousePreview.active ? 'مفعّل' : 'غير مفعّل'} /></div>
              <Card className={quranWarehousePreview.lowStock ? 'border-red-200 bg-red-50/30' : 'border-emerald-200 bg-emerald-50/30'}><CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="text-base">الرصيد الحالي وحدود الأمان</CardTitle>{quranWarehousePreview.lowStock ? <Badge className="bg-red-600">رصيد منخفض</Badge> : <Badge className="bg-emerald-600">الرصيد آمن</Badge>}</div></CardHeader><CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4"><Info label="الإجمالي" value={quranWarehousePreview.balance.totalCount.toLocaleString('ar-SA')} /><Info label={`كبير — حد ${quranWarehousePreview.minLargeCount}`} value={quranWarehousePreview.balance.largeCount.toLocaleString('ar-SA')} /><Info label={`متوسط — حد ${quranWarehousePreview.minMediumCount}`} value={quranWarehousePreview.balance.mediumCount.toLocaleString('ar-SA')} /><Info label={`صغير — حد ${quranWarehousePreview.minSmallCount}`} value={quranWarehousePreview.balance.smallCount.toLocaleString('ar-SA')} /></CardContent></Card>
              {quranWarehousePreview.lowStock && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">الناقص حتى حد الأمان: كبير {quranWarehousePreview.shortage.largeCount} — متوسط {quranWarehousePreview.shortage.mediumCount} — صغير {quranWarehousePreview.shortage.smallCount}</div>}
              <Card><CardHeader className="pb-3"><CardTitle className="text-base">الملاحظات</CardTitle></CardHeader><CardContent className="text-sm leading-7 text-slate-700">{quranWarehousePreview.notes || 'لا توجد ملاحظات مسجلة.'}</CardContent></Card>
              <div><div className="mb-2 flex items-center justify-between"><p className="font-black text-slate-800">آخر حركات هذه المكتبة</p><Badge variant="outline">{(quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === quranWarehousePreview.id).length} حركة ظاهرة</Badge></div><div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-50"><tr><th className="p-3">رقم الحركة</th><th className="p-3">النوع</th><th className="p-3">الموقع المستفيد</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">التاريخ</th></tr></thead><tbody>{(quranStockDashboard?.recentMovements || []).filter((item) => item.warehouseId === quranWarehousePreview.id).slice(0, 15).map((movement) => <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center">{quranStockMovementDisplayLabel(movement)}</td><td className="p-3 text-center">{movement.site?.name || '-'}</td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black">{movement.totalCount}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td></tr>)}{!(quranStockDashboard?.recentMovements || []).some((item) => item.warehouseId === quranWarehousePreview.id) && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد حركات مصاحف ظاهرة لهذه المكتبة.</td></tr>}</tbody></table></div></div>
            </div>
            <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranWarehousePreview(null)}>إغلاق</Button><Button className="border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white" onClick={() => exportQuranWarehouseExcel(quranWarehousePreview)}><FileSpreadsheet className="ml-2 h-4 w-4 text-white" />Excel</Button><Button variant="outline" onClick={() => printQuranWarehouse(quranWarehousePreview)}><Printer className="ml-2 h-4 w-4" />طباعة</Button>{role === 'head' && <Button className="bg-sky-700 hover:bg-sky-600" onClick={() => { const warehouse = quranWarehousePreview; setQuranWarehousePreview(null); openEditQuranWarehouse(warehouse); }}><Pencil className="ml-2 h-4 w-4" />تعديل</Button>}</DialogFooter>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={quranWarehouseDialog} onOpenChange={(open) => { setQuranWarehouseDialog(open); if (!open) setEditingQuranWarehouse(null); }}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-amber-200/80 sm:max-w-[820px]" dir="rtl">
          <DialogHeader className="border-b border-amber-100 bg-gradient-to-l from-amber-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><img src={quranLibrary3dIcon} alt="" aria-hidden="true" className="h-8 w-8 rounded-xl object-cover shadow-[0_4px_10px_rgba(15,23,42,0.22),0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-200/80" />{editingQuranWarehouse ? 'تعديل مكتبة المصاحف' : 'إنشاء مكتبة المصاحف'}</DialogTitle><DialogDescription>{editingQuranWarehouse ? 'تعديل بيانات المكتبة وحدود الأمان وحالة التفعيل دون المساس بسجل حركات المصاحف.' : 'مكتبة المصاحف هي الرصيد الداخلي للوحدة، وتُربط بها إضافات المصاحف للمساجد والمصليات تلقائيًا.'}</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-4 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2"><Field label="اسم المكتبة *"><Input value={quranWarehouseForm.name} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, name: e.target.value })} placeholder="مثال: مكتبة المصاحف" /></Field><Field label="رمز المكتبة"><Input value={quranWarehouseForm.code} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, code: e.target.value })} placeholder="يولد تلقائيًا عند تركه فارغًا" /></Field><div className="md:col-span-2"><Field label="موقع المكتبة"><Input value={quranWarehouseForm.location} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, location: e.target.value })} placeholder="المبنى / الحرم / الغرفة أو الوصف المكاني" /></Field></div><Field label="حالة المكتبة"><NativeSelect value={quranWarehouseForm.active === false ? 'inactive' : 'active'} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, active: e.target.value === 'active' })}><option value="active">مفعّل</option><option value="inactive">غير مفعّل / موقوف</option></NativeSelect></Field></div>
            <Card className="border-amber-200"><CardHeader className="pb-3"><CardTitle className="text-base">حدود التنبيه للرصيد</CardTitle><CardDescription>عندما يقل الرصيد عن هذه الحدود يظهر تنبيه تلقائي بالحاجة إلى إضافة رصيد للمكتبة.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="الحد الأدنى للكبير"><Input type="number" min="0" step="1" value={quranWarehouseForm.minLargeCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minLargeCount: e.target.value })} /></Field><Field label="الحد الأدنى للمتوسط"><Input type="number" min="0" step="1" value={quranWarehouseForm.minMediumCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minMediumCount: e.target.value })} /></Field><Field label="الحد الأدنى للصغير"><Input type="number" min="0" step="1" value={quranWarehouseForm.minSmallCount} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, minSmallCount: e.target.value })} /></Field></CardContent></Card>
            <Field label="ملاحظات"><Textarea rows={3} value={quranWarehouseForm.notes} onChange={(e) => setQuranWarehouseForm({ ...quranWarehouseForm, notes: e.target.value })} /></Field>
          </div>
          <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranWarehouseDialog(false)}>إلغاء</Button><Button className="bg-emerald-700 hover:bg-emerald-600" onClick={saveQuranWarehouse} disabled={quranStockSaving}><Save className="ml-2 h-4 w-4" />{quranStockSaving ? 'جاري الحفظ...' : editingQuranWarehouse ? 'حفظ التعديلات' : 'إنشاء المكتبة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranOpeningBaselineDialog} onOpenChange={(open) => { setQuranOpeningBaselineDialog(open); if (!open) setQuranOpeningBaselineSite(null); }}>
        <DialogContent className="grid h-[90dvh] max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-violet-200/80 bg-gradient-to-br from-white via-violet-50/25 to-emerald-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-violet-100 bg-gradient-to-l from-violet-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><ClipboardList className="h-5 w-5 text-violet-700" />الجرد التأسيسي للمصاحف</DialogTitle><DialogDescription>{quranOpeningBaselineSite?.name || ''} — تسجيل الرصيد الموجود فعليًا قبل بدء العمل بالنظام. هذه العملية لا تخصم من مكتبة المصاحف.</DialogDescription></DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto p-5 md:p-6">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-900"><strong>نقطة البداية:</strong> احصر المصاحف الموجودة ميدانيًا في هذا المسجد أو المصلى ثم أدخلها هنا. بعد إقفال الجرد التأسيسي، أي مصحف جديد يضاف للموقع يجب أن يأتي من «مكتبة المصاحف» ويخصم منها تلقائيًا.</div>
            <Card className="border-violet-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">الرصيد الافتتاحي حسب الحجم</CardTitle><CardDescription>أدخل العدد الفعلي الموجود وقت الزيارة الميدانية.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranOpeningBaselineForm.largeCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranOpeningBaselineForm.mediumCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranOpeningBaselineForm.smallCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-2"><Field label="مصاحف يوصى بسحبها"><Input type="number" min="0" step="1" inputMode="numeric" value={quranOpeningBaselineForm.recommendedWithdrawalCount} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, recommendedWithdrawalCount: e.target.value })} /><p className="mt-1 text-[11px] leading-5 text-muted-foreground">توصية ميدانية فقط؛ لا تعتبر المصاحف مسحوبة حتى تنفيذ إجراء «سحب مصاحف» فعليًا.</p></Field><Field label="تاريخ الحصر الميداني"><Input type="date" value={quranOpeningBaselineForm.countedAt} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, countedAt: e.target.value })} /></Field></div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:grid-cols-4"><Info label="الإجمالي" value={(Number(quranOpeningBaselineForm.largeCount || 0) + Number(quranOpeningBaselineForm.mediumCount || 0) + Number(quranOpeningBaselineForm.smallCount || 0)).toLocaleString('ar-SA')} /><Info label="الكبيرة" value={Number(quranOpeningBaselineForm.largeCount || 0).toLocaleString('ar-SA')} /><Info label="المتوسطة" value={Number(quranOpeningBaselineForm.mediumCount || 0).toLocaleString('ar-SA')} /><Info label="الصغيرة" value={Number(quranOpeningBaselineForm.smallCount || 0).toLocaleString('ar-SA')} /></div>
            <Field label="ملاحظات الحصر"><Textarea rows={4} value={quranOpeningBaselineForm.notes} onChange={(e) => setQuranOpeningBaselineForm({ ...quranOpeningBaselineForm, notes: e.target.value })} placeholder="مثال: بعض المصاحف قديمة ويوصى بسحبها، موقع المصاحف داخل المسجد، ملاحظات الزيارة..." /></Field>
          </div>
          <DialogFooter className="relative z-20 shrink-0 border-t border-violet-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:px-6"><Button variant="outline" className={button3d} onClick={() => setQuranOpeningBaselineDialog(false)}>إلغاء</Button><Button className={`${button3d} min-w-40 bg-violet-700 hover:bg-violet-600`} onClick={saveQuranOpeningBaseline} disabled={quranStockSaving}><Save className="ml-2 h-4 w-4" />{quranStockSaving ? 'جاري الحفظ...' : 'حفظ الرصيد الافتتاحي'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranStockMovementDialog} onOpenChange={(open) => { setQuranStockMovementDialog(open); if (!open) setQuranStockContextSiteId(null); }}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-emerald-200/80 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />{quranStockMovementForm.movementType === 'site_withdrawal' ? 'سحب مصاحف من المسجد / المصلى' : 'حركة مصاحف المكتبة'}</DialogTitle><DialogDescription>{quranStockMovementForm.movementType === 'site_withdrawal' ? 'السحب يخصم المصاحف من الرصيد النظامي للموقع ويسجل سبب السحب وتاريخه. المصاحف المسحوبة لا تعاد تلقائيًا إلى رصيد المكتبة المتاح.' : 'إضافة الرصيد تزيد رصيد المكتبة، وإضافة المصاحف للموقع تخصمها تلقائيًا من المكتبة، والإرجاع يعيد الكمية إلى المكتبة. لا يتم تعديل الرصيد يدويًا خارج سجل الحركات.'}</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-2"><Field label="نوع الحركة *"><NativeSelect disabled={Boolean(quranStockContextSiteId)} value={quranStockMovementForm.movementType} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementType: e.target.value, siteId: ['distribution', 'return', 'site_withdrawal'].includes(e.target.value) ? (quranStockMovementForm.siteId || sites[0]?.id || '') : '' })}>{Object.entries(quranStockMovementTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect>{quranStockContextSiteId && <p className="mt-1.5 text-[11px] text-slate-500">تم تحديد نوع الحركة تلقائيًا من الإجراء الذي اخترته.</p>}</Field><Field label="المكتبة *"><NativeSelect value={quranStockMovementForm.warehouseId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, warehouseId: e.target.value })}><option value="">اختر المكتبة</option>{quranStockDashboard?.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} — رصيد {warehouse.balance.totalCount}</option>)}</NativeSelect></Field>{['distribution', 'return', 'site_withdrawal'].includes(quranStockMovementForm.movementType) && <div className="md:col-span-2">{quranStockContextSiteId ? (() => { const selectedSite = sites.find((site) => site.id === quranStockMovementForm.siteId); return <Field label="المسجد / المصلى المستهدف"><div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-emerald-950">{selectedSite?.name || 'الموقع المحدد'}</p><p className="mt-1 text-xs text-emerald-800">{selectedSite ? siteTypeDisplayLabel(selectedSite) : 'مسجد / مصلى'} — تم تحديده تلقائيًا من البطاقة</p></div><Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">محدد مسبقًا</Badge></div></div></Field>; })() : <Field label="المسجد / المصلى *"><NativeSelect value={quranStockMovementForm.siteId} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} — {siteTypeDisplayLabel(site)}</option>)}</NativeSelect></Field>}</div>}</div>
            {quranStockDashboard?.warehouses.find((warehouse) => warehouse.id === quranStockMovementForm.warehouseId) && <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs font-bold text-emerald-900">الرصيد الحالي للمكتبة</p>{(() => { const balance = quranStockDashboard.warehouses.find((warehouse) => warehouse.id === quranStockMovementForm.warehouseId)!.balance; return <div className="mt-2 grid grid-cols-4 gap-2 text-center"><Info label="الإجمالي" value={balance.totalCount} /><Info label="كبير" value={balance.largeCount} /><Info label="متوسط" value={balance.mediumCount} /><Info label="صغير" value={balance.smallCount} /></div>; })()}</div>}
            <Card className="border-emerald-200"><CardHeader className="pb-3"><CardTitle className="text-base">الكميات حسب الحجم</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.largeCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.mediumCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranStockMovementForm.smallCount} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            {quranStockMovementForm.movementType === 'site_withdrawal' && <Field label="سبب السحب *"><NativeSelect value={quranStockMovementForm.withdrawalReason || ''} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, withdrawalReason: e.target.value })}><option value="">اختر سبب السحب</option><option value="قدم المصحف">قدم المصحف</option><option value="تهالك أو تمزق">تهالك أو تمزق</option><option value="عدم ملاءمة النسخة للموقع">عدم ملاءمة النسخة للموقع</option><option value="فائض عن حاجة الموقع">فائض عن حاجة الموقع</option><option value="إعادة تنظيم وتوزيع">إعادة تنظيم وتوزيع</option><option value="أخرى">أخرى</option></NativeSelect></Field>}
            <div className="grid gap-4 md:grid-cols-2"><Field label="رقم المرجع / السند"><Input value={quranStockMovementForm.referenceNumber} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, referenceNumber: e.target.value })} /></Field><Field label="تاريخ الحركة"><Input type="date" value={quranStockMovementForm.movementAt} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, movementAt: e.target.value })} /></Field></div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">إجمالي هذه الحركة: <strong>{(Number(quranStockMovementForm.largeCount || 0) + Number(quranStockMovementForm.mediumCount || 0) + Number(quranStockMovementForm.smallCount || 0)).toLocaleString('ar-SA')} مصحف</strong>{quranStockMovementForm.movementType === 'distribution' ? ' — سيتم خصمها تلقائيًا من مكتبة المصاحف وإضافتها إلى رصيد الموقع.' : quranStockMovementForm.movementType === 'site_withdrawal' ? ' — سيتم خصمها من رصيد المسجد أو المصلى فقط، ولن تدخل تلقائيًا في الرصيد المتاح للمكتبة.' : ''}</div>
            <Field label="ملاحظات الحركة"><Textarea rows={4} value={quranStockMovementForm.notes} onChange={(e) => setQuranStockMovementForm({ ...quranStockMovementForm, notes: e.target.value })} placeholder={quranStockMovementForm.movementType === 'site_withdrawal' ? 'تفاصيل إضافية عن حالة المصاحف أو مكان حفظها بعد السحب...' : 'مثال: إضافة رصيد للمكتبة، إضافة لمسجد، إرجاع فائض، سبب التسوية...'} /></Field>
          </div>
          <DialogFooter className="border-t bg-white p-4 md:px-6"><Button variant="outline" onClick={() => setQuranStockMovementDialog(false)}>إلغاء</Button><Button className="bg-emerald-700 hover:bg-emerald-600" onClick={saveQuranStockMovement} disabled={quranStockSaving}><Save className="ml-2 h-4 w-4" />{quranStockSaving ? 'جاري التسجيل...' : 'تسجيل الحركة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranPrintDialog} onOpenChange={setQuranPrintDialog}>
        <DialogContent className="grid h-[90dvh] max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/35 to-emerald-50/25 sm:max-w-[1120px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Printer className="h-5 w-5 text-sky-700" />إعداد تقرير المصاحف للطباعة / PDF</DialogTitle>
            <DialogDescription>حدد نطاق التقرير وطريقة الفرز قبل الطباعة. تتحدث المعاينة والإحصائيات مباشرة وفق الخيارات المحددة.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 pb-6 md:p-6">
            <Card className="overflow-hidden border-sky-200/80 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-sky-100 bg-sky-50/60 pb-3"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-sky-700" />التصفية والفترة الزمنية</CardTitle><CardDescription>الرصيد الحالي لحظي، بينما المضاف والمسحوب والمرتجع تحسب حسب الفترة المحددة.</CardDescription></CardHeader>
              <CardContent className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2"><Field label="بحث داخل التقرير"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="h-11 pr-10" value={quranPrintSearch} onChange={(e) => setQuranPrintSearch(e.target.value)} placeholder="اسم المسجد أو المصلى، المدينة، الحي، الموقع..." /></div></Field></div>
                <Field label="نوع الموقع"><NativeSelect className="h-11" value={quranPrintSiteFilter} onChange={(e) => setQuranPrintSiteFilter(e.target.value as QuranPrintSiteFilter)}><option value="all">جميع المواقع</option><option value="mosque">المساجد فقط</option><option value="jami">الجوامع فقط</option><option value="prayer_room_men">مصليات الرجال</option><option value="prayer_room_women">مصليات النساء</option></NativeSelect></Field>
                <Field label="حالة الرصيد"><NativeSelect className="h-11" value={quranPrintStateFilter} onChange={(e) => setQuranPrintStateFilter(e.target.value as QuranPrintStateFilter)}><option value="all">جميع الحالات</option><option value="with_stock">لديه رصيد</option><option value="without_stock">بدون رصيد</option><option value="need">لديه احتياج</option><option value="damaged">لديه مصاحف مسحوبة</option><option value="not_counted">لم يسبق جرده</option></NativeSelect></Field>
                <Field label="من تاريخ"><Input className="h-11" type="date" value={quranPrintFrom} onChange={(e) => setQuranPrintFrom(e.target.value)} /></Field>
                <Field label="إلى تاريخ"><Input className="h-11" type="date" value={quranPrintTo} onChange={(e) => setQuranPrintTo(e.target.value)} /></Field>
                <Field label="حركة المصاحف"><NativeSelect className="h-11" value={quranPrintActivityFilter} onChange={(e) => setQuranPrintActivityFilter(e.target.value as QuranPrintActivityFilter)}><option value="all">جميع المواقع</option><option value="with_activity">لديها حركة خلال الفترة</option><option value="added">تمت إضافة مصاحف</option><option value="withdrawn">تم سحب مصاحف</option><option value="returned">تم إرجاع مصاحف</option><option value="without_activity">بدون حركة خلال الفترة</option></NativeSelect></Field>
                <div className="flex items-end"><Badge variant="outline" className={`h-11 w-full justify-center px-3 font-bold ${quranMovementsLoading ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>{quranMovementsLoading ? 'جاري تحميل سجل الحركات...' : `حركات الفترة: ${quranPrintMovementRows.length}`}</Badge></div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-emerald-200/80 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-emerald-100 bg-emerald-50/50 pb-3"><CardTitle className="text-base">الفرز وترتيب التقرير</CardTitle></CardHeader>
              <CardContent className="grid gap-4 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <Field label="الفرز حسب"><NativeSelect className="h-11" value={quranPrintSortKey} onChange={(e) => setQuranPrintSortKey(e.target.value as QuranPrintSortKey)}><option value="name">اسم الموقع</option><option value="total">الرصيد الحالي</option><option value="added">المضاف خلال الفترة</option><option value="withdrawn">المسحوب خلال الفترة</option><option value="returned">المرتجع خلال الفترة</option><option value="netMovement">صافي الحركة</option><option value="large">المصاحف الكبيرة</option><option value="medium">المصاحف المتوسطة</option><option value="small">المصاحف الصغيرة</option><option value="damaged">المسحوب التراكمي</option><option value="needed">الاحتياج</option><option value="last_count">آخر جرد</option></NativeSelect></Field>
                <Field label="اتجاه الفرز"><NativeSelect className="h-11" value={quranPrintSortDirection} onChange={(e) => setQuranPrintSortDirection(e.target.value as QuranPrintSortDirection)}><option value="asc">تصاعدي</option><option value="desc">تنازلي</option></NativeSelect></Field>
                <Button type="button" variant="outline" className={`${button3d} h-11`} onClick={resetQuranPrintFilters}><RefreshCw className="ml-2 h-4 w-4" />إعادة الضبط</Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              <ReportMetric label="المواقع" value={quranPrintStats.sites} />
              <ReportMetric label="الرصيد الحالي" value={quranPrintStats.total} />
              <ReportMetric label="المضاف خلال الفترة" value={quranPrintStats.added} />
              <ReportMetric label="المسحوب خلال الفترة" value={quranPrintStats.withdrawn} />
              <ReportMetric label="المرتجع خلال الفترة" value={quranPrintStats.returned} />
              <ReportMetric label="صافي الحركة" value={quranPrintStats.netMovement} />
              <ReportMetric label="الكبيرة" value={quranPrintStats.large} />
              <ReportMetric label="المتوسطة" value={quranPrintStats.medium} />
              <ReportMetric label="الصغيرة" value={quranPrintStats.small} />
              <ReportMetric label="المسحوب التراكمي" value={quranPrintStats.damaged} />
              <ReportMetric label="الاحتياج" value={quranPrintStats.needed} />
              <ReportMetric label="عدد الحركات" value={quranPrintMovementRows.length} />
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white/95">
              <CardHeader className="gap-2 border-b bg-slate-50/80 pb-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-base">ملخص المواقع</CardTitle><CardDescription>الرصيد الحالي مع إجماليات الإضافة والسحب والإرجاع حسب الفترة.</CardDescription></div><Badge variant="outline" className="w-fit border-sky-200 bg-white">{quranPrintRows.length} موقع مطابق</Badge></CardHeader>
              <CardContent className="p-0">
                {quranPrintRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-sm"><thead className="bg-sky-50 text-slate-700"><tr><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3">النوع</th><th className="p-3">الرصيد الحالي</th><th className="p-3">المضاف</th><th className="p-3">المسحوب</th><th className="p-3">المرتجع</th><th className="p-3">صافي الحركة</th><th className="p-3">المستهدف</th><th className="p-3">التغطية</th><th className="p-3">الاحتياج</th><th className="p-3">آخر جرد</th></tr></thead><tbody>{quranPrintRows.slice(0, 12).map((row) => <tr key={row.site.id} className="border-t"><td className="p-3 font-bold text-slate-800">{row.site.name}</td><td className="p-3 text-center">{siteTypeDisplayLabel(row.site)}</td><td className="p-3 text-center text-lg font-black text-emerald-700">{row.total}</td><td className="p-3 text-center font-black text-emerald-700">{row.added}</td><td className="p-3 text-center font-black text-red-600">{row.withdrawn}</td><td className="p-3 text-center font-black text-amber-700">{row.returned}</td><td className="p-3 text-center font-black text-sky-700">{row.netMovement}</td><td className="p-3 text-center">{row.target || '-'}</td><td className="p-3 text-center">{row.coverage == null ? '-' : `${row.coverage}%`}</td><td className="p-3 text-center font-bold text-amber-700">{row.needed}</td><td className="p-3 text-center text-xs">{row.latest ? new Date(row.latest.countedAt).toLocaleDateString('ar-SA-u-ca-gregory') : 'لم يجرد'}</td></tr>)}</tbody></table></div> : <div className="p-10"><Empty text="لا توجد نتائج مطابقة لمعايير التقرير الحالية" /></div>}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-violet-200 bg-white/95">
              <CardHeader className="gap-2 border-b bg-violet-50/60 pb-3 md:flex-row md:items-center md:justify-between"><div><CardTitle className="text-base">تفاصيل حركات المصاحف</CardTitle><CardDescription>سجل رقابي للحركات المطابقة للفترة والمواقع الحالية.</CardDescription></div><Badge variant="outline" className="w-fit border-violet-200 bg-white">{quranPrintMovementRows.length} حركة</Badge></CardHeader>
              <CardContent className="p-0">
                {quranPrintMovementRows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead className="bg-violet-50 text-slate-700"><tr><th className="p-3">رقم الحركة</th><th className="p-3">التاريخ</th><th className="p-3 text-right">المسجد / المصلى</th><th className="p-3">نوع الحركة</th><th className="p-3">كبير</th><th className="p-3">متوسط</th><th className="p-3">صغير</th><th className="p-3">الإجمالي</th><th className="p-3">المرجع</th></tr></thead><tbody>{quranPrintMovementRows.slice(0, 20).map((movement) => <tr key={movement.id} className="border-t"><td className="p-3 text-center font-mono text-xs">{movement.movementNumber}</td><td className="p-3 text-center text-xs">{new Date(movement.movementAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 font-bold">{movement.site?.name || sites.find((site) => site.id === movement.siteId)?.name || '-'}</td><td className="p-3 text-center"><Badge variant="outline">{quranStockMovementDisplayLabel(movement)}</Badge></td><td className="p-3 text-center">{movement.largeCount}</td><td className="p-3 text-center">{movement.mediumCount}</td><td className="p-3 text-center">{movement.smallCount}</td><td className="p-3 text-center font-black">{movement.totalCount}</td><td className="p-3 text-center">{movement.referenceNumber || '-'}</td></tr>)}</tbody></table></div> : <div className="p-8"><Empty text="لا توجد حركات مصاحف مطابقة للفترة الحالية" /></div>}
              </CardContent>
            </Card>
          </div>
<DialogFooter className="relative z-20 shrink-0 border-t border-sky-100 bg-white p-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] md:px-6">
            <Button variant="outline" className={button3d} onClick={() => setQuranPrintDialog(false)}>إلغاء</Button>
            <Button variant="outline" className={button3d} onClick={resetQuranPrintFilters}><RefreshCw className="ml-2 h-4 w-4" />مسح التصفية</Button>
            <Button className={`min-w-36 ${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={exportQuranInventoryExcel} disabled={!quranPrintRows.length || quranMovementsLoading}><FileSpreadsheet className="ml-2 h-4 w-4 text-white" />Excel + الصور</Button>
            <Button className={`min-w-44 ${button3d} bg-sky-700 hover:bg-sky-600`} onClick={printQuranInventory} disabled={!quranPrintRows.length || quranMovementsLoading}><Printer className="ml-2 h-4 w-4" />طباعة / حفظ PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quranDialog} onOpenChange={setQuranDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/25 to-sky-50/25 sm:max-w-[860px]" dir="rtl">
          <DialogHeader className="border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-sky-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><BookOpen className="h-5 w-5 text-emerald-700" />تحديث جرد المصاحف</DialogTitle><DialogDescription>{quranInventorySite?.name || ''} — هذا جرد فعلي للموجود بالموقع. زيادة الرصيد تتم من «إضافة من المكتبة» ليتم الخصم تلقائيًا من رصيد مكتبة المصاحف.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-5 md:p-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><strong>تنبيه:</strong> الجرد الفعلي للمطابقة فقط. لا يمكن زيادة رصيد مسجد أو مصلى من شاشة الجرد بعد اعتماد أول جرد؛ استخدم «إضافة من المكتبة» ليتم خصم الكمية تلقائيًا من مكتبة المصاحف وحفظ الحركة.</div>
            <Card className="border-emerald-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">المصاحف حسب الحجم</CardTitle><CardDescription>أدخل العدد الفعلي الموجود حاليًا بالموقع.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><Field label="المصاحف الكبيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.largeCount} onChange={(e) => setQuranForm({ ...quranForm, largeCount: e.target.value })} /></Field><Field label="المصاحف المتوسطة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.mediumCount} onChange={(e) => setQuranForm({ ...quranForm, mediumCount: e.target.value })} /></Field><Field label="المصاحف الصغيرة"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.smallCount} onChange={(e) => setQuranForm({ ...quranForm, smallCount: e.target.value })} /></Field></CardContent></Card>
            <Card className="border-amber-200/70"><CardHeader className="pb-3"><CardTitle className="text-base">الاحتياج وتاريخ الجرد</CardTitle><CardDescription>المصاحف المسحوبة تسجل من إجراء «سحب مصاحف» حتى يتم خصمها من رصيد الموقع وحفظ سبب السحب.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="المطلوب توفيره"><Input type="number" min="0" step="1" inputMode="numeric" value={quranForm.neededCount} onChange={(e) => setQuranForm({ ...quranForm, neededCount: e.target.value })} /></Field><Field label="تاريخ الجرد"><Input type="date" value={quranForm.countedAt} onChange={(e) => setQuranForm({ ...quranForm, countedAt: e.target.value })} /></Field></CardContent></Card>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-4"><Info label="الإجمالي الحالي" value={(Number(quranForm.largeCount || 0) + Number(quranForm.mediumCount || 0) + Number(quranForm.smallCount || 0)).toLocaleString('ar-SA')} /><Info label="الكبيرة" value={Number(quranForm.largeCount || 0).toLocaleString('ar-SA')} /><Info label="المتوسطة" value={Number(quranForm.mediumCount || 0).toLocaleString('ar-SA')} /><Info label="الصغيرة" value={Number(quranForm.smallCount || 0).toLocaleString('ar-SA')} /></div>
            <Field label="ملاحظات الجرد"><Textarea rows={4} value={quranForm.notes} onChange={(e) => setQuranForm({ ...quranForm, notes: e.target.value })} placeholder="مثال: مصاحف مسحوبة، حاجة إلى توفير مصاحف إضافية، موقع التخزين..." /></Field>
          </div>
          <DialogFooter className="border-t border-emerald-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setQuranDialog(false)}>إلغاء</Button><Button className={'min-w-36 ' + button3d} onClick={saveQuranInventory} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ الجرد'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quranHistorySite)} onOpenChange={(open) => !open && setQuranHistorySite(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="border-b bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-5 text-right"><DialogTitle className="flex items-center gap-2 text-xl font-black"><Clock3 className="h-5 w-5 text-sky-700" />سجل جرد المصاحف</DialogTitle><DialogDescription>{quranHistorySite?.name || ''} — سجل زمني غير مستبدل لعمليات الجرد السابقة.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-125px)] overflow-y-auto p-5">{quranHistoryLoading ? <div className="flex items-center justify-center gap-2 py-12"><RefreshCw className="h-5 w-5 animate-spin" />جاري تحميل السجل...</div> : quranHistoryRows.length ? <div className="overflow-x-auto rounded-2xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-sky-50"><tr><th className="p-3">تاريخ الجرد</th><th className="p-3">كبيرة</th><th className="p-3">متوسطة</th><th className="p-3">صغيرة</th><th className="p-3">الإجمالي</th><th className="p-3">مسحوبة (جرد سابق)</th><th className="p-3">الاحتياج</th><th className="p-3">مسجل الجرد</th><th className="p-3">ملاحظات</th></tr></thead><tbody>{quranHistoryRows.map((row) => <tr key={row.id} className="border-t"><td className="p-3 text-center">{new Date(row.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')}</td><td className="p-3 text-center">{row.largeCount}</td><td className="p-3 text-center">{row.mediumCount}</td><td className="p-3 text-center">{row.smallCount}</td><td className="p-3 text-center font-black text-emerald-700">{row.totalCount}</td><td className="p-3 text-center text-red-600">{row.damagedCount}</td><td className="p-3 text-center text-amber-700">{row.neededCount}</td><td className="p-3 text-center">{row.countedByName || '-'}</td><td className="max-w-[260px] p-3 text-xs leading-5">{row.notes || '-'}</td></tr>)}</tbody></table></div> : <Empty text="لا يوجد سجل جرد سابق لهذا الموقع" />}</div>
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
          <div className="space-y-5 overflow-y-auto p-5 md:p-6"><Card className="border-sky-200/70 bg-white/90"><CardContent className="space-y-4 pt-5"><Field label="الحالة الجديدة"><NativeSelect className="h-11" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>{statusTarget ? transitionsFor(statusTarget.kind, statusTarget.item.status).filter((s) => !(s === 'approved' && role !== 'head')).map((s) => <option key={s} value={s}>{statusTarget?.kind === 'request' && isQuranSupplyRequest(statusTarget.item) ? (quranSupplyStatusLabels[s] || statusLabels[s] || s) : (statusLabels[s] || s)}</option>) : null}</NativeSelect></Field><Field label={['rejected', 'returned_for_edit', 'archived'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'}><Textarea rows={5} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="دوّن المبرر أو الملاحظة المرتبطة بالإجراء..." /></Field>{statusTarget?.kind === 'request' && statusValue === 'completed' && <Field label="إثبات الإنجاز *"><Input className="h-11" type="file" accept="image/*,application/pdf" onChange={(e) => setStatusEvidence(e.target.files?.[0] || null)} /></Field>}</CardContent></Card></div>
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
            {['mosque', 'jami'].includes(previewSite.siteType) && <div className={`rounded-2xl border p-4 ${previewSite.hasWomenPrayerArea ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/70'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className={`font-black ${previewSite.hasWomenPrayerArea ? 'text-emerald-950' : 'text-slate-700'}`}>مصلى النساء</p><p className="mt-1 text-xs leading-6 text-slate-500">قسم تابع لسجل {previewSite.siteType === 'jami' ? 'الجامع' : 'المسجد'} وليس موقعًا مستقلًا.</p></div>
                <Badge variant="outline" className={previewSite.hasWomenPrayerArea ? (previewSite.womenPrayerArea?.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-800' : previewSite.womenPrayerArea?.status === 'temporarily_closed' ? 'border-slate-300 bg-white text-slate-600' : 'border-emerald-300 bg-white text-emerald-800') : 'border-slate-300 bg-white text-slate-500'}>
                  {previewSite.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(previewSite) : 'غير مسجل'}
                </Badge>
              </div>
              {previewSite.hasWomenPrayerArea ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="السعة التقريبية" value={previewSite.womenPrayerArea?.capacity ? Number(previewSite.womenPrayerArea.capacity).toLocaleString('ar-SA') : '-'} />
                <Info label="الدور / المستوى" value={previewSite.womenPrayerArea?.floor || '-'} />
                <Info label="مدخل مستقل" value={previewSite.womenPrayerArea?.separateEntrance === true ? 'نعم' : previewSite.womenPrayerArea?.separateEntrance === false ? 'لا' : '-'} />
                <Info label="مواضئ خاصة" value={previewSite.womenPrayerArea?.hasAblution === true ? 'نعم' : previewSite.womenPrayerArea?.hasAblution === false ? 'لا' : '-'} />
                <Info label="دورات مياه خاصة" value={previewSite.womenPrayerArea?.hasRestrooms === true ? 'نعم' : previewSite.womenPrayerArea?.hasRestrooms === false ? 'لا' : '-'} />
                <div className="sm:col-span-2 lg:col-span-3"><Info label="الموقع داخل المسجد / الجامع" value={previewSite.womenPrayerArea?.locationDescription || '-'} /></div>
                {previewSite.womenPrayerArea?.notes && <div className="sm:col-span-2 lg:col-span-3"><Info label="ملاحظات مصلى النساء" value={previewSite.womenPrayerArea.notes} /></div>}
              </div> : <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">لم يتم تسجيل مصلى نساء تابع لهذا الموقع حتى الآن.</p>}
            </div>}
            {previewSite.notes && <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-muted-foreground">ملاحظات</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewSite.notes}</p></div>}
            {(() => { const media = normalizeSiteMedia(previewSite.images); return media.photos.length || media.documents.length ? <div className="space-y-4 rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><p className="font-black text-slate-800">الصور والمرفقات</p><Badge variant="outline">{media.photos.length + media.documents.length} ملف</Badge></div>{media.photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{media.photos.map((item, index) => <a key={`preview-photo-${index}`} href={item.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border bg-slate-50"><MosqueMediaImage item={item} alt={item.fileName || 'صورة الموقع'} className="h-32 w-full object-cover" /><div className="flex items-center justify-between gap-2 p-2"><span className="min-w-0 truncate text-xs font-semibold text-slate-700">{item.fileName || `صورة ${index + 1}`}</span><Badge variant="outline" className="shrink-0 text-[10px]">{item.category === 'site_image' ? 'الموقع' : 'المسجد'}</Badge></div></a>)}</div>}{media.documents.length > 0 && <div className="space-y-2">{media.documents.map((item, index) => <a key={`preview-doc-${index}`} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm hover:bg-sky-50"><span className="min-w-0 truncate font-semibold text-slate-700"><FileText className="ml-2 inline h-4 w-4 text-sky-700" />{item.fileName || `مستند ${index + 1}`}</span><ExternalLink className="h-4 w-4 shrink-0 text-sky-700" /></a>)}</div>}</div> : null; })()}
            {(canPrint || (previewSite.latitude != null && previewSite.longitude != null)) && <div className="flex flex-wrap justify-end gap-2">
              {canPrint && <Button className={`${button3d} border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white`} onClick={() => exportSitesExcel([previewSite], `mosque-${previewSite.publicToken || previewSite.id}`)}><FileSpreadsheet className="ml-2 h-4 w-4 text-white" />Excel + الصور</Button>}{canPrint && <Button variant="outline" className={button3d} onClick={() => void printSiteCard(previewSite)} disabled={printingSiteCard}>{printingSiteCard ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{printingSiteCard ? 'جاري تجهيز الطباعة...' : 'طباعة بطاقة A4'}</Button>}
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
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="النوع" value={siteTypeDisplayLabel(qrSite)} /><Info label="الموقع" value={[qrSite.campusLocation, qrSite.city, qrSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="المساحة" value={qrSite.area ? `${qrSite.area} م²` : '-'} /><Info label="الإحداثيات" value={qrSite.latitude != null && qrSite.longitude != null ? `${qrSite.latitude}, ${qrSite.longitude}` : '-'} />{['mosque', 'jami'].includes(qrSite.siteType) && <Info label="مصلى النساء" value={qrSite.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(qrSite) : 'غير مسجل'} />}</div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">الرمز دائم ولا يحتاج إلى إعادة إنشائه عند تعديل بيانات الموقع؛ لأنه يفتح السجل الحالي عبر رمز عام آمن، ولا يضع بيانات الموظفين أو البيانات الداخلية داخل الباركود.</div>
            <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة الرمز</Button></div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingPersonnel)} onOpenChange={(open) => !open && setViewingPersonnel(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[#ded3b8] bg-[#fffdf8] sm:max-w-[860px]" dir="rtl">
          {viewingPersonnel && (() => {
            const site = sites.find((row) => row.id === viewingPersonnel.siteId);
            const media = normalizeSiteMedia(site?.images || null);
            const cover = media.photos.find((photo) => photo.category === 'mosque_image') || media.photos[0];
            const personnelLeaves = leaves.filter((leave) => leave.personnelId === viewingPersonnel.id).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const initials = viewingPersonnel.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

            return <div className="space-y-4">
              <div className="relative overflow-hidden rounded-[22px] border border-[#d6b46a]/45 bg-[#0b4a3f]">
                <div className="h-36">{cover ? <MosqueMediaImage item={cover} alt={cover.fileName || site?.name || viewingPersonnel.name} className="h-full w-full object-cover opacity-70" /> : <div className="h-full bg-[radial-gradient(circle_at_top_left,#167060,#073f35)]" />}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#073f35] via-[#073f35]/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 text-white">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-xl font-black backdrop-blur-sm">{initials || 'م'}</div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-black md:text-2xl">{viewingPersonnel.name}</h2><Badge variant="outline" className="border-[#e6c878]/70 bg-[#d6b46a]/20 text-[#ffe9b5]">{personnelRoleLabels[viewingPersonnel.role] || viewingPersonnel.role}</Badge></div><p className="mt-1 truncate text-sm text-emerald-50/85">{site?.name || viewingPersonnel.site?.name || 'بدون موقع محدد'}</p></div>
                  <Badge variant="outline" className={viewingPersonnel.active ? 'border-emerald-200/60 bg-emerald-50/90 text-emerald-800' : 'border-white/40 bg-white/85 text-slate-600'}>{viewingPersonnel.active ? 'نشط' : 'غير نشط'}</Badge>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
                <Card className="border-[#e2d4b4] bg-white">
                  <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">بيانات الملف التشغيلي</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Info label="الاسم الكامل" value={viewingPersonnel.name} />
                    <Info label="الصفة التشغيلية" value={personnelRoleLabels[viewingPersonnel.role] || viewingPersonnel.role} />
                    <Info label="المسجد / المصلى" value={site?.name || viewingPersonnel.site?.name || '-'} />
                    <Info label="حالة السجل" value={viewingPersonnel.active ? 'نشط' : 'غير نشط'} />
                    <Info label="رقم الجوال" value={viewingPersonnel.mobile || '-'} />
                    <Info label="البريد الإلكتروني" value={viewingPersonnel.email || '-'} />
                    <Info label="حساب مستخدم مرتبط" value={viewingPersonnel.userId ? 'نعم' : 'لا'} />
                  </CardContent>
                </Card>

                <Card className="border-[#e2d4b4] bg-[#fffdf8]">
                  <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">ملخص الإجازات والاعتذارات</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-[#e4d8bd] bg-white p-3 text-center"><p className="text-[10px] font-bold text-slate-500">الإجمالي</p><p className="mt-1 text-2xl font-black text-[#0b4a3f]">{personnelLeaves.length}</p></div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center"><p className="text-[10px] font-bold text-amber-700">قيد المراجعة</p><p className="mt-1 text-2xl font-black text-amber-800">{personnelLeaves.filter((leave) => ['pending', 'under_review'].includes(leave.status)).length}</p></div>
                    </div>
                    {personnelLeaves.slice(0, 3).map((leave) => <div key={leave.id} className="rounded-xl border border-[#e4d8bd] bg-white p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-[#0b4a3f]">{leaveTypeLabels[leave.requestType] || leave.requestType}</span><Badge variant="outline" className={statusBadgeClass(leave.status)}>{statusLabels[leave.status] || leave.status}</Badge></div><p className="mt-1 text-[11px] text-slate-500">{new Date(leave.startDate).toLocaleDateString('ar-SA-u-ca-gregory')} — {new Date(leave.endDate).toLocaleDateString('ar-SA-u-ca-gregory')}</p></div>)}
                    {!personnelLeaves.length && <p className="rounded-xl border border-dashed border-[#d9c9a5] bg-white p-4 text-center text-xs text-slate-500">لا توجد إجازات أو اعتذارات مسجلة.</p>}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[#e8ddc3] pt-4">
                {canEdit && ['head', 'supervisor'].includes(role) && <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => { const item = viewingPersonnel; setViewingPersonnel(null); openPersonnelDialog(item); }}><Pencil className="ml-2 h-4 w-4" />تعديل الملف</Button>}
                {canDelete && role === 'head' && <Button variant="outline" className="border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => deletePersonnel(viewingPersonnel)}><Trash2 className="ml-2 h-4 w-4" />حذف</Button>}
              </div>
            </div>;
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={personnelDialog} onOpenChange={(open) => { setPersonnelDialog(open); if (!open) setEditingPersonnel(null); }}>
        <DialogContent className="max-h-[92vh] overflow-hidden gap-0 border-[#ded3b8] bg-[#fffdf8] p-0 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-[#e8ddc3] bg-white p-5 text-right md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-[#fff8e8] text-[#0b5a49]">{editingPersonnel ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</div>
              <div><Badge variant="outline" className="mb-2 border-[#d6b46a]/55 bg-[#fff8e8] text-[#8a6a1f]">{editingPersonnel ? 'تحديث ملف تشغيلي' : 'ملف تشغيلي جديد'}</Badge><DialogTitle className="text-xl font-black text-[#0b4a3f] md:text-2xl">{editingPersonnel ? 'تعديل بيانات منسوب المسجد / المصلى' : 'إضافة منسوب مسجد / مصلى'}</DialogTitle><DialogDescription className="mt-1 leading-6">{editingPersonnel ? 'تحديث الموقع والصفة وبيانات التواصل مع المحافظة على الحساب المرتبط.' : 'تسجيل المنسوب وربطه بالمسجد أو المصلى والصفة التشغيلية، ثم إنشاء أو ربط حساب الدخول.'}</DialogDescription></div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(92vh-170px)] space-y-4 overflow-y-auto p-4 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <Card className="border-[#e2d4b4] bg-white shadow-sm">
                <CardHeader className="border-b border-[#eee5d2] bg-[#fffdf8] pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">البيانات الأساسية</CardTitle><CardDescription>الاسم وبيانات التواصل المستخدمة في الملف والحساب.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 pt-5">
                  <Field label="الاسم الكامل *"><Input className="h-11 border-[#d9c9a5]" autoFocus value={personnelForm.name} onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })} placeholder="الاسم الرباعي" /></Field>
                  <div className="grid gap-4 md:grid-cols-2"><Field label="رقم الجوال"><Input className="h-11 border-[#d9c9a5]" type="tel" inputMode="tel" value={personnelForm.mobile} onChange={(e) => setPersonnelForm({ ...personnelForm, mobile: e.target.value })} placeholder="05xxxxxxxx" /></Field><Field label="البريد الإلكتروني *"><Input className="h-11 border-[#d9c9a5]" type="email" inputMode="email" value={personnelForm.email} onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })} placeholder="name@iau.edu.sa" /></Field></div>
                </CardContent>
              </Card>

              <Card className="border-[#e2d4b4] bg-white shadow-sm">
                <CardHeader className="border-b border-[#eee5d2] bg-[#fffdf8] pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">الارتباط التشغيلي</CardTitle><CardDescription>الموقع والصفة التي تحدد نطاق عمل المنسوب.</CardDescription></CardHeader>
                <CardContent className="grid gap-4 pt-5">
                  <Field label="المسجد / المصلى *"><NativeSelect className="h-11 border-[#d9c9a5] bg-white" value={personnelForm.siteId} onChange={(e) => setPersonnelForm({ ...personnelForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field>
                  <Field label="الصفة التشغيلية *"><NativeSelect className="h-11 border-[#d9c9a5] bg-white" value={personnelForm.role} onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}><option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option></NativeSelect></Field>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border border-[#d6b46a]/45 bg-[#fff8e8] p-4 text-sm leading-7 text-slate-700">
              <div className="flex items-start gap-3"><Shield className="mt-1 h-5 w-5 shrink-0 text-[#0b5a49]" /><div><strong className="text-[#0b4a3f]">{editingPersonnel ? 'الحساب المرتبط:' : 'إنشاء وربط الحساب:'}</strong> {editingPersonnel ? 'يتم تحديث بيانات الملف والربط التشغيلي فقط، مع الإبقاء على حساب المستخدم الحالي.' : 'عند الحفظ يتم إنشاء حساب جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. ويكون وصول المنسوب مقصورًا على موقعه والطلبات والإجازات والإشعارات المرتبطة به.'}</div></div>
            </div>
          </div>

          <DialogFooter className="border-t border-[#e8ddc3] bg-white p-4 md:px-6">
            <Button variant="outline" className="border-[#d9c9a5] text-[#0b4a3f]" onClick={() => { setPersonnelDialog(false); setEditingPersonnel(null); }}>إلغاء</Button>
            <Button className="min-w-36 border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={savePersonnel} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : editingPersonnel ? 'حفظ التعديلات' : 'حفظ المنسوب'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          </div>
  );
};

const OverviewMetric = ({ label, value, icon: Icon, onClick }: { label: string; value: number; icon: React.ElementType; onClick?: () => void }) => {
  const content = <div className="group flex min-h-[106px] items-center justify-between gap-3 rounded-2xl border border-[#e1d4b7] bg-white p-3 shadow-[0_5px_14px_rgba(6,60,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d6b46a] hover:shadow-[0_10px_24px_rgba(6,60,51,0.10)]"><div><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#0b4a3f]">{value}</p></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-[#0b4a3f] text-[#f0d18b]"><Icon className="h-5 w-5" /></div></div>;
  return onClick ? <button type="button" className="w-full text-right" onClick={onClick}>{content}</button> : content;
};

const OverviewSectionCard = ({ title, description, value, icon: Icon, onClick }: { title: string; description: string; value: number; icon: React.ElementType; onClick: () => void }) => (
  <button type="button" className="group w-full text-right" onClick={onClick}>
    <div className="relative overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white p-4 shadow-[0_8px_24px_rgba(6,60,51,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_14px_28px_rgba(6,60,51,0.12)]">
      <div className="absolute bottom-3 right-0 top-3 w-1 rounded-l-full bg-[#0b5a49] transition-all group-hover:bg-[#d6b46a]" />
      <div className="flex items-start gap-3 pr-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-[#fdf7e9] text-[#0b5a49]"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><h3 className="font-black text-[#0b4a3f]">{title}</h3><span className="rounded-full border border-[#dfcfaa] bg-[#fffaf0] px-2.5 py-1 text-xs font-black text-[#8a6a1f]">{value}</span></div>
          <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  </button>
);

const EmptyCompact = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed border-[#d9c9a5] bg-white/75 px-4 py-6 text-center text-xs text-slate-500">{text}</div>;

const Stat = ({ title, value, icon: Icon, onClick }: { title: string; value: number; icon: React.ElementType; onClick?: () => void }) => {
  const card = <Card className={`${card3d} group h-full overflow-hidden ${onClick ? 'transition-all duration-200 hover:-translate-y-1 hover:border-[#c6a052] hover:shadow-[0_16px_34px_rgba(6,60,51,0.14)]' : ''}`}><div className="h-1 bg-gradient-to-l from-[#0b5a49] via-[#d6b46a] to-[#0b5a49]" /><CardContent className="flex h-full items-center justify-between gap-3 p-4"><div><p className="text-xs font-bold text-slate-500">{title}</p><p className="mt-1 text-2xl font-black text-[#0b4a3f]">{value}</p></div><div className="rounded-2xl border border-[#d6b46a]/55 bg-[#0b4a3f] p-2.5 text-[#f2d48d] shadow-[0_7px_18px_rgba(6,60,51,0.18)] transition-transform duration-200 group-hover:scale-105"><Icon className="h-5 w-5" /></div></CardContent></Card>;
  return onClick ? <button type="button" className="block h-full w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c6a052] focus-visible:ring-offset-2" onClick={onClick}>{card}</button> : card;
};
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-muted-foreground"><Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>{text}</p></div>;
const Rule = ({ title, text }: { title: string; text: string }) => <div className="rounded-2xl border border-[#dfcfaa] bg-gradient-to-br from-white to-[#fbf6ea] p-4 shadow-sm"><div className="mb-2 h-1 w-10 rounded-full bg-[#d6b46a]" /><p className="font-black text-[#0b4a3f]">{title}</p><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
const ReportMetric = ({ label, value }: { label: string; value: number }) => <div className="rounded-2xl border border-[#dfcfaa] bg-gradient-to-b from-white to-[#f9f3e7] p-5 text-center shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-[#0b4a3f]">{value}</p></div>;
const MiniRow = ({ title, subtitle, status }: { title: string; subtitle: string; status: string }) => <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#e3d5b4] bg-[#fffdf8] p-3 shadow-[0_4px_12px_rgba(6,60,51,0.05)]"><div className="min-w-0"><p className="truncate font-black text-[#0b4a3f]">{title}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500">{subtitle}</p></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div>;

const SpatialMetric = ({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: React.ElementType; tone?: 'default' | 'warning' }) => (
  <div className={`flex min-h-[94px] items-center justify-between gap-3 rounded-2xl border p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)] ${tone === 'warning' ? 'border-amber-200 bg-amber-50/70 text-amber-800' : 'border-[#e2d4b4] bg-white text-[#0b4a3f]'}`}>
    <div><p className="text-[11px] font-bold opacity-75">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p></div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-white/75"><Icon className="h-5 w-5" /></div>
  </div>
);

const NotificationMetric = ({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: React.ElementType; tone?: 'default' | 'warning' }) => (
  <div className={`flex min-h-[94px] items-center justify-between gap-3 rounded-2xl border p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)] ${tone === 'warning' ? 'border-amber-200 bg-amber-50/70 text-amber-800' : 'border-[#e2d4b4] bg-white text-[#0b4a3f]'}`}>
    <div><p className="text-[11px] font-bold opacity-75">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p></div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-white/75"><Icon className="h-5 w-5" /></div>
  </div>
);

const RoleMetric = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex min-h-[94px] items-center justify-between gap-3 rounded-2xl border border-[#e2d4b4] bg-white p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)]">
    <div><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#0b4a3f]">{value.toLocaleString('ar-SA')}</p></div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-[#fff8e8] text-[#0b5a49]"><Icon className="h-5 w-5" /></div>
  </div>
);

const RoleDefinitionCard = ({ title, description, count, icon: Icon }: { title: string; description: string; count: number; icon: React.ElementType }) => (
  <div className="rounded-2xl border border-[#e2d4b4] bg-[#fffdf8] p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-white text-[#0b5a49]"><Icon className="h-5 w-5" /></div><span className="rounded-full border border-[#dfcfaa] bg-white px-2.5 py-1 text-xs font-black text-[#8a6a1f]">{count}</span></div>
    <p className="mt-3 font-black text-[#0b4a3f]">{title}</p>
    <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
  </div>
);

const PersonnelMetric = ({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) => (
  <div className="flex min-h-[94px] items-center justify-between gap-3 rounded-2xl border border-[#e2d4b4] bg-white p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)]">
    <div><p className="text-[11px] font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-[#0b4a3f]">{value.toLocaleString('ar-SA')}</p></div>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#d6b46a]/45 bg-[#fff8e8] text-[#0b5a49]"><Icon className="h-5 w-5" /></div>
  </div>
);

const SiteRegistryMetric = ({ label, value, suffix }: { label: string; value: number; suffix?: string }) => (
  <div className="rounded-2xl border border-[#e2d4b4] bg-white p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)]">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <div className="mt-1 flex items-end gap-1"><span className="text-2xl font-black text-[#0b4a3f]">{value.toLocaleString('ar-SA', { maximumFractionDigits: 2 })}</span>{suffix && <span className="pb-0.5 text-[11px] font-bold text-slate-500">{suffix}</span>}</div>
  </div>
);

const SiteCard = ({ site, canEdit, canDelete, canPrint, onPreview, onPrint, onExcel, onEdit, onDelete, onQr, quranInventory }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; canPrint: boolean; onPreview: () => void; onPrint: () => void; onExcel: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void; quranInventory?: MosqueQuranInventory | null }) => {
  const media = normalizeSiteMedia(site.images || null);
  const cover = media.photos.find((item) => item.category === 'mosque_image') || media.photos[0];
  const requests = site._count?.requests || 0;
  const tickets = site._count?.tickets || 0;
  const personnel = site._count?.personnel || 0;

  return <Card className="group overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_10px_28px_rgba(6,60,51,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_16px_34px_rgba(6,60,51,0.12)]">
    <div className="grid min-h-[190px] sm:grid-cols-[180px_1fr]">
      <button type="button" onClick={onPreview} className="relative min-h-[165px] overflow-hidden bg-[#f4efe4] text-right sm:min-h-full">
        {cover ? <MosqueMediaImage item={cover} alt={cover.fileName || site.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full min-h-[165px] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fff8e8,#eee6d7)] text-[#0b4a3f]"><Building2 className="h-12 w-12 opacity-60" /><span className="mt-2 text-xs font-bold text-slate-500">لا توجد صورة مسجلة</span></div>}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-9 text-white">
          <span className="rounded-full border border-white/25 bg-black/25 px-2 py-1 text-[10px] font-bold backdrop-blur-sm">{siteTypeDisplayLabel(site)}</span>
        </div>
      </button>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-[#0b4a3f]">{site.name}</h3>
            <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{site.campusLocation || site.city || '-'}{site.building?.buildingNumber ? ` — مبنى ${site.building.buildingNumber}` : ''}</span></p>
          </div>
          <Badge variant="outline" className={site.status === 'active' ? 'shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700' : site.status === 'maintenance' ? 'shrink-0 border-amber-300 bg-amber-50 text-amber-700' : 'shrink-0 border-slate-300 bg-slate-50 text-slate-700'}>{siteStatusLabels[site.status]}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-[#e8ddc4] bg-[#fffdf8] p-2"><p className="text-[10px] font-bold text-slate-500">المساحة</p><p className="mt-1 text-sm font-black text-[#0b4a3f]">{site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'}</p></div>
          <div className="rounded-xl border border-[#e8ddc4] bg-[#fffdf8] p-2"><p className="text-[10px] font-bold text-slate-500">السعة</p><p className="mt-1 text-sm font-black text-[#0b4a3f]">{site.capacity ? site.capacity.toLocaleString('ar-SA') : '-'}</p></div>
          <div className="rounded-xl border border-[#e8ddc4] bg-[#fffdf8] p-2"><p className="text-[10px] font-bold text-slate-500">المنسوبون</p><p className="mt-1 text-sm font-black text-[#0b4a3f]">{personnel}</p></div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div><span className="text-slate-500">الإمام</span><p className="mt-0.5 truncate font-bold text-slate-800">{site.imamName || '-'}</p></div>
          <div><span className="text-slate-500">المؤذن</span><p className="mt-0.5 truncate font-bold text-slate-800">{site.muezzinName || '-'}</p></div>
          <div><span className="text-slate-500">الخطيب</span><p className="mt-0.5 truncate font-bold text-slate-800">{site.khateebName || '-'}</p></div>
          <div><span className="text-slate-500">المنسق</span><p className="mt-0.5 truncate font-bold text-slate-800">{site.coordinatorName || '-'}</p></div>
        </div>

        {['mosque', 'jami'].includes(site.siteType) && <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${site.hasWomenPrayerArea ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/70'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className={`flex items-center gap-2 font-black ${site.hasWomenPrayerArea ? 'text-emerald-900' : 'text-slate-600'}`}><Users className="h-4 w-4" />مصلى النساء</div>
            <Badge variant="outline" className={site.hasWomenPrayerArea ? (site.womenPrayerArea?.status === 'temporarily_closed' ? 'border-slate-300 bg-white text-slate-600' : site.womenPrayerArea?.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-white text-emerald-800') : 'border-slate-300 bg-white text-slate-500'}>
              {site.hasWomenPrayerArea ? womenPrayerAreaStatusLabel(site) : 'غير مسجل'}
            </Badge>
          </div>
          {site.hasWomenPrayerArea ? <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-emerald-900">
            <span>السعة: <strong>{site.womenPrayerArea?.capacity ? Number(site.womenPrayerArea.capacity).toLocaleString('ar-SA') : '-'}</strong></span>
            <span>الدور: <strong>{site.womenPrayerArea?.floor || '-'}</strong></span>
            {site.womenPrayerArea?.separateEntrance === true && <span className="font-bold">مدخل مستقل</span>}
          </div> : <p className="mt-1 leading-5 text-slate-500">لا يوجد مصلى نساء مسجل ضمن بيانات هذا {site.siteType === 'jami' ? 'الجامع' : 'المسجد'}.</p>}
        </div>}
      </div>
    </div>

    <CardContent className="space-y-3 border-t border-[#eee5d2] p-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-[#e4d8bd] bg-white p-2.5 text-center"><p className="text-[10px] font-bold text-slate-500">الطلبات</p><p className="mt-1 text-lg font-black text-[#0b4a3f]">{requests}</p></div>
        <div className="rounded-xl border border-[#e4d8bd] bg-white p-2.5 text-center"><p className="text-[10px] font-bold text-slate-500">البلاغات</p><p className="mt-1 text-lg font-black text-[#0b4a3f]">{tickets}</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/55 p-2.5 text-center"><p className="text-[10px] font-bold text-emerald-700">المصاحف</p><p className="mt-1 text-lg font-black text-emerald-800">{quranInventory ? quranInventory.totalCount : '-'}</p></div>
      </div>

      {quranInventory && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/55 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-black text-emerald-900"><BookOpen className="h-4 w-4" />آخر جرد فعلي</div>
        <div className="flex flex-wrap gap-2 text-emerald-800"><span>كبير {quranInventory.largeCount}</span><span>متوسط {quranInventory.mediumCount}</span><span>صغير {quranInventory.smallCount}</span>{quranInventory.neededCount > 0 && <span className="font-black text-amber-700">احتياج {quranInventory.neededCount}</span>}</div>
      </div>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button className={`${siteActionButton} border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152] hover:text-white`} onClick={onPreview}><Eye className="h-4 w-4 shrink-0" />فتح السجل</Button>
        <Button variant="outline" className={`${siteActionButton} border-[#d9c9a5] text-[#0b4a3f]`} onClick={onQr}><QrCode className="h-4 w-4 shrink-0" />QR</Button>
        {site.latitude != null && site.longitude != null ? <Button variant="outline" className={`${siteActionButton} border-[#d9c9a5] text-[#0b4a3f]`} onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')}><MapPin className="h-4 w-4 shrink-0" />الخريطة</Button> : <Button variant="outline" disabled className={siteActionButton}><MapPin className="h-4 w-4 shrink-0" />الخريطة</Button>}
        {canEdit ? <Button variant="outline" className={`${siteActionButton} border-[#d6b46a] bg-[#fff8e8] text-[#7b5b16]`} onClick={onEdit}><Pencil className="h-4 w-4 shrink-0" />تعديل</Button> : <Button variant="outline" disabled className={siteActionButton}><Pencil className="h-4 w-4 shrink-0" />تعديل</Button>}
      </div>

      {(canPrint || canDelete) && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#eee5d2] pt-3">
        {canPrint && <Button size="sm" variant="ghost" className="text-slate-600" onClick={onExcel}><FileSpreadsheet className="ml-1 h-3.5 w-3.5" />Excel</Button>}
        {canPrint && <Button size="sm" variant="ghost" className="text-slate-600" onClick={onPrint}><Printer className="ml-1 h-3.5 w-3.5" />طباعة / PDF</Button>}
        {canDelete && <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onDelete}><Trash2 className="ml-1 h-3.5 w-3.5" />حذف</Button>}
      </div>}
    </CardContent>
  </Card>;
};

const QuickFilterBar = ({ label, onClear }: { label: string; onClear: () => void }) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2d4b4] bg-[#fffdf8] px-4 py-3 text-sm"><span>العرض الحالي: <strong className="text-[#0b4a3f]">{label}</strong></span><Button variant="outline" size="sm" className="border-[#d9c9a5] text-[#0b4a3f]" onClick={onClear}>عرض الكل</Button></div>;

const TransactionMetric = ({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: React.ElementType; tone?: 'default' | 'warning' | 'urgent' }) => {
  const toneClass = tone === 'urgent'
    ? 'border-red-200 bg-red-50/70 text-red-700'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50/70 text-amber-800'
      : 'border-[#e2d4b4] bg-white text-[#0b4a3f]';
  return <div className={`flex min-h-[92px] items-center justify-between gap-3 rounded-2xl border p-3 shadow-[0_5px_14px_rgba(6,60,51,0.05)] ${toneClass}`}><div><p className="text-[11px] font-bold opacity-75">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p></div><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-white/75"><Icon className="h-5 w-5" /></div></div>;
};

const WorkflowCard = ({ kind, title, subtitle, description, status, statusLabel, priority, createdAt, meta, submitterName, submitterRole, onView, onStatus, extraAction }: { kind?: 'request' | 'ticket' | 'leave' | 'job'; title: string; subtitle: string; description: string; status: string; statusLabel?: string; priority?: string; createdAt?: string; meta: string[]; submitterName?: string; submitterRole?: string; onView?: () => void; onStatus?: () => void; extraAction?: React.ReactNode }) => {
  const isOpen = !['closed', 'rejected', 'archived'].includes(status);
  const createdTime = createdAt ? new Date(createdAt).getTime() : NaN;
  const ageDays = Number.isFinite(createdTime) ? Math.max(0, Math.floor((Date.now() - createdTime) / (24 * 60 * 60 * 1000))) : null;
  const isLate = kind === 'request' && isOpen && ageDays != null && ageDays >= 7;
  const icon = kind === 'ticket' ? <MessageSquare className="h-4 w-4" /> : kind === 'request' ? <Wrench className="h-4 w-4" /> : kind === 'leave' ? <CalendarDays className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />;

  return <Card className="group overflow-hidden rounded-[22px] border border-[#ded3b8] bg-white shadow-[0_9px_26px_rgba(6,60,51,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9a753] hover:shadow-[0_14px_30px_rgba(6,60,51,0.10)]">
    <CardContent className="flex min-h-[350px] flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1 font-bold text-[#0b5a49]">{icon}{title}</span>{createdAt && <span>• {new Date(createdAt).toLocaleDateString('ar-SA-u-ca-gregory')}</span>}{isLate && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">متأخر</Badge>}</div>
          <h3 className="mt-2 truncate text-lg font-black text-[#0b4a3f]">{subtitle || 'بدون موقع محدد'}</h3>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusBadgeClass(status)}`}>{statusLabel || statusLabels[status] || status}</Badge>
      </div>

      {submitterName && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e7dcc4] bg-[#fffdf8] px-3 py-2.5"><div className="min-w-0"><p className="text-[10px] font-bold text-slate-500">مقدم المعاملة</p><p className="mt-0.5 truncate text-sm font-black text-slate-800">{submitterName}</p></div>{submitterRole && <Badge variant="outline" className="shrink-0 border-[#d6b46a]/45 bg-white text-[#7b5b16]">{submitterRole}</Badge>}</div>}

      <p className="mt-3 line-clamp-3 min-h-[76px] rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-6 text-slate-700">{description}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {meta.slice(0,2).map((x, i) => <span key={i} className="rounded-xl border border-[#e4d8bd] bg-white p-2.5 text-center font-bold text-slate-600">{x || '-'}</span>)}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e3d6b9] bg-[#fbf8f1] px-3 py-2.5">
        <div><p className="text-[10px] font-bold text-slate-500">الإجراء التالي</p><p className="mt-0.5 text-xs font-black text-[#0b4a3f]">{workflowNextActionLabel(kind, status)}</p></div>
        <div className="text-left">{priority && <Badge variant="outline" className={priority === 'urgent' ? 'border-red-300 bg-red-50 text-red-700' : priority === 'high' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}>{priorityLabels[priority] || priority}</Badge>}{ageDays != null && <p className="mt-1 text-[10px] text-slate-400">منذ {ageDays} يوم</p>}</div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-[#eee5d2] pt-4">
        {onView && <Button size="sm" className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={onView}><Eye className="ml-1 h-3.5 w-3.5" />عرض التفاصيل</Button>}
        {onStatus && <Button variant="outline" size="sm" className="border-[#d6b46a] bg-[#fff8e8] text-[#7b5b16]" onClick={onStatus}><RefreshCw className="ml-1 h-3.5 w-3.5" />إجراء رسمي</Button>}
        {extraAction}
      </div>
    </CardContent>
  </Card>;
};

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
      <DialogContent className="max-h-[92vh] overflow-y-auto border-[#ded3b8] bg-[#fffdf8] sm:max-w-[980px]" dir="rtl">
        <DialogHeader className="rounded-2xl border border-[#e3d6b9] bg-white p-4 text-right">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><Badge variant="outline" className="mb-2 border-[#d6b46a]/55 bg-[#fff8e8] text-[#8a6a1f]">{isRequest ? 'طلب صيانة / احتياج' : isTicket ? 'بلاغ' : 'إجازة / اعتذار'}</Badge><DialogTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]"><Eye className="h-5 w-5" />{recordNumber}</DialogTitle><DialogDescription className="mt-1">{item.site?.name || 'بدون موقع محدد'}</DialogDescription></div>
            <Badge variant="outline" className={statusBadgeClass(item.status)}>{statusLabels[item.status] || item.status}</Badge>
          </div>
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

          <Card className="border-[#d6b46a]/45 bg-white"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base font-black text-[#0b4a3f]"><Clock3 className="h-4 w-4" />التسلسل الزمني للمعاملة</CardTitle><CardDescription>كل تغيير حالة أو تعديل إداري محفوظ بترتيبه الزمني.</CardDescription></CardHeader><CardContent>{history.length ? <div className="space-y-0">{history.map((entry, index) => <div key={entry.id} className="relative pr-7 pb-5 last:pb-0"><span className="absolute right-[7px] top-2 h-full w-px bg-[#e4d8bd] last:hidden" /><span className="absolute right-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#d6b46a] bg-white"><span className="h-1.5 w-1.5 rounded-full bg-[#0b5a49]" /></span><div className="rounded-xl border border-[#e4d8bd] bg-[#fffdf8] p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[#0b4a3f]">{entry.action === 'administrative_edit' ? 'تعديل إداري' : entry.action === 'archive' ? 'حذف / أرشفة' : entry.action === 'resubmitted_after_return' ? 'إعادة إرسال بعد التعديل' : 'تغيير حالة'}</strong><span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString('ar-SA')}</span></div><p className="mt-1 text-xs text-slate-500">{entry.username || entry.userEmail || 'النظام'}{entry.details?.fromStatus || entry.details?.toStatus ? ` — ${statusLabels[entry.details?.fromStatus || ''] || entry.details?.fromStatus || '-'} ← ${statusLabels[entry.details?.toStatus || ''] || entry.details?.toStatus || '-'}` : ''}</p>{entry.details?.note && <p className="mt-2 rounded-lg border border-slate-100 bg-white p-2 text-xs leading-6 text-slate-700">{entry.details.note}</p>}</div></div>)}</div> : <p className="rounded-xl border border-dashed border-[#d9c9a5] bg-[#fffdf8] p-5 text-center text-sm text-slate-500">لا توجد إجراءات مسجلة بعد.</p>}</CardContent></Card>

          {(attachmentUrls.length > 0 || item.completionEvidenceUrl) && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">المرفقات</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{attachmentUrls.map((url: string, index: number) => <Button key={`${url}-${index}`} variant="outline" size="sm" className={button3d} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}><ExternalLink className="ml-1 h-3.5 w-3.5" />مرفق {index + 1}</Button>)}{item.completionEvidenceUrl && <Button variant="outline" size="sm" className={button3d} onClick={() => window.open(item.completionEvidenceUrl, '_blank', 'noopener,noreferrer')}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />إثبات الإنجاز</Button>}</CardContent></Card>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
