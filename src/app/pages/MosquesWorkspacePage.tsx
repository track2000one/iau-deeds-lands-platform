import React, { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { mosqueApi } from '../api/mosques';
import { MosquesUnitPage } from './MosquesUnitPage';

export const MosquesWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [operationalRole, setOperationalRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mosqueApi.me()
      .then((me) => { if (!cancelled) setOperationalRole(me.role); })
      .catch(() => { if (!cancelled) setOperationalRole(null); });
    return () => { cancelled = true; };
  }, []);

  const canImport = (isAdmin || hasPermission('mosques', 'canAdd')) && (isAdmin || operationalRole === 'head');

  return (
    <div className="space-y-4" dir="rtl">
      {canImport && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
          <div>
            <div className="font-semibold text-sky-950">طلبات التعاون للمساجد والمصليات</div>
            <div className="mt-1 text-sm text-sky-800">استيراد ملفات المتقدمين مع مطابقة رقم الطلب والسجل المدني قبل الحفظ.</div>
          </div>
          <Button onClick={() => navigate('/mosques/import-jobs')}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            استيراد طلبات التعاون
          </Button>
        </div>
      )}
      <MosquesUnitPage />
    </div>
  );
};
