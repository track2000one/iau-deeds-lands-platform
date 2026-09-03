import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from './ui/button';

const getErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    if (error.status === 403) return 'ليس لديك صلاحية للوصول إلى هذه الصفحة.';
    if (error.status === 404) return 'تعذر العثور على الصفحة المطلوبة.';
    return error.statusText || 'حدث خطأ أثناء فتح الصفحة.';
  }
  if (error instanceof Error) return error.message;
  return 'حدث خطأ غير متوقع أثناء فتح الصفحة.';
};

export const RouteErrorPage: React.FC = () => {
  const error = useRouteError();
  const isArabic = document.documentElement.lang !== 'en';
  const message = getErrorMessage(error);

  React.useEffect(() => {
    console.error('Route rendering error:', error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center">
        <section className="w-full rounded-3xl border border-red-200/80 bg-card p-6 text-center shadow-xl sm:p-9">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black sm:text-2xl">
            {isArabic ? 'تعذر إكمال فتح الصفحة' : 'Unable to open this page'}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            {message}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            {isArabic
              ? 'يمكنك إعادة المحاولة، وإذا استمرت المشكلة ارجع إلى الصفحة الرئيسية ثم افتح القسم مرة أخرى.'
              : 'Try again. If the issue persists, return to the home page and reopen the section.'}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="me-2 h-4 w-4" />
              {isArabic ? 'إعادة المحاولة' : 'Try again'}
            </Button>
            <Button variant="outline" onClick={() => { window.location.hash = '#/'; }}>
              <Home className="me-2 h-4 w-4" />
              {isArabic ? 'الصفحة الرئيسية' : 'Home'}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};
