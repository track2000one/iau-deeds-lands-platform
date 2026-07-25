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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img
              src={PLATFORM_LOGO_URL}
              alt="منصة إدارة الصكوك والأراضي"
              className="h-20 w-20 object-contain drop-shadow-xl md:h-24 md:w-24"
            />
          </div>

          <div>
            <CardTitle className="text-2xl font-bold text-primary">
              إعادة تعيين كلمة المرور
            </CardTitle>
            <CardDescription className="mt-2">
              أنشئ كلمة مرور جديدة وآمنة لحسابك.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
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
                <Link to="/forgot-password">
                  طلب رابط جديد
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">العودة إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="flex items-center gap-2">
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
                    className="pl-10"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2"
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
                <Label htmlFor="confirm-password">
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
