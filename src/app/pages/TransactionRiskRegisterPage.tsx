import React from 'react';
import { ArrowRight, FileCheck2, Gauge, ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
} from '../api/transactionFollowUp';
import { Button } from '../components/ui/button';
import {
  TransactionRiskRegisterDialog,
  type RiskRegisterSeed,
} from '../components/TransactionRiskRegisterDialog';

export const TransactionRiskRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, hasPermission } = usePermissions();
  const supervisor = isAdmin || hasPermission('transaction_follow_up', 'canDelete');
  const [assignees, setAssignees] = React.useState<TransactionFollowUpAssignee[]>([]);
  const navigationSeed = (location.state as { riskSeed?: RiskRegisterSeed } | null)?.riskSeed || null;

  React.useEffect(() => {
    transactionFollowUpApi.assignees()
      .then(setAssignees)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل الموظفين'));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1750px] space-y-5" dir="rtl">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_16px_48px_rgba(15,23,42,.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-red-800">
              <ShieldAlert className="h-4 w-4" />
              نظام المتابعة
            </div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">سجل المخاطر التشغيلية</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              إدارة المخاطر المتكررة وربطها بالتدخلات الوقائية وCAPA، مع تقييم الاحتمالية والأثر والخطر المتبقي ومواعيد المراجعة.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/follow-up/risks/acceptance')}>
              <FileCheck2 className="ml-2 h-4 w-4" />
              حوكمة قبول المخاطر
            </Button>
            {supervisor && (
              <Button variant="outline" onClick={() => navigate('/follow-up/risks/executive')}>
                <Gauge className="ml-2 h-4 w-4" />
                لوحة المخاطر التنفيذية
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/follow-up')}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة إلى نظام المتابعة
            </Button>
          </div>
        </div>
      </section>

      <div className="rounded-[28px] border border-dashed bg-slate-50/70 p-10 text-center text-sm text-muted-foreground">
        يتم فتح لوحة سجل المخاطر التشغيلية تلقائيًا.
      </div>

      <TransactionRiskRegisterDialog
        open
        onOpenChange={(open) => {
          if (!open) navigate('/follow-up');
        }}
        assignees={assignees}
        supervisor={supervisor}
        seed={navigationSeed}
      />
    </div>
  );
};

export default TransactionRiskRegisterPage;
