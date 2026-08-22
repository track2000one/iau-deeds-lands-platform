import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, DatabaseZap } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { AccountingTransformationScopedImportPage } from './AccountingTransformationScopedImportPage';
import { AccountingTransformationBaselineResetPage } from './AccountingTransformationBaselineResetPage';

export const AccountingTransformationImportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();

  if (searchParams.get('mode') === 'reset-baseline') {
    return <AccountingTransformationBaselineResetPage />;
  }

  return (
    <>
      {isAdmin && (
        <div className="mx-auto mt-3 w-full max-w-[1550px] px-1 sm:px-3 md:px-5" dir="rtl">
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-xs leading-6 text-amber-950">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span><strong>إجراء تأسيسي لمسؤول النظام:</strong> استخدمه فقط إذا أردت حذف جميع دورات وسجلات اللجنة الحالية واعتماد ملف Excel واحد كنقطة أساس جديدة.</span>
            </div>
            <Button variant="outline" className="shrink-0 border-amber-300 bg-white text-amber-900" onClick={() => navigate('/accounting-transformation/import?mode=reset-baseline')}>
              <DatabaseZap className="ml-2 h-4 w-4" />إعادة تأسيس اللجنة من Excel
            </Button>
          </div>
        </div>
      )}
      <AccountingTransformationScopedImportPage />
    </>
  );
};
