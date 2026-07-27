import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { apiJson } from '../../lib/http';
import { PLATFORM_LOGO_URL } from '../config/branding';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

type ValidationResponse = {
  valid: boolean;
  username: string;
  email: string;
  expiresAt: string;
  message: string;
};

export const ActivateAccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get('token') || '',
    [searchParams]
  );

  const [validation, setValidation] =
    useState<ValidationResponse | null>(null);
  const [validationError, setValidationError] = useState('');
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [keepCurrentPassword, setKeepCurrentPassword] =
    useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setValidationError('رابط التفعيل غير صالح.');
        setValidating(false);
        return;
      }

      try {
        const response = await apiJson<ValidationResponse>(
          `/api/auth/activate-account/validate?token=${encodeURIComponent(
            token
          )}`
        );

        setValidation(response);
      } catch (error) {
        setValidationError(
          error instanceof Error
            ? error.message
            : 'تعذر التحقق من رابط التفعيل.'
        );
      } finally {
        setValidating(false);
      }
    };

    validate();
  }, [token]);

  const submitActivation = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!currentPassword) {
      toast.error(
        'أدخل كلمة المرور المرسلة إلى بريدك الإلكتروني.'
      );
      return;
    }

    if (!keepCurrentPassword) {
      if (newPassword.length < 8) {
        toast.error(
          'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.'
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error(
          'كلمة المرور الجديدة وتأكيدها غير متطابقين.'
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await apiJson<{ message: string }>(
        '/api/auth/activate-account',
        {
          method: 'POST',
          body: JSON.stringify({
            token,
            currentPassword,
            keepCurrentPassword,
            newPassword:
              keepCurrentPassword ? undefined : newPassword,
          }),
        }
      );

      toast.success(response.message);
      setActivated(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تفعيل الحساب.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-4">
      <Card className="w-full max-w-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <img
              src={PLATFORM_LOGO_URL}
              alt="منصة إدارة الصكوك والأراضي"
              className="h-24 w-24 object-contain"
            />
          </div>

          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            تفعيل الحساب
          </CardTitle>

          <CardDescription>
            منصة إدارة الصكوك والأراضي
          </CardDescription>
        </CardHeader>

        <CardContent>
          {validating ? (
            <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري التحقق من رابط التفعيل...
            </div>
          ) : validationError ? (
            <div className="space-y-5 py-6 text-center">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-destructive">
                {validationError}
              </div>

              <p className="text-sm text-muted-foreground">
                يرجى التواصل مع مسؤول النظام لإرسال رابط
                تفعيل جديد.
              </p>

              <Button asChild>
                <Link to="/login">العودة إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : activated ? (
            <div className="space-y-5 py-8 text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />

              <div>
                <h2 className="text-xl font-bold">
                  تم تفعيل الحساب بنجاح
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  يمكنك الآن تسجيل الدخول إلى المنصة.
                </p>
              </div>

              <Button asChild className="w-full">
                <Link to="/login">الانتقال إلى تسجيل الدخول</Link>
              </Button>
            </div>
          ) : validation ? (
            <form
              onSubmit={submitActivation}
              className="space-y-5"
            >
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="font-semibold">
                  مرحبًا {validation.username}
                </p>
                <p
                  className="mt-1 text-sm text-muted-foreground"
                  dir="ltr"
                >
                  {validation.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  كلمة المرور المرسلة بالبريد
                </Label>

                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={
                      showCurrentPassword ? 'text' : 'password'
                    }
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    className="pl-11"
                    required
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-1 top-1/2 -translate-y-1/2"
                    onClick={() =>
                      setShowCurrentPassword((value) => !value)
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setKeepCurrentPassword(true)}
                  className={`rounded-xl border p-4 text-right transition ${
                    keepCurrentPassword
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <Lock className="mb-2 h-5 w-5" />
                  <p className="font-semibold">
                    الاحتفاظ بكلمة المرور
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    تفعيل الحساب دون تغييرها.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setKeepCurrentPassword(false)}
                  className={`rounded-xl border p-4 text-right transition ${
                    !keepCurrentPassword
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <KeyRound className="mb-2 h-5 w-5" />
                  <p className="font-semibold">
                    تعيين كلمة مرور جديدة
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    تغييرها أثناء تفعيل الحساب.
                  </p>
                </button>
              </div>

              {!keepCurrentPassword && (
                <div className="space-y-4 rounded-xl border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      كلمة المرور الجديدة
                    </Label>

                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={
                          showNewPassword ? 'text' : 'password'
                        }
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        minLength={8}
                        autoComplete="new-password"
                        className="pl-11"
                        required={!keepCurrentPassword}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-1 top-1/2 -translate-y-1/2"
                        onClick={() =>
                          setShowNewPassword((value) => !value)
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      تأكيد كلمة المرور الجديدة
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      minLength={8}
                      autoComplete="new-password"
                      required={!keepCurrentPassword}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري تفعيل الحساب...
                  </>
                ) : keepCurrentPassword ? (
                  'تفعيل الحساب والاحتفاظ بكلمة المرور'
                ) : (
                  'تفعيل الحساب وتحديث كلمة المرور'
                )}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
