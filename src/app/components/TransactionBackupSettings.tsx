import React from 'react';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  HardDriveDownload,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpBackupRun,
  type TransactionFollowUpBackupSchedule,
} from '../api/transactionFollowUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';

const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const statusLabel: Record<TransactionFollowUpBackupRun['status'], string> = {
  running: 'قيد التنفيذ',
  success: 'مكتملة',
  partial: 'مكتملة جزئيًا',
  failed: 'فشلت',
};

const statusClass: Record<TransactionFollowUpBackupRun['status'], string> = {
  running: 'border-sky-300 bg-sky-50 text-sky-800',
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  partial: 'border-amber-300 bg-amber-50 text-amber-800',
  failed: 'border-red-300 bg-red-50 text-red-800',
};

const integrityLabel = {
  success: 'تم التحقق — سليمة',
  warning: 'تم التحقق — مع ملاحظات',
  failed: 'فشل فحص السلامة',
} as const;

const integrityClass = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  failed: 'border-red-300 bg-red-50 text-red-800',
} as const;

const restoreTestLabel = {
  success: 'الاستعادة التجريبية ناجحة',
  warning: 'الاستعادة التجريبية مع ملاحظات',
  failed: 'فشل اختبار الاستعادة',
} as const;

const defaultSchedule = (): Pick<
  TransactionFollowUpBackupSchedule,
  'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'runHour' | 'includeAttachments' | 'retentionCount' | 'isActive'
> => ({
  frequency: 'weekly',
  dayOfWeek: 0,
  dayOfMonth: 1,
  runHour: 2,
  includeAttachments: true,
  retentionCount: 12,
  isActive: false,
});

export const TransactionBackupSettings: React.FC = () => {
  const [schedule, setSchedule] = React.useState(defaultSchedule());
  const [persisted, setPersisted] = React.useState<TransactionFollowUpBackupSchedule | null>(null);
  const [runs, setRuns] = React.useState<TransactionFollowUpBackupRun[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [restoreTestingId, setRestoreTestingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.backupSettings();
      setPersisted(result.schedule);
      setSchedule({
        frequency: result.schedule.frequency,
        dayOfWeek: result.schedule.dayOfWeek ?? 0,
        dayOfMonth: result.schedule.dayOfMonth ?? 1,
        runHour: result.schedule.runHour,
        includeAttachments: result.schedule.includeAttachments,
        retentionCount: result.schedule.retentionCount,
        isActive: result.schedule.isActive,
      });
      setRuns(result.runs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل إعداد النسخ الاحتياطي');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    try {
      setSaving(true);
      const next = await transactionFollowUpApi.updateBackupSchedule({
        frequency: schedule.frequency,
        dayOfWeek: schedule.frequency === 'weekly' ? schedule.dayOfWeek ?? 0 : null,
        dayOfMonth: schedule.frequency === 'monthly' ? schedule.dayOfMonth ?? 1 : null,
        runHour: schedule.runHour,
        includeAttachments: schedule.includeAttachments,
        retentionCount: schedule.retentionCount,
        isActive: schedule.isActive,
      });
      setPersisted(next);
      toast.success(
        next.isActive
          ? 'تم حفظ وتفعيل النسخ الاحتياطي الآلي'
          : 'تم حفظ إعدادات النسخ الاحتياطي وهو متوقف حاليًا',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ إعدادات النسخ الاحتياطي');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!window.confirm(
      'سيتم إنشاء نسخة كاملة الآن في Google Drive تشمل Excel والبيانات الخام ونسخ المرفقات وفق الإعداد الحالي. هل تريد المتابعة؟',
    )) {
      return;
    }
    try {
      setRunning(true);
      const result = await transactionFollowUpApi.runBackupNow();
      if (result.run.status === 'partial') {
        toast.warning(
          `تم إنشاء النسخة، مع تعذر نسخ ${result.run.failedAttachmentCount} مرفق.`,
        );
      } else {
        toast.success('تم إنشاء النسخة الاحتياطية في Google Drive بنجاح');
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تشغيل النسخة الاحتياطية');
      await load();
    } finally {
      setRunning(false);
    }
  };

  const verifyRun = async (run: TransactionFollowUpBackupRun) => {
    try {
      setVerifyingId(run.id);
      const verified = await transactionFollowUpApi.verifyBackupRun(run.id);
      setRuns((current) => current.map((item) => item.id === verified.id ? verified : item));
      if (verified.integrityStatus === 'success') {
        toast.success('تم فحص النسخة الاحتياطية وتبين أنها سليمة وقابلة للقراءة');
      } else if (verified.integrityStatus === 'warning') {
        toast.warning(verified.integrityMessage || 'النسخة قابلة للقراءة مع وجود ملاحظات');
      } else {
        toast.error(verified.integrityMessage || 'فشل فحص سلامة النسخة الاحتياطية');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فحص سلامة النسخة الاحتياطية');
    } finally {
      setVerifyingId(null);
    }
  };

  const testRestore = async (run: TransactionFollowUpBackupRun) => {
    if (!window.confirm(
      'سيتم تنفيذ اختبار استعادة تجريبي داخل الذاكرة فقط، دون إضافة أو تعديل أو حذف أي بيانات في النظام الحالي. هل تريد المتابعة؟',
    )) {
      return;
    }

    try {
      setRestoreTestingId(run.id);
      const tested = await transactionFollowUpApi.testBackupRestore(run.id);
      setRuns((current) => current.map((item) => item.id === tested.id ? tested : item));

      if (tested.restoreTestStatus === 'success') {
        toast.success('نجح اختبار الاستعادة التجريبي دون المساس بالبيانات الحية');
      } else if (tested.restoreTestStatus === 'warning') {
        toast.warning(tested.restoreTestMessage || 'نجح اختبار الاستعادة مع وجود ملاحظات');
      } else {
        toast.error(tested.restoreTestMessage || 'فشل اختبار الاستعادة التجريبي');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ اختبار الاستعادة');
    } finally {
      setRestoreTestingId(null);
    }
  };

  const latestVerified = runs.find((run) => run.verifiedAt && run.integrityStatus);
  const latestRestoreTest = runs.find((run) => run.restoreTestAt && run.restoreTestStatus);

  return (
    <Card className="border-emerald-200 shadow-none">
      <CardHeader className="border-b border-emerald-100 bg-emerald-50/40 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              النسخ الاحتياطي الآلي لنظام المتابعة
            </CardTitle>
            <p className="mt-2 max-w-4xl text-xs leading-6 text-muted-foreground">
              ينشئ نسخة مستقلة داخل Google Drive تحتوي على ملف Excel، وملف البيانات الخام،
              ونسخ فعلية من الصور والمرفقات. وبعد الإنشاء يُفحص سلامة النسخة ويُجرى اختبار استعادة تجريبي
              داخل الذاكرة دون المساس بقاعدة البيانات الحية.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                persisted?.isActive
                  ? 'border-emerald-300 bg-white text-emerald-800'
                  : 'border-slate-300 bg-white text-slate-600'
              }
            >
              {persisted?.isActive ? 'النسخ الآلي مفعّل' : 'النسخ الآلي متوقف'}
            </Badge>
            {latestVerified?.integrityStatus && (
              <Badge
                variant="outline"
                className={integrityClass[latestVerified.integrityStatus]}
                title={latestVerified.integrityMessage || undefined}
              >
                <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                آخر نسخة: {integrityLabel[latestVerified.integrityStatus]}
              </Badge>
            )}
            {latestRestoreTest?.restoreTestStatus && (
              <Badge
                variant="outline"
                className={integrityClass[latestRestoreTest.restoreTestStatus]}
                title={latestRestoreTest.restoreTestMessage || undefined}
              >
                <RotateCcw className="ml-1 h-3.5 w-3.5" />
                {restoreTestLabel[latestRestoreTest.restoreTestStatus]}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || running}>
              <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-4 sm:p-5">
        {loading && !persisted ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
            جارٍ تحميل إعداد النسخ الاحتياطي...
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-1.5 text-xs font-semibold">
                <span>التكرار</span>
                <NativeSelect
                  value={schedule.frequency}
                  onChange={(event) =>
                    setSchedule((current) => ({
                      ...current,
                      frequency: event.target.value as 'weekly' | 'monthly',
                    }))
                  }
                >
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                </NativeSelect>
              </label>

              {schedule.frequency === 'weekly' ? (
                <label className="space-y-1.5 text-xs font-semibold">
                  <span>يوم النسخ</span>
                  <NativeSelect
                    value={schedule.dayOfWeek ?? 0}
                    onChange={(event) =>
                      setSchedule((current) => ({ ...current, dayOfWeek: Number(event.target.value) }))
                    }
                  >
                    {weekDays.map((day, index) => (
                      <option key={day} value={index}>{day}</option>
                    ))}
                  </NativeSelect>
                </label>
              ) : (
                <label className="space-y-1.5 text-xs font-semibold">
                  <span>يوم الشهر</span>
                  <NativeSelect
                    value={schedule.dayOfMonth ?? 1}
                    onChange={(event) =>
                      setSchedule((current) => ({ ...current, dayOfMonth: Number(event.target.value) }))
                    }
                  >
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </NativeSelect>
                </label>
              )}

              <label className="space-y-1.5 text-xs font-semibold">
                <span>ساعة التنفيذ</span>
                <NativeSelect
                  value={schedule.runHour}
                  onChange={(event) =>
                    setSchedule((current) => ({ ...current, runHour: Number(event.target.value) }))
                  }
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                  ))}
                </NativeSelect>
              </label>

              <label className="space-y-1.5 text-xs font-semibold">
                <span>عدد النسخ المحتفظ بها</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={schedule.retentionCount}
                  onChange={(event) =>
                    setSchedule((current) => ({
                      ...current,
                      retentionCount: Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                    }))
                  }
                />
              </label>

              <label className="flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={schedule.includeAttachments}
                  onChange={(event) =>
                    setSchedule((current) => ({ ...current, includeAttachments: event.target.checked }))
                  }
                />
                نسخ الصور والمرفقات فعليًا
              </label>

              <label className="flex min-h-10 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={schedule.isActive}
                  onChange={(event) =>
                    setSchedule((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                تفعيل النسخ الاحتياطي الآلي
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border bg-slate-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-xs leading-6 text-slate-600">
                <p>
                  <b>التشغيل القادم:</b> {formatDateTime(persisted?.nextRunAt)}
                  {persisted?.lastRunAt ? <> · <b>آخر تشغيل:</b> {formatDateTime(persisted.lastRunAt)}</> : null}
                </p>
                <p>
                  عند تجاوز عدد النسخ المحدد، تُحذف أقدم نسخة احتياطية آلية من مجلد النسخ الاحتياطية.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={saving || running}
                  onClick={() => void runNow()}
                >
                  {running ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Play className="ml-2 h-4 w-4" />}
                  {running ? 'جارٍ إنشاء النسخة...' : 'تشغيل نسخة الآن'}
                </Button>
                <Button disabled={saving || running} onClick={() => void save()}>
                  {saving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                  حفظ الإعداد
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-black">
                  <Archive className="h-4 w-4 text-emerald-700" />
                  سجل النسخ الاحتياطية
                </h3>
                <span className="text-[11px] text-muted-foreground">آخر {runs.length.toLocaleString('ar-SA')} عملية</span>
              </div>

              {runs.length === 0 ? (
                <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                  لا توجد نسخ احتياطية آلية مسجلة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div key={run.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-sm">{run.folderName || 'نسخة نظام المتابعة'}</b>
                          <Badge variant="outline" className={statusClass[run.status]}>
                            {statusLabel[run.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          بدأت {formatDateTime(run.startedAt)}
                          {run.completedAt ? <> · اكتملت {formatDateTime(run.completedAt)}</> : null}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                          <span>المعاملات: <b>{run.transactionCount.toLocaleString('ar-SA')}</b></span>
                          <span>المرفقات: <b>{run.attachmentCount.toLocaleString('ar-SA')}</b></span>
                          <span>تم نسخها: <b>{run.copiedAttachmentCount.toLocaleString('ar-SA')}</b></span>
                          {run.failedAttachmentCount > 0 && (
                            <span className="text-red-700">تعذر: <b>{run.failedAttachmentCount.toLocaleString('ar-SA')}</b></span>
                          )}
                        </div>
                        {run.integrityStatus && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={integrityClass[run.integrityStatus]}>
                              {integrityLabel[run.integrityStatus]}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {run.verifiedAt ? `فُحصت ${formatDateTime(run.verifiedAt)}` : ''}
                              {run.verifiedFileCount != null ? ` · ${run.verifiedFileCount.toLocaleString('ar-SA')} ملف تم التحقق منه` : ''}
                            </span>
                          </div>
                        )}
                        {run.integrityMessage ? (
                          <p className={`mt-2 text-xs leading-5 ${run.integrityStatus === 'failed' ? 'text-red-700' : 'text-slate-600'}`}>
                            {run.integrityMessage}
                          </p>
                        ) : null}

                        {run.restoreTestStatus && (
                          <div className="mt-2 rounded-xl border bg-slate-50/70 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={integrityClass[run.restoreTestStatus]}>
                                <RotateCcw className="ml-1 h-3.5 w-3.5" />
                                {restoreTestLabel[run.restoreTestStatus]}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {run.restoreTestAt ? `اختُبرت ${formatDateTime(run.restoreTestAt)}` : ''}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                              {run.restoreTestTransactions != null && (
                                <span>المعاملات القابلة لإعادة البناء: <b>{run.restoreTestTransactions.toLocaleString('ar-SA')}</b></span>
                              )}
                              {run.restoreTestRelations != null && (
                                <span>العلاقات: <b>{run.restoreTestRelations.toLocaleString('ar-SA')}</b></span>
                              )}
                              {run.restoreTestAttachments != null && (
                                <span>المرفقات المرتبطة: <b>{run.restoreTestAttachments.toLocaleString('ar-SA')}</b></span>
                              )}
                            </div>
                            {run.restoreTestMessage ? (
                              <p className={`mt-2 text-xs leading-5 ${run.restoreTestStatus === 'failed' ? 'text-red-700' : 'text-slate-600'}`}>
                                {run.restoreTestMessage}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {run.errorMessage ? (
                          <p className="mt-2 text-xs text-red-700">{run.errorMessage}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {run.status !== 'running' && run.status !== 'failed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={verifyingId === run.id || restoreTestingId === run.id}
                              onClick={() => void verifyRun(run)}
                            >
                              {verifyingId === run.id
                                ? <RefreshCw className="ml-1 h-4 w-4 animate-spin" />
                                : <ShieldCheck className="ml-1 h-4 w-4" />}
                              فحص السلامة
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-violet-300 text-violet-800 hover:bg-violet-50"
                              disabled={restoreTestingId === run.id || verifyingId === run.id}
                              onClick={() => void testRestore(run)}
                            >
                              {restoreTestingId === run.id
                                ? <RefreshCw className="ml-1 h-4 w-4 animate-spin" />
                                : <RotateCcw className="ml-1 h-4 w-4" />}
                              اختبار الاستعادة
                            </Button>
                          </>
                        )}
                        {run.folderUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={run.folderUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="ml-1 h-4 w-4" />
                              مجلد النسخة
                            </a>
                          </Button>
                        )}
                        {run.workbookUrl && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={run.workbookUrl} target="_blank" rel="noreferrer">
                              <HardDriveDownload className="ml-1 h-4 w-4" />
                              Excel
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
