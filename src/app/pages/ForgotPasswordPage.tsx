import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { apiJson } from '../../lib/http';
import { PLATFORM_LOGO_URL } from '../config/branding';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { toast } from 'sonner';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      const response = await apiJson<{ message: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      setSubmitted(true);
      toast.success(
        response.message ||
          'تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني المسجل.'
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر إرسال طلب إعادة تعيين كلمة المرور'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="neo-auth-page" dir="rtl">
      <style>{`
        .neo-auth-page {
          --neo-bg: #e8edf2;
          --neo-text: #27313d;
          --neo-muted: #75808c;
          --neo-accent: #184b77;
          --neo-shadow: rgba(148, 163, 184, .46);
          --neo-light: rgba(255, 255, 255, .96);
          position: relative;
          isolation: isolate;
          display: flex;
          min-height: 100dvh;
          width: 100%;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 28px 18px;
          background:
            radial-gradient(circle at 50% 38%, rgba(255,255,255,.96) 0 12%, rgba(255,255,255,.32) 34%, transparent 58%),
            linear-gradient(145deg, #eef3f7 0%, var(--neo-bg) 58%, #e2e8ee 100%);
          color: var(--neo-text);
        }

        .neo-auth-page::before,
        .neo-auth-page::after {
          content: '';
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          pointer-events: none;
        }

        .neo-auth-page::before {
          width: min(46vw, 560px);
          height: min(46vw, 560px);
          inset-inline-start: -18vw;
          top: -25vw;
          background: rgba(255,255,255,.34);
          box-shadow: 28px 28px 68px rgba(148,163,184,.16);
        }

        .neo-auth-page::after {
          width: min(40vw, 500px);
          height: min(40vw, 500px);
          inset-inline-end: -16vw;
          bottom: -24vw;
          background: rgba(214,223,232,.44);
          box-shadow: -22px -22px 56px rgba(255,255,255,.72);
        }

        .neo-auth-card {
          width: min(100%, 480px) !important;
          max-width: 480px !important;
          gap: 0 !important;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.74) !important;
          border-radius: 30px !important;
          background: linear-gradient(145deg, #edf2f6 0%, #e5ebf0 100%) !important;
          color: var(--neo-text) !important;
          box-shadow:
            -18px -18px 38px var(--neo-light),
            18px 18px 40px var(--neo-shadow),
            inset 1px 1px 0 rgba(255,255,255,.72) !important;
        }

        .neo-auth-logo {
          width: 82px;
          height: 82px;
          display: grid;
          place-items: center;
          margin: 0 auto;
          border-radius: 24px;
          background: linear-gradient(145deg, #eef3f7, #e0e7ed);
          box-shadow:
            -8px -8px 18px rgba(255,255,255,.96),
            8px 8px 18px rgba(148,163,184,.40);
        }

        .neo-auth-page [data-slot="card-title"] {
          color: #173b60 !important;
          letter-spacing: -.01em;
        }

        .neo-auth-page [data-slot="card-description"] {
          color: var(--neo-muted) !important;
        }

        .neo-auth-page [data-slot="input"] {
          min-height: 50px;
          border: 0 !important;
          border-radius: 15px !important;
          background: var(--neo-bg) !important;
          color: var(--neo-text) !important;
          box-shadow:
            inset 5px 5px 11px rgba(148,163,184,.28),
            inset -5px -5px 11px rgba(255,255,255,.90) !important;
        }

        .neo-auth-page [data-slot="input"]:focus {
          box-shadow:
            inset 4px 4px 9px rgba(148,163,184,.24),
            inset -4px -4px 9px rgba(255,255,255,.92),
            0 0 0 3px rgba(24,75,119,.10) !important;
        }

        .neo-auth-page [data-slot="button"] {
          min-height: 48px;
          border-radius: 15px !important;
        }

        .neo-auth-page [data-slot="button"][class*="bg-primary"] {
          border: 0 !important;
          background: linear-gradient(145deg, #1f5d8e, #153f66) !important;
          color: white !important;
          box-shadow:
            0 7px 14px rgba(24,75,119,.22),
            inset 1px 1px 0 rgba(255,255,255,.20) !important;
        }

        .neo-auth-page [data-slot="button"][class*="border"] {
          background: linear-gradient(145deg, #eef3f7, #e1e8ee) !important;
          border-color: rgba(96,115,132,.18) !important;
          box-shadow:
            -5px -5px 10px rgba(255,255,255,.84),
            5px 5px 11px rgba(148,163,184,.26) !important;
        }

        @media (max-width: 520px) {
          .neo-auth-page { padding: 18px 12px; }
          .neo-auth-card { border-radius: 24px !important; }
        }
      `}</style>

      <Card className="neo-auth-card">
        <CardHeader className="space-y-4 px-6 pb-4 pt-7 text-center sm:px-8 sm:pt-8">
          <div className="neo-auth-logo">
            <img
              src={PLATFORM_LOGO_URL}
              alt="منصة إدارة الأصول والأملاك والأوقاف الجامعية"
              className="h-16 w-16 object-contain"
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold">
              نسيت كلمة المرور
            </CardTitle>
            <CardDescription className="mt-2 leading-6">
              أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا آمنًا لإعادة تعيين كلمة المرور.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
          {submitted ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <div>
                <p className="font-semibold">تحقق من بريدك الإلكتروني</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني المسجل.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                إرسال الرابط مرة أخرى
              </Button>

              <Button asChild className="w-full">
                <Link to="/login">العودة إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4" />
                  البريد الإلكتروني
                </Label>

                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@university.edu"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    إرسال رابط إعادة التعيين
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">العودة إلى تسجيل الدخول</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
