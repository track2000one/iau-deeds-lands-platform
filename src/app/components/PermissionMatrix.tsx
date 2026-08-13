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
  { key: 'canPrint', ar: 'طباعة', en: 'Print' },
  { key: 'canCreateUser', ar: 'إضافة مستخدم جديد', en: 'Create User' },
];

export const PermissionMatrix: React.FC<{
  value: UserPermissions;
  onChange: (value: UserPermissions) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
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
        canPrint: false,
        canCreateUser: false,
      };
    }

    onChange(next);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold">{ui('صلاحيات المستخدم التفصيلية', 'Detailed User Permissions')}</h3>
            <p className="text-sm text-muted-foreground">
              {ui('الأقسام غير المفعلة ستختفي من القائمة الجانبية.', 'Disabled sections will be hidden from the sidebar.')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ui('صلاحية «إضافة مستخدم جديد» مخصصة حاليًا لوحدة العناية بالمساجد والمصليات، وتسمح بإنشاء أو ربط حساب المنسوب ضمن نفس عملية إضافته.', 'Create User is currently scoped to the Mosques & Prayer Rooms Care Unit and creates or links the personnel login in the same operation.')}
            </p>
            <p className="mt-2 text-xs font-medium text-primary">
              {ui('يمكن تمرير الجدول بعجلة الفأرة، سحب شريط التمرير، أو استخدام مفاتيح الأسهم بعد النقر داخل الجدول.', 'Scroll with the mouse wheel, drag the scrollbar, or use the arrow keys after focusing the table.')}
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
        className="max-h-[62vh] min-h-[320px] overflow-auto overscroll-contain outline-none [scrollbar-gutter:stable] focus:ring-2 focus:ring-primary/20"
        aria-label={ui('جدول صلاحيات المستخدم قابل للتمرير', 'Scrollable user permissions table')}
      >
        <table className="w-full min-w-[900px] text-sm">
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
                  const supported = action.key !== 'canCreateUser' || moduleName === 'mosques';
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
