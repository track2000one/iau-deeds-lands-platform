import React from 'react';
import { useNavigate } from 'react-router';
import {
  CheckCircle2,
  Clock3,
  LogOut,
  Mail,
  Palette,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const formatLastLogin = (value?: Date | null) => {
  if (!value) return 'لا يوجد تسجيل سابق';
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch {
    return 'غير متاح';
  }
};

export const PlatformAccountMenu: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, username, logout } = useAuth();
  const { isAdmin } = usePermissions();
  const [open, setOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          title="الحساب"
          aria-label="فتح قائمة الحساب"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-2xl future-glow-button"
        >
          <User className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-[min(92vw,360px)] overflow-hidden rounded-2xl border-slate-200 p-0 shadow-2xl"
        dir="rtl"
      >
        <div className="border-b border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
              <User className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">{username || 'مستخدم المنصة'}</p>
              <p className="mt-1 truncate text-[11px] text-slate-500">{userProfile?.email || '—'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 p-4 text-xs">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              نوع الحساب
            </span>
            <b className="text-slate-800">{isAdmin ? 'مسؤول المنصة' : 'مستخدم'}</b>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="h-4 w-4" />
              الحالة
            </span>
            <b className="text-emerald-700">{userProfile?.isActive === false ? 'غير نشط' : 'نشط'}</b>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <span className="inline-flex shrink-0 items-center gap-2 text-slate-500">
              <Clock3 className="h-4 w-4" />
              آخر دخول
            </span>
            <b className="text-left text-[11px] leading-5 text-slate-700">{formatLastLogin(userProfile?.lastLoginAt)}</b>
          </div>
        </div>

        <div className="grid gap-2 border-t border-slate-200 bg-white p-3">
          {isAdmin && (
            <Button variant="outline" className="justify-start" onClick={() => goTo('/admin')}>
              <ShieldCheck className="ml-2 h-4 w-4" />
              لوحة إدارة المستخدمين والصلاحيات
            </Button>
          )}
          <Button variant="outline" className="justify-start" onClick={() => goTo('/settings')}>
            <Settings className="ml-2 h-4 w-4" />
            إعدادات المنصة
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => goTo('/appearance')}>
            <Palette className="ml-2 h-4 w-4" />
            إعدادات المظهر
          </Button>
          <Button
            variant="outline"
            className="justify-start border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
          >
            <LogOut className="ml-2 h-4 w-4" />
            {loggingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PlatformAccountMenu;
