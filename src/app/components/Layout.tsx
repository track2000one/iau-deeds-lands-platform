import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { ThemeInitializer } from './ThemeInitializer';
import { PLATFORM_LOGO_URL } from '../config/branding';
import {
  Home,
  FileText,
  PlusCircle,
  Search,
  BarChart3,
  Settings,
  Languages,
  Menu,
  X,
  LogOut,
  User,
  MapPin,
  Building,
  Shield,
  Archive,
  Palette,
  Bell,
  Mail,
  Globe2,
  CalendarDays,
  History,
  ClipboardCheck,
  Package,
  FileClock,
  Scale,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { logout, username } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  const isRTL = i18n.language === 'ar';
  const ui = (ar: string, en: string) => (isRTL ? ar : en);
  const locale = isRTL ? 'ar-SA' : 'en-US';

  const coreHomeModules = [
    'deeds',
    'allocated_lands',
    'delivered_lands',
    'leased_lands_out',
    'leased_lands_in',
    'leased_buildings_out',
    'leased_buildings_in',
  ] as const;

  const scopedLandingRoutes = [
    ['assets', '/assets'],
    ['accounting_transformation', '/accounting-transformation'],
    ['mosques', '/mosques'],
    ['contracts_follow_up', '/contracts/follow-up'],
    ['site_inspections', '/site-inspections'],
    ['reports', '/reports'],
    ['archive', '/archive'],
  ] as const;

  const hasCoreHomeAccess =
    isAdmin || coreHomeModules.some((module) => hasPermission(module, 'canView'));
  const defaultLandingPath = hasCoreHomeAccess
    ? '/'
    : scopedLandingRoutes.find(([module]) => hasPermission(module, 'canView'))?.[1] || '/appearance';

  React.useEffect(() => {
    if (!sidebarOpen || window.innerWidth >= 1024) return;

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [sidebarOpen]);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';

    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleLogout = () => {
    logout();
    setLogoutDialogOpen(false);
  };

  const menuItems = [
    { id: 'home', path: '/', icon: Home, label: t('nav.home'), alwaysVisible: hasCoreHomeAccess },
    { id: 'add-deed', path: '/deeds/new', icon: PlusCircle, label: t('nav.addDeed'), module: 'deeds', action: 'canAdd' },
    { id: 'all-deeds', path: '/deeds', icon: FileText, label: t('nav.allDeeds'), module: 'deeds', action: 'canView' },
    { id: 'allocated-lands', path: '/lands/allocated', icon: MapPin, label: t('nav.allocatedLands'), module: 'allocated_lands', action: 'canView' },
    { id: 'delivered-lands', path: '/lands/delivered', icon: MapPin, label: t('nav.deliveredLands'), module: 'delivered_lands', action: 'canView' },
    { id: 'site-inspections', path: '/site-inspections', icon: ClipboardCheck, label: ui('معاينة أرض أو موقع', 'Land or Site Inspection'), module: 'site_inspections', action: 'canView' },
    { id: 'leased-lands-out', path: '/lands/leased-out', icon: MapPin, label: t('nav.leasedLandsOut'), module: 'leased_lands_out', action: 'canView' },
    { id: 'leased-lands-in', path: '/lands/leased-in', icon: MapPin, label: t('nav.leasedLandsIn'), module: 'leased_lands_in', action: 'canView' },
    { id: 'leased-buildings-out', path: '/buildings/leased-out', icon: Building, label: t('nav.leasedBuildingsOut'), module: 'leased_buildings_out', action: 'canView' },
    { id: 'leased-buildings-in', path: '/buildings/leased-in', icon: Building, label: t('nav.leasedBuildingsIn'), module: 'leased_buildings_in', action: 'canView' },
    { id: 'contracts-followup', path: '/contracts/follow-up', icon: FileClock, label: ui('متابعة العقود', 'Contract Follow-up'), module: 'contracts_follow_up', action: 'canView' },
    { id: 'assets', path: '/assets', icon: Package, label: ui('وحدة الأصول', 'Assets Unit'), module: 'assets', action: 'canView' },
    { id: 'accounting-transformation', path: '/accounting-transformation', icon: Scale, label: ui('لجنة متابعة متطلبات التحول المحاسبي', 'Accounting Transformation Requirements Committee'), module: 'accounting_transformation', action: 'canView' },
    { id: 'mosques', path: '/mosques', icon: Building, label: ui('وحدة العناية بالمساجد والمصليات', 'Mosques & Prayer Rooms Care'), module: 'mosques', action: 'canView' },
    { id: 'search', path: '/search', icon: Search, label: t('nav.search'), alwaysVisible: true },
    { id: 'reports', path: '/reports', icon: BarChart3, label: t('nav.reports'), module: 'reports', action: 'canView' },
    { id: 'admin', path: '/admin', icon: Shield, label: t('nav.admin'), adminOnly: true },
    { id: 'audit', path: '/audit', icon: History, label: ui('سجل العمليات', 'Audit Log'), adminOnly: true },
    { id: 'archive', path: '/archive', icon: Archive, label: ui('الأرشفة', 'Archive'), module: 'archive', action: 'canView' },
    { id: 'appearance', path: '/appearance', icon: Palette, label: ui('المظهر', 'Appearance'), alwaysVisible: true },
  ] as const;

  const getCurrentPage = () => {
    const path = location.pathname;

    if (path === '/') return 'home';
    if (path.startsWith('/deeds/new')) return 'add-deed';
    if (path.startsWith('/deeds')) return 'all-deeds';
    if (path.startsWith('/lands/allocated')) return 'allocated-lands';
    if (path.startsWith('/lands/delivered')) return 'delivered-lands';
    if (path.startsWith('/site-inspections')) return 'site-inspections';
    if (path.startsWith('/lands/leased-out')) return 'leased-lands-out';
    if (path.startsWith('/lands/leased-in')) return 'leased-lands-in';
    if (path.startsWith('/buildings/leased-out')) return 'leased-buildings-out';
    if (path.startsWith('/buildings/leased-in')) return 'leased-buildings-in';
    if (path.startsWith('/contracts/follow-up')) return 'contracts-followup';
    if (path.startsWith('/assets')) return 'assets';
    if (path.startsWith('/accounting-transformation')) return 'accounting-transformation';
    if (path.startsWith('/mosques')) return 'mosques';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/archive')) return 'archive';
    if (path.startsWith('/appearance')) return 'appearance';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/audit')) return 'audit';
    if (path.startsWith('/settings')) return 'settings';

    return 'home';
  };

  const currentPage = getCurrentPage();
  const now = new Date();

  return (
    <div className="future-app-shell min-h-dvh h-dvh w-full min-w-0 flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <ThemeInitializer />

      <header className="future-topbar text-foreground z-30 relative shrink-0 min-h-[58px] sm:min-h-[64px]">
        <div className="flex min-h-[58px] sm:min-h-[64px] items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-4 md:px-6 2xl:px-8">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 h-10 w-10 rounded-xl future-glow-button"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <Button title={ui('الحساب', 'Account')} aria-label={ui('الحساب', 'Account')} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl future-glow-button" onClick={() => navigate(isAdmin ? '/admin' : defaultLandingPath)}>
                <User className="h-4 w-4" />
              </Button>
              {(isAdmin || hasPermission('contracts_follow_up', 'canView')) && (
                <Button title={ui('تنبيهات العقود', 'Contract Alerts')} aria-label={ui('تنبيهات العقود', 'Contract Alerts')} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl relative" onClick={() => navigate('/contracts/follow-up')}>
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2 end-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-background" />
                </Button>
              )}
              <Button title={ui('إنشاء رسالة بريد', 'Compose Email')} aria-label={ui('إنشاء رسالة بريد', 'Compose Email')} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(ui('منصة إدارة الأصول والأملاك والأوقاف الجامعية', 'University Assets, Properties and Endowments Management Platform'))}`; }}>
                <Mail className="h-4 w-4" />
              </Button>
              <Button title={ui('تبديل اللغة', 'Switch Language')} aria-label={ui('تبديل اللغة', 'Switch Language')} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" onClick={toggleLanguage}>
                <Globe2 className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-10 rounded-2xl px-3"
            >
              <Languages className="h-4 w-4 ml-2" />
              {i18n.language === 'ar' ? 'EN' : 'AR'}
            </Button>

            <div className="hidden xl:flex items-center gap-2 rounded-2xl border bg-background/50 px-4 py-2">
              <span className="font-mono text-sm">
                {now.toLocaleDateString(locale)}
              </span>
              <span className="font-mono text-sm">
                {now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex flex-col text-right min-w-0">
              <h1 className="text-base md:text-xl font-bold truncate">{t('app.title')}</h1>
              <p className="text-xs opacity-75 truncate">{t('app.subtitle')}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate(defaultLandingPath)}
              aria-label="Platform home"
              className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-2xl border bg-background/60 p-1.5 grid place-items-center shadow-[0_0_25px_hsl(var(--primary)/0.25)] transition-transform hover:scale-105"
            >
              <img
                src={PLATFORM_LOGO_URL}
                alt="Platform logo"
                className="h-full w-full object-contain"
              />
            </button>
          </div>
        </div>
      </header>

      <div className="app-content-row relative flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          data-sidebar
          className={`
            future-sidebar
            fixed lg:static
            inset-y-0 lg:inset-y-auto
            h-dvh lg:h-auto
            z-50 lg:z-0
            w-[88vw] max-w-[340px] shrink-0
            lg:w-[300px] xl:w-[320px] 2xl:w-[340px]
            bg-sidebar text-sidebar-foreground
            transition-transform duration-300 ease-in-out
            flex flex-col
            ${isRTL ? 'right-0 lg:border-l' : 'left-0 lg:border-r'}
            ${
              sidebarOpen
                ? 'translate-x-0'
                : isRTL
                  ? 'translate-x-full'
                  : '-translate-x-full'
            }
            lg:translate-x-0
          `}
        >
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{username}</p>
                <p className="text-xs opacity-70">{ui('مستخدم المنصة', 'Platform User')}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLogoutDialogOpen(true)}
                className="h-9 w-9 rounded-2xl"
              >
                <LogOut className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden h-9 w-9 rounded-2xl"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-3 sm:py-4">
            <nav className="space-y-2">
              {menuItems
                .filter((item) => {
                  if ('adminOnly' in item && item.adminOnly) return isAdmin;
                  if ('alwaysVisible' in item && item.alwaysVisible) return true;
                  if ('module' in item && 'action' in item) {
                    return hasPermission(item.module, item.action);
                  }
                  return false;
                })
                .map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`
                      future-nav-item w-full ${isRTL ? 'justify-end' : 'justify-start'} gap-3 text-[13px] min-h-12 h-auto px-3 py-2.5 whitespace-normal
                      ${isActive ? 'is-active font-bold' : ''}
                    `}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className={`min-w-0 flex-1 whitespace-normal break-words leading-5 ${isRTL ? 'text-right' : 'text-left'}`} title={item.label}>
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </nav>

            <Separator className="my-4 bg-sidebar-border" />

            <div className={`px-3 py-2 text-xs opacity-70 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="font-medium">v2060.1.0</p>
              <p className="mt-1">© 2060 IAU</p>
            </div>
          </ScrollArea>
        </aside>

        <main className="app-main min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-background/70">
          <div className="mobile-page-shell w-full max-w-none px-2 py-2.5 sm:px-3 sm:py-4 md:px-5 md:py-5 2xl:px-7">
            {children}
          </div>
        </main>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('nav.confirmLogout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('nav.confirmLogoutMessage')}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
