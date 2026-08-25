import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
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
  type MosqueRequest,
  type MosqueSite,
  type MosqueSiteMediaLibrary,
  type MosqueStaffUser,
  type MosqueTicket,
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
  name: '', siteType: 'mosque', city: 'الدمام', district: '', campusLocation: '', area: '', capacity: '', latitude: '', longitude: '',
  status: 'active', imamName: '', muezzinName: '', khateebName: '', contactPhone: '', supervisorUserId: '', notes: '',
};
const emptyRequest = { siteId: '', requestType: 'maintenance', priority: 'medium', description: '', notes: '', file: null as File | null };
const emptyLeave = { siteId: '', requestType: 'leave', startDate: '', endDate: '', reason: '', replacementName: '', notes: '' };

type PendingSiteMedia = { file: File; kind: 'site_image' | 'mosque_image' | 'document' };

const emptySiteMedia = (): MosqueSiteMediaLibrary => ({ photos: [], documents: [] });
const normalizeSiteMedia = (value: MosqueSite['images']): MosqueSiteMediaLibrary => {
  if (Array.isArray(value)) return { photos: value.map((url) => ({ url, category: 'mosque_image' as const })), documents: [] };
  return { photos: value?.photos || [], documents: value?.documents || [] };
};
const drivePreviewUrl = (url: string) => {
  const id = String(url || '').match(/drive\.google\.com\/file\/d\/([^/?#]+)/i)?.[1] || String(url || '').match(/[?&]id=([^&#]+)/i)?.[1];
  return id ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : url;
};

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
  const [assignments, setAssignments] = useState<MosqueAssignment[]>([]);
  const [staffUsers, setStaffUsers] = useState<MosqueStaffUser[]>([]);
  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);
  const [search, setSearch] = useState('');
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
  const [previewSite, setPreviewSite] = useState<MosqueSite | null>(null);
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

  const visibleSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = role === 'personnel' && linkedSiteId ? sites.filter((site) => site.id === linkedSiteId) : sites;
    if (!q) return base;
    return base.filter((site) => [site.name, site.city, site.district, site.campusLocation].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [sites, search, role, linkedSiteId]);

  const mapSites = useMemo(() => visibleSites.filter((site) => Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude))), [visibleSites]);
  const mapCenter: [number, number] = useMemo(() => {
    if (!mapSites.length) return [26.3927, 50.0438];
    return [mapSites.reduce((s, x) => s + Number(x.latitude), 0) / mapSites.length, mapSites.reduce((s, x) => s + Number(x.longitude), 0) / mapSites.length];
  }, [mapSites]);

  const publicUrlForSite = (site: MosqueSite) => `${window.location.origin}${window.location.pathname}#/mosques/public?site=${encodeURIComponent(site.publicToken)}`;

  const openSiteDialog = (site?: MosqueSite) => {
    setEditingSite(site || null);
    setShowSiteMap(false);
    setSiteMediaKind('mosque_image');
    setSiteMediaFiles([]);
    setSiteMediaLibrary(normalizeSiteMedia(site?.images || null));
    setSiteForm(site ? {
      name: site.name, siteType: site.siteType, city: site.city || '', district: site.district || '', campusLocation: site.campusLocation || '',
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
          fileName: uploaded.fileName || pending.file.name,
          mimeType: uploaded.mimeType || pending.file.type || null,
        };
        if (pending.kind === 'document') nextMedia.documents.push(media);
        else nextMedia.photos.push({ ...media, category: pending.kind });
      }

      const payload = {
        ...siteForm,
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
    setRequestForm({ ...emptyRequest, siteId: linkedSiteId || sites[0]?.id || '' });
    setRequestDialog(true);
  };

  const saveRequest = async () => {
    if (!requestForm.siteId || requestForm.description.trim().length < 5) return toast.error('حدد الموقع واكتب وصفًا واضحًا للطلب');
    setSaving(true);
    try {
      const attachments: string[] = [];
      if (requestForm.file) attachments.push((await mosqueApi.upload(requestForm.file)).driveUrl);
      await mosqueApi.createRequest({ ...requestForm, file: undefined, attachments });
      toast.success('تم إنشاء الطلب وإرساله للمراجعة');
      setRequestDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إنشاء الطلب'); } finally { setSaving(false); }
  };

  const openLeaveDialog = () => {
    setLeaveForm({ ...emptyLeave, siteId: linkedSiteId || sites[0]?.id || '' });
    setLeaveDialog(true);
  };

  const saveLeave = async () => {
    if (!leaveForm.siteId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim() || !leaveForm.replacementName.trim()) return toast.error('أكمل بيانات الإجازة والبديل');
    setSaving(true);
    try {
      await mosqueApi.createLeave(leaveForm);
      toast.success('تم إرسال طلب الإجازة/الاعتذار');
      setLeaveDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إرسال الطلب'); } finally { setSaving(false); }
  };

  const transitionsFor = (kind: string, status: string) => {
    if (kind === 'request') return requestTransitions[status] || [];
    if (kind === 'ticket') return ticketTransitions[status] || [];
    if (kind === 'leave') return leaveTransitions[status] || [];
    return jobTransitions[status] || [];
  };

  const openStatusDialog = (kind: 'request' | 'ticket' | 'leave' | 'job', item: any) => {
    const next = transitionsFor(kind, item.status);
    if (!next.length) return toast.info('لا توجد حالة تالية متاحة لهذا السجل');
    setStatusTarget({ kind, item });
    setStatusValue(next[0]);
    setStatusNote('');
    setStatusEvidence(null);
    setStatusDialog(true);
  };

  const applyStatus = async () => {
    if (!statusTarget || !statusValue) return;
    if (['rejected', 'returned_for_edit'].includes(statusValue) && !statusNote.trim()) return toast.error('اكتب سبب الرفض أو ملاحظة الإعادة');
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
      if (statusTarget.kind === 'request') await mosqueApi.updateRequestStatus(statusTarget.item.id, payload);
      if (statusTarget.kind === 'ticket') await mosqueApi.updateTicketStatus(statusTarget.item.id, { ...payload, resolutionNote: statusNote });
      if (statusTarget.kind === 'leave') await mosqueApi.updateLeaveStatus(statusTarget.item.id, payload);
      if (statusTarget.kind === 'job') await mosqueApi.updateJobStatus(statusTarget.item.id, payload);
      toast.success('تم تحديث الحالة');
      setStatusDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر تحديث الحالة'); } finally { setSaving(false); }
  };

  const convertTicket = async (ticket: MosqueTicket) => {
    if (!confirm(`تحويل البلاغ ${ticket.ticketNumber} إلى طلب صيانة مرتبط؟`)) return;
    try { await mosqueApi.convertTicketToRequest(ticket.id, { requestType: 'maintenance', priority: 'medium' }); toast.success('تم إنشاء طلب صيانة مرتبط بالبلاغ'); await loadAll(); } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر التحويل'); }
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

  const exportReportExcel = async () => {
    try {
      const data = await mosqueApi.reportSummary();
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sites || []), 'المساجد والمصليات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.requests || []), 'الطلبات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.tickets || []), 'البلاغات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.leaves || []), 'الإجازات');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.jobs || []), 'التوظيف');
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
            {canAdd && ['head', 'supervisor'].includes(role) && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}
          </div>
        </div>
      </section>

      {role === 'head' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} onClick={() => goToDashboardSection('sites')} />
        <Stat title="طلبات جديدة" value={dashboard?.stats.newRequests || 0} icon={ClipboardList} onClick={() => goToDashboardSection('requests', { request: 'new' })} />
        <Stat title="تحت المراجعة" value={dashboard?.stats.reviewRequests || 0} icon={Clock3} onClick={() => goToDashboardSection('requests', { request: 'under_review' })} />
        <Stat title="معتمدة" value={dashboard?.stats.approvedRequests || 0} icon={CheckCircle2} onClick={() => goToDashboardSection('requests', { request: 'approved' })} />
        <Stat title="طلبات متأخرة" value={dashboard?.stats.lateRequests || 0} icon={AlertTriangle} onClick={() => goToDashboardSection('requests', { request: 'late' })} />
        <Stat title="بلاغات مفتوحة" value={dashboard?.stats.openTickets || 0} icon={MessageSquare} onClick={() => goToDashboardSection('tickets', { ticket: 'open' })} />
        <Stat title="إجازات معلقة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} onClick={() => goToDashboardSection('leaves', { leave: 'pending' })} />
        <Stat title="طلبات توظيف" value={dashboard?.stats.jobs || 0} icon={Briefcase} onClick={() => goToDashboardSection('jobs')} />
      </div>}

      {role === 'supervisor' && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat title="المساجد التابعة لي" value={dashboard?.stats.managedSites || 0} icon={Building2} />
        <Stat title="طلبات تحتاج متابعة" value={dashboard?.stats.assignedRequests || 0} icon={ClipboardList} />
        <Stat title="بلاغات جديدة" value={dashboard?.stats.newTickets || 0} icon={MessageSquare} />
        <Stat title="طلبات عاجلة" value={dashboard?.stats.urgentRequests || 0} icon={AlertTriangle} />
        <Stat title="إجازات للمراجعة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="التنبيهات" value={unreadNotifications} icon={Bell} />
      </div>}

      {role === 'personnel' && <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat title="الموقع المرتبط" value={linkedSite ? 1 : 0} icon={Building2} />
        <Stat title="طلباتي الحالية" value={dashboard?.stats.myRequests || activeMyRequests.length} icon={ClipboardList} />
        <Stat title="طلبات الصيانة" value={maintenanceMyRequests.length} icon={Wrench} />
        <Stat title="الإجازات الحالية" value={dashboard?.stats.myLeaves || 0} icon={CalendarDays} />
        <Stat title="الإشعارات" value={unreadNotifications} icon={Bell} />
      </div>}



      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white/80 p-2">
          <TabsTrigger value="overview">الرئيسية</TabsTrigger>
          <TabsTrigger value="sites">المساجد والمصليات</TabsTrigger>
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
            <Card className={card3d}><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />بيانات المسجد أو المصلى المرتبط بحسابي</CardTitle><CardDescription>{myPersonnelRole ? `الصفة التشغيلية: ${personnelRoleLabels[myPersonnelRole] || myPersonnelRole}` : 'منسوب مسجد أو مصلى'}</CardDescription></CardHeader><CardContent>{linkedSite ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Info label="الاسم" value={linkedSite.name} /><Info label="النوع" value={siteTypeLabels[linkedSite.siteType] || linkedSite.siteType} /><Info label="الموقع" value={[linkedSite.campusLocation, linkedSite.city, linkedSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="الحالة" value={siteStatusLabels[linkedSite.status] || linkedSite.status} /></div> : <Empty text="لم يتم ربط حسابك بمسجد أو مصلى حتى الآن" />}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>طلباتي الحالية</CardTitle><CardDescription>متابعة طلبات الاحتياج والصيانة التي قدمتها.</CardDescription></CardHeader><CardContent className="space-y-2">{activeMyRequests.length ? activeMyRequests.slice(0, 5).map((item) => <MiniRow key={item.id} title={item.requestNumber} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حالية" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>الخدمات السريعة</CardTitle><CardDescription>تقديم طلب أو إجازة/اعتذار واستقبال الإشعارات.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button className={button3d} onClick={openRequestDialog}><Wrench className="ml-2 h-4 w-4" />تقديم طلب جديد</Button><Button variant="outline" className={button3d} onClick={openLeaveDialog}><CalendarDays className="ml-2 h-4 w-4" />إجازة أو اعتذار</Button>{linkedSite?.mapUrl && <Button variant="outline" className={button3d} onClick={() => window.open(linkedSite.mapUrl!, '_blank')}><MapPin className="ml-2 h-4 w-4" />موقع المسجد</Button>}</CardContent></Card>
            </div>
          </>}

          {(role === 'university_member' || role === 'viewer') && <Card className={card3d}><CardHeader><CardTitle>منسوب الجامعة</CardTitle><CardDescription>الموظف، عضو هيئة التدريس، أو الطالب.</CardDescription></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-7 text-slate-600">يمكنك الاطلاع على المعلومات العامة ومواقع المساجد والمصليات، وإرسال بلاغ أو شكوى ومتابعته برقم المتابعة. البيانات الداخلية والتقارير وبيانات الموظفين غير متاحة لهذا الدور.</p><div className="flex flex-wrap gap-3"><Button className={button3d} onClick={() => navigate('/mosques/public')}><MessageSquare className="ml-2 h-4 w-4" />إرسال أو متابعة بلاغ</Button><Button variant="outline" className={button3d} onClick={() => navigate('/mosques/public')}><MapPin className="ml-2 h-4 w-4" />معلومات ومواقع المساجد</Button></div></CardContent></Card>}
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <Card className={card3d}><CardContent className="p-4"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المسجد أو المدينة أو الحي أو الموقع..." /></div></CardContent></Card>
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} onPreview={() => setPreviewSite(site)} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} />)}</div>}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openRequestDialog}><Plus className="ml-2 h-4 w-4" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</Button></div>}
          {requestQuickFilter !== 'all' && <QuickFilterBar label={requestQuickFilter === 'new' ? 'الطلبات الجديدة' : requestQuickFilter === 'under_review' ? 'الطلبات تحت المراجعة' : requestQuickFilter === 'approved' ? 'الطلبات المعتمدة' : 'الطلبات المتأخرة'} onClear={() => setRequestQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredRequests.map((item) => <WorkflowCard key={item.id} title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} submitterName={item.applicant?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || 'مقدم الطلب'} onView={() => setViewingWorkflow({ kind: 'request', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} />)}</div>
          {!filteredRequests.length && <Empty text="لا توجد طلبات مطابقة" />}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {ticketQuickFilter !== 'all' && <QuickFilterBar label="البلاغات المفتوحة" onClear={() => setTicketQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredTickets.map((item) => <WorkflowCard key={item.id} title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'بدون وسيلة تواصل']} submitterName={item.reporterName || 'غير محدد'} submitterRole="مقدّم البلاغ" onView={() => setViewingWorkflow({ kind: 'ticket', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant="outline" size="sm" className={button3d} onClick={() => convertTicket(item)}><Wrench className="ml-1 h-3.5 w-3.5" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant="outline">مرتبط بطلب صيانة</Badge> : null} />)}</div>
          {!filteredTickets.length && <Empty text="لا توجد بلاغات مطابقة" />}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openLeaveDialog}><Plus className="ml-2 h-4 w-4" />طلب إجازة / اعتذار</Button></div>}
          {leaveQuickFilter !== 'all' && <QuickFilterBar label="الإجازات والاعتذارات المعلقة" onClear={() => setLeaveQuickFilter('all')} />}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredLeaves.map((item) => <WorkflowCard key={item.id} title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} submitterName={item.applicant?.name || item.personnel?.name || 'غير محدد'} submitterRole={item.applicant?.roleLabel || (item.personnel?.role ? personnelRoleLabels[item.personnel.role] || item.personnel.role : 'مقدم الطلب')} onView={() => setViewingWorkflow({ kind: 'leave', item })} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} />)}</div>
          {!filteredLeaves.length && <Empty text="لا توجد طلبات إجازة أو اعتذار مطابقة" />}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">بيانات الهوية والجوال والبريد والسيرة الذاتية تظهر فقط للمخولين داخل الوحدة، ولا تظهر في البوابة العامة.</div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{jobs.map((item) => <WorkflowCard key={item.id} title={item.applicationNumber} subtitle={`${item.fullName} — ${item.jobType}`} description={`${item.qualification}${item.preferredLocation ? ` — ${item.preferredLocation}` : ''}`} status={item.status} meta={[item.email, item.phone]} onStatus={canEdit && role === 'head' ? () => openStatusDialog('job', item) : undefined} extraAction={item.cvUrl ? <Button variant="outline" size="sm" className={button3d} onClick={() => window.open(item.cvUrl!, '_blank')}><Eye className="ml-1 h-3.5 w-3.5" />السيرة الذاتية</Button> : null} />)}</div>
          {!jobs.length && <Empty text="لا توجد طلبات توظيف" />}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card className={`${card3d} overflow-hidden`}><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />خريطة المساجد والمصليات</CardTitle><CardDescription>OpenStreetMap / Leaflet — اضغط على أي نقطة لعرض بيانات الموقع.</CardDescription></CardHeader><CardContent><div className="h-[560px] overflow-hidden rounded-2xl border"><MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${mapSites.length}`} center={mapCenter} zoom={13} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mapSites.map((site) => <CircleMarker key={site.id} center={[Number(site.latitude), Number(site.longitude)]} radius={10} pathOptions={{ fillOpacity: 0.85 }}><Popup><div dir="rtl" className="min-w-[180px]"><strong>{site.name}</strong><div>{siteTypeLabels[site.siteType]} — {siteStatusLabels[site.status]}</div><div>{site.city || ''} {site.district || ''}</div><div>بلاغات: {site._count?.tickets || 0}</div><button onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')} className="mt-2 underline">فتح في Google Maps</button></div></Popup></CircleMarker>)}</MapContainer></div></CardContent></Card>
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

      <Dialog open={siteDialog} onOpenChange={setSiteDialog}>
        <DialogContent className="max-h-[94vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/40 to-violet-50/30 sm:max-w-[1180px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100/90 bg-gradient-to-l from-sky-50 via-white to-violet-50/70 p-5 text-right md:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-white text-sky-700 shadow-sm"><Building2 className="h-5 w-5" /></div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 md:text-2xl">{editingSite ? 'تعديل بيانات المسجد / الجامع / المصلى' : 'إضافة مسجد / جامع / مصلى جديد'}</DialogTitle>
                <DialogDescription className="mt-1 leading-6">نموذج موحد لتسجيل البيانات الأساسية والموقع والطاقة الاستيعابية وبيانات المسؤولين الرئيسيين.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[calc(94vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/60 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />المعلومات الأساسية</CardTitle><CardDescription>تعريف المسجد أو الجامع أو المصلى وحالته وموقعه الإداري داخل الجامعة.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2 lg:grid-cols-3">
                <Field label="اسم المسجد / الجامع / المصلى *"><Input className="h-11" autoFocus value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="مثال: مسجد الحرم الجامعي" /></Field>
                <Field label="النوع"><NativeSelect className="h-11" value={siteForm.siteType} onChange={(e) => setSiteForm({ ...siteForm, siteType: e.target.value })}><option value="mosque">مسجد</option><option value="jami">جامع</option><option value="prayer_room">مصلى</option></NativeSelect></Field>
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
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-emerald-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />المسؤولون الرئيسيون</CardTitle><CardDescription>هذه بيانات تعريفية مختصرة للموقع. بيانات الاتصال والصفة التشغيلية التفصيلية تُدار من تبويب «المنسوبون».</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-3">
                <Field label="الإمام"><Input className="h-11" value={siteForm.imamName} onChange={(e) => setSiteForm({ ...siteForm, imamName: e.target.value })} /></Field>
                <Field label="المؤذن"><Input className="h-11" value={siteForm.muezzinName} onChange={(e) => setSiteForm({ ...siteForm, muezzinName: e.target.value })} /></Field>
                <Field label="الخطيب"><Input className="h-11" value={siteForm.khateebName} onChange={(e) => setSiteForm({ ...siteForm, khateebName: e.target.value })} /></Field>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
              <CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-amber-50/50 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><FileText className="h-5 w-5" />صور ومرفقات المسجد / المصلى</CardTitle><CardDescription>يمكن رفع عدة صور للمسجد أو للموقع، إضافة إلى PDF وWord وExcel. الحد الأقصى 20 MB لكل ملف.</CardDescription></CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
                  <Field label="تصنيف المرفق"><NativeSelect className="h-11" value={siteMediaKind} onChange={(e) => setSiteMediaKind(e.target.value as any)}><option value="mosque_image">صورة المسجد / المصلى</option><option value="site_image">صورة الموقع / المبنى</option><option value="document">مستند / ملف</option></NativeSelect></Field>
                  <Field label="اختيار الملفات"><Input className="h-11 file:ml-3" type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => { const files = Array.from(e.target.files || []); if (!files.length) return; setSiteMediaFiles((current) => [...current, ...files.map((file) => ({ file, kind: file.type.startsWith('image/') ? siteMediaKind === 'document' ? 'mosque_image' : siteMediaKind : 'document' }))]); e.currentTarget.value = ''; }} /></Field>
                </div>
                {siteMediaFiles.length > 0 && <div className="space-y-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-3"><p className="text-xs font-bold text-sky-800">ملفات بانتظار الرفع ({siteMediaFiles.length})</p>{siteMediaFiles.map((item, index) => <div key={`pending-${index}-${item.file.name}`} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 text-sm"><span className="min-w-0 truncate">{item.file.name} — {item.kind === 'document' ? 'مستند' : item.kind === 'site_image' ? 'صورة الموقع' : 'صورة المسجد'}</span><Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setSiteMediaFiles((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
                {siteMediaLibrary.photos.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-slate-700">الصور المحفوظة ({siteMediaLibrary.photos.length})</p><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{siteMediaLibrary.photos.map((item, index) => <div key={`photo-${index}`} className="overflow-hidden rounded-2xl border bg-white"><img src={drivePreviewUrl(item.url)} alt={item.fileName || 'صورة المسجد'} className="h-28 w-full object-cover" /><div className="flex items-center justify-between gap-1 p-2"><a className="min-w-0 truncate text-xs text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer">{item.fileName || `صورة ${index + 1}`}</a><Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => setSiteMediaLibrary((current) => ({ ...current, photos: current.photos.filter((_, i) => i !== index) }))}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>)}</div></div>}
                {siteMediaLibrary.documents.length > 0 && <div className="space-y-2"><p className="text-xs font-bold text-slate-700">المستندات والملفات ({siteMediaLibrary.documents.length})</p>{siteMediaLibrary.documents.map((item, index) => <div key={`document-${index}`} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-2 text-sm"><a className="min-w-0 truncate text-sky-700 hover:underline" href={item.url} target="_blank" rel="noreferrer"><ExternalLink className="ml-1 inline h-3.5 w-3.5" />{item.fileName || `مستند ${index + 1}`}</a><Button type="button" size="sm" variant="ghost" className="text-red-600" onClick={() => setSiteMediaLibrary((current) => ({ ...current, documents: current.documents.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/50 pb-4"><CardTitle className="text-base md:text-lg">ملاحظات إضافية</CardTitle></CardHeader><CardContent className="pt-5"><Field label="الملاحظات"><Textarea rows={4} value={siteForm.notes} onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })} placeholder="أي معلومات تنظيمية أو تشغيلية إضافية..." /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setSiteDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveSite} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : editingSite ? 'حفظ التعديلات' : 'إضافة الموقع'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><Wrench className="h-5 w-5 text-sky-700" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</DialogTitle>
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
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setRequestDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveRequest} disabled={saving}>{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/60 p-5 text-right md:p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><CalendarDays className="h-5 w-5 text-sky-700" />طلب إجازة / اعتذار</DialogTitle>
            <DialogDescription>حدد الفترة والبديل بوضوح ليتمكن النظام من فحص التعارضات ومراجعة الطلب.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">بيانات الطلب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={leaveForm.siteId} onChange={(e) => setLeaveForm({ ...leaveForm, siteId: e.target.value })} disabled={role === 'personnel'}>{sites.filter((s) => role !== 'personnel' || !linkedSiteId || s.id === linkedSiteId).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع الطلب"><NativeSelect className="h-11" value={leaveForm.requestType} onChange={(e) => setLeaveForm({ ...leaveForm, requestType: e.target.value })}>{Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="text-base md:text-lg">الفترة والبديل</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="من *"><Input className="h-11" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field><Field label="إلى *"><Input className="h-11" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} /></Field><div className="md:col-span-2"><Field label="اسم النائب / البديل *"><Input className="h-11" value={leaveForm.replacementName} onChange={(e) => setLeaveForm({ ...leaveForm, replacementName: e.target.value })} placeholder="الاسم الكامل للبديل" /></Field></div></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-amber-50/40 pb-4"><CardTitle className="text-base md:text-lg">سبب الطلب والملاحظات</CardTitle></CardHeader><CardContent className="space-y-4 pt-5"><Field label="السبب *"><Textarea rows={5} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></Field><Field label="ملاحظات"><Textarea rows={3} value={leaveForm.notes} onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })} /></Field></CardContent></Card>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setLeaveDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={saveLeave} disabled={saving}>{saving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkflowDetailsDialog target={viewingWorkflow} onOpenChange={(open) => !open && setViewingWorkflow(null)} />

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[760px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="text-xl font-black">تحديث حالة الإجراء</DialogTitle><DialogDescription>{statusTarget?.item?.requestNumber || statusTarget?.item?.ticketNumber || statusTarget?.item?.leaveNumber || statusTarget?.item?.applicationNumber}</DialogDescription></DialogHeader>
          <div className="space-y-5 overflow-y-auto p-5 md:p-6"><Card className="border-sky-200/70 bg-white/90"><CardContent className="space-y-4 pt-5"><Field label="الحالة الجديدة"><NativeSelect className="h-11" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>{statusTarget ? transitionsFor(statusTarget.kind, statusTarget.item.status).filter((s) => !(s === 'approved' && role !== 'head')).map((s) => <option key={s} value={s}>{statusLabels[s] || s}</option>) : null}</NativeSelect></Field><Field label={['rejected', 'returned_for_edit'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'}><Textarea rows={5} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="دوّن المبرر أو الملاحظة المرتبطة بالإجراء..." /></Field>{statusTarget?.kind === 'request' && statusValue === 'completed' && <Field label="إثبات الإنجاز *"><Input className="h-11" type="file" accept="image/*,application/pdf" onChange={(e) => setStatusEvidence(e.target.files?.[0] || null)} /></Field>}</CardContent></Card></div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setStatusDialog(false)}>إلغاء</Button><Button className={button3d} onClick={applyStatus} disabled={saving}>{saving ? 'جاري التحديث...' : 'تحديث الحالة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewSite)} onOpenChange={(open) => !open && setPreviewSite(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[720px]">
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
              <Info label="النوع" value={siteTypeLabels[previewSite.siteType] || previewSite.siteType} />
              <Info label="المساحة" value={previewSite.area ? `${previewSite.area.toLocaleString('ar-SA')} م²` : '-'} />
              <Info label="الطاقة الاستيعابية" value={previewSite.capacity ? previewSite.capacity.toLocaleString('ar-SA') : '-'} />
              <Info label="الإمام" value={previewSite.imamName || '-'} />
              <Info label="المؤذن" value={previewSite.muezzinName || '-'} />
              <Info label="الخطيب" value={previewSite.khateebName || '-'} />
              <Info label="رقم التواصل" value={previewSite.contactPhone || '-'} />
              <Info label="الإحداثيات" value={previewSite.latitude != null && previewSite.longitude != null ? `${previewSite.latitude}, ${previewSite.longitude}` : '-'} />
            </div>
            {previewSite.notes && <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-muted-foreground">ملاحظات</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{previewSite.notes}</p></div>}
            {previewSite.latitude != null && previewSite.longitude != null && <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${previewSite.latitude},${previewSite.longitude}`, '_blank')}><MapPin className="ml-2 h-4 w-4" />فتح الموقع على الخريطة</Button></div>}
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[620px]">
          <DialogHeader><DialogTitle>QR / الباركود التلقائي — {qrSite?.name}</DialogTitle><DialogDescription>يُنشأ الرمز تلقائيًا مع سجل المسجد أو الجامع أو المصلى، ويرتبط بالسجل الدائم لعرض أحدث بياناته وتقديم البلاغات.</DialogDescription></DialogHeader>
          {qrSite && <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /></div>
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="النوع" value={siteTypeLabels[qrSite.siteType] || qrSite.siteType} /><Info label="الموقع" value={[qrSite.campusLocation, qrSite.city, qrSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="المساحة" value={qrSite.area ? `${qrSite.area} م²` : '-'} /><Info label="الإحداثيات" value={qrSite.latitude != null && qrSite.longitude != null ? `${qrSite.latitude}, ${qrSite.longitude}` : '-'} /></div>
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

const SiteCard = ({ site, canEdit, canDelete, onPreview, onEdit, onDelete, onQr }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; onPreview: () => void; onEdit: () => void; onDelete: () => void; onQr: () => void }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-emerald-400 via-sky-500 to-blue-800" /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2">{siteTypeLabels[site.siteType]}</Badge><h3 className="text-lg font-black text-slate-800">{site.name}</h3><p className="mt-1 text-sm text-muted-foreground">{site.city || '-'} — {site.district || '-'}</p></div><Badge variant="outline" className={site.status === 'active' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : site.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-300 bg-slate-50'}>{siteStatusLabels[site.status]}</Badge></div><div className="my-4 grid grid-cols-2 gap-3 rounded-2xl border bg-slate-50/70 p-3 text-sm"><Info label="الموقع داخل الجامعة" value={site.campusLocation || '-'} /><Info label="المساحة" value={site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'} /><Info label="الإمام" value={site.imamName || '-'} /><Info label="المؤذن" value={site.muezzinName || '-'} /><Info label="الطلبات" value={site._count?.requests || 0} /><Info label="البلاغات" value={site._count?.tickets || 0} /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5"><Button variant="outline" className={button3d} onClick={onQr}><QrCode className="ml-1 h-4 w-4" />QR</Button>{site.latitude != null && site.longitude != null && <Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')}><MapPin className="ml-1 h-4 w-4" />الخريطة</Button>}<Button variant="outline" className={button3d} onClick={onPreview}><Eye className="ml-1 h-4 w-4" />معاينة</Button>{canEdit && <Button variant="outline" className={button3d} onClick={onEdit}>تعديل</Button>}{canDelete && <Button variant="outline" className="border-red-300 text-red-600" onClick={onDelete}>حذف</Button>}</div></CardContent></Card>;

const QuickFilterBar = ({ label, onClear }: { label: string; onClear: () => void }) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm"><span>العرض الحالي: <strong>{label}</strong></span><Button variant="outline" size="sm" className={button3d} onClick={onClear}>عرض الكل</Button></div>;

const WorkflowCard = ({ title, subtitle, description, status, meta, submitterName, submitterRole, onView, onStatus, extraAction }: { title: string; subtitle: string; description: string; status: string; meta: string[]; submitterName?: string; submitterRole?: string; onView?: () => void; onStatus?: () => void; extraAction?: React.ReactNode }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-sky-400 via-blue-600 to-slate-800" /><CardContent className="flex min-h-[315px] flex-col p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{title}</p><h3 className="mt-1 font-black text-slate-800">{subtitle}</h3></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div>{submitterName && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-white/90 p-3"><div><p className="text-[11px] text-muted-foreground">مقدم الإجراء</p><p className="mt-1 font-bold text-slate-800">{submitterName}</p></div>{submitterRole && <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">{submitterRole}</Badge>}</div>}<p className="mt-3 line-clamp-3 rounded-2xl border bg-slate-50/80 p-3 text-sm leading-6 text-slate-700">{description}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">{meta.map((x, i) => <span key={i} className="rounded-xl border bg-white p-2">{x || '-'}</span>)}</div><div className="mt-auto flex flex-wrap gap-2 border-t pt-4">{onView && <Button variant="outline" size="sm" className={button3d} onClick={onView}><Eye className="ml-1 h-3.5 w-3.5" />عرض التفاصيل</Button>}{onStatus && <Button variant="outline" size="sm" className={button3d} onClick={onStatus}><RefreshCw className="ml-1 h-3.5 w-3.5" />تحديث الحالة</Button>}{extraAction}</div></CardContent></Card>;

const WorkflowDetailsDialog = ({ target, onOpenChange }: { target: { kind: 'request' | 'ticket' | 'leave'; item: any } | null; onOpenChange: (open: boolean) => void }) => {
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

          {(attachmentUrls.length > 0 || item.completionEvidenceUrl) && <Card className="border-slate-200"><CardHeader className="pb-3"><CardTitle className="text-base">المرفقات</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{attachmentUrls.map((url: string, index: number) => <Button key={`${url}-${index}`} variant="outline" size="sm" className={button3d} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}><ExternalLink className="ml-1 h-3.5 w-3.5" />مرفق {index + 1}</Button>)}{item.completionEvidenceUrl && <Button variant="outline" size="sm" className={button3d} onClick={() => window.open(item.completionEvidenceUrl, '_blank', 'noopener,noreferrer')}><CheckCircle2 className="ml-1 h-3.5 w-3.5" />إثبات الإنجاز</Button>}</CardContent></Card>}
        </div>
      </DialogContent>
    </Dialog>
  );
};