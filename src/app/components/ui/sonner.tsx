import type { CSSProperties, ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, Loader2, TriangleAlert } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const NotificationIcon = ({ children, tone }: { children: ReactNode; tone: string }) => (
  <span
    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white/90 shadow-sm ${tone}`}
    aria-hidden="true"
  >
    {children}
  </span>
);

const defaultClassNames: NonNullable<ToasterProps['toastOptions']>['classNames'] = {
  toast:
    '!w-[min(92vw,460px)] !rounded-[18px] !border !border-slate-200/90 !bg-white/95 !px-4 !py-3.5 !text-right !shadow-[0_18px_55px_rgba(15,23,42,0.16)] !backdrop-blur-xl',
  title: '!text-right !text-[14px] !font-extrabold !leading-6 !text-slate-900',
  description: '!text-right !text-[12px] !font-medium !leading-5 !text-slate-600',
  content: '!gap-0.5',
  icon: '!ml-3 !mr-0',
  closeButton:
    '!left-2 !right-auto !top-2 !h-6 !w-6 !rounded-full !border-slate-200 !bg-white !text-slate-500 !shadow-sm hover:!bg-slate-50 hover:!text-slate-900',
  success:
    '!border-emerald-200/90 !bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(236,253,245,.96))]',
  error:
    '!border-rose-200/90 !bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,241,242,.97))]',
  warning:
    '!border-amber-200/90 !bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(255,251,235,.97))]',
  info:
    '!border-sky-200/90 !bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(240,249,255,.97))]',
  loading:
    '!border-slate-200/90 !bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(248,250,252,.97))]',
};

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      dir="rtl"
      position="top-center"
      expand
      closeButton
      visibleToasts={4}
      gap={10}
      offset={22}
      mobileOffset={14}
      className="toaster group"
      icons={{
        success: (
          <NotificationIcon tone="border-emerald-200 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </NotificationIcon>
        ),
        error: (
          <NotificationIcon tone="border-rose-200 text-rose-700">
            <CircleAlert className="h-5 w-5" />
          </NotificationIcon>
        ),
        warning: (
          <NotificationIcon tone="border-amber-200 text-amber-700">
            <TriangleAlert className="h-5 w-5" />
          </NotificationIcon>
        ),
        info: (
          <NotificationIcon tone="border-sky-200 text-sky-700">
            <Info className="h-5 w-5" />
          </NotificationIcon>
        ),
        loading: (
          <NotificationIcon tone="border-slate-200 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
          </NotificationIcon>
        ),
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          fontFamily: 'inherit',
        } as CSSProperties
      }
      toastOptions={{
        duration: 5000,
        ...toastOptions,
        classNames: {
          ...defaultClassNames,
          ...(toastOptions?.classNames || {}),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
