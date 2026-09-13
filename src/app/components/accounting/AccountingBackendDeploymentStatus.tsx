import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Server } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  backendSupportsAccountingAuditReconciliation,
  getBackendDeploymentHealth,
  type BackendDeploymentHealth,
} from '../../api/systemHealth';

type Props = {
  onReadinessChange?: (ready: boolean) => void;
};

const shortSha = (value?: string | null) => value ? value.slice(0, 12) : 'غير متاح';

const formatUptime = (seconds?: number) => {
  const total = Math.max(0, Number(seconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days} يوم ${hours} س`;
  if (hours > 0) return `${hours} س ${minutes} د`;
  return `${minutes} دقيقة`;
};

export const AccountingBackendDeploymentStatus: React.FC<Props> = ({ onReadinessChange }) => {
  const [health, setHealth] = useState<BackendDeploymentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ready = useMemo(() => backendSupportsAccountingAuditReconciliation(health), [health]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBackendDeploymentHealth();
      setHealth(result);
      onReadinessChange?.(backendSupportsAccountingAuditReconciliation(result));
    } catch (loadError) {
      setHealth(null);
      onReadinessChange?.(false);
      setError(loadError instanceof Error ? loadError.message : 'تعذر التحقق من نسخة الخادم المنشورة');
    } finally {
      setLoading(false);
    }
  }, [onReadinessChange]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card className="audit-print-card rounded-[26px] border-slate-200 bg-white">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Server className="h-5 w-5 text-slate-700" />النسخة المنشورة وجاهزية الخادم</CardTitle>
            <p className="mt-1 text-xs leading-6 text-slate-500">تحقق مباشر من `/api/health` قبل تشغيل مطابقة قاعدة البيانات، لضمان أن البيئة المنشورة تدعم حماية AuditLog والمطابقة والاستكمال الآمن.</p>
          </div>
          <div className="audit-no-print flex items-center gap-2">
            <Badge variant="outline" className={loading ? 'border-slate-200 bg-slate-50 text-slate-600' : ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}>
              {loading ? 'جارٍ التحقق' : ready ? 'جاهز للفحص التشغيلي' : 'غير جاهز للفحص'}
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="ml-2 h-4 w-4" />}
              إعادة التحقق
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading && !health ? (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جارٍ قراءة بصمة النشر من الخادم...</div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-bold">تعذر التحقق من البيئة المنشورة</p><p className="mt-1 text-xs leading-6">{error}</p></div></div>
        ) : health ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">الخدمة</p><p className="mt-1 text-xs font-black text-slate-900">{health.deployment?.serviceName || health.service}</p></div>
              <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">البيئة</p><p className="mt-1 text-xs font-black text-slate-900">{health.deployment?.environment || 'غير متاحة'}</p></div>
              <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">Commit المنشور</p><p className="mt-1 font-mono text-xs font-black text-slate-900" dir="ltr">{shortSha(health.deployment?.commitSha)}</p></div>
              <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">بدء الخدمة</p><p className="mt-1 text-xs font-black text-slate-900">{health.startedAt ? new Date(health.startedAt).toLocaleString('ar-SA') : 'غير متاح'}</p></div>
              <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-500">مدة التشغيل</p><p className="mt-1 text-xs font-black text-slate-900">{formatUptime(health.uptimeSeconds)}</p></div>
            </div>

            <div className={ready ? 'flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800' : 'flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900'}>
              {ready ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <div>
                <p className="font-black">{ready ? 'الخادم المنشور يدعم مسار المطابقة الرقابية كاملًا' : 'النسخة المنشورة لا تعلن جميع قدرات المطابقة المطلوبة'}</p>
                <p className="mt-1 leading-6">{ready ? 'يمكن لمسؤول النظام تشغيل «فحص قاعدة البيانات» بأمان من اللوحة التالية.' : 'لن يتم تمكين الفحص الإداري حتى يتم نشر Backend يحتوي AuditLog mirror والمطابقة وmissing-only backfill.'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
