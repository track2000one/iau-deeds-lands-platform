import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
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
import { NativeSelect } from './ui/native-select';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import {
  mosqueApi,
  type MosqueCompletionTask,
  type MosqueCompletionTaskAnalytics,
  type MosqueCompletionTaskAssignee,
  type MosqueFieldVisit,
  type MosqueSite,
  type MosqueSiteMediaLibrary,
} from '../api/mosques';

type CompletenessState = 'complete' | 'review' | 'incomplete';
type PriorityBand = 'urgent' | 'high' | 'medium' | 'normal';
type TaskTimingFilter = 'all' | 'overdue' | 'today' | 'soon' | 'unassigned';

type MissingKey =
  | 'identity'
  | 'gender'
  | 'building'
  | 'location'
  | 'coordinates'
  | 'area'
  | 'capacity'
  | 'contact'
  | 'photos'
  | 'documents'
  | 'women_verification'
  | 'women_details'
  | 'visit';

type MissingItem = {
  key: MissingKey;
  label: string;
};

type CompletenessRow = {
  site: MosqueSite;
  score: number;
  state: CompletenessState;
  missing: MissingItem[];
  completedChecks: number;
  totalChecks: number;
  photoCount: number;
  documentCount: number;
  latestVisit: MosqueFieldVisit | null;
};

type PriorityRow = CompletenessRow & {
  priorityScore: number;
  priorityBand: PriorityBand;
  activeTasks: MosqueCompletionTask[];
  overdueTasks: MosqueCompletionTask[];
};

type MosqueDataCompletenessCenterProps = {
  sites: MosqueSite[];
  canEdit: boolean;
  onOpenSite: (site: MosqueSite) => void;
  onFixMissing: (site: MosqueSite, target: string) => void;
  onGoToVisits: () => void;
  taskTimingFilter: TaskTimingFilter;
  onTaskTimingFilterChange: (filter: TaskTimingFilter) => void;
};

const missingCatalog: Array<{ key: MissingKey; label: string; weight: number }> = [
  { key: 'identity', label: 'اسم الموقع', weight: 20 },
  { key: 'gender', label: 'فئة المصلى', weight: 14 },
  { key: 'building', label: 'ربط المبنى', weight: 16 },
  { key: 'location', label: 'بيانات الموقع', weight: 10 },
  { key: 'coordinates', label: 'الإحداثيات', weight: 18 },
  { key: 'area', label: 'المساحة', weight: 8 },
  { key: 'capacity', label: 'السعة', weight: 8 },
  { key: 'contact', label: 'التواصل / المسؤول', weight: 10 },
  { key: 'photos', label: 'الصور', weight: 8 },
  { key: 'documents', label: 'المستندات', weight: 12 },
  { key: 'women_verification', label: 'التحقق من مصلى النساء', weight: 18 },
  { key: 'women_details', label: 'تفاصيل مصلى النساء', weight: 10 },
  { key: 'visit', label: 'الزيارة الميدانية', weight: 20 },
];

const missingLabelByKey = Object.fromEntries(missingCatalog.map((item) => [item.key, item.label])) as Record<MissingKey, string>;
const missingWeightByKey = Object.fromEntries(missingCatalog.map((item) => [item.key, item.weight])) as Record<MissingKey, number>;

const focusTargetByMissingKey: Partial<Record<MissingKey, string>> = {
  identity: 'identity',
  gender: 'gender',
  building: 'building',
  location: 'location',
  coordinates: 'coordinates',
  area: 'area',
  capacity: 'capacity',
  contact: 'contact',
  photos: 'media-photo',
  documents: 'media-document',
  women_verification: 'women',
  women_details: 'women',
};

const stateLabel: Record<CompletenessState, string> = {
  complete: 'مكتمل',
  review: 'يحتاج استكمال',
  incomplete: 'ناقص',
};

const stateClass: Record<CompletenessState, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
  incomplete: 'border-rose-200 bg-rose-50 text-rose-800',
};

const priorityLabel: Record<PriorityBand, string> = {
  urgent: 'عاجلة',
  high: 'عالية',
  medium: 'متوسطة',
  normal: 'عادية',
};

const priorityClass: Record<PriorityBand, string> = {
  urgent: 'border-rose-300 bg-rose-50 text-rose-800',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-700',
};

const taskStatusLabel: Record<MosqueCompletionTask['status'], string> = {
  open: 'مفتوحة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

const taskStatusClass: Record<MosqueCompletionTask['status'], string> = {
  open: 'border-sky-200 bg-sky-50 text-sky-800',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-600',
};

const activeTaskStatuses = new Set<MosqueCompletionTask['status']>(['open', 'in_progress']);

const siteTypeLabel = (site: MosqueSite) => {
  if (site.siteType === 'jami') return 'جامع';
  if (site.siteType === 'mosque') return 'مسجد';
  if (site.prayerRoomGender === 'women') return 'مصلى نساء';
  if (site.prayerRoomGender === 'men') return 'مصلى رجال';
  return 'مصلى';
};

const womenPresence = (site: MosqueSite): 'present' | 'verified_absent' | 'unverified' => {
  if (!['mosque', 'jami'].includes(site.siteType)) return 'verified_absent';
  if (site.womenPrayerArea?.presenceStatus) return site.womenPrayerArea.presenceStatus;
  if (site.hasWomenPrayerArea) return 'present';
  return 'unverified';
};

const mediaCounts = (site: MosqueSite) => {
  if (!site.images) return { photos: 0, documents: 0 };
  if (Array.isArray(site.images)) return { photos: site.images.filter(Boolean).length, documents: 0 };
  const library = site.images as MosqueSiteMediaLibrary;
  return {
    photos: Array.isArray(library.photos) ? library.photos.length : 0,
    documents: Array.isArray(library.documents) ? library.documents.length : 0,
  };
};

const validNumber = (value: unknown) =>
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value))
  && Number(value) > 0;

const formatDate = (value?: string | null) => {
  if (!value) return 'غير محدد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const RIYADH_TIME_ZONE = 'Asia/Riyadh';
const riyadhDateKey = (value: Date | string = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: RIYADH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};
const calendarDayNumber = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};
const daysUntilTaskDue = (task: MosqueCompletionTask) => {
  if (!task.dueDate || !activeTaskStatuses.has(task.status)) return null;
  return calendarDayNumber(riyadhDateKey(task.dueDate)) - calendarDayNumber(riyadhDateKey());
};
const isTaskOverdue = (task: MosqueCompletionTask) => {
  const days = daysUntilTaskDue(task);
  return days !== null && days < 0;
};

const bandFromScore = (score: number): PriorityBand => {
  if (score >= 65) return 'urgent';
  if (score >= 45) return 'high';
  if (score >= 25) return 'medium';
  return 'normal';
};

const taskPriorityFromBand = (band: PriorityBand): MosqueCompletionTask['priority'] => band;

const emptyTaskForm = {
  missingKey: '' as MissingKey | '',
  priority: 'medium' as MosqueCompletionTask['priority'],
  assignedToUserId: '',
  dueDate: '',
  description: '',
  status: 'open' as MosqueCompletionTask['status'],
  completionNote: '',
};

export const MosqueDataCompletenessCenter: React.FC<MosqueDataCompletenessCenterProps> = ({
  sites,
  canEdit,
  onOpenSite,
  onFixMissing,
  onGoToVisits,
  taskTimingFilter,
  onTaskTimingFilterChange,
}) => {
  const [visits, setVisits] = useState<MosqueFieldVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsAvailable, setVisitsAvailable] = useState(true);

  const [tasks, setTasks] = useState<MosqueCompletionTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksAvailable, setTasksAvailable] = useState(true);

  const [analyticsMonth, setAnalyticsMonth] = useState(riyadhDateKey().slice(0, 7));
  const [analytics, setAnalytics] = useState<MosqueCompletionTaskAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | CompletenessState>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mosques' | 'prayer_rooms'>('all');
  const [missingFilter, setMissingFilter] = useState<'all' | MissingKey>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityBand>('all');
  const [sortMode, setSortMode] = useState<'priority' | 'completion' | 'name'>('priority');

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogRow, setTaskDialogRow] = useState<PriorityRow | null>(null);
  const [editingTask, setEditingTask] = useState<MosqueCompletionTask | null>(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskAssignees, setTaskAssignees] = useState<MosqueCompletionTaskAssignee[]>([]);
  const [taskAssigneesLoading, setTaskAssigneesLoading] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);

  const loadVisits = async () => {
    setVisitsLoading(true);
    try {
      const rows = await mosqueApi.fieldVisits();
      setVisits(rows || []);
      setVisitsAvailable(true);
    } catch {
      setVisits([]);
      setVisitsAvailable(false);
    } finally {
      setVisitsLoading(false);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const rows = await mosqueApi.completionTasks();
      setTasks(rows || []);
      setTasksAvailable(true);
    } catch {
      setTasks([]);
      setTasksAvailable(false);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadAnalytics = async (month = analyticsMonth) => {
    setAnalyticsLoading(true);
    try {
      setAnalytics(await mosqueApi.completionTaskAnalytics(month));
    } catch (error) {
      setAnalytics(null);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مؤشرات أداء مهام الاستكمال');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadVisits();
    void loadTasks();
  }, []);

  useEffect(() => {
    void loadAnalytics(analyticsMonth);
  }, [analyticsMonth]);

  const latestVisitBySite = useMemo(() => {
    const map = new Map<string, MosqueFieldVisit>();
    for (const visit of visits) {
      const current = map.get(visit.siteId);
      const visitTime = new Date(visit.visitDate || visit.updatedAt || visit.createdAt).getTime();
      const currentTime = current
        ? new Date(current.visitDate || current.updatedAt || current.createdAt).getTime()
        : -1;
      if (!current || visitTime > currentTime) map.set(visit.siteId, visit);
    }
    return map;
  }, [visits]);

  const baseRows = useMemo<CompletenessRow[]>(() => sites.map((site) => {
    const missing: MissingItem[] = [];
    const media = mediaCounts(site);
    const latestVisit = latestVisitBySite.get(site.id) || null;
    const checks: Array<MissingItem & { ok: boolean }> = [];

    checks.push({ key: 'identity', label: 'اسم الموقع', ok: Boolean(site.name?.trim()) });
    checks.push({
      key: 'gender',
      label: 'تحديد نوع المصلى (رجال/نساء)',
      ok: site.siteType === 'prayer_room' ? Boolean(site.prayerRoomGender) : true,
    });

    const insideBuilding = site.spatialRelation === 'inside_building';
    if (insideBuilding) {
      checks.push({ key: 'building', label: 'ربط المبنى', ok: Boolean(site.buildingId) });
    } else {
      checks.push({
        key: 'location',
        label: 'بيانات الموقع',
        ok: Boolean(site.campusLocation || site.city || site.district),
      });
    }

    checks.push({
      key: 'coordinates',
      label: 'الإحداثيات',
      ok: site.latitude !== null
        && site.latitude !== undefined
        && site.longitude !== null
        && site.longitude !== undefined
        && Number.isFinite(Number(site.latitude))
        && Number.isFinite(Number(site.longitude)),
    });
    checks.push({ key: 'area', label: 'المساحة', ok: validNumber(site.area) });
    checks.push({ key: 'capacity', label: 'السعة', ok: validNumber(site.capacity) });
    checks.push({
      key: 'contact',
      label: 'المسؤول أو وسيلة التواصل',
      ok: Boolean(
        site.supervisorName
        || site.coordinatorName
        || site.imamName
        || site.muezzinName
        || site.khateebName
        || site.contactPhone
      ),
    });
    checks.push({ key: 'photos', label: 'صورة واحدة على الأقل', ok: media.photos > 0 });
    checks.push({ key: 'documents', label: 'مستند واحد على الأقل', ok: media.documents > 0 });

    if (['mosque', 'jami'].includes(site.siteType)) {
      const presence = womenPresence(site);
      checks.push({
        key: 'women_verification',
        label: 'التحقق من وجود مصلى النساء',
        ok: presence !== 'unverified',
      });
      if (presence === 'present') {
        checks.push({
          key: 'women_details',
          label: 'تفاصيل مصلى النساء',
          ok: Boolean(
            validNumber(site.womenPrayerArea?.capacity)
            || site.womenPrayerArea?.locationDescription
            || site.womenPrayerArea?.floor
          ),
        });
      }
    }

    if (visitsAvailable) {
      checks.push({ key: 'visit', label: 'زيارة ميدانية مسجلة', ok: Boolean(latestVisit) });
    }

    for (const check of checks) {
      if (!check.ok) missing.push({ key: check.key, label: check.label });
    }

    const completedChecks = checks.length - missing.length;
    const score = checks.length ? Math.round((completedChecks / checks.length) * 100) : 100;
    const state: CompletenessState = score >= 90 ? 'complete' : score >= 65 ? 'review' : 'incomplete';

    return {
      site,
      score,
      state,
      missing,
      completedChecks,
      totalChecks: checks.length,
      photoCount: media.photos,
      documentCount: media.documents,
      latestVisit,
    };
  }), [sites, latestVisitBySite, visitsAvailable]);

  const priorityRows = useMemo<PriorityRow[]>(() => baseRows.map((row) => {
    const siteTasks = tasks.filter((task) => task.siteId === row.site.id);
    const activeTasks = siteTasks.filter((task) => activeTaskStatuses.has(task.status));
    const overdueTasks = activeTasks.filter(isTaskOverdue);

    const baseNeed = 100 - row.score;
    const weightedGaps = row.missing.reduce((sum, item) => sum + (missingWeightByKey[item.key] || 0), 0);
    const taskUrgency = activeTasks.reduce((sum, task) => {
      if (task.priority === 'urgent') return sum + 10;
      if (task.priority === 'high') return sum + 6;
      return sum;
    }, 0);
    const overdueBonus = overdueTasks.length ? Math.min(25, overdueTasks.length * 12) : 0;

    const priorityScore = row.missing.length
      ? Math.min(100, Math.round(baseNeed + Math.min(38, weightedGaps * 0.45) + taskUrgency + overdueBonus))
      : 0;

    return {
      ...row,
      priorityScore,
      priorityBand: bandFromScore(priorityScore),
      activeTasks,
      overdueTasks,
    };
  }), [baseRows, tasks]);

  const stats = useMemo(() => {
    const total = priorityRows.length;
    const average = total
      ? Math.round(priorityRows.reduce((sum, row) => sum + row.score, 0) / total)
      : 100;

    return {
      total,
      average,
      complete: priorityRows.filter((row) => row.state === 'complete').length,
      needsWork: priorityRows.filter((row) => row.state !== 'complete').length,
      missingCoordinates: priorityRows.filter((row) => row.missing.some((item) => item.key === 'coordinates')).length,
      missingDocuments: priorityRows.filter((row) => row.missing.some((item) => item.key === 'documents')).length,
      noVisit: visitsAvailable
        ? priorityRows.filter((row) => row.missing.some((item) => item.key === 'visit')).length
        : 0,
    };
  }, [priorityRows, visitsAvailable]);

  const priorityStats = useMemo(() => ({
    urgent: priorityRows.filter((row) => row.missing.length > 0 && row.priorityBand === 'urgent').length,
    high: priorityRows.filter((row) => row.missing.length > 0 && row.priorityBand === 'high').length,
    medium: priorityRows.filter((row) => row.missing.length > 0 && row.priorityBand === 'medium').length,
    activeTasks: tasks.filter((task) => activeTaskStatuses.has(task.status)).length,
    overdueTasks: tasks.filter(isTaskOverdue).length,
  }), [priorityRows, tasks]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = priorityRows.filter((row) => {
      if (stateFilter !== 'all' && row.state !== stateFilter) return false;
      if (priorityFilter !== 'all' && row.priorityBand !== priorityFilter) return false;
      if (typeFilter === 'mosques' && !['mosque', 'jami'].includes(row.site.siteType)) return false;
      if (typeFilter === 'prayer_rooms' && row.site.siteType !== 'prayer_room') return false;
      if (missingFilter !== 'all' && !row.missing.some((item) => item.key === missingFilter)) return false;
      if (taskTimingFilter !== 'all') {
        const matchesTiming = row.activeTasks.some((task) => {
          if (taskTimingFilter === 'unassigned') return !task.assignedToUserId;
          const days = daysUntilTaskDue(task);
          if (days === null) return false;
          if (taskTimingFilter === 'overdue') return days < 0;
          if (taskTimingFilter === 'today') return days === 0;
          return days >= 1 && days <= 3;
        });
        if (!matchesTiming) return false;
      }
      if (!q) return true;

      return [
        row.site.name,
        row.site.city,
        row.site.district,
        row.site.campusLocation,
        row.site.building?.name,
        row.site.building?.buildingNumber,
        siteTypeLabel(row.site),
        ...row.missing.map((item) => item.label),
        ...row.activeTasks.map((task) => task.assignedToName || ''),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });

    return result.sort((a, b) => {
      if (sortMode === 'completion') return a.score - b.score || b.priorityScore - a.priorityScore;
      if (sortMode === 'name') return a.site.name.localeCompare(b.site.name, 'ar', { numeric: true });
      return b.priorityScore - a.priorityScore || a.score - b.score;
    });
  }, [priorityRows, search, stateFilter, priorityFilter, typeFilter, missingFilter, taskTimingFilter, sortMode]);

  const topPriorityRows = useMemo(
    () => [...priorityRows]
      .filter((row) => row.missing.length > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore || a.score - b.score)
      .slice(0, 5),
    [priorityRows]
  );

  const resetFilters = () => {
    setSearch('');
    setStateFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setMissingFilter('all');
    onTaskTimingFilterChange('all');
    setSortMode('priority');
  };

  const handleMissingAction = (row: PriorityRow, item: MissingItem) => {
    if (item.key === 'visit') {
      onGoToVisits();
      return;
    }

    const target = focusTargetByMissingKey[item.key];
    if (canEdit && target) {
      onFixMissing(row.site, target);
      return;
    }

    onOpenSite(row.site);
  };

  const resetTaskFormForRow = (row: PriorityRow, preferredMissingKey?: MissingKey) => {
    const activeKeys = new Set(row.activeTasks.map((task) => task.missingKey));
    const missingKey = preferredMissingKey
      || row.missing.find((item) => !activeKeys.has(item.key))?.key
      || row.missing[0]?.key
      || '';

    setEditingTask(null);
    setTaskForm({
      ...emptyTaskForm,
      missingKey,
      priority: taskPriorityFromBand(row.priorityBand),
    });
  };

  const loadAssigneesForSite = async (siteId: string) => {
    setTaskAssigneesLoading(true);
    try {
      const rows = await mosqueApi.completionTaskAssignees(siteId);
      setTaskAssignees(rows || []);
    } catch (error) {
      setTaskAssignees([]);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل قائمة المسند إليهم');
    } finally {
      setTaskAssigneesLoading(false);
    }
  };

  const openTaskManager = (row: PriorityRow, preferredMissingKey?: MissingKey, task?: MosqueCompletionTask) => {
    setTaskDialogRow(row);
    setTaskDialogOpen(true);
    void loadAssigneesForSite(row.site.id);

    if (task) {
      setEditingTask(task);
      setTaskForm({
        missingKey: task.missingKey as MissingKey,
        priority: task.priority,
        assignedToUserId: task.assignedToUserId || '',
        dueDate: toDateInput(task.dueDate),
        description: task.description || '',
        status: task.status,
        completionNote: task.completionNote || '',
      });
      return;
    }

    resetTaskFormForRow(row, preferredMissingKey);
  };

  const startEditTask = (task: MosqueCompletionTask) => {
    setEditingTask(task);
    setTaskForm({
      missingKey: task.missingKey as MissingKey,
      priority: task.priority,
      assignedToUserId: task.assignedToUserId || '',
      dueDate: toDateInput(task.dueDate),
      description: task.description || '',
      status: task.status,
      completionNote: task.completionNote || '',
    });
  };

  const saveTask = async () => {
    if (!taskDialogRow) return;
    if (!taskForm.missingKey) {
      toast.error('حدد بند النقص المراد متابعته');
      return;
    }
    if (taskForm.status === 'completed' && !taskForm.completionNote.trim()) {
      toast.error('ملاحظة الإنجاز مطلوبة عند إكمال المهمة');
      return;
    }

    setTaskSaving(true);
    try {
      const label = missingLabelByKey[taskForm.missingKey] || taskForm.missingKey;
      const payload = {
        priority: taskForm.priority,
        assignedToUserId: taskForm.assignedToUserId || null,
        dueDate: taskForm.dueDate || null,
        description: taskForm.description.trim() || null,
      };

      if (editingTask) {
        await mosqueApi.updateCompletionTask(editingTask.id, {
          ...payload,
          status: taskForm.status,
          completionNote: taskForm.completionNote.trim() || null,
        });
        toast.success('تم تحديث مهمة الاستكمال');
      } else {
        await mosqueApi.createCompletionTask({
          siteId: taskDialogRow.site.id,
          missingKey: taskForm.missingKey,
          title: `استكمال: ${label} — ${taskDialogRow.site.name}`,
          ...payload,
        });
        toast.success('تم إنشاء مهمة المتابعة وإسنادها');
      }

      const updatedTasks = await mosqueApi.completionTasks();
      setTasks(updatedTasks || []);
      setTasksAvailable(true);
      void loadAnalytics(analyticsMonth);

      const refreshedActive = (updatedTasks || []).filter(
        (task) => task.siteId === taskDialogRow.site.id && activeTaskStatuses.has(task.status)
      );
      const refreshedRow: PriorityRow = {
        ...taskDialogRow,
        activeTasks: refreshedActive,
        overdueTasks: refreshedActive.filter(isTaskOverdue),
      };
      setTaskDialogRow(refreshedRow);
      resetTaskFormForRow(refreshedRow);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ مهمة الاستكمال');
    } finally {
      setTaskSaving(false);
    }
  };


  const exportMonthlyPerformanceReport = () => {
    if (!analytics) {
      toast.error('لا توجد بيانات أداء متاحة للتصدير');
      return;
    }

    const summaryRows = [
      ['التقرير', 'تقرير الأداء الشهري لمهام استكمال بيانات المساجد والمصليات'],
      ['الشهر', analytics.month],
      ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA')],
      [],
      ['المؤشر', 'القيمة'],
      ['مهام أنشئت خلال الشهر', analytics.summary.created],
      ['مهام أنجزت خلال الشهر', analytics.summary.completed],
      ['نسبة إنجاز المهام المنشأة', analytics.summary.completionRate + '%'],
      ['المهام النشطة حاليًا', analytics.summary.active],
      ['المهام المتأخرة حاليًا', analytics.summary.overdue],
      ['المستحقة اليوم', analytics.summary.dueToday],
      ['المستحقة خلال 3 أيام', analytics.summary.dueSoon],
      ['المهام غير المسندة', analytics.summary.unassigned],
      ['المهام المنجزة ضمن الموعد', analytics.summary.onTimeCompleted],
      ['المهام المنجزة ذات موعد محدد', analytics.summary.completedWithDueDate],
      ['نسبة الالتزام بالمواعيد', analytics.summary.onTimeRate == null ? 'لا تتوفر عينة' : analytics.summary.onTimeRate + '%'],
      ['متوسط مدة الإنجاز', analytics.summary.avgCompletionHours == null ? 'لا تتوفر بيانات' : (analytics.summary.avgCompletionHours / 24).toFixed(1) + ' يوم'],
    ];

    const assigneeRows = analytics.byAssignee.map((row, index) => ({
      'م': index + 1,
      'المسؤول': row.assigneeName,
      'مهام أنشئت': row.created,
      'مهام منجزة': row.completed,
      'مهام نشطة': row.active,
      'متأخرة': row.overdue,
      'مستحقة اليوم': row.dueToday,
      'منجزة ضمن الموعد': row.onTimeCompleted,
      'مهام منجزة ذات موعد': row.completedWithDueDate,
      'نسبة الالتزام بالمواعيد': row.onTimeRate == null ? '' : row.onTimeRate + '%',
      'متوسط مدة الإنجاز بالأيام': row.avgCompletionHours == null ? '' : Number((row.avgCompletionHours / 24).toFixed(1)),
    }));

    const gapRows = analytics.byMissingKey.map((row, index) => ({
      'م': index + 1,
      'نوع النقص': missingLabelByKey[row.missingKey as MissingKey] || row.missingKey,
      'إجمالي المهام': row.total,
      'أنشئت خلال الشهر': row.created,
      'أنجزت خلال الشهر': row.completed,
      'نشطة حاليًا': row.active,
      'متأخرة حاليًا': row.overdue,
    }));

    const trendRows = analytics.trend.map((row) => ({
      'الشهر': row.month,
      'مهام أنشئت': row.created,
      'مهام منجزة': row.completed,
      'نسبة الالتزام بالمواعيد': row.onTimeRate == null ? '' : row.onTimeRate + '%',
    }));

    const periodTaskMap = new Map<string, MosqueCompletionTask>();
    analytics.periodTasks.created.forEach((task) => periodTaskMap.set(task.id, task));
    analytics.periodTasks.completed.forEach((task) => periodTaskMap.set(task.id, task));
    const taskRows = [...periodTaskMap.values()]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((task, index) => ({
        'م': index + 1,
        'رقم المهمة': task.taskNumber,
        'الموقع': task.site?.name || '',
        'بند الاستكمال': missingLabelByKey[task.missingKey as MissingKey] || task.missingKey,
        'الأولوية': priorityLabel[task.priority],
        'الحالة': taskStatusLabel[task.status],
        'المسؤول': task.assignedToName || 'غير مسندة',
        'تاريخ الإنشاء': formatDate(task.createdAt),
        'موعد الإنجاز': task.dueDate ? formatDate(task.dueDate) : '',
        'تاريخ الإكمال': task.completedAt ? formatDate(task.completedAt) : '',
        'ملاحظة الإنجاز': task.completionNote || '',
      }));

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const assigneeSheet = XLSX.utils.json_to_sheet(assigneeRows);
    const gapSheet = XLSX.utils.json_to_sheet(gapRows);
    const trendSheet = XLSX.utils.json_to_sheet(trendRows);
    const tasksSheet = XLSX.utils.json_to_sheet(taskRows);

    for (const sheet of [summarySheet, assigneeSheet, gapSheet, trendSheet, tasksSheet]) {
      (sheet as any)['!views'] = [{ RTL: true }];
    }

    (summarySheet as any)['!cols'] = [{ wch: 40 }, { wch: 28 }];
    (assigneeSheet as any)['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 19 }, { wch: 21 }, { wch: 23 }, { wch: 24 }];
    (gapSheet as any)['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    (trendSheet as any)['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 24 }];
    (tasksSheet as any)['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 30 }, { wch: 34 }, { wch: 14 }, { wch: 16 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 42 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص التنفيذي');
    XLSX.utils.book_append_sheet(workbook, assigneeSheet, 'أداء المسؤولين');
    XLSX.utils.book_append_sheet(workbook, gapSheet, 'أنواع النواقص');
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'الاتجاه الشهري');
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'تفاصيل المهام');

    XLSX.writeFile(workbook, `IAU_Mosques_Completion_Performance_${analytics.month}.xlsx`);
  };

  const exportToExcel = () => {
    const detailRows = filteredRows.map((row, index) => ({
      'م': index + 1,
      'اسم الموقع': row.site.name,
      'التصنيف': siteTypeLabel(row.site),
      'المبنى / الموقع': row.site.building?.name
        || row.site.building?.buildingNumber
        || row.site.campusLocation
        || row.site.district
        || row.site.city
        || '',
      'نسبة الاكتمال': row.score,
      'حالة الاكتمال': stateLabel[row.state],
      'درجة الأولوية': row.priorityScore,
      'أولوية الاستكمال': priorityLabel[row.priorityBand],
      'البيانات الناقصة': row.missing.map((item) => item.label).join('، ') || 'لا توجد نواقص رئيسية',
      'مهام المتابعة النشطة': row.activeTasks.map((task) => task.taskNumber).join('، '),
      'المهام المتأخرة': row.overdueTasks.map((task) => task.taskNumber).join('، '),
      'المسند إليهم': [...new Set(row.activeTasks.map((task) => task.assignedToName).filter(Boolean))].join('، '),
      'عدد الصور': row.photoCount,
      'عدد المستندات': row.documentCount,
      'آخر زيارة': row.latestVisit ? formatDate(row.latestVisit.visitDate) : '',
      'رقم آخر زيارة': row.latestVisit?.visitNumber || '',
    }));

    const summaryRows = [
      ['المؤشر', 'القيمة'],
      ['إجمالي السجلات', stats.total],
      ['متوسط الاكتمال', stats.average + '%'],
      ['السجلات المكتملة', stats.complete],
      ['السجلات التي تحتاج استكمال', stats.needsWork],
      ['أولوية عاجلة', priorityStats.urgent],
      ['أولوية عالية', priorityStats.high],
      ['مهام متابعة نشطة', priorityStats.activeTasks],
      ['مهام متأخرة', priorityStats.overdueTasks],
      ['بدون إحداثيات', stats.missingCoordinates],
      ['بدون مستندات', stats.missingDocuments],
      ['بدون زيارة ميدانية', visitsAvailable ? stats.noVisit : 'تعذر تحميل سجل الزيارات'],
      ['السجلات الظاهرة حسب التصفية', filteredRows.length],
    ];

    const workbook = XLSX.utils.book_new();
    const detailsSheet = XLSX.utils.json_to_sheet(detailRows);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);

    (detailsSheet as any)['!views'] = [{ RTL: true }];
    (summarySheet as any)['!views'] = [{ RTL: true }];
    (detailsSheet as any)['!cols'] = [
      { wch: 6 }, { wch: 34 }, { wch: 16 }, { wch: 30 }, { wch: 16 },
      { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 55 }, { wch: 28 },
      { wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 },
    ];
    (summarySheet as any)['!cols'] = [{ wch: 34 }, { wch: 22 }];

    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'أولويات الاستكمال');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');

    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `IAU_Mosques_Data_Completeness_Priorities_${dateStamp}.xlsx`);
  };

  const taskHistoryForDialog = useMemo(() => {
    if (!taskDialogRow) return [];
    return tasks
      .filter((task) => task.siteId === taskDialogRow.site.id)
      .sort((a, b) => {
        const aActive = activeTaskStatuses.has(a.status) ? 1 : 0;
        const bActive = activeTaskStatuses.has(b.status) ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [tasks, taskDialogRow]);

  const activeTaskKeysForDialog = useMemo(
    () => new Set(taskHistoryForDialog.filter((task) => activeTaskStatuses.has(task.status)).map((task) => task.missingKey)),
    [taskHistoryForDialog]
  );

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">
                جودة البيانات وأولويات الاستكمال
              </Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <CheckCircle2 className="h-5 w-5" />
                مركز اكتمال بيانات المساجد والمصليات
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                يرتب المواقع حسب أولوية المعالجة، ويكشف النواقص، ويتيح تحويل أي نقص إلى مهمة متابعة مسندة بموعد إنجاز.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-[#d9c9a5] bg-white text-[#0b4a3f]"
                onClick={exportToExcel}
                disabled={!filteredRows.length}
              >
                <FileSpreadsheet className="ml-2 h-4 w-4" />
                تصدير Excel
              </Button>
              <Button
                variant="outline"
                className="border-[#d9c9a5] bg-white text-[#0b4a3f]"
                onClick={() => { void loadVisits(); void loadTasks(); }}
                disabled={visitsLoading || tasksLoading}
              >
                <RefreshCw className={(visitsLoading || tasksLoading) ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث
              </Button>
              <Button
                className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]"
                onClick={onGoToVisits}
              >
                <Clock3 className="ml-2 h-4 w-4" />
                الجولات والزيارات
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {!visitsAvailable && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              تعذر تحميل سجل الزيارات حاليًا؛ تم حساب نسبة الاكتمال دون احتساب الزيارة الميدانية.
            </div>
          )}

          {!tasksAvailable && (
            <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-bold leading-6 text-sky-900">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
              تعذر تحميل مهام المتابعة حاليًا. تبقى أولوية البيانات ظاهرة، لكن الإسناد والمتابعة مؤقتًا غير متاحين.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Metric label="متوسط الاكتمال" value={stats.average} suffix="%" icon={CheckCircle2} />
            <Metric label="إجمالي السجلات" value={stats.total} icon={Building2} />
            <Metric label="مكتملة" value={stats.complete} icon={CheckCircle2} />
            <Metric label="تحتاج استكمال" value={stats.needsWork} icon={AlertTriangle} />
            <Metric label="بدون إحداثيات" value={stats.missingCoordinates} icon={MapPin} />
            <Metric
              label={visitsAvailable ? 'بدون زيارة' : 'بدون مستندات'}
              value={visitsAvailable ? stats.noVisit : stats.missingDocuments}
              icon={visitsAvailable ? Clock3 : FileText}
            />
          </div>

          <div className="rounded-[24px] border border-[#d9c9a5] bg-gradient-to-l from-[#fffaf0] via-white to-[#f2fbf8] p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-lg font-black text-[#0b4a3f]">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  مركز أولويات الاستكمال
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  تعتمد الأولوية على نسبة النقص، أهمية البيانات المفقودة، أولوية المهام المسندة، وتأخر موعد الإنجاز.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <PriorityChip label="عاجلة" value={priorityStats.urgent} band="urgent" onClick={() => setPriorityFilter('urgent')} />
                <PriorityChip label="عالية" value={priorityStats.high} band="high" onClick={() => setPriorityFilter('high')} />
                <PriorityChip label="متوسطة" value={priorityStats.medium} band="medium" onClick={() => setPriorityFilter('medium')} />
                <button
                  type="button"
                  className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-800"
                  onClick={() => setSortMode('priority')}
                >
                  {priorityStats.activeTasks} مهمة نشطة
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-800"
                  onClick={() => setSortMode('priority')}
                >
                  {priorityStats.overdueTasks} متأخرة
                </button>
              </div>
            </div>

            {topPriorityRows.length > 0 && (
              <div className="grid gap-3 lg:grid-cols-5">
                {topPriorityRows.map((row, index) => (
                  <button
                    key={row.site.id}
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-[#d6b46a]"
                    onClick={() => canEdit && tasksAvailable ? openTaskManager(row) : onOpenSite(row.site)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0b4a3f] text-[11px] font-black text-white">{index + 1}</span>
                      <Badge variant="outline" className={priorityClass[row.priorityBand]}>{priorityLabel[row.priorityBand]}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-black text-slate-800">{row.site.name}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>اكتمال {row.score}%</span>
                      <span>أولوية {row.priorityScore}</span>
                    </div>
                    <Progress value={row.priorityScore} className="mt-2 h-1.5" />
                    <p className="mt-2 text-[10px] font-bold text-slate-400">{row.missing.length} بند ناقص · {row.activeTasks.length} مهمة نشطة</p>
                  </button>
                ))}
              </div>
            )}
          </div>


          <Card className="overflow-hidden rounded-[24px] border border-[#d9c9a5] bg-white shadow-sm">
            <CardHeader className="border-b border-[#eadfc8] bg-gradient-to-l from-[#fffaf0] via-white to-[#f2fbf8] pb-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-[#0b4a3f]">
                    <BarChart3 className="h-5 w-5" />
                    لوحة أداء مهام الاستكمال
                  </CardTitle>
                  <CardDescription className="mt-1">
                    مؤشرات شهرية لسرعة الإنجاز، الالتزام بالمواعيد، أداء المسؤولين وأكثر أنواع النواقص تكرارًا.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="h-10 w-[165px] border-[#d9c9a5] bg-white"
                    type="month"
                    value={analyticsMonth}
                    onChange={(event) => setAnalyticsMonth(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    className="border-[#d9c9a5] bg-white text-[#0b4a3f]"
                    onClick={() => void loadAnalytics(analyticsMonth)}
                    disabled={analyticsLoading}
                  >
                    <RefreshCw className={analyticsLoading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                    تحديث المؤشرات
                  </Button>
                  <Button
                    className="bg-[#0b4a3f] text-white hover:bg-[#126152]"
                    onClick={exportMonthlyPerformanceReport}
                    disabled={!analytics || analyticsLoading}
                  >
                    <FileSpreadsheet className="ml-2 h-4 w-4" />
                    التقرير الشهري
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4 sm:p-5">
              {analyticsLoading ? (
                <div className="flex min-h-32 items-center justify-center text-sm font-bold text-slate-500">
                  <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
                  جاري احتساب مؤشرات الأداء...
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    <PerformanceMetric label="مهام أنشئت" value={analytics.summary.created} />
                    <PerformanceMetric label="مهام منجزة" value={analytics.summary.completed} />
                    <PerformanceMetric label="معدل الإنجاز" value={analytics.summary.completionRate} suffix="%" />
                    <PerformanceMetric label="الالتزام بالموعد" value={analytics.summary.onTimeRate == null ? '—' : analytics.summary.onTimeRate} suffix={analytics.summary.onTimeRate == null ? '' : '%'} />
                    <PerformanceMetric label="متوسط الإنجاز" value={analytics.summary.avgCompletionHours == null ? '—' : (analytics.summary.avgCompletionHours / 24).toFixed(1)} suffix={analytics.summary.avgCompletionHours == null ? '' : ' يوم'} />
                    <PerformanceMetric label="متأخرة حاليًا" value={analytics.summary.overdue} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-black text-slate-800">أداء المسؤولين</p>
                        <p className="mt-1 text-[11px] text-slate-500">يقاس الإنجاز الفعلي ونسبة الالتزام بالموعد ومتوسط مدة الإغلاق.</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-right text-xs">
                          <thead className="bg-white text-[10px] font-black text-slate-500">
                            <tr>
                              <th className="px-3 py-3">المسؤول</th>
                              <th className="px-3 py-3">منجزة</th>
                              <th className="px-3 py-3">نشطة</th>
                              <th className="px-3 py-3">متأخرة</th>
                              <th className="px-3 py-3">الالتزام</th>
                              <th className="px-3 py-3">متوسط الإنجاز</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {analytics.byAssignee.slice(0, 10).map((row) => (
                              <tr key={row.assigneeUserId || row.assigneeName}>
                                <td className="px-3 py-3 font-black text-slate-800">{row.assigneeName}</td>
                                <td className="px-3 py-3 text-slate-600">{row.completed}</td>
                                <td className="px-3 py-3 text-slate-600">{row.active}</td>
                                <td className="px-3 py-3"><span className={row.overdue ? 'font-black text-rose-700' : 'text-slate-500'}>{row.overdue}</span></td>
                                <td className="px-3 py-3">{row.onTimeRate == null ? '—' : `${row.onTimeRate}%`}</td>
                                <td className="px-3 py-3">{row.avgCompletionHours == null ? '—' : `${(row.avgCompletionHours / 24).toFixed(1)} يوم`}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
                      <p className="text-sm font-black text-slate-800">أكثر أنواع النقص تكرارًا</p>
                      <p className="mt-1 text-[11px] text-slate-500">بحسب المهام التي أُنشئت خلال الشهر المحدد.</p>
                      <div className="mt-4 space-y-3">
                        {analytics.byMissingKey.slice(0, 6).length ? analytics.byMissingKey.slice(0, 6).map((row) => {
                          const max = Math.max(...analytics.byMissingKey.map((item) => item.created), 1);
                          const percent = Math.max(4, Math.round((row.created / max) * 100));
                          return (
                            <div key={row.missingKey}>
                              <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                                <span className="font-bold text-slate-700">{missingLabelByKey[row.missingKey as MissingKey] || row.missingKey}</span>
                                <strong className="text-[#0b4a3f]">{row.created}</strong>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-[#0b4a3f]" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        }) : <p className="py-8 text-center text-xs font-bold text-slate-400">لا توجد مهام منشأة خلال هذا الشهر.</p>}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">اتجاه الأداء خلال 6 أشهر</p>
                        <p className="mt-1 text-[11px] text-slate-500">مقارنة عدد المهام المنشأة والمنجزة ونسبة الالتزام بالموعد.</p>
                      </div>
                      <Badge variant="outline" className="border-[#d9c9a5] bg-[#fffdf8] text-[#0b4a3f]">{analytics.month}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                      {analytics.trend.map((row) => {
                        const maxValue = Math.max(...analytics.trend.flatMap((item) => [item.created, item.completed]), 1);
                        return (
                          <div key={row.month} className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-3">
                            <p className="text-xs font-black text-slate-700">{row.month}</p>
                            <div className="mt-3 flex h-24 items-end justify-center gap-2">
                              <div className="flex h-full w-7 items-end rounded-t-lg bg-slate-100" title={`أنشئت: ${row.created}`}>
                                <div className="w-full rounded-t-lg bg-[#d6b46a]" style={{ height: `${Math.max(4, Math.round((row.created / maxValue) * 100))}%` }} />
                              </div>
                              <div className="flex h-full w-7 items-end rounded-t-lg bg-slate-100" title={`أنجزت: ${row.completed}`}>
                                <div className="w-full rounded-t-lg bg-[#0b4a3f]" style={{ height: `${Math.max(4, Math.round((row.completed / maxValue) * 100))}%` }} />
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between text-[9px] font-bold text-slate-500"><span>إنشاء {row.created}</span><span>إنجاز {row.completed}</span></div>
                            <p className="mt-2 text-center text-[10px] font-black text-slate-600">التزام {row.onTimeRate == null ? '—' : `${row.onTimeRate}%`}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                  تعذر تحميل مؤشرات الأداء للشهر المحدد.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-[#0b4a3f]">البحث والتصفية</p>
                <p className="mt-1 text-xs text-slate-500">يمكن حصر المواقع حسب الأولوية أو نوع النقص ثم تصدير النتيجة.</p>
              </div>
              <Button variant="outline" size="sm" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={resetFilters}>
                مسح التصفية
              </Button>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_170px_175px_180px_210px_210px_180px_auto]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" />
                <Input
                  className="h-11 border-[#d9c9a5] bg-white pr-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم الموقع أو النقص أو المسند إليه..."
                />
              </div>

              <NativeSelect className="h-11 bg-white" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | PriorityBand)}>
                <option value="all">جميع الأولويات</option>
                <option value="urgent">عاجلة</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="normal">عادية</option>
              </NativeSelect>

              <NativeSelect className="h-11 bg-white" value={stateFilter} onChange={(event) => setStateFilter(event.target.value as 'all' | CompletenessState)}>
                <option value="all">جميع حالات الاكتمال</option>
                <option value="incomplete">ناقص</option>
                <option value="review">يحتاج استكمال</option>
                <option value="complete">مكتمل</option>
              </NativeSelect>

              <NativeSelect className="h-11 bg-white" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | 'mosques' | 'prayer_rooms')}>
                <option value="all">جميع المواقع</option>
                <option value="mosques">المساجد والجوامع</option>
                <option value="prayer_rooms">المصليات</option>
              </NativeSelect>

              <NativeSelect className="h-11 bg-white" value={missingFilter} onChange={(event) => setMissingFilter(event.target.value as 'all' | MissingKey)}>
                <option value="all">جميع أنواع النقص</option>
                {missingCatalog.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </NativeSelect>

              <NativeSelect className="h-11 bg-white" value={taskTimingFilter} onChange={(event) => onTaskTimingFilterChange(event.target.value as TaskTimingFilter)}>
                <option value="all">جميع مواعيد المهام</option>
                <option value="overdue">مهام متأخرة</option>
                <option value="today">مستحقة اليوم</option>
                <option value="soon">تستحق خلال 3 أيام</option>
                <option value="unassigned">مهام غير مسندة</option>
              </NativeSelect>

              <NativeSelect className="h-11 bg-white" value={sortMode} onChange={(event) => setSortMode(event.target.value as 'priority' | 'completion' | 'name')}>
                <option value="priority">ترتيب: الأولوية</option>
                <option value="completion">ترتيب: الأقل اكتمالًا</option>
                <option value="name">ترتيب: الاسم</option>
              </NativeSelect>

              <Badge variant="outline" className="h-11 justify-center border-[#d6b46a]/55 bg-white px-3 font-black text-[#0b4a3f]">
                {filteredRows.length} سجل
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(190px,1.1fr)_125px_155px_165px_minmax(290px,1.55fr)_145px_125px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500 xl:grid">
              <span>الموقع</span>
              <span>التصنيف</span>
              <span>الأولوية</span>
              <span>الاكتمال</span>
              <span>البيانات الناقصة / المهام</span>
              <span>آخر زيارة</span>
              <span>الإجراء</span>
            </div>

            {filteredRows.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                لا توجد سجلات مطابقة للتصفية الحالية.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <div
                    key={row.site.id}
                    className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(190px,1.1fr)_125px_155px_165px_minmax(290px,1.55fr)_145px_125px] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{row.site.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {row.site.building?.name
                          || row.site.campusLocation
                          || row.site.district
                          || row.site.city
                          || 'الموقع غير مكتمل'}
                      </p>
                    </div>

                    <div>
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {siteTypeLabel(row.site)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {row.missing.length ? (
                        <>
                          <Badge variant="outline" className={priorityClass[row.priorityBand]}>{priorityLabel[row.priorityBand]}</Badge>
                          <p className="text-[10px] font-black text-slate-500">درجة {row.priorityScore}/100</p>
                          {row.overdueTasks.length > 0 && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-800">{row.overdueTasks.length} متأخرة</Badge>}
                        </>
                      ) : (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">لا توجد أولوية</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={stateClass[row.state]}>{stateLabel[row.state]}</Badge>
                        <span className="text-sm font-black text-[#0b4a3f]">{row.score}%</span>
                      </div>
                      <Progress value={row.score} className="h-2" />
                      <p className="text-[10px] font-bold text-slate-400">{row.completedChecks} من {row.totalChecks} عناصر مكتملة</p>
                    </div>

                    <div>
                      {row.missing.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          لا توجد نواقص رئيسية
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.missing.map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleMissingAction(row, item)}
                              className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800 transition hover:border-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                              title={item.key === 'visit'
                                ? 'الانتقال إلى الجولات والزيارات'
                                : canEdit
                                  ? 'فتح السجل والانتقال إلى موضع الاستكمال'
                                  : 'فتح السجل للعرض'}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {row.activeTasks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {row.activeTasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => canEdit && openTaskManager(row, task.missingKey as MissingKey, task)}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black transition ${isTaskOverdue(task) ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`}
                              title={task.assignedToName ? `مسند إلى: ${task.assignedToName}` : 'مهمة متابعة غير مسندة'}
                            >
                              {task.taskNumber}{task.assignedToName ? ` · ${task.assignedToName}` : ''}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{row.photoCount} صورة</span>
                        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{row.documentCount} مستند</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <p className="font-black text-slate-700">{row.latestVisit ? formatDate(row.latestVisit.visitDate) : 'لا توجد زيارة'}</p>
                      {row.latestVisit && <p className="mt-1 text-[10px] font-bold text-slate-400">{row.latestVisit.visitNumber}</p>}
                    </div>

                    <div className="space-y-2">
                      <Button size="sm" variant="outline" className="w-full border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => onOpenSite(row.site)}>
                        فتح السجل
                      </Button>
                      {canEdit && row.missing.length > 0 && tasksAvailable && (
                        <Button size="sm" variant="outline" className="w-full border-sky-200 bg-sky-50 text-sky-800" onClick={() => openTaskManager(row)}>
                          <ClipboardList className="ml-1 h-3.5 w-3.5" />
                          المهام
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-xs leading-6 text-slate-600">
            <strong className="text-sky-900">منهجية الأولوية:</strong>{' '}
            تبدأ من مقدار النقص في ملف الموقع، ثم تضاف أوزان أعلى للنواقص المؤثرة مثل غياب الزيارة،
            الإحداثيات، التحقق من مصلى النساء وربط المبنى. كما ترفع المهام العاجلة والمتأخرة ترتيب الموقع تلقائيًا.
            لا يتم إغلاق مهمة متابعة تلقائيًا عند استكمال الحقل؛ بل تبقى حتى يوثق المسؤول الإنجاز.
          </div>
        </CardContent>
      </Card>

      <Dialog open={taskDialogOpen} onOpenChange={(open) => {
        setTaskDialogOpen(open);
        if (!open) {
          setTaskDialogRow(null);
          setEditingTask(null);
          setTaskAssignees([]);
          setTaskForm(emptyTaskForm);
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-slate-200 bg-[#fffdf8] p-5 text-right">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]">
              <ClipboardList className="h-5 w-5" />
              مهام استكمال البيانات
            </DialogTitle>
            <DialogDescription>
              {taskDialogRow ? `${taskDialogRow.site.name} — أولوية الاستكمال: ${priorityLabel[taskDialogRow.priorityBand]} (${taskDialogRow.priorityScore}/100)` : ''}
            </DialogDescription>
          </DialogHeader>

          {taskDialogRow && (
            <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <MiniMetric label="نسبة الاكتمال" value={`${taskDialogRow.score}%`} />
                <MiniMetric label="النواقص الحالية" value={String(taskDialogRow.missing.length)} />
                <MiniMetric label="المهام النشطة" value={String(taskDialogRow.activeTasks.length)} />
                <MiniMetric label="المهام المتأخرة" value={String(taskDialogRow.overdueTasks.length)} />
              </div>

              {taskHistoryForDialog.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <p className="mb-3 text-sm font-black text-slate-800">سجل مهام الموقع</p>
                  <div className="space-y-2">
                    {taskHistoryForDialog.map((task) => {
                      const gapStillMissing = taskDialogRow.missing.some((item) => item.key === task.missingKey);
                      return (
                        <div key={task.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm text-slate-800">{task.taskNumber}</strong>
                              <Badge variant="outline" className={taskStatusClass[task.status]}>{taskStatusLabel[task.status]}</Badge>
                              <Badge variant="outline" className={priorityClass[task.priority]}>{priorityLabel[task.priority]}</Badge>
                              {isTaskOverdue(task) && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-800">متأخرة</Badge>}
                              {!gapStillMissing && activeTaskStatuses.has(task.status) && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">البند مستكمل — يحتاج إغلاق المهمة</Badge>}
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-700">{missingLabelByKey[task.missingKey as MissingKey] || task.title}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{task.assignedToName || 'غير مسندة'}</span>
                              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{task.dueDate ? formatDate(task.dueDate) : 'بدون موعد'}</span>
                            </div>
                          </div>
                          {canEdit && (
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => startEditTask(task)}>
                              <Pencil className="ml-1 h-3.5 w-3.5" />
                              تعديل
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Card className="border border-[#d9c9a5] shadow-none">
                <CardHeader className="border-b border-[#eadfc8] bg-[#fffdf8] pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-black text-[#0b4a3f]">{editingTask ? 'تحديث مهمة المتابعة' : 'إنشاء مهمة متابعة'}</CardTitle>
                      <CardDescription className="mt-1">{editingTask ? editingTask.taskNumber : 'حوّل أحد النواقص الحالية إلى مهمة مسندة بموعد واضح.'}</CardDescription>
                    </div>
                    {editingTask && (
                      <Button variant="outline" size="sm" onClick={() => resetTaskFormForRow(taskDialogRow)}>
                        <Plus className="ml-1 h-3.5 w-3.5" />
                        مهمة جديدة
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
                  <FieldBlock label="بند الاستكمال">
                    <NativeSelect
                      className="h-11"
                      value={taskForm.missingKey}
                      disabled={Boolean(editingTask)}
                      onChange={(event) => setTaskForm((current) => ({ ...current, missingKey: event.target.value as MissingKey }))}
                    >
                      <option value="">اختر البند</option>
                      {taskDialogRow.missing.map((item) => {
                        const hasActiveTask = activeTaskKeysForDialog.has(item.key) && editingTask?.missingKey !== item.key;
                        return <option key={item.key} value={item.key} disabled={hasActiveTask}>{item.label}{hasActiveTask ? ' — مسندة بالفعل' : ''}</option>;
                      })}
                      {editingTask && !taskDialogRow.missing.some((item) => item.key === editingTask.missingKey) && (
                        <option value={editingTask.missingKey}>{missingLabelByKey[editingTask.missingKey as MissingKey] || editingTask.missingKey} — تم استكمال البند</option>
                      )}
                    </NativeSelect>
                  </FieldBlock>

                  <FieldBlock label="الأولوية">
                    <NativeSelect className="h-11" value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as MosqueCompletionTask['priority'] }))}>
                      <option value="normal">عادية</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </NativeSelect>
                  </FieldBlock>

                  <FieldBlock label="إسناد المهمة">
                    <NativeSelect
                      className="h-11"
                      value={taskForm.assignedToUserId}
                      disabled={taskAssigneesLoading}
                      onChange={(event) => setTaskForm((current) => ({ ...current, assignedToUserId: event.target.value }))}
                    >
                      <option value="">{taskAssigneesLoading ? 'جاري تحميل المستخدمين...' : 'بدون إسناد حالي'}</option>
                      {taskAssignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>{assignee.username} — {assignee.moduleRole === 'head' ? 'رئيس/صلاحية شاملة' : 'مشرف'}</option>
                      ))}
                    </NativeSelect>
                  </FieldBlock>

                  <FieldBlock label="موعد الإنجاز">
                    <Input
                      className="h-11"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </FieldBlock>

                  {editingTask && (
                    <FieldBlock label="حالة المهمة">
                      <NativeSelect className="h-11" value={taskForm.status} onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value as MosqueCompletionTask['status'] }))}>
                        <option value="open">مفتوحة</option>
                        <option value="in_progress">قيد التنفيذ</option>
                        <option value="completed">مكتملة</option>
                        <option value="cancelled">ملغاة</option>
                      </NativeSelect>
                    </FieldBlock>
                  )}

                  <div className="md:col-span-2">
                    <FieldBlock label="تعليمات / وصف المهمة">
                      <Textarea
                        rows={3}
                        value={taskForm.description}
                        onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="مثال: استكمال الإحداثيات من الموقع الفعلي والتحقق منها قبل الحفظ."
                      />
                    </FieldBlock>
                  </div>

                  {editingTask && taskForm.status === 'completed' && (
                    <div className="md:col-span-2">
                      <FieldBlock label="ملاحظة الإنجاز *">
                        <Textarea
                          rows={3}
                          value={taskForm.completionNote}
                          onChange={(event) => setTaskForm((current) => ({ ...current, completionNote: event.target.value }))}
                          placeholder="اذكر ما تم استكماله أو مصدر التحقق..."
                        />
                      </FieldBlock>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 bg-white p-4">
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>إغلاق</Button>
            {canEdit && taskDialogRow && (
              <Button
                className="bg-[#0b4a3f] text-white hover:bg-[#126152]"
                onClick={saveTask}
                disabled={taskSaving || !taskForm.missingKey}
              >
                {taskSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <ClipboardList className="ml-2 h-4 w-4" />}
                {taskSaving ? 'جاري الحفظ...' : editingTask ? 'حفظ تحديث المهمة' : 'إنشاء مهمة المتابعة'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Metric = ({
  label,
  value,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5f2] text-[#006b63]">
        <Icon className="h-4 w-4" />
      </span>
      <strong className="text-xl font-black text-[#0b4a3f]">{value}{suffix || ''}</strong>
    </div>
    <p className="mt-2 text-[11px] font-bold text-slate-500">{label}</p>
  </div>
);

const PerformanceMetric = ({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-3">
    <p className="text-[10px] font-black text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-black text-[#0b4a3f]">{value}{suffix}</p>
  </div>
);

const MiniMetric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black text-[#0b4a3f]">{value}</p>
  </div>
);

const PriorityChip = ({
  label,
  value,
  band,
  onClick,
}: {
  label: string;
  value: number;
  band: PriorityBand;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={`rounded-xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${priorityClass[band]}`}
    onClick={onClick}
  >
    {label}: {value}
  </button>
);

const FieldBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-black text-slate-700">{label}</span>
    {children}
  </label>
);

export default MosqueDataCompletenessCenter;
