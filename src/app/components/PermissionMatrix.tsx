import React from 'react';
import type {
  ModuleName,
  ModulePermissions,
  UserPermissions,
} from '../../types/permissions';
import { MODULE_LABELS } from '../../types/permissions';
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
  'assets',
  'archive',
  'reports',
];

const ACTIONS: Array<{
  key: keyof ModulePermissions;
  label: string;
}> = [
  { key: 'canView', label: 'عرض' },
  { key: 'canAdd', label: 'إضافة' },
  { key: 'canEdit', label: 'تعديل' },
  { key: 'canDelete', label: 'حذف' },
  { key: 'canPrint', label: 'طباعة' },
];

export const PermissionMatrix: React.FC<{
  value: UserPermissions;
  onChange: (value: UserPermissions) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
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
      };
    }

    onChange(next);
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b p-4">
        <h3 className="font-semibold">صلاحيات المستخدم التفصيلية</h3>
        <p className="text-sm text-muted-foreground">
          الأقسام غير المفعلة ستختفي من القائمة الجانبية.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="p-3 text-right">القسم</th>
              {ACTIONS.map((action) => (
                <th key={action.key} className="p-3 text-center">
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {MODULES.map((moduleName) => (
              <tr key={moduleName} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  {MODULE_LABELS[moduleName]}
                </td>

                {ACTIONS.map((action) => (
                  <td key={action.key} className="p-3 text-center">
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
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
