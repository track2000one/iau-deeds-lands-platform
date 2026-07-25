import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_LOGO_URL } from '../config/branding';
import {
  Eye,
  EyeOff,
  Languages,
  Lock,
  LogIn,
  Shield,
  User,
} from 'lucide-react';
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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      toast.success(
        i18n.language === 'ar'
          ? 'تم تسجيل الدخول بنجاح'
          : 'Login successful'
      );
      navigate('/');
    } catch {
      toast.error(
        i18n.language === 'ar'
          ? 'تعذر تسجيل الدخول، يرجى التحقق من البريد الإلكتروني وكلمة المرور'
          : 'Unable to sign in. Please check your email and password.'
      );
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-3 md:p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute right-3 top-3 h-8 text-white hover:bg-white/10 md:right-4 md:top-4 md:h-9"
      >
        <Languages className="ml-1 h-3 w-3 md:ml-2 md:h-4 md:w-4" />
        <span className="text-xs md:text-sm">
          {i18n.language === 'ar' ? 'EN' : 'ع'}
        </span>
      </Button>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-3 pb-2 text-center md:space-y-4">
          <div className="mb-2 flex justify-center">
            <img
              src={PLATFORM_LOGO_URL}
              alt="منصة إدارة الصكوك والأراضي"
              className="h-20 w-20 object-contain drop-shadow-xl md:h-24 md:w-24"
            />
          </div>

          <div>
            <CardTitle className="text-xl font-bold text-primary md:text-2xl">
              {t('app.title') || 'منصة إدارة الصكوك والأراضي'}
            </CardTitle>
            <CardDescription className="mt-1 text-sm md:mt-2 md:text-base">
              {t('app.subtitle') || 'جامعة الإمام عبدالرحمن بن فيصل'}
            </CardDescription>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground md:text-sm">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span>
              {i18n.language === 'ar'
                ? 'منصة رسمية مخصصة للمستخدمين المخولين'
                : 'Official platform for authorized users only'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 md:pt-6">
          <div className="mb-4 rounded-lg border bg-muted/30 p-3 md:mb-6 md:p-4">
            <p className="text-xs leading-6 text-muted-foreground md:text-sm">
              {i18n.language === 'ar'
                ? 'هذه المنصة مخصصة لإدارة بيانات الصكوك والأراضي والعقارات، ولا يسمح بالدخول أو استخدام الخدمات إلا للمستخدمين المخولين وفق الصلاحيات المعتمدة.'
                : 'This platform is restricted to authorized users for managing deeds, lands, and real estate records according to approved permissions.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
              >
                <User className="h-3 w-3 md:h-4 md:w-4" />
                {i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={
                  i18n.language === 'ar'
                    ? 'أدخل البريد الإلكتروني'
                    : 'Enter email'
                }
                required
                disabled={isLoading}
                className="h-10 text-sm md:h-11 md:text-base"
                autoComplete="email"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-sm md:gap-2 md:text-base"
                >
                  <Lock className="h-3 w-3 md:h-4 md:w-4" />
                  {i18n.language === 'ar' ? 'كلمة المرور' : 'Password'}
                </Label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline md:text-sm"
                >
                  {i18n.language === 'ar'
                    ? 'نسيت كلمة المرور؟'
                    : 'Forgot password?'}
                </Link>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    i18n.language === 'ar'
                      ? 'أدخل كلمة المرور'
                      : 'Enter password'
                  }
                  required
                  disabled={isLoading}
                  className="h-10 pl-10 text-sm md:h-11 md:text-base"
                  autoComplete="current-password"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2 md:h-9 md:w-9"
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isLoading}
                  aria-label={
                    showPassword
                      ? 'إخفاء كلمة المرور'
                      : 'إظهار كلمة المرور'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-10 w-full text-sm md:h-11 md:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent md:h-4 md:w-4" />
                  {i18n.language === 'ar'
                    ? 'جاري تسجيل الدخول...'
                    : 'Signing in...'}
                </>
              ) : (
                <>
                  <LogIn className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  {i18n.language === 'ar'
                    ? 'تسجيل الدخول'
                    : 'Sign in'}
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <div className="px-4 pb-4 text-center md:px-6 md:pb-6">
          <p className="text-xs text-muted-foreground">
            © 2026{' '}
            {i18n.language === 'ar'
              ? 'جامعة الإمام عبدالرحمن بن فيصل'
              : 'Imam Abdulrahman Bin Faisal University'}
          </p>
        </div>
      </Card>
    </div>
  );
};
