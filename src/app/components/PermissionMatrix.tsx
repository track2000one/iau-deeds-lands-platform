import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ModuleName,
  ModulePermissions,
  UserPermissions,
} from '../../types/permissions';
import { MODULE_LABELS, MODULE_LABELS_EN } from '../../types/permissions';
import { Card } from './ui/card';
import { Label } from './ui/label';

const MODULES: ModuleName[] = [
  'deeds',
  'allocated_lands',
  'delivered_lands',
  'site_inspections',
  'leased_lands_out',
  'leased_lands_in',
  'leased_buildings_out',
  'leased_buildings_in',
  'central_buildings',
  'transaction_follow_up',
  'transaction_risk_register',
  'transaction_risk_executive',
  'transaction_risk_acceptance',
  'transaction_risk_policy',
  'contracts_follow_up',
  'assets',
  'accounting_transformation',
  'mosques',
  'archive',
  'reports',
];

const ACTIONS: Array<{
  key: keyof ModulePermissions;
  ar: string;
  en: string;
}> = [
  { key: 'canView', ar: 'عرض', en: 'View' },
  { key: 'canAdd', ar: 'إضافة', en: 'Add' },
  { key: 'canEdit', ar: 'تعديل', en: 'Edit' },
  { key: 'canDelete', ar: 'حذف', en: 'Delete' },
  { key: 'canReopen', ar: 'إعادة فتح', en: 'Reopen' },
  { key: 'canTransfer', ar: 'تحويل', en: 'Transfer' },
  { key: 'canUploadAttachments', ar: 'رفع مرفقات', en: 'Upload Attachments' },
  { key: 'canDeleteAttachments', ar: 'حذف مرفقاته', en: 'Delete Own Attachments' },
  { key: 'canPrint', ar: 'طباعة', en: 'Print' },
  { key: 'canCreateUser', ar: 'إضافة مستخدم جديد', en: 'Create User' },
  { key: 'canCreateCycle', ar: 'إنشاء دورة جديدة', en: 'Create Cycle' },
  { key: 'canApproveCycle', ar: 'اعتماد دورة', en: 'Approve Cycle' },
  { key: 'canApproveArchive', ar: 'اعتماد الأرشيف', en: 'Approve Archive' },
];

export const PermissionMatrix: React.FC<{
  value: UserPermissions;
  onChange: (value: UserPermissions) => void;
  disabled?: boolean;
  dialogMode?: boolean;
}> = ({ value, onChange, disabled = false, dialogMode = false }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const scrollPermissions = (position: 'top' | 'bottom') => {
    const element = scrollAreaRef.current;
    if (!element) return;

    element.scrollTo({
      top: position === 'top' ? 0 : element.scrollHeight,
      behavior: 'smooth',
    });
    element.focus({ preventScroll: true });
  };

  const setPermission = (
    moduleName: ModuleName,
    action: keyof ModulePermissions,
    checked: boolean
  ) => {
    const next = {
      ...value,
      [moduleName]: {
        ...value[moduleName],
        [action]: checked,
      },
    };

    if (action !== 'canView' && checked) {
      next[moduleName].canView = true;
    }

    if (action === 'canView' && !checked) {
      next[moduleName] = {
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canReopen: false,
        canTransfer: false,
        canUploadAttachments: false,
        canDeleteAttachments: false,
        canPrint: false,
        canCreateUser: false,
        canCreateCycle: false,
        canApproveCycle: false,
        canApproveArchive: false,
      };
    }

    onChange(next);
  };

  return (
    <Card className={`overflow-hidden ${dialogMode ? 'min-h-0' : ''}`}>
      <div className={`border-b ${dialogMode ? 'p-3 sm:p-4' : 'p-4'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">{ui('صلاحيات المستخدم التفصيلية', 'Detailed User Permissions')}</h3>
            <p className="text-sm text-muted-foreground">
              {ui('الأقسام غير المفعلة ستختفي من القائمة الجانبية.', 'Disabled sections will be hidden from the sidebar.')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ui('صلاحية «إضافة مستخدم جديد» مخصصة لوحدة العناية بالمساجد والمصليات. أما «إنشاء دورة جديدة» و«اعتماد دورة» فهما مخصصتان لوحدة الأصول ولجنة متابعة متطلبات التحول المحاسبي لفصل إعداد البيانات عن اعتمادها الرسمي.', 'Create User is scoped to the Mosques & Prayer Rooms Care Unit. Create Cycle and Approve Cycle are scoped to the Assets Unit and Accounting Transformation Committee to separate data preparation from formal approval.')}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              {ui('سياسة الجولات والزيارات الميدانية: صلاحيتا «تعديل» و«حذف» في وحدة المساجد تسمحان للمستخدم بإدارة الجولات والزيارات التي أنشأها بنفسه فقط. سجلات المستخدمين الآخرين تكون «عرض فقط»، بينما مسؤول النظام أو رئيس الوحدة يستطيع إدارة جميع السجلات وفق الصلاحيات الممنوحة.', 'Field tours and visits policy: Edit and Delete permissions in the Mosques module let a user manage only tours and visits they created. Other users’ records are read-only, while the system administrator or unit head can manage all records according to granted permissions.')}
            </p>
            <p className="mt-1 text-xs font-semibold text-sky-700">
              {ui('نظام المتابعة: «إضافة» لإنشاء معاملة جديدة، و«تعديل» لتسجيل الإجراءات وتحديث المعاملة المسندة، و«تحويل» لتحويل المعاملة المسندة للمستخدم، و«رفع مرفقات» لإضافة ملفات إلى المعاملة المسندة دون الحاجة لصلاحية إنشاء معاملة، و«حذف مرفقاته» لحذف الملفات التي رفعها المستخدم بنفسه فقط. صلاحية «حذف» تبقى إشرافية وتسمح بإدارة جميع المرفقات.', 'Transaction Follow-up: Add creates new transactions, Edit records actions and updates assigned transactions, Transfer moves the user’s assigned transaction, Upload Attachments adds files to an assigned transaction without granting transaction creation, and Delete Own Attachments removes only files uploaded by that user. Delete remains supervisory and can manage all attachments.')}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {ui('صفحات المخاطر الأربع (سجل المخاطر التشغيلية، لوحة المخاطر التنفيذية، طلبات قبول المخاطر، شهية المخاطر وإعدادات KRI) تكون للمسؤول افتراضيًا، ولا تظهر للمستخدم العادي إلا إذا منح المسؤول صلاحية «عرض» للصفحة المطلوبة.', 'The four risk pages are administrator-only by default and are shown to an ordinary user only when an administrator grants View permission for the required risk page.')}
            </p>
            <p className="mt-1 text-xs font-semibold text-violet-700">
              {ui('الأرشفة: «عرض» لفتح الملفات والمعاملات المؤرشفة، «إضافة» لترحيل المعاملة المغلقة وإضافة الملفات، «تعديل» لتحديث بيانات الأرشفة ورفع الإصدارات الجديدة، «اعتماد الأرشيف» لمراجعة واعتماد أو إلغاء مسودات الإصدارات، «حذف» للحذف، و«طباعة» للتقارير. فصل الاعتماد عن التعديل يمنع المستخدم الذي يرفع النسخة من اعتمادها إلا إذا مُنح صلاحية الاعتماد صراحة.', 'Archive: View opens archived files and transactions; Add archives closed transactions and adds files; Edit updates archive metadata and uploads new versions; Approve Archive reviews, approves, or cancels version drafts; Delete removes records; Print enables reports. Approval is separated from editing so uploaders cannot approve their own versions unless explicitly granted approval permission.')}
            </p>
            <p className="mt-2 text-xs font-medium text-primary">
              {ui('يمكن تمرير الجدول بعجلة الفأرة أو بسحب شريط التمرير الواضح على طرف الجدول، كما يمكن استخدام زري أعلى وأسفل للانتقال السريع.', 'Scroll with the mouse wheel or drag the visible scrollbar at the edge of the table. You can also use the Top and Bottom buttons for quick navigation.')}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => scrollPermissions('top')}
              className="rounded-lg border bg-background px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-muted"
              title={ui('الانتقال إلى أعلى جدول الصلاحيات', 'Go to top of permissions table')}
            >
              ▲ {ui('أعلى', 'Top')}
            </button>
            <button
              type="button"
              onClick={() => scrollPermissions('bottom')}
              className="rounded-lg border bg-background px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-muted"
              title={ui('الانتقال إلى أسفل جدول الصلاحيات', 'Go to bottom of permissions table')}
            >
              ▼ {ui('أسفل', 'Bottom')}
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        tabIndex={0}
        className={`${dialogMode ? 'h-[clamp(300px,42dvh,480px)] min-h-[300px]' : 'max-h-[62vh] min-h-[320px]'} overflow-auto overscroll-contain scroll-smooth outline-none [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 focus:ring-2 focus:ring-primary/20`}
        aria-label={ui('جدول صلاحيات المستخدم قابل للتمرير', 'Scrollable user permissions table')}
      >
        <table className="w-full min-w-[1380px] text-sm">
          <thead className="sticky top-0 z-10 bg-background shadow-sm">
            <tr className="border-b bg-muted/40">
              <th className={`p-3 ${isArabic ? 'text-right' : 'text-left'}`}>{ui('القسم', 'Section')}</th>
              {ACTIONS.map((action) => (
                <th key={action.key} className="p-3 text-center">
                  {isArabic ? action.ar : action.en}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {MODULES.map((moduleName) => (
              <tr key={moduleName} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  {isArabic ? MODULE_LABELS[moduleName] : MODULE_LABELS_EN[moduleName]}
                </td>

                {ACTIONS.map((action) => {
                  const isCyclePermission = action.key === 'canCreateCycle' || action.key === 'canApproveCycle';
                  const isArchiveApprovalPermission = action.key === 'canApproveArchive';
                  const riskViewOnlyModules: ModuleName[] = [
                    'transaction_risk_register',
                    'transaction_risk_executive',
                    'transaction_risk_acceptance',
                    'transaction_risk_policy',
                  ];
                  const supported = riskViewOnlyModules.includes(moduleName)
                    ? action.key === 'canView'
                    : action.key === 'canCreateUser'
                      ? moduleName === 'mosques'
                      : action.key === 'canReopen' ||
                          action.key === 'canTransfer' ||
                          action.key === 'canUploadAttachments' ||
                          action.key === 'canDeleteAttachments'
                        ? moduleName === 'transaction_follow_up'
                        : isCyclePermission
                          ? ['assets', 'accounting_transformation'].includes(moduleName)
                          : isArchiveApprovalPermission
                            ? moduleName === 'archive'
                            : true;
                  return (
                    <td key={action.key} className="p-3 text-center">
                      {supported ? (
                        <Label className="inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={Boolean(value[moduleName]?.[action.key])}
                            disabled={disabled}
                            onChange={(event) =>
                              setPermission(
                                moduleName,
                                action.key,
                                event.target.checked
                              )
                            }
                          />
                        </Label>
                      ) : (
                        <span className="text-muted-foreground/60" title={ui('غير مطبق لهذا القسم', 'Not applicable to this section')}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
