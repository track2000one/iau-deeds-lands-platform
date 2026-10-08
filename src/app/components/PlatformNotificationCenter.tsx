import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  CheckCheck,
  Clock3,
  ExternalLink,
  RefreshCw,
  Target,
} from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { mosqueApi, type MosqueNotification } from '../api/mosques';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

const notificationCategory = (notice: MosqueNotification) => {
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

const notificationTargetTab = (notice: MosqueNotification) => {
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
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<MosqueNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!canViewMosques) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const rows = await mosqueApi.notifications();
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.warn('Unable to load platform notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewMosques]);

  useEffect(() => {
    if (!canViewMosques) return;

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
  }, [canViewMosques, loadNotifications]);

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

  const openNotice = async (notice: MosqueNotification) => {
    if (!notice.isRead) {
      try {
        await mosqueApi.readNotification(notice.id);
        setNotifications((current) => current.map((item) => item.id === notice.id ? { ...item, isRead: true } : item));
        window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      } catch (error) {
        console.warn('Unable to mark notification as read:', error);
      }
    }

    const tab = notificationTargetTab(notice);
    setOpen(false);
    navigate(`/mosques?tab=${encodeURIComponent(tab)}&notice=${encodeURIComponent(notice.id)}`);
  };

  const markAllRead = async () => {
    const unread = notifications.filter((notice) => !notice.isRead);
    if (!unread.length) return;

    setLoading(true);
    try {
      await Promise.all(unread.map((notice) => mosqueApi.readNotification(notice.id)));
      setNotifications((current) => current.map((notice) => ({ ...notice, isRead: true })));
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
    } catch (error) {
      console.warn('Unable to mark all notifications as read:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewMosques) return null;

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
            {ordered.slice(0, 20).map((notice) => {
              const category = notificationCategory(notice);
              const Icon = category === 'improvement' || category === 'completion' ? Target : Clock3;
              return (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => void openNotice(notice)}
                  className={`flex w-full gap-3 p-4 text-right transition hover:bg-slate-50 ${notice.isRead ? 'bg-white' : 'bg-amber-50/45'}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${notice.isRead ? 'border-slate-200 bg-white text-slate-500' : 'border-amber-200 bg-white text-amber-700'}`}>
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

        <div className="border-t border-slate-200 bg-white p-3">
          <Button
            variant="outline"
            className="w-full border-[#d9c9a5] bg-[#fffdf8] font-bold text-[#0b4a3f]"
            onClick={() => {
              setOpen(false);
              navigate('/mosques?tab=notifications');
            }}
          >
            عرض جميع الإشعارات
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PlatformNotificationCenter;
