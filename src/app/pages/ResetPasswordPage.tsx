import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldAlert,
} from 'lucide-react';
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

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const passwordsMatch = useMemo(
    () => password === confirmation,
    [password, confirmation]
  );

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setValidationMessage('رابط إعادة تعيين كلمة المرور غير مكتمل');
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await apiJson<{
          valid: boolean;
          message: string;
        }>(
          `/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`
        );

        setIsValid(response.valid);
        setValidationMessage(response.message);
      } catch (error) {
        setIsValid(false);
        setValidationMessage(
          error instanceof Error
            ? error.message
            : 'انتهت صلاحية الرابط أو تم استخدامه مسبقًا'
        );
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error('كلمة المرور يجب ألا تقل عن 8 أحرف');
      return;
    }

    if (!passwordsMatch) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await apiJson<{ message: string }>(
        '/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      setCompleted(true);
      toast.success(response.message);

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر إعادة تعيين كلمة المرور'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="neo-reset-page" dir="rtl">
      <style>{`
        .neo-reset-page {
          --neo-bg: #e8edf2;
          --neo-text: #27313d;
          --neo-muted: #75808c;
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

        .neo-reset-page::before,
        .neo-reset-page::after {
          content: '';
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          pointer-events: none;
        }

        .neo-reset-page::before {
          width: min(46vw, 560px);
          height: min(46vw, 560px);
          inset-inline-start: -18vw;
          top: -25vw;
          background: rgba(255,255,255,.34);
          box-shadow: 28px 28px 68px rgba(148,163,184,.16);
        }

        .neo-reset-page::after {
          width: min(40vw, 500px);
          height: min(40vw, 500px);
          inset-inline-end: -16vw;
          bottom: -24vw;
          background: rgba(214,223,232,.44);
          box-shadow: -22px -22px 56px rgba(255,255,255,.72);
        }

        .neo-reset-card {
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

        .neo-reset-logo {
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

        .neo-reset-page [data-slot="card-title"] {
          color: #173b60 !important;
        }

        .neo-reset-page [data-slot="card-description"] {
          color: var(--neo-muted) !important;
        }

        .neo-reset-page [data-slot="input"] {
          min-height: 50px;
          border: 0 !important;
          border-radius: 15px !important;
          background: var(--neo-bg) !important;
          color: var(--neo-text) !important;
          box-shadow:
            inset 5px 5px 11px rgba(148,163,184,.28),
            inset -5px -5px 11px rgba(255,255,255,.90) !important;
        }

        .neo-reset-page [data-slot="input"]:focus {
          box-shadow:
            inset 4px 4px 9px rgba(148,163,184,.24),
            inset -4px -4px 9px rgba(255,255,255,.92),
            0 0 0 3px rgba(24,75,119,.10) !important;
        }

        .neo-reset-page [data-slot="button"] {
          min-height: 48px;
          border-radius: 15px !important;
        }

        .neo-reset-page [data-slot="button"][class*="bg-primary"] {
          border: 0 !important;
          background: linear-gradient(145deg, #1f5d8e, #153f66) !important;
          color: white !important;
          box-shadow:
            0 7px 14px rgba(24,75,119,.22),
            inset 1px 1px 0 rgba(255,255,255,.20) !important;
        }

        .neo-reset-page [data-slot="button"][class*="border"] {
          background: linear-gradient(145deg, #eef3f7, #e1e8ee) !important;
          border-color: rgba(96,115,132,.18) !important;
          box-shadow:
            -5px -5px 10px rgba(255,255,255,.84),
            5px 5px 11px rgba(148,163,184,.26) !important;
        }

        @media (max-width: 520px) {
          .neo-reset-page { padding: 18px 12px; }
          .neo-reset-card { border-radius: 24px !important; }
        }
      `}</style>

      <Card className="neo-reset-card">
        <CardHeader className="space-y-4 px-6 pb-4 pt-7 text-center sm:px-8 sm:pt-8">
          <div className="neo-reset-logo">
            <img
              src={PLATFORM_LOGO_URL}
              alt="منصة إدارة الأصول والأملاك والأوقاف الجامعية"
              className="h-16 w-16 object-contain"
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold">
              إعادة تعيين كلمة المرور
            </CardTitle>
            <CardDescription className="mt-2 leading-6">
              أنشئ كلمة مرور جديدة وآمنة لحسابك.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
          {isValidating ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                جاري التحقق من صلاحية الرابط...
              </p>
            </div>
          ) : completed ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <div>
                <p className="font-semibold">تم تغيير كلمة المرور بنجاح</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  سيتم نقلك إلى صفحة تسجيل الدخول.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/login">تسجيل الدخول الآن</Link>
              </Button>
            </div>
          ) : !isValid ? (
            <div className="space-y-5 text-center">
              <ShieldAlert className="mx-auto h-14 w-14 text-destructive" />
              <div>
                <p className="font-semibold">الرابط غير صالح</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {validationMessage}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/forgot-password">طلب رابط جديد</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">العودة إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2 font-semibold">
                  <LockKeyhole className="h-4 w-4" />
                  كلمة المرور الجديدة
                </Label>

                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="8 أحرف على الأقل"
                    className="pl-11"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="font-semibold">
                  تأكيد كلمة المرور
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="أعد إدخال كلمة المرور"
                />

                {confirmation && !passwordsMatch && (
                  <p className="text-xs text-destructive">
                    كلمتا المرور غير متطابقتين
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !passwordsMatch}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ كلمة المرور الجديدة'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
