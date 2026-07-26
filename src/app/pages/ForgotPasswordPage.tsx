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
              نسيت كلمة المرور
            </CardTitle>
            <CardDescription className="mt-2 leading-6">
              أدخل بريدك الإلكتروني المسجل في المنصة لإرسال رابط آمن لإعادة تعيين كلمة المرور.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <div>
                <p className="font-semibold">تحقق من بريدك الإلكتروني</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  تم قبول الطلب وإرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني المسجل.
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
                <Link to="/login">
                  العودة إلى تسجيل الدخول
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="flex items-center gap-2">
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
                <Link to="/login">
                  العودة إلى تسجيل الدخول
                </Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
