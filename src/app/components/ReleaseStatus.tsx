import React from 'react';
import { CheckCircle2, RefreshCw, RotateCcw, AlertTriangle, DownloadCloud } from 'lucide-react';
import { BUILD_INFO, type ReleaseBuildInfo } from '../utils/buildInfo';

type CheckState = 'idle' | 'checking' | 'latest' | 'outdated' | 'error';

const formatBuildDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

/**
 * A user-verifiable release indicator. Checks only a public same-origin file:
 * it never sends account data or application records to a third party.
 */
export const ReleaseStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [state, setState] = React.useState<CheckState>('idle');
  const [remoteRelease, setRemoteRelease] = React.useState<ReleaseBuildInfo | null>(null);

  const checkForUpdates = async () => {
    if (state === 'checking') return;
    setState('checking');
    try {
      const response = await fetch(`/build-info.json?check=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Release manifest is unavailable');
      const latest: ReleaseBuildInfo = await response.json();
      if (!latest || typeof latest.id !== 'string' || typeof latest.builtAt !== 'string') {
        throw new Error('Invalid release manifest');
      }
      setRemoteRelease(latest);
      setState(latest.id === BUILD_INFO.id ? 'latest' : 'outdated');
    } catch {
      setState('error');
    }
  };

  return (
    <section aria-label="إصدار الواجهة والتحديثات" className={compact ? 'space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-right' : 'space-y-2 rounded-xl border border-sidebar-border/80 bg-background/45 px-2.5 py-3'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold">إصدار الواجهة</span>
        <span className="text-[10px] font-semibold opacity-80" dir="ltr" title={BUILD_INFO.id}>
          {BUILD_INFO.id.slice(-8)}
        </span>
      </div>
      <div className="text-[11px] leading-5 opacity-80">
        تاريخ البناء: <time dateTime={BUILD_INFO.builtAt}>{formatBuildDate(BUILD_INFO.builtAt)}</time>
      </div>
      {BUILD_INFO.commit && (
        <div className="text-[10px] opacity-70" dir="ltr" title="معرّف GitHub">
          {BUILD_INFO.commit}
        </div>
      )}
      <button
        type="button"
        onClick={() => void checkForUpdates()}
        disabled={state === 'checking'}
        className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-current/20 bg-background/90 px-2 py-1.5 text-xs font-bold shadow-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${state === 'checking' ? 'animate-spin' : ''}`} />
        {state === 'checking' ? 'جارٍ التحقق...' : 'التحقق من التحديثات'}
      </button>
      <div aria-live="polite" className="text-[11px] leading-5">
        {state === 'latest' && (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> لديك أحدث إصدار متاح
          </span>
        )}
        {state === 'outdated' && (
          <div className="space-y-2">
            <p className="flex items-center gap-1 font-bold text-amber-700">
              <DownloadCloud className="h-3.5 w-3.5" /> يتوفر تحديث أحدث
            </p>
            {remoteRelease && (
              <p className="opacity-80">بُني في {formatBuildDate(remoteRelease.builtAt)}</p>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white hover:bg-emerald-800"
            >
              <RotateCcw className="h-3.5 w-3.5" /> تحديث المنصة الآن
            </button>
          </div>
        )}
        {state === 'error' && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> تعذر التحقق؛ تحقق من الاتصال وحاول مجددًا
          </span>
        )}
      </div>
    </section>
  );
};
