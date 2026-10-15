import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Clock3,
  ExternalLink,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { mosqueApi, type MosqueNotification } from '../api/mosques';
import { transactionFollowUpApi, type TransactionFollowUpAlert } from '../api/transactionFollowUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

type PlatformNotice = {
  id: string;
  source: 'mosques' | 'follow_up';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  severity?: 'info' | 'warning' | 'danger';
  isRead: boolean;
  createdAt: string;
};

const normalizeMosqueNotice = (notice: MosqueNotification): PlatformNotice => ({
  id: notice.id,
  source: 'mosques',
  title: notice.title,
  message: notice.message,
  entityType: notice.entityType,
  entityId: notice.entityId,
  isRead: notice.isRead,
  createdAt: notice.createdAt,
});

const normalizeFollowUpAlert = (alert: TransactionFollowUpAlert): PlatformNotice => ({
  id: alert.id,
  source: 'follow_up',
  title: alert.title,
  message: alert.message,
  entityType: alert.kind.startsWith('preventive_action_')
    ? 'follow_up_preventive'
    : alert.kind.startsWith('early_warning_')
      ? 'follow_up_early_warning'
      : alert.kind.startsWith('capa_')
      ? 'follow_up_capa'
      : alert.kind === 'kpi_target_breach'
        ? 'follow_up_kpi'
        : 'transaction_follow_up',
  entityId: alert.transactionId || null,
  severity: alert.severity,
  isRead: alert.isRead,
  createdAt: alert.createdAt,
});

const notificationCategory = (notice: PlatformNotice) => {
  if (notice.source === 'follow_up' && notice.entityType === 'follow_up_preventive') return 'follow_up_preventive';
  if (notice.source === 'follow_up' && notice.entityType === 'follow_up_early_warning') return 'follow_up_early_warning';
  if (notice.source === 'follow_up' && notice.entityType === 'follow_up_capa') return 'follow_up_capa';
  if (notice.source === 'follow_up' && notice.entityType === 'follow_up_kpi') return 'follow_up_kpi';
  if (notice.source === 'follow_up') return 'follow_up';
  const type = String(notice.entityType || '').toLowerCase();
  const text = `${notice.title || ''} ${notice.message || ''}`.toLowerCase();

  if (type.includes('request') || text.includes('طلب صيانة') || text.includes('طلب احتياج')) return 'request';
  if (type.includes('ticket') || text.includes('بلاغ')) return 'ticket';
  if (type.includes('leave') || text.includes('إجاز') || text.includes('اعتذار')) return 'leave';
  if (type.includes('quran') || text.includes('مصحف') || text.includes('مصاحف')) return 'quran';
  if (
    type.includes('improvement_goal')
    || type.includes('completion_kpi_approval_automation')
    || text.includes('هدف تحسين')
    || text.includes('تحقق هدف')
    || text.includes('أتمتة ما بعد اعتماد KPI')
  ) return 'improvement';
  if (type.includes('completion_task') || text.includes('مهمة استكمال') || text.includes('استكمال بيانات')) return 'completion';
  if (type.includes('site') || type.includes('mosque') || text.includes('مسجد') || text.includes('مصلى')) return 'site';
  return 'other';
};

const notificationTargetTab = (notice: PlatformNotice) => {
  const category = notificationCategory(notice);
  if (category === 'request') return 'requests';
  if (category === 'ticket') return 'tickets';
  if (category === 'leave') return 'leaves';
  if (category === 'quran') return 'quran';
  if (category === 'improvement') return 'improvement-goals';
  if (category === 'completion') return 'data-completeness';
  if (category === 'site') return 'sites';
  return 'notifications';
};

const formatRelativeTime = (value: string) => {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(value).toLocaleDateString('ar-SA-u-ca-gregory');
};

export const PlatformNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canViewMosques = isAdmin || hasPermission('mosques', 'canView');
  const canViewFollowUp = isAdmin || hasPermission('transaction_follow_up', 'canView');
  const canViewNotifications = canViewMosques || canViewFollowUp;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PlatformNotice[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!canViewNotifications) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const [mosqueRows, followUpRows] = await Promise.all([
        canViewMosques ? mosqueApi.notifications().catch(() => []) : Promise.resolve([]),
        canViewFollowUp ? transactionFollowUpApi.alerts().catch(() => []) : Promise.resolve([]),
      ]);
      setNotifications([
        ...(Array.isArray(mosqueRows) ? mosqueRows.map(normalizeMosqueNotice) : []),
        ...(Array.isArray(followUpRows) ? followUpRows.map(normalizeFollowUpAlert) : []),
      ]);
    } catch (error) {
      console.warn('Unable to load platform notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewFollowUp, canViewMosques, canViewNotifications]);

  useEffect(() => {
    if (!canViewNotifications) return;

    void loadNotifications();

    const handleRefresh = () => void loadNotifications();
    const intervalId = window.setInterval(handleRefresh, 60_000);
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('iau-notifications-changed', handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('iau-notifications-changed', handleRefresh);
    };
  }, [canViewNotifications, loadNotifications]);

  useEffect(() => {
    if (open) void loadNotifications();
  }, [open, loadNotifications]);

  const ordered = useMemo(
    () => notifications
      .slice()
      .sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [notifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((notice) => !notice.isRead).length,
    [notifications]
  );

  const openNotice = async (notice: PlatformNotice) => {
    if (!notice.isRead) {
      try {
        if (notice.source === 'follow_up') {
          await transactionFollowUpApi.readAlert(notice.id);
        } else {
          await mosqueApi.readNotification(notice.id);
        }
        setNotifications((current) => current.map((item) =>
          item.id === notice.id && item.source === notice.source ? { ...item, isRead: true } : item
        ));
        window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      } catch (error) {
        console.warn('Unable to mark notification as read:', error);
      }
    }

    setOpen(false);
    if (notice.source === 'follow_up') {
      if (notice.entityType === 'follow_up_preventive') {
        navigate(`/follow-up?preventive=1&alert=${encodeURIComponent(notice.id)}`);
      } else if (notice.entityType === 'follow_up_early_warning') {
        navigate(`/follow-up?earlyWarning=1&alert=${encodeURIComponent(notice.id)}`);
      } else if (notice.entityType === 'follow_up_capa') {
        navigate(`/follow-up?capa=1&alert=${encodeURIComponent(notice.id)}`);
      } else if (notice.entityType === 'follow_up_kpi') {
        navigate(`/follow-up?kpi=1&alert=${encodeURIComponent(notice.id)}`);
      } else {
        navigate(`/follow-up?transaction=${encodeURIComponent(notice.entityId || '')}&alert=${encodeURIComponent(notice.id)}`);
      }
      return;
    }

    const tab = notificationTargetTab(notice);
    navigate(`/mosques?tab=${encodeURIComponent(tab)}&notice=${encodeURIComponent(notice.id)}`);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notice) => !notice.isRead);
    if (!unread.length) return;

    setLoading(true);
    try {
      const mosqueUnread = unread.filter((notice) => notice.source === 'mosques');
      const hasFollowUpUnread = unread.some((notice) => notice.source === 'follow_up');
      await Promise.all([
        ...mosqueUnread.map((notice) => mosqueApi.readNotification(notice.id)),
        ...(hasFollowUpUnread ? [transactionFollowUpApi.readAllAlerts()] : []),
      ]);
      setNotifications((current) => current.map((notice) => ({ ...notice, isRead: true })));
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
    } catch (error) {
      console.warn('Unable to mark all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewNotifications) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          title="مركز الإشعارات"
          aria-label={unreadCount > 0 ? `مركز الإشعارات، ${unreadCount} غير مقروء` : 'مركز الإشعارات'}
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-2xl"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -end-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-black leading-none text-white ring-2 ring-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[min(94vw,430px)] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl"
        dir="rtl"
      >
        <div className="border-b border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#0b4a3f]" />
                <h2 className="font-black text-slate-900">مركز الإشعارات</h2>
                {unreadCount > 0 && <Badge className="bg-rose-600 text-white">{unreadCount} جديد</Badge>}
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">إشعارات محفوظة على حسابك وموجهة حسب صلاحياتك ومسؤولياتك.</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void loadNotifications()} disabled={loading}>
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <span className="text-[11px] font-bold text-slate-500">{notifications.length} إشعار محفوظ</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-[#0b4a3f]" onClick={() => void markAllRead()} disabled={loading || unreadCount === 0}>
            <CheckCheck className="ml-1 h-3.5 w-3.5" />
            تحديد الكل كمقروء
          </Button>
        </div>

        <ScrollArea className="max-h-[430px]">
          <div className="divide-y divide-slate-100">
            {ordered.slice(0, 30).map((notice) => {
              const category = notificationCategory(notice);
              const Icon = category === 'follow_up_preventive'
                ? ShieldCheck
                : category === 'follow_up_early_warning'
                  ? AlertTriangle
                : category === 'follow_up_capa' || category === 'follow_up_kpi'
                  ? Target
                : category === 'follow_up'
                  ? notice.severity === 'danger' ? AlertTriangle : ListTodo
                  : category === 'improvement' || category === 'completion'
                    ? Target
                    : Clock3;
              const iconClass = notice.source === 'follow_up' && notice.severity === 'danger'
                ? 'border-red-200 bg-red-50 text-red-700'
                : notice.isRead
                  ? 'border-slate-200 bg-white text-slate-500'
                  : 'border-amber-200 bg-white text-amber-700';
              return (
                <button
                  key={`${notice.source}:${notice.id}`}
                  type="button"
                  onClick={() => void openNotice(notice)}
                  className={`flex w-full gap-3 p-4 text-right transition hover:bg-slate-50 ${notice.isRead ? 'bg-white' : 'bg-amber-50/45'}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <strong className="line-clamp-1 text-xs font-black text-slate-900">{notice.title}</strong>
                      {!notice.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-600" />}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-5 text-slate-600">{notice.message}</span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>{formatRelativeTime(notice.createdAt)}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#0b4a3f]"><ExternalLink className="h-3 w-3" />فتح</span>
                    </span>
                  </span>
                </button>
              );
            })}

            {!ordered.length && (
              <div className="p-8 text-center">
                <CheckCheck className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-3 text-sm font-black text-slate-700">لا توجد إشعارات حاليًا</p>
                <p className="mt-1 text-xs text-slate-400">ستظهر هنا التنبيهات الموجهة إلى حسابك عند إنشائها.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className={`grid gap-2 border-t border-slate-200 bg-white p-3 ${canViewMosques && canViewFollowUp ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canViewFollowUp && (
            <Button
              variant="outline"
              className="border-[#d9c9a5] bg-[#fffdf8] font-bold text-[#0b4a3f]"
              onClick={() => {
                setOpen(false);
                navigate('/follow-up');
              }}
            >
              <ListTodo className="ml-1 h-4 w-4" />
              نظام المتابعة
            </Button>
          )}
          {canViewMosques && (
            <Button
              variant="outline"
              className="border-[#d9c9a5] bg-[#fffdf8] font-bold text-[#0b4a3f]"
              onClick={() => {
                setOpen(false);
                navigate('/mosques?tab=notifications');
              }}
            >
              إشعارات المساجد
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PlatformNotificationCenter;
