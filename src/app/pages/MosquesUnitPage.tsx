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
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Shield,
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

export const MosquesUnitPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin } = usePermissions();
  const canAdd = isAdmin || hasPermission('mosques', 'canAdd');
  const canEdit = isAdmin || hasPermission('mosques', 'canEdit');
  const canDelete = isAdmin || hasPermission('mosques', 'canDelete');
  const canPrint = isAdmin || hasPermission('mosques', 'canPrint');

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

  const [siteDialog, setSiteDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<MosqueSite | null>(null);
  const [siteForm, setSiteForm] = useState<any>(emptySite);
  const [showSiteMap, setShowSiteMap] = useState(false);
  const [locatingSite, setLocatingSite] = useState(false);
  const [requestDialog, setRequestDialog] = useState(false);
  const [requestForm, setRequestForm] = useState<any>(emptyRequest);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState<any>(emptyLeave);
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ kind: 'request' | 'ticket' | 'leave' | 'job'; item: any } | null>(null);
  const [statusValue, setStatusValue] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusEvidence, setStatusEvidence] = useState<File | null>(null);
  const [qrSite, setQrSite] = useState<MosqueSite | null>(null);
  const [personnelDialog, setPersonnelDialog] = useState(false);
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
          mosqueApi.requests(), mosqueApi.tickets(), mosqueApi.leaves(), mosqueApi.personnel(), mosqueApi.staffDirectory(),
        ]);
        setRequests(requestRows);
        setTickets(ticketRows);
        setLeaves(leaveRows);
        setPersonnel(personRows);
        setStaffUsers(staffRows);
        try { setJobs(await mosqueApi.jobs()); } catch { setJobs([]); }
        if (me.role === 'head') {
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
      const payload = {
        ...siteForm,
        area: siteForm.area === '' ? null : Number(siteForm.area),
        capacity: siteForm.capacity === '' ? null : Number(siteForm.capacity),
        latitude: siteForm.latitude === '' ? null : Number(siteForm.latitude),
        longitude: siteForm.longitude === '' ? null : Number(siteForm.longitude),
        mapUrl: siteForm.latitude !== '' && siteForm.longitude !== '' ? `https://www.google.com/maps?q=${siteForm.latitude},${siteForm.longitude}` : null,
        images: [],
      };
      const savedSite = editingSite
        ? await mosqueApi.updateSite(editingSite.id, { ...payload, images: editingSite.images || [] })
        : await mosqueApi.createSite(payload);
      toast.success(editingSite ? 'تم تحديث بيانات الموقع' : 'تمت إضافة الموقع وإنشاء QR تلقائيًا');
      setSiteDialog(false);
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

  const savePersonnel = async () => {
    if (!personnelForm.siteId || !personnelForm.name.trim() || !personnelForm.email.trim()) return toast.error('الموقع والاسم والبريد الإلكتروني مطلوبة لإنشاء حساب المنسوب');
    setSaving(true);
    try {
      const result = await mosqueApi.createPersonnelAccount(personnelForm);
      toast.success(result.message || 'تمت إضافة منسوب المسجد وربط حسابه');
      setPersonnelDialog(false);
      await loadAll();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إضافة منسوب المسجد'); } finally { setSaving(false); }
  };

  const setUserAssignment = async (userId: string, roleValue: MosqueModuleRole, siteId?: string, personnelRole?: string) => {
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
            <Button variant="outline" className={button3d} onClick={() => window.open('https://inspection-vna1.vercel.app/', '_blank', 'noopener,noreferrer')}><ClipboardList className="ml-2 h-4 w-4" />نظام المعاينة</Button>
            <Button variant="outline" className={button3d} onClick={loadAll}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
            {['head', 'supervisor'].includes(role) && <Button className={`${button3d} bg-sky-700 hover:bg-sky-800`} onClick={() => openSiteDialog()}><Plus className="ml-2 h-4 w-4" />إضافة مسجد / مصلى</Button>}
          </div>
        </div>
      </section>

      {role === 'head' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat title="المساجد والمصليات" value={dashboard?.stats.sites || 0} icon={Building2} />
        <Stat title="طلبات جديدة" value={dashboard?.stats.newRequests || 0} icon={ClipboardList} />
        <Stat title="تحت المراجعة" value={dashboard?.stats.reviewRequests || 0} icon={Clock3} />
        <Stat title="معتمدة" value={dashboard?.stats.approvedRequests || 0} icon={CheckCircle2} />
        <Stat title="طلبات متأخرة" value={dashboard?.stats.lateRequests || 0} icon={AlertTriangle} />
        <Stat title="بلاغات مفتوحة" value={dashboard?.stats.openTickets || 0} icon={MessageSquare} />
        <Stat title="إجازات معلقة" value={dashboard?.stats.pendingLeaves || 0} icon={CalendarDays} />
        <Stat title="طلبات توظيف" value={dashboard?.stats.jobs || 0} icon={Briefcase} />
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



      <Tabs defaultValue="overview" className="space-y-4">
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
          {role === 'head' && <TabsTrigger value="roles">الأدوار التشغيلية</TabsTrigger>}
          {role !== 'university_member' && role !== 'viewer' && <TabsTrigger value="notifications" className="gap-1">الإشعارات {unreadNotifications > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{unreadNotifications}</span>}</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {role === 'head' && <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={card3d}><CardHeader><CardTitle>آخر طلبات الصيانة والاحتياج</CardTitle><CardDescription>أحدث العمليات داخل منظومة الوحدة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentRequests || []).length ? dashboard!.recentRequests.map((item) => <MiniRow key={item.id} title={`${item.requestNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد طلبات حتى الآن" />}</CardContent></Card>
              <Card className={card3d}><CardHeader><CardTitle>آخر البلاغات</CardTitle><CardDescription>بلاغات الزوار ومنسوبي الجامعة التي تحتاج متابعة.</CardDescription></CardHeader><CardContent className="space-y-2">{(dashboard?.recentTickets || []).length ? dashboard!.recentTickets.map((item) => <MiniRow key={item.id} title={`${item.ticketNumber} — ${item.site?.name || ''}`} subtitle={item.description} status={item.status} />) : <Empty text="لا توجد بلاغات حتى الآن" />}</CardContent></Card>
            </div>
            <Card className={card3d}><CardHeader><CardTitle>إدارة المنظومة</CardTitle><CardDescription>رئيس الوحدة يملك الرؤية الشاملة والتقارير والإعدادات واعتماد الإجراءات.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Rule title="الإشراف الشامل" text="متابعة جميع المساجد والمصليات والطلبات والبلاغات." /><Rule title="الاعتماد" text="اعتماد الطلبات والإجازات والقرارات النهائية." /><Rule title="المؤشرات" text="متابعة الأداء والطلبات المتأخرة والحالات العاجلة." /><Rule title="المنسوبون" text="إدارة المشرفين ومنسوبي المساجد وربطهم بالمواقع." /></CardContent></Card>
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
          {visibleSites.length === 0 ? <Empty text="لا توجد مساجد أو مصليات مسجلة" /> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{visibleSites.map((site) => <SiteCard key={site.id} site={site} canEdit={canEdit && ['head', 'supervisor'].includes(role)} canDelete={canDelete && role === 'head'} onEdit={() => openSiteDialog(site)} onDelete={() => deleteSite(site)} onQr={() => setQrSite(site)} />)}</div>}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openRequestDialog}><Plus className="ml-2 h-4 w-4" />الإبلاغ عن مشكلة / طلب صيانة أو احتياج</Button></div>}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{requests.map((item) => <WorkflowCard key={item.id} title={item.requestNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[requestTypeLabels[item.requestType] || item.requestType, priorityLabels[item.priority] || item.priority]} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('request', item) : undefined} />)}</div>
          {!requests.length && <Empty text="لا توجد طلبات مسجلة" />}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{tickets.map((item) => <WorkflowCard key={item.id} title={item.ticketNumber} subtitle={item.site?.name || ''} description={item.description} status={item.status} meta={[ticketTypeLabels[item.ticketType] || item.ticketType, item.reporterPhone || item.reporterEmail || 'مبلغ مجهول']} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('ticket', item) : undefined} extraAction={['head', 'supervisor'].includes(role) && !item.convertedRequestId ? <Button variant="outline" size="sm" className={button3d} onClick={() => convertTicket(item)}><Wrench className="ml-1 h-3.5 w-3.5" />تحويل إلى صيانة</Button> : item.convertedRequestId ? <Badge variant="outline">مرتبط بطلب صيانة</Badge> : null} />)}</div>
          {!tickets.length && <Empty text="لا توجد بلاغات مسجلة" />}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          {role === 'personnel' && <div className="flex justify-end"><Button className={button3d} onClick={openLeaveDialog}><Plus className="ml-2 h-4 w-4" />طلب إجازة / اعتذار</Button></div>}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{leaves.map((item) => <WorkflowCard key={item.id} title={item.leaveNumber} subtitle={item.site?.name || ''} description={`${leaveTypeLabels[item.requestType] || item.requestType} — البديل: ${item.replacementName}`} status={item.status} meta={[new Date(item.startDate).toLocaleDateString('ar-SA'), new Date(item.endDate).toLocaleDateString('ar-SA')]} onStatus={['head', 'supervisor'].includes(role) ? () => openStatusDialog('leave', item) : undefined} />)}</div>
          {!leaves.length && <Empty text="لا توجد طلبات إجازة أو اعتذار" />}
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
          {['head', 'supervisor'].includes(role) && <div className="flex justify-end"><Button className={button3d} onClick={() => { setPersonnelForm({ siteId: sites[0]?.id || '', name: '', role: 'imam', mobile: '', email: '' }); setPersonnelDialog(true); }}><UserPlus className="ml-2 h-4 w-4" />إضافة منسوب مسجد / جامع / مصلى</Button></div>}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{personnel.map((item) => <Card key={item.id} className={card3d}><CardContent className="p-5"><div className="flex items-start justify-between"><div><h3 className="font-black">{item.name}</h3><p className="text-sm text-muted-foreground">{item.site?.name}</p></div><Badge variant="outline">{personnelRoleLabels[item.role] || item.role}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Info label="الجوال" value={item.mobile || '-'} /><Info label="البريد" value={item.email || '-'} /></div></CardContent></Card>)}</div>
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
                {role === 'head' && <Field label="المشرف المسؤول عن الموقع"><NativeSelect className="h-11" value={siteForm.supervisorUserId || ''} onChange={(e) => setSiteForm({ ...siteForm, supervisorUserId: e.target.value })}><option value="">بدون إسناد حالي</option>{staffUsers.filter((user) => user.moduleRole === 'supervisor').map((user) => <option key={user.uid} value={user.uid}>{user.username}</option>)}</NativeSelect></Field>}
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

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-h-[90vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-violet-50/20 sm:max-w-[760px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-violet-50/50 p-5 text-right"><DialogTitle className="text-xl font-black">تحديث حالة الإجراء</DialogTitle><DialogDescription>{statusTarget?.item?.requestNumber || statusTarget?.item?.ticketNumber || statusTarget?.item?.leaveNumber || statusTarget?.item?.applicationNumber}</DialogDescription></DialogHeader>
          <div className="space-y-5 overflow-y-auto p-5 md:p-6"><Card className="border-sky-200/70 bg-white/90"><CardContent className="space-y-4 pt-5"><Field label="الحالة الجديدة"><NativeSelect className="h-11" value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>{statusTarget ? transitionsFor(statusTarget.kind, statusTarget.item.status).filter((s) => !(s === 'approved' && role !== 'head')).map((s) => <option key={s} value={s}>{statusLabels[s] || s}</option>) : null}</NativeSelect></Field><Field label={['rejected', 'returned_for_edit'].includes(statusValue) ? 'السبب / الملاحظة *' : 'ملاحظة الإجراء'}><Textarea rows={5} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="دوّن المبرر أو الملاحظة المرتبطة بالإجراء..." /></Field>{statusTarget?.kind === 'request' && statusValue === 'completed' && <Field label="إثبات الإنجاز *"><Input className="h-11" type="file" accept="image/*,application/pdf" onChange={(e) => setStatusEvidence(e.target.files?.[0] || null)} /></Field>}</CardContent></Card></div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setStatusDialog(false)}>إلغاء</Button><Button className={button3d} onClick={applyStatus} disabled={saving}>{saving ? 'جاري التحديث...' : 'تحديث الحالة'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(qrSite)} onOpenChange={(open) => !open && setQrSite(null)}>
        <DialogContent dir="rtl" className="sm:max-w-[620px]">
          <DialogHeader><DialogTitle>QR / الباركود التلقائي — {qrSite?.name}</DialogTitle><DialogDescription>يُنشأ الرمز تلقائيًا مع سجل المسجد أو الجامع أو المصلى، ويرتبط بالسجل الدائم لعرض أحدث بياناته وتقديم البلاغات.</DialogDescription></DialogHeader>
          {qrSite && <div className="space-y-4">
            <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white p-6"><QRCodeSVG value={publicUrlForSite(qrSite)} size={240} level="M" includeMargin /><p className="break-all text-center text-xs text-muted-foreground" dir="ltr">{publicUrlForSite(qrSite)}</p></div>
            <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="النوع" value={siteTypeLabels[qrSite.siteType] || qrSite.siteType} /><Info label="الموقع" value={[qrSite.campusLocation, qrSite.city, qrSite.district].filter(Boolean).join(' — ') || '-'} /><Info label="المساحة" value={qrSite.area ? `${qrSite.area} م²` : '-'} /><Info label="الإحداثيات" value={qrSite.latitude != null && qrSite.longitude != null ? `${qrSite.latitude}, ${qrSite.longitude}` : '-'} /></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">الرمز دائم ولا يحتاج إلى إعادة إنشائه عند تعديل بيانات الموقع؛ لأنه يفتح السجل الحالي عبر رمز عام آمن، ولا يضع بيانات الموظفين أو البيانات الداخلية داخل الباركود.</div>
            <div className="flex justify-end"><Button variant="outline" className={button3d} onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة الرمز</Button></div>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={personnelDialog} onOpenChange={setPersonnelDialog}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 gap-0 border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 sm:max-w-[900px]" dir="rtl">
          <DialogHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-emerald-50/60 p-5 text-right md:p-6"><DialogTitle className="flex items-center gap-2 text-xl font-black md:text-2xl"><UserPlus className="h-5 w-5 text-sky-700" />إضافة منسوب مسجد / جامع / مصلى</DialogTitle><DialogDescription>يتم إنشاء أو ربط حساب دخول للمنسوب بواسطة رئيس الوحدة أو المشرف، ثم ربطه بالموقع وصفته التشغيلية.</DialogDescription></DialogHeader>
          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-6">
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-violet-50/40 pb-4"><CardTitle className="text-base md:text-lg">الارتباط والصفة</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><Field label="المسجد / المصلى *"><NativeSelect className="h-11" value={personnelForm.siteId} onChange={(e) => setPersonnelForm({ ...personnelForm, siteId: e.target.value })}><option value="">اختر الموقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect></Field><Field label="الصفة *"><NativeSelect className="h-11" value={personnelForm.role} onChange={(e) => setPersonnelForm({ ...personnelForm, role: e.target.value })}><option value="imam">إمام</option><option value="muezzin">مؤذن</option><option value="khateeb">خطيب</option><option value="collaborating_khateeb">خطيب متعاون</option></NativeSelect></Field></CardContent></Card>
            <Card className="overflow-hidden border-sky-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"><CardHeader className="border-b border-sky-100 bg-gradient-to-l from-sky-50/90 via-white to-emerald-50/40 pb-4"><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Users className="h-5 w-5" />بيانات المنسوب</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-2"><div className="md:col-span-2"><Field label="الاسم الكامل *"><Input className="h-11" autoFocus value={personnelForm.name} onChange={(e) => setPersonnelForm({ ...personnelForm, name: e.target.value })} placeholder="الاسم الرباعي" /></Field></div><Field label="رقم الجوال"><Input className="h-11" type="tel" inputMode="tel" value={personnelForm.mobile} onChange={(e) => setPersonnelForm({ ...personnelForm, mobile: e.target.value })} placeholder="05xxxxxxxx" /></Field><Field label="البريد الإلكتروني *"><Input className="h-11" type="email" inputMode="email" value={personnelForm.email} onChange={(e) => setPersonnelForm({ ...personnelForm, email: e.target.value })} placeholder="name@iau.edu.sa" /></Field></CardContent></Card>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm leading-6 text-slate-700"><strong>حساب منسوب المسجد:</strong> عند الحفظ يتم إنشاء حساب دخول جديد إذا لم يكن البريد مسجلًا، أو ربط الحساب الموجود. الحساب يمنح المنسوب الدخول إلى موقعه فقط لتقديم طلب صيانة/احتياج، إجازة أو اعتذار، متابعة طلباته واستقبال الإشعارات. ويستلم الحساب الجديد رابط التفعيل وبيانات الدخول عبر البريد الإلكتروني.</div>
          </div>
          <DialogFooter className="border-t border-sky-100 bg-white/95 p-4 md:px-6"><Button variant="outline" className={button3d} onClick={() => setPersonnelDialog(false)}>إلغاء</Button><Button className={'min-w-32 ' + button3d} onClick={savePersonnel} disabled={saving}><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ المنسوب'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

          </div>
  );
};

const Stat = ({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) => <Card className={card3d}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-black text-slate-800">{value}</p></div><div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-sky-700 shadow-sm"><Icon className="h-5 w-5" /></div></CardContent></Card>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>;
const Empty = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-muted-foreground"><Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>{text}</p></div>;
const Rule = ({ title, text }: { title: string; text: string }) => <div className="rounded-2xl border bg-white p-4"><p className="font-bold text-slate-800">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>;
const ReportMetric = ({ label, value }: { label: string; value: number }) => <div className="rounded-2xl border bg-gradient-to-b from-white to-sky-50 p-5 text-center shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black text-slate-800">{value}</p></div>;
const MiniRow = ({ title, subtitle, status }: { title: string; subtitle: string; status: string }) => <div className="flex items-start justify-between gap-3 rounded-2xl border bg-white p-3"><div className="min-w-0"><p className="truncate font-bold">{title}</p><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div>;

const SiteCard = ({ site, canEdit, canDelete, onEdit, onDelete, onQr }: { site: MosqueSite; canEdit: boolean; canDelete: boolean; onEdit: () => void; onDelete: () => void; onQr: () => void }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-emerald-400 via-sky-500 to-blue-800" /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Badge variant="outline" className="mb-2">{siteTypeLabels[site.siteType]}</Badge><h3 className="text-lg font-black text-slate-800">{site.name}</h3><p className="mt-1 text-sm text-muted-foreground">{site.city || '-'} — {site.district || '-'}</p></div><Badge variant="outline" className={site.status === 'active' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : site.status === 'maintenance' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-300 bg-slate-50'}>{siteStatusLabels[site.status]}</Badge></div><div className="my-4 grid grid-cols-2 gap-3 rounded-2xl border bg-slate-50/70 p-3 text-sm"><Info label="الموقع داخل الجامعة" value={site.campusLocation || '-'} /><Info label="المساحة" value={site.area ? `${site.area.toLocaleString('ar-SA')} م²` : '-'} /><Info label="الإمام" value={site.imamName || '-'} /><Info label="المؤذن" value={site.muezzinName || '-'} /><Info label="الطلبات" value={site._count?.requests || 0} /><Info label="البلاغات" value={site._count?.tickets || 0} /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Button variant="outline" className={button3d} onClick={onQr}><QrCode className="ml-1 h-4 w-4" />QR</Button>{site.latitude != null && site.longitude != null && <Button variant="outline" className={button3d} onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')}><MapPin className="ml-1 h-4 w-4" />الخريطة</Button>}{canEdit && <Button variant="outline" className={button3d} onClick={onEdit}>تعديل</Button>}{canDelete && <Button variant="outline" className="border-red-300 text-red-600" onClick={onDelete}>حذف</Button>}</div></CardContent></Card>;

const WorkflowCard = ({ title, subtitle, description, status, meta, onStatus, extraAction }: { title: string; subtitle: string; description: string; status: string; meta: string[]; onStatus?: () => void; extraAction?: React.ReactNode }) => <Card className={`${card3d} overflow-hidden`}><div className="h-1.5 bg-gradient-to-l from-sky-400 via-blue-600 to-slate-800" /><CardContent className="flex min-h-[265px] flex-col p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{title}</p><h3 className="mt-1 font-black text-slate-800">{subtitle}</h3></div><Badge variant="outline" className={statusBadgeClass(status)}>{statusLabels[status] || status}</Badge></div><p className="mt-4 line-clamp-3 rounded-2xl border bg-slate-50/80 p-3 text-sm leading-6 text-slate-700">{description}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">{meta.map((x, i) => <span key={i} className="rounded-xl border bg-white p-2">{x || '-'}</span>)}</div><div className="mt-auto flex flex-wrap gap-2 border-t pt-4">{onStatus && <Button variant="outline" size="sm" className={button3d} onClick={onStatus}><RefreshCw className="ml-1 h-3.5 w-3.5" />تحديث الحالة</Button>}{extraAction}</div></CardContent></Card>;
