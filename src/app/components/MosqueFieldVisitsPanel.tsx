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
  type MosqueQuranStockDashboard,
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
  currentUsername: string;
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

type ItemStatusOption = { value: MosqueFieldVisitItem['status']; label: string };
type ItemStatusProfileKey =
  | 'cleanliness'
  | 'operation'
  | 'condition'
  | 'absence_check'
  | 'required_availability'
  | 'fire_safety'
  | 'quran_compliance'
  | 'quran_quantity'
  | 'activity_approval'
  | 'accessibility'
  | 'readiness';

const uncheckedStatus: ItemStatusOption = { value: 'not_checked', label: 'لم يتم التحقق' };
const notApplicableStatus: ItemStatusOption = { value: 'not_applicable', label: 'لا ينطبق' };

const itemStatusProfiles: Record<ItemStatusProfileKey, ItemStatusOption[]> = {
  cleanliness: [
    { value: 'good', label: 'نظيف ومناسب' },
    { value: 'needs_action', label: 'يحتاج تنظيف أو معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  operation: [
    { value: 'good', label: 'يعمل بكفاءة' },
    { value: 'needs_action', label: 'متوقف أو يحتاج صيانة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  condition: [
    { value: 'good', label: 'سليم' },
    { value: 'needs_action', label: 'غير سليم / يحتاج معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  absence_check: [
    { value: 'good', label: 'لا توجد ملاحظة' },
    { value: 'needs_action', label: 'توجد ملاحظة تحتاج معالجة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  required_availability: [
    { value: 'good', label: 'متوفر وبحالة مناسبة' },
    { value: 'needs_action', label: 'غير متوفر أو يحتاج استكمال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  fire_safety: [
    { value: 'good', label: 'متوفرة وصالحة' },
    { value: 'needs_action', label: 'غير متوفرة أو تحتاج صيانة / استبدال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  quran_compliance: [
    { value: 'good', label: 'سليمة ومعتمدة' },
    { value: 'needs_action', label: 'تحتاج معالجة أو استبدال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  quran_quantity: [
    { value: 'good', label: 'كافية ومناسبة' },
    { value: 'needs_action', label: 'غير كافية / تحتاج استكمال' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  activity_approval: [
    { value: 'good', label: 'معتمدة' },
    { value: 'needs_action', label: 'غير معتمدة / تحتاج استكمال' },
    { value: 'not_available', label: 'لا توجد أنشطة قائمة' },
    notApplicableStatus,
    uncheckedStatus,
  ],
  accessibility: [
    { value: 'good', label: 'ملائم ومهيأ' },
    { value: 'needs_action', label: 'غير مهيأ / يحتاج تحسين' },
    uncheckedStatus,
  ],
  readiness: [
    { value: 'good', label: 'منظم وجاهز' },
    { value: 'needs_action', label: 'غير جاهز / يحتاج معالجة' },
    uncheckedStatus,
  ],
};

const itemStatusProfileByTitle: Record<string, ItemStatusProfileKey> = {
  'نظافة السجاد والأرضيات': 'cleanliness',
  'نظافة الجدران والنوافذ وخلو الموقع من الروائح': 'cleanliness',
  'نظافة مرافق الوضوء ودورات المياه': 'cleanliness',
  'كفاءة التكييف والتهوية وعدم وجود تسربات': 'operation',
  'سلامة الإنارة والمفاتيح والمقابس': 'condition',
  'عدم وجود تمديدات كهربائية مكشوفة أو غير آمنة': 'absence_check',
  'سلامة الميكروفونات والسماعات وأجهزة الأذان': 'operation',
  'وضوح مخارج الطوارئ وخلوها من العوائق': 'condition',
  'توفر طفايات الحريق وصلاحيتها': 'fire_safety',
  'سلامة الأبواب والممرات وسهولة الحركة': 'condition',
  'توفر دواليب ورفوف المصاحف بحالة مناسبة': 'required_availability',
  'سلامة الفواصل والستائر والساعات واللوحات': 'required_availability',
  'سلامة المصاحف والتحقق من جهة الطباعة': 'quran_compliance',
  'كفاية أعداد المصاحف وملاءمة أحجامها': 'quran_quantity',
  'خلو الموقع من الكتب والنشرات غير المعتمدة': 'absence_check',
  'اعتماد حلقات التحفيظ والمحاضرات والأنشطة القائمة': 'activity_approval',
  'ملاءمة الموقع لكبار السن والأشخاص ذوي الإعاقة': 'accessibility',
  'تنظيم الموقع ووضوح اتجاه القبلة وجاهزيته للصلاة': 'readiness',
};

const getItemStatusOptions = (item: MosqueFieldVisitItem): ItemStatusOption[] => {
  const profile = itemStatusProfileByTitle[item.title] || 'condition';
  const options = itemStatusProfiles[profile];
  if (options.some((option) => option.value === item.status)) return options;

  // Keep historical values editable even when a newer contextual profile no longer offers that value.
  return [
    { value: item.status, label: itemStatusLabels[item.status] || item.status },
    ...options,
  ];
};

const getItemStatusLabel = (item: MosqueFieldVisitItem) =>
  getItemStatusOptions(item).find((option) => option.value === item.status)?.label
  || itemStatusLabels[item.status]
  || item.status;

const QURAN_QUANTITY_ITEM_TITLE = 'كفاية أعداد المصاحف وملاءمة أحجامها';
const QURAN_EVIDENCE_PREFIX = 'مرجع مكتبة المصاحف وقت الزيارة:';

const mergeQuranEvidence = (currentNote: string | null | undefined, evidence: string) => {
  const keptLines = String(currentNote || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(QURAN_EVIDENCE_PREFIX));
  return [...keptLines, evidence].join('\n');
};

const QuranVisitStockLink: React.FC<{
  dashboard: MosqueQuranStockDashboard | null;
  siteId: string;
  onApplyQuantity: () => void;
}> = ({ dashboard, siteId, onApplyQuantity }) => {
  if (!dashboard) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        جارٍ تحميل بيانات مكتبة المصاحف المرتبطة بالموقع...
      </div>
    );
  }

  const stock = dashboard.sites.find((row) => row.site.id === siteId) || null;
  if (!stock) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
        لم يتم العثور على سجل مصاحف مرتبط بهذا المسجد أو المصلى. يفضل إجراء الجرد الأولي وتحديد العدد المستهدف قبل تقييم الكفاية.
      </div>
    );
  }

  const latestCountDate = stock.latestInventory?.countedAt
    ? new Date(stock.latestInventory.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')
    : 'لم يتم الجرد';
  const coverage = stock.coveragePercent == null ? 'غير محسوبة' : String(stock.coveragePercent) + '%';
  const target = stock.targetCount > 0 ? stock.targetCount.toLocaleString('ar-SA') : 'غير محدد';
  const statusLabel = stock.targetCount <= 0
    ? 'يلزم تحديد العدد المستهدف'
    : stock.needCount > 0
      ? 'احتياج ' + stock.needCount.toLocaleString('ar-SA') + ' مصحف'
      : 'العدد المستهدف مكتمل';

  return (
    <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              <b className="text-sm text-emerald-950">مرجع مكتبة المصاحف المرتبط بالموقع</b>
              <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-700">{statusLabel}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">تُعرض بيانات الرصيد النظامي مباشرة داخل الزيارة لتجنب إعادة إدخال الأعداد يدويًا.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onApplyQuantity}>
            <CheckCircle2 className="ml-2 h-4 w-4" />
            تطبيق التقييم العددي المقترح
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {[
            ['الرصيد بالموقع', stock.systemStock.totalCount.toLocaleString('ar-SA')],
            ['كبير', stock.systemStock.largeCount.toLocaleString('ar-SA')],
            ['متوسط', stock.systemStock.mediumCount.toLocaleString('ar-SA')],
            ['صغير', stock.systemStock.smallCount.toLocaleString('ar-SA')],
            ['المستهدف', target],
            ['الاحتياج', stock.needCount.toLocaleString('ar-SA')],
            ['التغطية', coverage],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-center">
              <div className="text-[10px] text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-black text-slate-800">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl bg-white/80 px-3 py-2">آخر جرد: <b>{latestCountDate}</b></div>
          <div className="rounded-xl bg-white/80 px-3 py-2">المتاح في مكتبة المصاحف: <b>{dashboard.summary.warehouseTotal.toLocaleString('ar-SA')}</b></div>
          <div className="rounded-xl bg-white/80 px-3 py-2">المصاحف المسحوبة من الموقع: <b>{stock.withdrawnStock.totalCount.toLocaleString('ar-SA')}</b></div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-[11px] leading-6 text-sky-900">
          <b>مهم:</b> التقييم العددي يساعد في بند «كفاية أعداد المصاحف»، لكنه لا يعتمد تلقائيًا بند «سلامة المصاحف والتحقق من جهة الطباعة»؛ هذا البند يبقى تحققًا ميدانيًا بصريًا. وعند وجود نقص تتم المعالجة من «مكتبة المصاحف» عبر حركة إضافة للموقع حتى يُخصم الرصيد من المكتبة ويُحدّث رصيد المسجد أو المصلى تلقائيًا.
        </div>
      </CardContent>
    </Card>
  );
};
const resolutionLabels: Record<string, string> = {
  new: 'جديدة',
  referred: 'محالة',
  in_progress: 'قيد المعالجة',
  resolved: 'تمت المعالجة',
  closed: 'مغلقة بعد التحقق',
};

type ProgramReportColumnKey =
  | 'visit_number'
  | 'site'
  | 'visit_type'
  | 'date'
  | 'tour'
  | 'location'
  | 'overall'
  | 'priority'
  | 'open_items'
  | 'urgent_items'
  | 'overdue_items'
  | 'workflow'
  | 'team'
  | 'representative'
  | 'attachments'
  | 'treatment_images';

const programReportColumns: Array<{ key: ProgramReportColumnKey; label: string; align?: 'right' }> = [
  { key: 'visit_number', label: 'رقم الزيارة' },
  { key: 'site', label: 'المسجد / المصلى', align: 'right' },
  { key: 'visit_type', label: 'نوع الزيارة' },
  { key: 'date', label: 'التاريخ' },
  { key: 'tour', label: 'الجولة', align: 'right' },
  { key: 'location', label: 'الموقع', align: 'right' },
  { key: 'overall', label: 'الحالة العامة' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'open_items', label: 'ملاحظات مفتوحة' },
  { key: 'urgent_items', label: 'عاجلة' },
  { key: 'overdue_items', label: 'متأخرة' },
  { key: 'workflow', label: 'حالة الزيارة' },
  { key: 'team', label: 'فريق الزيارة', align: 'right' },
  { key: 'representative', label: 'ممثل الموقع', align: 'right' },
  { key: 'attachments', label: 'المرفقات' },
  { key: 'treatment_images', label: 'صور قبل / بعد' },
];

const defaultProgramReportColumns: ProgramReportColumnKey[] = [
  'visit_number', 'site', 'visit_type', 'date', 'overall', 'open_items', 'urgent_items', 'workflow',
];
const basicProgramReportColumns: ProgramReportColumnKey[] = [
  'visit_number', 'site', 'visit_type', 'date', 'overall', 'workflow',
];
const followUpProgramReportColumns: ProgramReportColumnKey[] = [
  'visit_number', 'site', 'date', 'priority', 'open_items', 'urgent_items', 'overdue_items', 'workflow',
];

type VisitReportColumnKey =
  | 'category'
  | 'title'
  | 'status'
  | 'priority'
  | 'note'
  | 'responsible'
  | 'due_date'
  | 'resolution'
  | 'resolution_note'
  | 'treatment_images';

const visitReportColumns: Array<{ key: VisitReportColumnKey; label: string; align?: 'right' }> = [
  { key: 'category', label: 'المحور' },
  { key: 'title', label: 'بند الفحص', align: 'right' },
  { key: 'status', label: 'النتيجة' },
  { key: 'priority', label: 'الأولوية' },
  { key: 'note', label: 'الملاحظة', align: 'right' },
  { key: 'responsible', label: 'الجهة المسؤولة', align: 'right' },
  { key: 'due_date', label: 'تاريخ الاستحقاق' },
  { key: 'resolution', label: 'حالة المعالجة' },
  { key: 'resolution_note', label: 'الإجراء / المعالجة المنفذة', align: 'right' },
  { key: 'treatment_images', label: 'صور قبل / بعد' },
];

const defaultVisitReportColumns: VisitReportColumnKey[] = [
  'category', 'title', 'status', 'priority', 'note', 'responsible', 'resolution', 'treatment_images',
];
const basicVisitReportColumns: VisitReportColumnKey[] = ['category', 'title', 'status', 'priority'];
const followUpVisitReportColumns: VisitReportColumnKey[] = [
  'category', 'title', 'priority', 'note', 'responsible', 'due_date', 'resolution', 'resolution_note', 'treatment_images',
];

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

const emptyVisit = (items: MosqueFieldVisitItem[] = [], currentUsername = 'مستخدم'): VisitForm => ({
  tourId: '',
  siteId: '',
  visitType: 'initial',
  visitDate: dateTimeLocal(new Date().toISOString()),
  departureAt: '',
  representativeName: '',
  teamMembers: currentUsername || 'مستخدم',
  overallStatus: 'good',
  priority: 'normal',
  workflowStatus: 'in_progress',
  generalNotes: '',
  recommendations: '',
  attachments: [],
  items: freshItems(items),
});

export const MosqueFieldVisitsPanel: React.FC<Props> = ({ sites, currentUsername, canAdd, canEdit, canDelete, canPrint }) => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [summary, setSummary] = React.useState<MosqueFieldVisitSummary>(emptySummary);
  const [quranStockDashboard, setQuranStockDashboard] = React.useState<MosqueQuranStockDashboard | null>(null);
  const [tours, setTours] = React.useState<MosqueFieldTour[]>([]);
  const [visits, setVisits] = React.useState<MosqueFieldVisit[]>([]);
  const [template, setTemplate] = React.useState<MosqueFieldVisitItem[]>([]);
  const [view, setView] = React.useState<'visits' | 'tours'>('visits');
  const [search, setSearch] = React.useState('');
  const [siteFilter, setSiteFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [visitTypeFilter, setVisitTypeFilter] = React.useState('');
  const [overallFilter, setOverallFilter] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [issueFilter, setIssueFilter] = React.useState('');
  const [dateFromFilter, setDateFromFilter] = React.useState('');
  const [dateToFilter, setDateToFilter] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'date' | 'site' | 'visit_number' | 'status' | 'open_items' | 'priority'>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  const [tourDialog, setTourDialog] = React.useState(false);
  const [tourSearch, setTourSearch] = React.useState('');
  const [tourForm, setTourForm] = React.useState({
    title: '', scheduledDate: new Date().toISOString().slice(0, 10), scope: '',
    teamMembers: currentUsername || 'مستخدم', notes: '', siteIds: [] as string[],
  });

  const [visitDialog, setVisitDialog] = React.useState(false);
  const [editingVisit, setEditingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [viewingVisit, setViewingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deletingVisit, setDeletingVisit] = React.useState<MosqueFieldVisit | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [printTarget, setPrintTarget] = React.useState<MosqueFieldVisit | null>(null);
  const [includePrintImages, setIncludePrintImages] = React.useState(true);
  const [printTreatmentOnly, setPrintTreatmentOnly] = React.useState(false);
  const [visitPrintTitle, setVisitPrintTitle] = React.useState('تقرير زيارة ميدانية');
  const [visitPrintIssueFilter, setVisitPrintIssueFilter] = React.useState('');
  const [visitPrintStatusFilter, setVisitPrintStatusFilter] = React.useState('');
  const [visitPrintPriorityFilter, setVisitPrintPriorityFilter] = React.useState('');
  const [visitPrintResolutionFilter, setVisitPrintResolutionFilter] = React.useState('');
  const [visitPrintCategoryFilter, setVisitPrintCategoryFilter] = React.useState('');
  const [visitPrintSortBy, setVisitPrintSortBy] = React.useState<'order' | 'category' | 'priority' | 'status' | 'resolution' | 'due_date'>('order');
  const [visitPrintSortDirection, setVisitPrintSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [visitPrintColumns, setVisitPrintColumns] = React.useState<VisitReportColumnKey[]>([...defaultVisitReportColumns]);
  const [preparingPrint, setPreparingPrint] = React.useState(false);
  const [programPrintDialog, setProgramPrintDialog] = React.useState(false);
  const [programReportTitle, setProgramReportTitle] = React.useState('تقرير البرنامج الميداني للمساجد والمصليات');
  const [programPrintColumns, setProgramPrintColumns] = React.useState<ProgramReportColumnKey[]>([...defaultProgramReportColumns]);
  const [visitForm, setVisitForm] = React.useState<VisitForm>(() => emptyVisit([], currentUsername));
  const [uploadingKey, setUploadingKey] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [summaryData, tourData, visitData, checklist, quranStockData] = await Promise.all([
        mosqueApi.fieldVisitSummary(), mosqueApi.fieldTours(), mosqueApi.fieldVisits(), mosqueApi.fieldVisitChecklist(), mosqueApi.quranStockDashboard(),
      ]);
      setSummary(summaryData);
      setQuranStockDashboard(quranStockData);
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

  const filteredVisits = React.useMemo(() => {
    const fromTime = dateFromFilter ? new Date(`${dateFromFilter}T00:00:00`).getTime() : null;
    const toTime = dateToFilter ? new Date(`${dateToFilter}T23:59:59.999`).getTime() : null;
    const priorityOrder: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;

    const filtered = visits.filter((visit) => {
      const needle = search.trim().toLowerCase();
      const matchesSearch = !needle || [
        visit.visitNumber,
        visit.site.name,
        visit.site.campusLocation,
        visit.representativeName,
        ...(visit.teamMembers || []),
      ].some((value) => String(value || '').toLowerCase().includes(needle));
      const visitTime = new Date(visit.visitDate).getTime();
      const matchesIssue = !issueFilter
        || (issueFilter === 'open' && openCount(visit) > 0)
        || (issueFilter === 'urgent' && urgentCount(visit) > 0)
        || (issueFilter === 'overdue' && overdueCount(visit) > 0)
        || (issueFilter === 'clear' && openCount(visit) === 0);

      return matchesSearch
        && (!siteFilter || visit.siteId === siteFilter)
        && (!statusFilter || visit.workflowStatus === statusFilter)
        && (!visitTypeFilter || visit.visitType === visitTypeFilter)
        && (!overallFilter || visit.overallStatus === overallFilter)
        && (!priorityFilter || visit.priority === priorityFilter)
        && matchesIssue
        && (fromTime === null || visitTime >= fromTime)
        && (toTime === null || visitTime <= toTime);
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'site') comparison = String(a.site.name || '').localeCompare(String(b.site.name || ''), 'ar');
      else if (sortBy === 'visit_number') comparison = String(a.visitNumber || '').localeCompare(String(b.visitNumber || ''), 'ar', { numeric: true });
      else if (sortBy === 'status') comparison = String(visitStatusLabels[a.workflowStatus] || '').localeCompare(String(visitStatusLabels[b.workflowStatus] || ''), 'ar');
      else if (sortBy === 'open_items') comparison = openCount(a) - openCount(b);
      else if (sortBy === 'priority') comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      else comparison = new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime();
      return comparison * direction;
    });
  }, [visits, search, siteFilter, statusFilter, visitTypeFilter, overallFilter, priorityFilter, issueFilter, dateFromFilter, dateToFilter, sortBy, sortDirection]);

  const activeFilterCount = [search, siteFilter, statusFilter, visitTypeFilter, overallFilter, priorityFilter, issueFilter, dateFromFilter, dateToFilter]
    .filter((value) => Boolean(String(value || '').trim())).length;

  const resetVisitFilters = () => {
    setSearch('');
    setSiteFilter('');
    setStatusFilter('');
    setVisitTypeFilter('');
    setOverallFilter('');
    setPriorityFilter('');
    setIssueFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setSortBy('date');
    setSortDirection('desc');
  };

  const filteredTourSites = React.useMemo(() => {
    const needle = tourSearch.trim().toLowerCase();
    return sites.filter((site) => !needle || [site.name, site.campusLocation, site.city, site.district].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [sites, tourSearch]);


  const activeVisitBySite = React.useMemo(() => {
    const map = new Map<string, MosqueFieldVisit>();
    visits.forEach((visit) => {
      if (!['planned', 'in_progress', 'follow_up'].includes(visit.workflowStatus)) return;
      if (!map.has(visit.siteId)) map.set(visit.siteId, visit);
    });
    return map;
  }, [visits]);

  const openTour = () => {
    setTourForm({
      title: `جولة ميدانية - ${new Date().toLocaleDateString('ar-SA-u-ca-gregory')}`,
      scheduledDate: new Date().toISOString().slice(0, 10),
      scope: '', teamMembers: currentUsername || 'مستخدم', notes: '', siteIds: [],
    });
    setTourSearch('');
    setTourDialog(true);
  };

  const saveTour = async () => {
    const teamMembers = splitMembers(tourForm.teamMembers);
    if (!tourForm.title.trim() || !tourForm.scheduledDate || !teamMembers.length || !tourForm.siteIds.length) {
      toast.error('أكمل عنوان الجولة وتاريخها واختر موقعًا واحدًا على الأقل');
      return;
    }
    const conflictingVisit = tourForm.siteIds.map((siteId) => activeVisitBySite.get(siteId)).find(Boolean);
    if (conflictingVisit) {
      toast.error(`يوجد إجراء ميداني قائم للموقع ${conflictingVisit.site.name} برقم ${conflictingVisit.visitNumber}. افتح الزيارة القائمة بدل إنشاء زيارة مكررة.`);
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
    const existingVisit = preset?.siteId ? activeVisitBySite.get(preset.siteId) : null;
    if (existingVisit) {
      toast.info(`يوجد إجراء ميداني قائم لهذا الموقع برقم ${existingVisit.visitNumber}`);
      setViewingVisit(existingVisit);
      return;
    }
    setEditingVisit(null);
    setVisitForm({ ...emptyVisit(template, currentUsername), siteId: preset?.siteId || '', tourId: preset?.tourId || '' });
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

  const selectedQuranStock = quranStockDashboard?.sites.find((row) => row.site.id === visitForm.siteId) || null;

  const applyQuranQuantityAssessment = () => {
    const itemIndex = visitForm.items.findIndex((item) => item.title === QURAN_QUANTITY_ITEM_TITLE);
    if (itemIndex < 0) {
      toast.error('تعذر العثور على بند كفاية أعداد المصاحف في قائمة الفحص');
      return;
    }
    if (!selectedQuranStock) {
      toast.error('لا توجد بيانات رصيد مصاحف مرتبطة بالموقع المحدد');
      return;
    }

    const currentItem = visitForm.items[itemIndex];
    const lastCount = selectedQuranStock.latestInventory?.countedAt
      ? new Date(selectedQuranStock.latestInventory.countedAt).toLocaleDateString('ar-SA-u-ca-gregory')
      : 'لم يتم الجرد';
    const coverage = selectedQuranStock.coveragePercent == null ? 'غير محسوبة' : String(selectedQuranStock.coveragePercent) + '%';
    const targetText = selectedQuranStock.targetCount > 0
      ? selectedQuranStock.targetCount.toLocaleString('ar-SA')
      : 'غير محدد';
    const evidence = QURAN_EVIDENCE_PREFIX
      + ' الرصيد النظامي ' + selectedQuranStock.systemStock.totalCount.toLocaleString('ar-SA')
      + ' (كبير ' + selectedQuranStock.systemStock.largeCount.toLocaleString('ar-SA')
      + '، متوسط ' + selectedQuranStock.systemStock.mediumCount.toLocaleString('ar-SA')
      + '، صغير ' + selectedQuranStock.systemStock.smallCount.toLocaleString('ar-SA')
      + ')، المستهدف ' + targetText
      + '، الاحتياج ' + selectedQuranStock.needCount.toLocaleString('ar-SA')
      + '، التغطية ' + coverage
      + '، آخر جرد ' + lastCount + '.';

    if (selectedQuranStock.targetCount <= 0) {
      setVisitItem(itemIndex, { note: mergeQuranEvidence(currentItem.note, evidence) });
      toast.warning('تم ربط بيانات الرصيد بالملاحظة، لكن لم يتم تغيير النتيجة لأن العدد المستهدف غير محدد للموقع');
      return;
    }

    const needsAction = selectedQuranStock.needCount > 0;
    const suggestedPriority: MosqueFieldVisitItem['priority'] = needsAction
      ? selectedQuranStock.needLevel === 'high'
        ? 'high'
        : selectedQuranStock.needLevel === 'medium'
          ? 'medium'
          : 'normal'
      : currentItem.priority;

    setVisitItem(itemIndex, {
      status: needsAction ? 'needs_action' : 'good',
      note: mergeQuranEvidence(currentItem.note, evidence),
      priority: suggestedPriority,
      responsibleEntity: needsAction
        ? currentItem.responsibleEntity || 'وحدة العناية بالمساجد والمصليات الجامعية - مكتبة المصاحف'
        : currentItem.responsibleEntity,
    });
    toast.success(needsAction ? 'تم ربط الرصيد وتسجيل احتياج المصاحف في بند الفحص' : 'تم ربط الرصيد واعتماد كفاية العدد وفق البيانات النظامية');
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
      toast.error('اختر المسجد أو المصلى وأدخل تاريخ الزيارة');
      return;
    }
    if (!editingVisit) {
      const existingVisit = activeVisitBySite.get(visitForm.siteId);
      if (existingVisit) {
        toast.error(`يوجد إجراء ميداني قائم لهذا الموقع برقم ${existingVisit.visitNumber}. افتح الزيارة القائمة بدل إنشاء زيارة مكررة.`);
        setVisitDialog(false);
        setViewingVisit(existingVisit);
        return;
      }
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
    const missingBeforeEvidence = ['completed', 'follow_up', 'closed'].includes(visitForm.workflowStatus)
      ? visitForm.items.find((item) => item.status === 'needs_action' && !(item.beforeImages || []).length)
      : null;
    if (missingBeforeEvidence) {
      toast.error(`أرفق صورة واحدة على الأقل قبل المعالجة في بند: ${missingBeforeEvidence.title}`);
      return;
    }
    const missingResolutionDescription = visitForm.items.find((item) =>
      item.status === 'needs_action'
      && ['resolved', 'closed'].includes(item.resolutionStatus)
      && !String(item.resolutionNote || '').trim()
    );
    if (missingResolutionDescription) {
      toast.error(`اكتب وصف الإجراء أو المعالجة المنفذة في بند: ${missingResolutionDescription.title}`);
      return;
    }
    const missingAfterEvidence = visitForm.items.find((item) =>
      item.status === 'needs_action'
      && item.resolutionStatus === 'closed'
      && !(item.afterImages || []).length
    );
    if (missingAfterEvidence) {
      toast.error(`لا يمكن إغلاق الملاحظة قبل إرفاق صورة بعد المعالجة في بند: ${missingAfterEvidence.title}`);
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

  const resetVisitPrintOptions = (visit?: MosqueFieldVisit | null) => {
    setVisitPrintTitle(visit ? `تقرير زيارة ميدانية — ${visit.site.name}` : 'تقرير زيارة ميدانية');
    setVisitPrintIssueFilter('');
    setVisitPrintStatusFilter('');
    setVisitPrintPriorityFilter('');
    setVisitPrintResolutionFilter('');
    setVisitPrintCategoryFilter('');
    setVisitPrintSortBy('order');
    setVisitPrintSortDirection('asc');
    setVisitPrintColumns([...defaultVisitReportColumns]);
  };

  const getConfiguredVisitItems = (items: MosqueFieldVisitItem[]) => {
    const priorityOrder: Record<string, number> = { low: 1, normal: 2, medium: 3, high: 4, urgent: 5 };
    const resolutionOrder: Record<string, number> = { new: 1, referred: 2, in_progress: 3, resolved: 4, closed: 5 };
    const statusOrder: Record<string, number> = { not_checked: 1, needs_action: 2, not_available: 3, not_applicable: 4, good: 5 };
    const now = Date.now();
    const filtered = items.map((item, index) => ({ item, index })).filter(({ item }) => {
      const open = item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus);
      const urgent = open && item.priority === 'urgent';
      const overdue = open && Boolean(item.dueDate) && new Date(String(item.dueDate)).getTime() < now;
      const resolved = item.status === 'needs_action' && ['resolved', 'closed'].includes(item.resolutionStatus);
      const issueMatches = !visitPrintIssueFilter
        || (visitPrintIssueFilter === 'open' && open)
        || (visitPrintIssueFilter === 'urgent' && urgent)
        || (visitPrintIssueFilter === 'overdue' && overdue)
        || (visitPrintIssueFilter === 'resolved' && resolved);
      return issueMatches
        && (!visitPrintStatusFilter || item.status === visitPrintStatusFilter)
        && (!visitPrintPriorityFilter || item.priority === visitPrintPriorityFilter)
        && (!visitPrintResolutionFilter || item.resolutionStatus === visitPrintResolutionFilter)
        && (!visitPrintCategoryFilter || item.category === visitPrintCategoryFilter);
    });

    const direction = visitPrintSortDirection === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      let comparison = a.index - b.index;
      if (visitPrintSortBy === 'category') comparison = String(a.item.category || '').localeCompare(String(b.item.category || ''), 'ar');
      else if (visitPrintSortBy === 'priority') comparison = (priorityOrder[a.item.priority] || 0) - (priorityOrder[b.item.priority] || 0);
      else if (visitPrintSortBy === 'status') comparison = (statusOrder[a.item.status] || 0) - (statusOrder[b.item.status] || 0);
      else if (visitPrintSortBy === 'resolution') comparison = (resolutionOrder[a.item.resolutionStatus] || 0) - (resolutionOrder[b.item.resolutionStatus] || 0);
      else if (visitPrintSortBy === 'due_date') comparison = (a.item.dueDate ? new Date(a.item.dueDate).getTime() : Number.MAX_SAFE_INTEGER) - (b.item.dueDate ? new Date(b.item.dueDate).getTime() : Number.MAX_SAFE_INTEGER);
      return comparison * direction;
    }).map(({ item }) => item);
  };

  const printVisit = async (visit: MosqueFieldVisit, includeImages: boolean) => {
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) {
      toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
      return;
    }
    report.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري إعداد التقرير</title></head><body style="font-family:Tahoma,Arial;text-align:center;padding:80px"><h2>جاري إعداد تقرير الزيارة...</h2><p>يرجى الانتظار حتى يتم تحميل الصور المحددة.</p></body></html>');
    report.document.close();

    const reportTitle = visitPrintTitle.trim() || `تقرير زيارة ميدانية — ${visit.site.name}`;
    const selectedItems = getConfiguredVisitItems(visit.items || []);
    const selectedColumnDefs = visitReportColumns.filter((column) => visitPrintColumns.includes(column.key));
    const tableFontSize = selectedColumnDefs.length >= 9 ? 8 : selectedColumnDefs.length >= 7 ? 9 : 10;
    const isImageAttachment = (attachment: MosqueFieldVisitAttachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''));
    const printImages = [
      ...(visit.attachments || []).filter(isImageAttachment).map((attachment, index) => ({ attachment, label: attachment.description || `مرفق الزيارة ${index + 1}` })),
      ...selectedItems.flatMap((item) => [
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
    const actionItems = selectedItems.filter((item) => item.status === 'needs_action');

    const cellValue = (item: MosqueFieldVisitItem, column: VisitReportColumnKey) => {
      switch (column) {
        case 'category': return item.category;
        case 'title': return item.title;
        case 'status': return getItemStatusLabel(item);
        case 'priority': return priorityLabels[item.priority] || item.priority;
        case 'note': return item.note || '-';
        case 'responsible': return item.responsibleEntity || '-';
        case 'due_date': return item.dueDate ? new Date(item.dueDate).toLocaleDateString('ar-SA-u-ca-gregory') : '-';
        case 'resolution': return resolutionLabels[item.resolutionStatus] || item.resolutionStatus;
        case 'resolution_note': return item.resolutionNote || '-';
        case 'treatment_images': return `${item.beforeImages?.length || 0}/${item.afterImages?.length || 0}`;
        default: return '-';
      }
    };
    const headerCells = selectedColumnDefs.map((column) => `<th>${html(column.label)}</th>`).join('');
    const rows = selectedItems.map((item, index) => {
      const cells = selectedColumnDefs.map((column) => `<td${column.align === 'right' ? ' class="right"' : ''}>${html(cellValue(item, column.key))}</td>`).join('');
      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    }).join('');

    report.document.open();
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0f766e;border-radius:16px;padding:16px;background:#f0fdfa}.kicker{font-size:11px;color:#0f766e;font-weight:bold}.title{font-size:23px;font-weight:900;margin:6px 0}.subtitle{font-size:10px;color:#64748b}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:12px}.box{border:1px solid #cbd5e1;border-radius:10px;padding:8px;background:white}.box small{display:block;color:#64748b;margin-bottom:4px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.metric{padding:10px;border:1px solid #cbd5e1;border-radius:10px;text-align:center}.metric b{display:block;font-size:20px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:${tableFontSize}px;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:top;word-break:break-word}th{background:#e2e8f0;white-space:nowrap}.right{text-align:right}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.note{border:1px solid #cbd5e1;border-radius:10px;padding:10px;min-height:65px;white-space:pre-wrap}.pdf-list{margin-top:12px;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:10px}.pdf-list div{margin-top:5px;color:#475569}.attachments{page-break-before:always;padding-top:3mm}.attachments h2{margin:0 0 12px;font-size:20px}.image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.image-grid figure{margin:0;border:1px solid #cbd5e1;border-radius:12px;padding:8px;break-inside:avoid;page-break-inside:avoid}.image-grid img{display:block;width:100%;height:230px;object-fit:contain;background:#f8fafc;border-radius:8px}.image-grid figcaption{display:flex;flex-direction:column;gap:3px;margin-top:6px;font-size:10px}.footer{margin-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title">${html(reportTitle)}</div><div class="subtitle">يعرض التقرير ${selectedItems.length} من أصل ${visit.items.length} بند فحص وفق الفرز والتصفية المحددة.</div><div class="meta"><div class="box"><small>رقم الزيارة</small><b>${html(visit.visitNumber)}</b></div><div class="box"><small>المسجد / المصلى</small><b>${html(visit.site.name)}</b></div><div class="box"><small>التاريخ</small><b>${html(new Date(visit.visitDate).toLocaleString('ar-SA-u-ca-gregory'))}</b></div><div class="box"><small>نوع الزيارة</small><b>${html(visitTypeLabels[visit.visitType])}</b></div><div class="box"><small>الفريق</small><b>${html((visit.teamMembers || []).join('، '))}</b></div><div class="box"><small>ممثل الموقع</small><b>${html(visit.representativeName || '-')}</b></div><div class="box"><small>الحالة العامة</small><b>${html(overallLabels[visit.overallStatus])}</b></div><div class="box"><small>حالة السجل</small><b>${html(visitStatusLabels[visit.workflowStatus])}</b></div></div></div><div class="metrics"><div class="metric">بنود الفحص المطبوعة<b>${selectedItems.length}</b></div><div class="metric">تحتاج معالجة<b>${actionItems.length}</b></div><div class="metric">عاجلة<b>${actionItems.filter((item) => item.priority === 'urgent').length}</b></div><div class="metric">مغلقة بعد التحقق<b>${selectedItems.filter((item) => item.resolutionStatus === 'closed').length}</b></div></div><table><thead><tr><th>م</th>${headerCells}</tr></thead><tbody>${rows || `<tr><td colspan="${selectedColumnDefs.length + 1}">لا توجد بنود مطابقة للفرز والتصفية</td></tr>`}</tbody></table><div class="notes"><div class="note"><b>الملاحظات العامة</b><br>${html(visit.generalNotes || '-')}</div><div class="note"><b>التوصيات</b><br>${html(visit.recommendations || '-')}</div></div>${pdfSection}${imageSection}<div class="footer"><span>تم إنشاء التقرير من منصة IAU Deeds</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    report.document.close();
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  };

  const printTreatmentEvidenceReport = async (sourceVisits: MosqueFieldVisit[], reportTitle: string, useVisitPrintFilters = false) => {
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) {
      toast.error('تعذر فتح نافذة تقرير المعالجة. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
      return;
    }

    const treatmentItems = sourceVisits.flatMap((visit) => (useVisitPrintFilters ? getConfiguredVisitItems(visit.items || []) : (visit.items || []))
      .filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length)
      .map((item) => ({ visit, item })));

    if (!treatmentItems.length) {
      report.close();
      toast.info('لا توجد ملاحظات أو صور معالجة قبل/بعد ضمن السجل المحدد');
      return;
    }

    report.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>جاري إعداد سجل المعالجة المصور</title></head><body style="font-family:Tahoma,Arial;text-align:center;padding:80px"><h2>جاري إعداد سجل المعالجة المصور...</h2><p>يتم تحميل صور قبل المعالجة وبعدها.</p></body></html>');
    report.document.close();

    const objectUrls: string[] = [];
    const prepareImage = async (image: MosqueFieldVisitImage) => {
      try {
        if (!image.fileId) return { image, src: image.url };
        const blob = await mosqueApi.mediaBlob(image.fileId);
        const src = URL.createObjectURL(blob);
        objectUrls.push(src);
        return { image, src };
      } catch {
        return { image, src: image.url };
      }
    };

    const prepared = await Promise.all(treatmentItems.map(async ({ visit, item }) => ({
      visit,
      item,
      before: await Promise.all((item.beforeImages || []).map(prepareImage)),
      after: await Promise.all((item.afterImages || []).map(prepareImage)),
    })));

    const renderImages = (images: { image: MosqueFieldVisitImage; src: string }[], phase: 'before' | 'after') => {
      if (!images.length) return `<div class="empty-evidence">لم يتم إرفاق صورة ${phase === 'before' ? 'قبل المعالجة' : 'بعد المعالجة'}.</div>`;
      return `<div class="evidence-images">${images.map(({ image, src }, index) => `<figure><img src="${html(src)}" alt="${phase === 'before' ? 'قبل' : 'بعد'} ${index + 1}"><figcaption>${index + 1}${image.capturedAt ? ` — ${html(new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory'))}` : ''}</figcaption></figure>`).join('')}</div>`;
    };

    const cards = prepared.map(({ visit, item }, index) => {
      const before = prepared[index].before;
      const after = prepared[index].after;
      return `<section class="treatment-card"><div class="card-head"><div><span class="number">${index + 1}</span><b>${html(item.title)}</b><small>${html(item.category)}</small></div><div class="site"><b>${html(visit.site.name)}</b><small>${html(visit.visitNumber)} — ${html(new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory'))}</small></div></div><div class="details"><div><small>الملاحظة</small><b>${html(item.note || '-')}</b></div><div><small>الجهة المسؤولة</small><b>${html(item.responsibleEntity || '-')}</b></div><div><small>حالة المعالجة</small><b>${html(resolutionLabels[item.resolutionStatus] || item.resolutionStatus)}</b></div><div><small>وصف الإجراء / المعالجة المنفذة</small><b>${html(item.resolutionNote || '-')}</b></div></div><div class="compare"><div class="phase before"><h3>قبل المعالجة <span>${before.length}</span></h3>${renderImages(before, 'before')}</div><div class="phase after"><h3>بعد المعالجة <span>${after.length}</span></h3>${renderImages(after, 'after')}</div></div></section>`;
    }).join('');

    report.document.open();
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;background:#fff}.head{border:2px solid #0f766e;border-radius:16px;padding:16px;background:#f0fdfa;margin-bottom:14px}.kicker{font-size:11px;color:#0f766e;font-weight:bold}.title{font-size:23px;font-weight:900;margin:6px 0}.summary{font-size:11px;color:#475569}.treatment-card{border:1px solid #cbd5e1;border-radius:16px;padding:12px;margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}.card-head>div{display:flex;flex-wrap:wrap;align-items:center;gap:7px}.card-head small{color:#64748b}.number{display:inline-flex;width:24px;height:24px;border-radius:999px;align-items:center;justify-content:center;background:#0f766e;color:white;font-weight:bold}.site{justify-content:flex-end;text-align:left}.details{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.details>div{border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#f8fafc}.details small{display:block;color:#64748b;margin-bottom:4px}.details b{font-size:10px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.phase{border:1px solid #dbe4ee;border-radius:12px;padding:10px;min-height:190px}.phase h3{font-size:14px;margin:0 0 8px;display:flex;justify-content:space-between}.phase h3 span{border:1px solid #cbd5e1;border-radius:999px;padding:1px 7px;font-size:10px}.before{background:#fff7ed}.after{background:#f0fdf4}.evidence-images{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.evidence-images figure{margin:0;border:1px solid #cbd5e1;border-radius:10px;padding:6px;background:#fff;break-inside:avoid}.evidence-images img{width:100%;height:180px;display:block;object-fit:contain;background:#f8fafc;border-radius:7px}.evidence-images figcaption{font-size:9px;color:#64748b;margin-top:4px}.empty-evidence{height:180px;border:1px dashed #cbd5e1;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px}.footer{display:flex;justify-content:space-between;margin-top:10px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="title">${html(reportTitle)}</div><div class="summary">سجل معالجة مصور يوضح حالة الملاحظات قبل المعالجة وبعدها. عدد البنود: ${prepared.length}</div></div>${cards}<div class="footer"><span>منصة IAU Deeds — سجل المعالجة المصور</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`);
    report.document.close();
    if (objectUrls.length) setTimeout(() => objectUrls.forEach((url) => URL.revokeObjectURL(url)), 10 * 60 * 1000);
  };

  const printTourTreatmentReport = async (tour: MosqueFieldTour) => {
    const tourVisits = (tour.visits || [])
      .map((tourVisit) => visits.find((visit) => visit.id === tourVisit.id))
      .filter((visit): visit is MosqueFieldVisit => Boolean(visit));
    await printTreatmentEvidenceReport(tourVisits, `تقرير المعالجة المصور — ${tour.title}`);
  };

  const requestVisitPrint = (visit: MosqueFieldVisit) => {
    setPrintTarget(visit);
    setIncludePrintImages(true);
    setPrintTreatmentOnly(false);
    resetVisitPrintOptions(visit);
  };

  const confirmVisitPrint = async () => {
    if (!printTarget) return;
    const selectedItems = getConfiguredVisitItems(printTarget.items || []);
    const treatmentCount = selectedItems.filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length).length;
    if ((!printTreatmentOnly && !selectedItems.length) || (printTreatmentOnly && !treatmentCount)) {
      toast.error(printTreatmentOnly ? 'لا توجد بنود معالجة مطابقة للفرز والتصفية المحددة' : 'لا توجد بنود فحص مطابقة للفرز والتصفية المحددة');
      return;
    }
    try {
      setPreparingPrint(true);
      if (printTreatmentOnly) await printTreatmentEvidenceReport([printTarget], visitPrintTitle.trim() || `تقرير المعالجة المصور — ${printTarget.site.name}`, true);
      else await printVisit(printTarget, includePrintImages);
      setPrintTarget(null);
    } finally {
      setPreparingPrint(false);
    }
  };

  const openProgramPrintDialog = () => {
    if (!programReportTitle.trim()) setProgramReportTitle('تقرير البرنامج الميداني للمساجد والمصليات');
    setProgramPrintDialog(true);
  };

  const printProgramReport = () => {
    const reportTitle = programReportTitle.trim() || 'تقرير البرنامج الميداني للمساجد والمصليات';
    const openCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const urgentCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.priority === 'urgent' && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const overdueCount = (visit: MosqueFieldVisit) => visit.items.filter((item) => item.status === 'needs_action' && item.dueDate && new Date(item.dueDate).getTime() < Date.now() && !['resolved', 'closed'].includes(item.resolutionStatus)).length;
    const reportOpenItems = filteredVisits.reduce((total, visit) => total + openCount(visit), 0);
    const reportUrgentItems = filteredVisits.reduce((total, visit) => total + urgentCount(visit), 0);
    const reportOverdueItems = filteredVisits.reduce((total, visit) => total + overdueCount(visit), 0);
    const reportSiteCount = new Set(filteredVisits.map((visit) => visit.siteId)).size;
    const reportCompleted = filteredVisits.filter((visit) => ['completed', 'closed'].includes(visit.workflowStatus)).length;
    const activeColumnKeys = programPrintColumns.length ? programPrintColumns : defaultProgramReportColumns;
    const selectedColumnDefs = programReportColumns.filter((column) => activeColumnKeys.includes(column.key));
    const tableFontSize = selectedColumnDefs.length >= 13 ? 7.5 : selectedColumnDefs.length >= 10 ? 8.5 : 10;

    const cellValue = (visit: MosqueFieldVisit, column: ProgramReportColumnKey) => {
      switch (column) {
        case 'visit_number': return visit.visitNumber;
        case 'site': return visit.site.name;
        case 'visit_type': return visitTypeLabels[visit.visitType] || visit.visitType;
        case 'date': return new Date(visit.visitDate).toLocaleDateString('ar-SA-u-ca-gregory');
        case 'tour': return visit.tour ? [visit.tour.tourNumber, visit.tour.title].filter(Boolean).join(' — ') : '-';
        case 'location': return [visit.site.campusLocation, visit.site.district, visit.site.city].filter(Boolean).join(' — ') || '-';
        case 'overall': return overallLabels[visit.overallStatus] || visit.overallStatus;
        case 'priority': return priorityLabels[visit.priority] || visit.priority;
        case 'open_items': return openCount(visit);
        case 'urgent_items': return urgentCount(visit);
        case 'overdue_items': return overdueCount(visit);
        case 'workflow': return visitStatusLabels[visit.workflowStatus] || visit.workflowStatus;
        case 'team': return (visit.teamMembers || []).join('، ') || '-';
        case 'representative': return visit.representativeName || '-';
        case 'attachments': return visit.attachments?.length || 0;
        case 'treatment_images': {
          const before = visit.items.reduce((total, item) => total + (item.beforeImages?.length || 0), 0);
          const after = visit.items.reduce((total, item) => total + (item.afterImages?.length || 0), 0);
          return `${before}/${after}`;
        }
        default: return '-';
      }
    };

    const headerCells = selectedColumnDefs.map((column) => `<th>${html(column.label)}</th>`).join('');
    const rows = filteredVisits.map((visit, index) => {
      const cells = selectedColumnDefs.map((column) => `<td${column.align === 'right' ? ' class="right"' : ''}>${html(cellValue(visit, column.key))}</td>`).join('');
      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    }).join('');
    const report = window.open('', '_blank', 'width=1200,height=850');
    if (!report) return toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مجددًا.');
    report.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${html(reportTitle)}</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{border:2px solid #0369a1;border-radius:16px;padding:16px;background:linear-gradient(135deg,#f0f9ff,#fff,#ecfdf5)}.kicker{font-size:11px;color:#0369a1;font-weight:bold}h1{font-size:24px;margin:6px 0}.subtitle{font-size:11px;color:#475569}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0}.metric{border:1px solid #cbd5e1;border-radius:10px;padding:10px;text-align:center;background:#fff}.metric small{display:block;color:#64748b}.metric b{display:block;font-size:22px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:${tableFontSize}px;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:middle;word-break:break-word}th{background:#e2e8f0;white-space:nowrap}.right{text-align:right}.footer{display:flex;justify-content:space-between;margin-top:12px;font-size:9px;color:#64748b}</style></head><body><div class="head"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>${html(reportTitle)}</h1><div class="subtitle">تم إنشاء التقرير من ${filteredVisits.length} زيارة وفق الفرز والتصفية الحالية${activeFilterCount ? ` (${activeFilterCount} معيار تصفية)` : ''}. الأعمدة المختارة: ${selectedColumnDefs.length} بالإضافة إلى عمود التسلسل.</div></div><div class="metrics"><div class="metric"><small>الزيارات في التقرير</small><b>${filteredVisits.length}</b></div><div class="metric"><small>المواقع</small><b>${reportSiteCount}</b></div><div class="metric"><small>المكتملة / المغلقة</small><b>${reportCompleted}</b></div><div class="metric"><small>الملاحظات المفتوحة</small><b>${reportOpenItems}</b></div><div class="metric"><small>العاجلة</small><b>${reportUrgentItems}</b></div><div class="metric"><small>المتأخرة</small><b>${reportOverdueItems}</b></div></div><table><thead><tr><th>م</th>${headerCells}</tr></thead><tbody>${rows || `<tr><td colspan="${selectedColumnDefs.length + 1}">لا توجد زيارات مطابقة</td></tr>`}</tbody></table><div class="footer"><span>منصة IAU Deeds — البرنامج الميداني</span><span>${html(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    report.document.close();
    setProgramPrintDialog(false);
  };

  const configuredPrintItems = printTarget ? getConfiguredVisitItems(printTarget.items || []) : [];
  const visitPrintCategories = printTarget ? Array.from(new Set((printTarget.items || []).map((item) => item.category).filter(Boolean))) : [];
  const printImageCount = printTarget ? [
    ...(printTarget.attachments || []).filter((attachment) => String(attachment.mimeType || '').startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(String(attachment.fileName || ''))),
    ...configuredPrintItems.flatMap((item) => [...(item.beforeImages || []), ...(item.afterImages || [])]),
  ].length : 0;
  const printPdfCount = printTarget ? (printTarget.attachments || []).filter((attachment) => attachment.mimeType === 'application/pdf' || /\.pdf$/i.test(String(attachment.fileName || ''))).length : 0;
  const printTreatmentCount = configuredPrintItems.filter((item) => item.status === 'needs_action' || (item.beforeImages || []).length || (item.afterImages || []).length).length;


  if (loading) return <div className="flex min-h-[320px] items-center justify-center gap-3"><Loader2 className="h-7 w-7 animate-spin text-sky-700" /><span className="font-semibold">جاري تحميل البرنامج الميداني...</span></div>;

  return <div className="space-y-5" dir="rtl">
    <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-l from-emerald-50 via-white to-sky-50">
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <div><CardTitle className="flex items-center gap-2 text-xl"><Route className="h-5 w-5 text-emerald-700" />البرنامج الميداني للمساجد والمصليات</CardTitle><CardDescription className="mt-2">الجولات والزيارات مرتبطة مباشرة بالسجلات الحالية للمساجد والمصليات، مع متابعة الملاحظات والصور قبل المعالجة وبعدها.</CardDescription></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
          {canPrint && <Button variant="outline" onClick={openProgramPrintDialog}><Printer className="ml-2 h-4 w-4" />تقرير البرنامج</Button>}
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
          {view === 'visits' && <div className="flex-1 space-y-2 md:max-w-5xl">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث برقم الزيارة أو الموقع أو المنفذ" /></div>
              <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
              <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع حالات الزيارة</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <Button type="button" variant={showAdvancedFilters || activeFilterCount > 3 ? 'secondary' : 'outline'} onClick={() => setShowAdvancedFilters((current) => !current)}>تصفية وفرز متقدم{activeFilterCount ? ' (' + activeFilterCount + ')' : ''}</Button>
            </div>
            {showAdvancedFilters && <div className="rounded-2xl border border-sky-100 bg-slate-50/80 p-3 shadow-sm">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <NativeSelect value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)}><option value="">جميع أنواع الزيارة</option>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={overallFilter} onChange={(event) => setOverallFilter(event.target.value)}><option value="">جميع الحالات العامة</option>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
                <NativeSelect value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option value="">كل نتائج الفحص</option><option value="open">بها ملاحظات مفتوحة</option><option value="urgent">بها ملاحظات عاجلة</option><option value="overdue">بها ملاحظات متأخرة</option><option value="clear">بدون ملاحظات مفتوحة</option></NativeSelect>
                <Field label="من تاريخ"><Input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} /></Field>
                <Field label="إلى تاريخ"><Input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} /></Field>
                <Field label="الفرز حسب"><NativeSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">تاريخ الزيارة</option><option value="site">المسجد / المصلى</option><option value="visit_number">رقم الزيارة</option><option value="status">حالة الزيارة</option><option value="open_items">عدد الملاحظات المفتوحة</option><option value="priority">الأولوية العامة</option></NativeSelect></Field>
                <Field label="اتجاه الفرز"><NativeSelect value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}><option value="desc">تنازلي / الأحدث أولًا</option><option value="asc">تصاعدي / الأقدم أولًا</option></NativeSelect></Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3"><span className="text-xs font-semibold text-slate-600">النتائج الحالية: {filteredVisits.length} من {visits.length} زيارة</span><Button type="button" size="sm" variant="outline" onClick={resetVisitFilters}>مسح التصفية وإعادة الفرز</Button></div>
            </div>}
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
        <CardContent className="space-y-3 pt-4 text-sm"><InfoLine label="التاريخ" value={new Date(tour.scheduledDate).toLocaleDateString('ar-SA-u-ca-gregory')} /><InfoLine label="الفريق" value={(tour.teamMembers || []).join('، ')} /><InfoLine label="النطاق" value={tour.scope || '-'} /><div className="rounded-xl border bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><span className="font-bold">المواقع المجدولة</span><Badge>{tour.visits?.length || 0}</Badge></div><div className="max-h-36 space-y-1 overflow-y-auto">{tour.visits?.map((visit) => <button key={visit.id} type="button" className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-1.5 text-right hover:bg-sky-50" onClick={() => { const full = visits.find((item) => item.id === visit.id); if (full) openVisit(full); }}><span>{visit.site.name}</span><span className="text-xs text-slate-500">{visitStatusLabels[visit.workflowStatus]}</span></button>)}</div></div>{canEdit && <NativeSelect value={tour.status} onChange={(event) => void updateTourStatus(tour, event.target.value as MosqueFieldTour['status'])}>{Object.entries(tourStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>}{canPrint && <Button size="sm" variant="outline" className="w-full border-emerald-200 text-emerald-800" onClick={() => void printTourTreatmentReport(tour)}><ImageIcon className="ml-2 h-4 w-4" />تقرير المعالجة المصور قبل / بعد</Button>}</CardContent>
      </Card>)}
      {!tours.length && <Empty message="لم يتم إنشاء جولات ميدانية بعد" />}
    </div>}

    <Dialog open={programPrintDialog} onOpenChange={setProgramPrintDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-sky-700" />إعداد تقرير البرنامج الميداني</DialogTitle>
          <DialogDescription>حدد عنوان التقرير ومعايير الفرز والتصفية والأعمدة التي تريد ظهورها في الجدول قبل الانتقال إلى الطباعة. يتم تحديث عدد النتائج مباشرة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="عنوان التقرير / اسم الجدول">
            <Input value={programReportTitle} onChange={(event) => setProgramReportTitle(event.target.value)} placeholder="مثال: جدول الزيارات الميدانية لمساجد الحرم الشرقي" autoFocus />
          </Field>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
            <div className="mb-3 flex items-center justify-between"><b className="text-sm text-slate-800">الفرز والتصفية</b><Badge variant="outline">{filteredVisits.length} زيارة</Badge></div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <NativeSelect value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}><option value="">جميع المواقع</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</NativeSelect>
              <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">جميع حالات الزيارة</option>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)}><option value="">جميع أنواع الزيارة</option>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={overallFilter} onChange={(event) => setOverallFilter(event.target.value)}><option value="">جميع الحالات العامة</option>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect value={issueFilter} onChange={(event) => setIssueFilter(event.target.value)}><option value="">كل نتائج الفحص</option><option value="open">بها ملاحظات مفتوحة</option><option value="urgent">بها ملاحظات عاجلة</option><option value="overdue">بها ملاحظات متأخرة</option><option value="clear">بدون ملاحظات مفتوحة</option></NativeSelect>
              <Field label="من تاريخ"><Input type="date" value={dateFromFilter} onChange={(event) => setDateFromFilter(event.target.value)} /></Field>
              <Field label="إلى تاريخ"><Input type="date" value={dateToFilter} onChange={(event) => setDateToFilter(event.target.value)} /></Field>
              <Field label="الفرز حسب"><NativeSelect value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="date">تاريخ الزيارة</option><option value="site">المسجد / المصلى</option><option value="visit_number">رقم الزيارة</option><option value="status">حالة الزيارة</option><option value="open_items">الملاحظات المفتوحة</option><option value="priority">الأولوية العامة</option></NativeSelect></Field>
              <Field label="اتجاه الفرز"><NativeSelect value={sortDirection} onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}><option value="desc">تنازلي / الأحدث أولًا</option><option value="asc">تصاعدي / الأقدم أولًا</option></NativeSelect></Field>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-sky-100 pt-3"><span className="text-xs text-slate-600">{activeFilterCount ? 'تم تطبيق ' + activeFilterCount + ' معيار تصفية.' : 'سيتم تضمين جميع الزيارات.'}</span><Button type="button" size="sm" variant="outline" onClick={resetVisitFilters}>إعادة ضبط</Button></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div><b className="text-sm text-slate-800">الأعمدة الظاهرة في جدول الطباعة</b><p className="mt-1 text-[11px] text-slate-500">اختر الأعمدة التي يحتاجها التقرير فقط. عمود التسلسل «م» يظهر تلقائيًا، وترتيب الأعمدة يبقى بالترتيب القياسي.</p></div>
              <Badge variant="outline">{programPrintColumns.length} عمود مختار</Badge>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setProgramPrintColumns([...defaultProgramReportColumns])}>الافتراضي</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setProgramPrintColumns([...basicProgramReportColumns])}>أساسي</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setProgramPrintColumns([...followUpProgramReportColumns])}>متابعة ومعالجة</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setProgramPrintColumns(programReportColumns.map((column) => column.key))}>جميع الأعمدة</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {programReportColumns.map((column) => {
                const selected = programPrintColumns.includes(column.key);
                return <button key={column.key} type="button" aria-pressed={selected} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-xs font-semibold transition ${selected ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`} onClick={() => setProgramPrintColumns((current) => current.includes(column.key) ? (current.length === 1 ? current : current.filter((key) => key !== column.key)) : [...current, column.key])}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${selected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span><span>{column.label}</span></button>;
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setProgramPrintDialog(false)}>إلغاء</Button><Button onClick={printProgramReport} disabled={!filteredVisits.length}><Printer className="ml-2 h-4 w-4" />متابعة إلى الطباعة</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(printTarget)} onOpenChange={(open) => { if (!open && !preparingPrint) setPrintTarget(null); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">
        {printTarget && <>
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-sky-700" />خيارات طباعة التقرير</DialogTitle>
            <DialogDescription>اختر نوع التقرير ثم خصص عنوانه والبنود والفرز والأعمدة قبل الطباعة للزيارة {printTarget.visitNumber}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${includePrintImages && !printTreatmentOnly ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-sky-700" checked={includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(false); }} />
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                <span><b className="block text-sm text-slate-800">تقرير كامل مع الصور</b><small className="mt-1 block text-slate-500">إدراج {printImageCount} صورة مرتبطة بالبُنود المحددة ومرفقات الزيارة.</small></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${!includePrintImages && !printTreatmentOnly ? 'border-slate-600 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-slate-700" checked={!includePrintImages && !printTreatmentOnly} onChange={() => { setIncludePrintImages(false); setPrintTreatmentOnly(false); }} />
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <span><b className="block text-sm text-slate-800">تقرير بدون الصور</b><small className="mt-1 block text-slate-500">طباعة البيانات والبنود المختارة فقط لتقليل عدد الصفحات.</small></span>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${printTreatmentOnly ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                <input type="radio" name="visit-print-mode" className="mt-1 h-4 w-4 accent-emerald-700" checked={printTreatmentOnly} onChange={() => { setIncludePrintImages(true); setPrintTreatmentOnly(true); }} />
                <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <span><b className="block text-sm text-slate-800">المعالجة المصورة قبل / بعد</b><small className="mt-1 block text-slate-500">تقرير مركز على {printTreatmentCount} بند معالجة مطابق للتصفية الحالية.</small></span>
              </label>
            </div>

            <Field label="عنوان التقرير">
              <Input value={visitPrintTitle} onChange={(event) => setVisitPrintTitle(event.target.value)} placeholder={`مثال: تقرير متابعة ${printTarget.site.name}`} />
            </Field>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div><b className="text-sm text-slate-800">فرز وتصفية بنود الزيارة</b><p className="mt-1 text-[11px] text-slate-500">تطبق الخيارات على جدول الفحص، وعلى سجل المعالجة المصور عند اختياره.</p></div>
                <Badge variant="outline">{configuredPrintItems.length} من {printTarget.items.length} بند</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <NativeSelect value={visitPrintIssueFilter} onChange={(event) => setVisitPrintIssueFilter(event.target.value)}>
                  <option value="">جميع البنود</option><option value="open">الملاحظات المفتوحة فقط</option><option value="urgent">العاجلة فقط</option><option value="overdue">المتأخرة فقط</option><option value="resolved">المعالَجة / المغلقة فقط</option>
                </NativeSelect>
                <NativeSelect value={visitPrintStatusFilter} onChange={(event) => setVisitPrintStatusFilter(event.target.value)}>
                  <option value="">جميع نتائج الفحص</option>{Object.entries(itemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintCategoryFilter} onChange={(event) => setVisitPrintCategoryFilter(event.target.value)}>
                  <option value="">جميع المحاور</option>{visitPrintCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintPriorityFilter} onChange={(event) => setVisitPrintPriorityFilter(event.target.value)}>
                  <option value="">جميع الأولويات</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintResolutionFilter} onChange={(event) => setVisitPrintResolutionFilter(event.target.value)}>
                  <option value="">جميع حالات المعالجة</option>{Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
                <NativeSelect value={visitPrintSortBy} onChange={(event) => setVisitPrintSortBy(event.target.value as typeof visitPrintSortBy)}>
                  <option value="order">ترتيب قائمة الفحص</option><option value="category">المحور</option><option value="priority">الأولوية</option><option value="status">نتيجة الفحص</option><option value="resolution">حالة المعالجة</option><option value="due_date">تاريخ الاستحقاق</option>
                </NativeSelect>
                <NativeSelect value={visitPrintSortDirection} onChange={(event) => setVisitPrintSortDirection(event.target.value as 'asc' | 'desc')}>
                  <option value="asc">تصاعدي / الترتيب الأصلي أولًا</option><option value="desc">تنازلي / الأعلى أو الأحدث أولًا</option>
                </NativeSelect>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-sky-100 pt-3">
                <span className="text-xs text-slate-600">{printTreatmentOnly ? `سيتم تضمين ${printTreatmentCount} بند معالجة مصور.` : `سيتم طباعة ${configuredPrintItems.length} بند فحص.`}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => resetVisitPrintOptions(printTarget)}>إعادة ضبط التخصيص</Button>
              </div>
            </div>

            {!printTreatmentOnly && <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div><b className="text-sm text-slate-800">الأعمدة الظاهرة في جدول الفحص</b><p className="mt-1 text-[11px] text-slate-500">اختر المعلومات التي تحتاجها فقط. عمود التسلسل «م» يظهر تلقائيًا.</p></div>
                <Badge variant="outline">{visitPrintColumns.length} عمود مختار</Badge>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...defaultVisitReportColumns])}>الافتراضي</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...basicVisitReportColumns])}>أساسي</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns([...followUpVisitReportColumns])}>متابعة ومعالجة</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setVisitPrintColumns(visitReportColumns.map((column) => column.key))}>جميع الأعمدة</Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {visitReportColumns.map((column) => {
                  const selected = visitPrintColumns.includes(column.key);
                  return <button key={column.key} type="button" aria-pressed={selected} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-right text-xs font-semibold transition ${selected ? 'border-sky-300 bg-sky-50 text-sky-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`} onClick={() => setVisitPrintColumns((current) => current.includes(column.key) ? (current.length === 1 ? current : current.filter((key) => key !== column.key)) : [...current, column.key])}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] ${selected ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span><span>{column.label}</span></button>;
                })}
              </div>
            </div>}

            {printTreatmentOnly && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">في تقرير المعالجة المصور لا توجد أعمدة جدول ثابتة؛ تُطبق التصفية والفرز أعلاه على بطاقات الملاحظات وصور قبل/بعد المعالجة.</div>}
            {printPdfCount > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">يوجد {printPdfCount} ملف PDF؛ ستظهر أوصافها في التقرير ويمكن فتح كل ملف وطباعته بصورة مستقلة.</div>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrintTarget(null)} disabled={preparingPrint}>إلغاء</Button>
            <Button className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => void confirmVisitPrint()} disabled={preparingPrint || (!printTreatmentOnly && !configuredPrintItems.length) || (printTreatmentOnly && !printTreatmentCount)}>{preparingPrint ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Printer className="ml-2 h-4 w-4" />}{preparingPrint ? 'جاري إعداد التقرير...' : 'متابعة إلى الطباعة'}</Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>

    <Dialog open={tourDialog} onOpenChange={setTourDialog}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]" dir="rtl">
        <DialogHeader className="text-right"><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-emerald-700" />إنشاء جولة ميدانية</DialogTitle><DialogDescription>اختر المواقع المسجلة حاليًا؛ ستُنشأ زيارة مجدولة مستقلة لكل مسجد أو مصلى داخل الجولة.</DialogDescription></DialogHeader>
        <div className="grid gap-4 md:grid-cols-2"><Field label="عنوان الجولة *"><Input value={tourForm.title} onChange={(event) => setTourForm({ ...tourForm, title: event.target.value })} /></Field><Field label="تاريخ الجولة *"><Input type="date" value={tourForm.scheduledDate} onChange={(event) => setTourForm({ ...tourForm, scheduledDate: event.target.value })} /></Field><div className="md:col-span-2"><Field label="منفذ الجولة"><Input value={tourForm.teamMembers} readOnly className="bg-slate-100 font-semibold text-slate-700" /></Field><p className="mt-1 text-[11px] text-slate-500">يُسجل اسم المستخدم الحالي تلقائيًا دون الحاجة لكتابة جميع أعضاء الفريق.</p></div><div className="md:col-span-2"><Field label="نطاق الجولة"><Input value={tourForm.scope} onChange={(event) => setTourForm({ ...tourForm, scope: event.target.value })} placeholder="مثال: الحرم الجامعي الشرقي - مباني الكليات الصحية" /></Field></div></div>
        <div className="rounded-2xl border bg-slate-50 p-4"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">المساجد والمصليات المشمولة</p><p className="text-xs text-slate-500">تم اختيار {tourForm.siteIds.length} موقع</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setTourForm({ ...tourForm, siteIds: filteredTourSites.filter((site) => !activeVisitBySite.has(site.id)).map((site) => site.id) })}>تحديد المتاح</Button><Button size="sm" variant="outline" onClick={() => setTourForm({ ...tourForm, siteIds: [] })}>إلغاء التحديد</Button></div></div><div className="relative mb-3"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-9" value={tourSearch} onChange={(event) => setTourSearch(event.target.value)} placeholder="ابحث عن موقع" /></div><div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{filteredTourSites.map((site) => { const checked = tourForm.siteIds.includes(site.id); const activeVisit = activeVisitBySite.get(site.id); const unavailable = Boolean(activeVisit); return <div key={site.id} className={`rounded-xl border p-3 ${unavailable ? 'border-amber-200 bg-amber-50/70' : checked ? 'border-emerald-300 bg-emerald-50' : 'bg-white'}`}><label className={`flex items-start gap-3 ${unavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}><input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700" checked={checked} disabled={unavailable} onChange={() => setTourForm((current) => ({ ...current, siteIds: checked ? current.siteIds.filter((id) => id !== site.id) : [...current.siteIds, site.id] }))} /><span className="min-w-0 flex-1"><b className="block text-sm">{site.name}</b><small className="block text-slate-500">{site.campusLocation || [site.city, site.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}</small>{activeVisit && <span className="mt-1 block text-[11px] font-bold text-amber-700">زيارة قائمة: {activeVisit.visitNumber} — {visitStatusLabels[activeVisit.workflowStatus]}</span>}</span></label>{activeVisit && <Button type="button" size="sm" variant="outline" className="mt-2 h-8 border-amber-300 bg-white text-xs text-amber-800" onClick={() => setViewingVisit(activeVisit)}><Eye className="ml-1 h-3.5 w-3.5" />فتح الزيارة القائمة</Button>}</div>; })}</div></div>
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
                  <div className="flex flex-wrap gap-2"><Badge variant="outline">{getItemStatusLabel(item)}</Badge><Badge variant="outline">{priorityLabels[item.priority]}</Badge></div>
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
        <div className="grid gap-4 rounded-2xl border bg-slate-50/70 p-4 md:grid-cols-3"><Field label="المسجد أو المصلى *"><NativeSelect value={visitForm.siteId} onChange={(event) => setVisitForm({ ...visitForm, siteId: event.target.value })} disabled={Boolean(editingVisit?.tourId)}><option value="">اختر الموقع</option>{sites.map((site) => { const activeVisit = activeVisitBySite.get(site.id); const blocked = !editingVisit && Boolean(activeVisit); return <option key={site.id} value={site.id} disabled={blocked}>{site.name} — {site.campusLocation || site.city || ''}{blocked ? ` — زيارة قائمة ${activeVisit!.visitNumber}` : ''}</option>; })}</NativeSelect></Field><Field label="نوع الزيارة"><NativeSelect value={visitForm.visitType} onChange={(event) => setVisitForm({ ...visitForm, visitType: event.target.value as MosqueFieldVisit['visitType'] })}>{Object.entries(visitTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label="تاريخ ووقت الوصول *"><Input type="datetime-local" value={visitForm.visitDate} onChange={(event) => setVisitForm({ ...visitForm, visitDate: event.target.value })} /></Field><Field label="وقت المغادرة"><Input type="datetime-local" value={visitForm.departureAt} onChange={(event) => setVisitForm({ ...visitForm, departureAt: event.target.value })} /></Field><Field label="ممثل الموقع"><Input value={visitForm.representativeName} onChange={(event) => setVisitForm({ ...visitForm, representativeName: event.target.value })} /></Field><Field label="حالة سجل الزيارة"><NativeSelect value={visitForm.workflowStatus} onChange={(event) => setVisitForm({ ...visitForm, workflowStatus: event.target.value as MosqueFieldVisit['workflowStatus'] })}>{Object.entries(visitStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><div className="md:col-span-3"><Field label="منفذ الزيارة"><Input value={visitForm.teamMembers} readOnly className="bg-slate-100 font-semibold text-slate-700" /></Field><p className="mt-1 text-[11px] text-slate-500">يُسجل اسم المستخدم الحالي تلقائيًا. السجلات السابقة تحتفظ بأسماء الفريق المحفوظة تاريخيًا.</p></div><Field label="الحالة العامة"><NativeSelect value={visitForm.overallStatus} onChange={(event) => setVisitForm({ ...visitForm, overallStatus: event.target.value as MosqueFieldVisit['overallStatus'] })}>{Object.entries(overallLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label="الأولوية العامة"><NativeSelect value={visitForm.priority} onChange={(event) => setVisitForm({ ...visitForm, priority: event.target.value as MosqueFieldVisit['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field></div>
        {visitForm.siteId && <QuranVisitStockLink dashboard={quranStockDashboard} siteId={visitForm.siteId} onApplyQuantity={applyQuranQuantityAssessment} />}
        <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-black">قائمة الفحص الميداني</h3><p className="text-xs text-slate-500">تتغير خيارات النتيجة تلقائيًا حسب نوع بند الفحص، وأكمل جميع البنود قبل اعتماد الزيارة كمكتملة.</p></div><Badge variant="outline">{visitForm.items.filter((item) => item.status !== 'not_checked').length} / {visitForm.items.length}</Badge></div>{visitForm.items.map((item, index) => <Card key={`${item.category}-${item.title}-${index}`} className={item.status === 'needs_action' ? 'border-amber-300 bg-amber-50/30' : ''}><CardContent className="space-y-3 pt-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><Badge variant="outline" className="mb-1">{item.category}</Badge><p className="font-bold text-slate-800">{item.title}</p></div><NativeSelect className="lg:w-64" value={item.status} onChange={(event) => setVisitItem(index, { status: event.target.value as MosqueFieldVisitItem['status'] })}>{getItemStatusOptions(item).map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</NativeSelect><NativeSelect className="lg:w-36" value={item.priority} onChange={(event) => setVisitItem(index, { priority: event.target.value as MosqueFieldVisitItem['priority'] })}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>{item.status === 'needs_action' && <div className="grid gap-3 border-t border-amber-200 pt-3 md:grid-cols-2"><div className="md:col-span-2"><Field label="وصف الملاحظة *"><Textarea rows={2} value={item.note || ''} onChange={(event) => setVisitItem(index, { note: event.target.value })} /></Field></div><Field label="الجهة المسؤولة"><Input value={item.responsibleEntity || ''} onChange={(event) => setVisitItem(index, { responsibleEntity: event.target.value })} placeholder="مثال: إدارة التشغيل والصيانة" /></Field><Field label="المهلة المستهدفة"><Input type="date" value={dateOnly(item.dueDate)} onChange={(event) => setVisitItem(index, { dueDate: event.target.value })} /></Field><Field label="حالة المعالجة"><NativeSelect value={item.resolutionStatus} onChange={(event) => setVisitItem(index, { resolutionStatus: event.target.value as MosqueFieldVisitItem['resolutionStatus'] })}>{Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field><Field label={['resolved', 'closed'].includes(item.resolutionStatus) ? 'وصف الإجراء / المعالجة المنفذة *' : 'وصف الإجراء / المعالجة المنفذة'}><Textarea rows={2} value={item.resolutionNote || ''} onChange={(event) => setVisitItem(index, { resolutionNote: event.target.value })} placeholder="اكتب ما تم تنفيذه لمعالجة الملاحظة" /></Field><div className="md:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><b className="text-sm text-emerald-900">سجل المعالجة المصور — قبل / بعد</b><p className="mt-1 text-[11px] text-slate-500">وثّق الحالة قبل المعالجة، ثم أضف صورة بعد التنفيذ لإغلاق الملاحظة والتحقق منها.</p></div><div className="flex gap-2"><Badge variant="outline">قبل: {(item.beforeImages || []).length}</Badge><Badge variant="outline">بعد: {(item.afterImages || []).length}</Badge></div></div><div className="grid gap-3 md:grid-cols-2"><ImageField label="صور قبل المعالجة *" images={item.beforeImages} loading={uploadingKey === `${index}-beforeImages`} onFiles={(files) => void uploadItemImages(index, 'beforeImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'beforeImages', imageIndex)} /><ImageField label={item.resolutionStatus === 'closed' ? 'صور بعد المعالجة *' : 'صور بعد المعالجة'} images={item.afterImages} loading={uploadingKey === `${index}-afterImages`} onFiles={(files) => void uploadItemImages(index, 'afterImages', files)} onRemove={(imageIndex) => removeItemImage(index, 'afterImages', imageIndex)} /></div></div></div>}</CardContent></Card>)}</div>
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
  <div className="grid gap-3 sm:grid-cols-2">
    <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-emerald-300 bg-emerald-50' : 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-500 hover:bg-emerald-50'}`}>
      {loading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-emerald-700" /> : <Camera className="mb-2 h-7 w-7 text-emerald-700" />}
      <b className="text-sm text-emerald-900">{loading ? 'جاري رفع الصورة...' : 'تصوير مباشر من الجوال'}</b>
      <span className="mt-1 text-xs text-emerald-700/80">يفتح الكاميرا الخلفية مباشرة؛ يمكنك التصوير أكثر من مرة وإضافة وصف لكل صورة</span>
      <input type="file" accept="image/*" capture="environment" className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
    </label>
    <label className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${loading ? 'cursor-wait border-sky-300 bg-sky-50' : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/70'}`}>
      {loading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-sky-700" /> : <Upload className="mb-2 h-6 w-6 text-sky-700" />}
      <b className="text-sm text-slate-800">{loading ? 'جاري رفع المرفقات...' : 'رفع من الجهاز'}</b>
      <span className="mt-1 text-xs text-slate-500">صور سابقة أو ملفات PDF — ويمكن اختيار عدة ملفات دفعة واحدة</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
    </label>
  </div>
  <VisitAttachmentGallery label="المرفقات المضافة" attachments={attachments} onRemove={onRemove} onDescriptionChange={onDescriptionChange} />
</div>;
const Metric: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; tone?: 'green' | 'blue' | 'amber' | 'red' }> = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const tones = { green: 'border-emerald-200 bg-emerald-50 text-emerald-700', blue: 'border-sky-200 bg-sky-50 text-sky-700', amber: 'border-amber-200 bg-amber-50 text-amber-700', red: 'border-red-200 bg-red-50 text-red-700' };
  return <Card className={`${tones[tone]} shadow-sm`}><CardContent className="p-3 sm:p-4"><Icon className="h-4 w-4 opacity-80" /><p className="mt-2 text-[11px] font-semibold">{label}</p><p className="mt-1 text-xl font-black sm:text-2xl">{value}</p></CardContent></Card>;
};
const StatusBadge: React.FC<{ status: string }> = ({ status }) => <Badge variant="outline" className={status === 'closed' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : status === 'follow_up' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-sky-300 bg-sky-50 text-sky-700'}>{visitStatusLabels[status] || status}</Badge>;
const Empty: React.FC<{ message: string }> = ({ message }) => <Card className="md:col-span-2 xl:col-span-3"><CardContent className="flex min-h-40 flex-col items-center justify-center text-center text-slate-500"><ClipboardList className="mb-3 h-8 w-8 opacity-50" /><p>{message}</p></CardContent></Card>;

const FieldVisitImagePreview: React.FC<{ image: MosqueFieldVisitImage }> = ({ image }) => {
  const [previewUrl, setPreviewUrl] = React.useState(image.fileId ? '' : image.url);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    let objectUrl = '';
    setFailed(false);

    if (!image.fileId) {
      setPreviewUrl(image.url);
      return () => { active = false; };
    }

    setPreviewUrl('');
    void mosqueApi.mediaBlob(image.fileId).then((blob) => {
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
  }, [image.fileId, image.url]);

  if (failed) {
    return <div className="flex h-28 w-full flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-500"><ImageIcon className="h-7 w-7 text-sky-600" /><span className="mt-1 text-[10px] font-semibold">تعذرت معاينة الصورة</span></div>;
  }

  if (!previewUrl) {
    return <div className="flex h-28 w-full items-center justify-center rounded-lg bg-slate-100"><Loader2 className="h-5 w-5 animate-spin text-sky-700" /></div>;
  }

  return <a href={previewUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-slate-50" title="فتح الصورة بالحجم الكامل"><img src={previewUrl} alt={image.fileName || 'صورة مرفوعة'} className="h-28 w-full object-contain" loading="lazy" onError={() => setFailed(true)} /></a>;
};

const ImageField: React.FC<{
  label: string;
  images: MosqueFieldVisitImage[];
  loading: boolean;
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}> = ({ label, images, loading, onFiles, onRemove }) => <div className="rounded-xl border bg-white p-3">
  <div className="mb-2 flex items-center justify-between"><Label className="text-xs font-bold">{label}</Label><Badge variant="outline">{images.length}</Badge></div>
  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
    {loading ? 'جاري الرفع...' : 'التقاط / اختيار صور'}
    <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={loading} onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
  </label>
  {images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
    {images.map((image, index) => <div key={`${image.fileId || image.url}-${index}`} className="relative overflow-hidden rounded-xl border bg-white p-1.5 shadow-sm">
      <FieldVisitImagePreview image={image} />
      <button type="button" aria-label="حذف الصورة" title="حذف الصورة" className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow hover:bg-red-700" onClick={() => onRemove(index)}>×</button>
      {image.capturedAt && <div className="mt-1.5 px-1 text-center"><p className="text-[9px] text-slate-400">{new Date(image.capturedAt).toLocaleString('ar-SA-u-ca-gregory')}</p></div>}
    </div>)}
  </div>}
</div>;
