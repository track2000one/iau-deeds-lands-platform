import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Eye, EyeOff, LogIn, Shield, Languages, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import logoImage from '../../imports/103144.png';
import { isFirebaseConfigured } from '../../config/firebase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const firebaseConfigured = isFirebaseConfigured();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success(i18n.language === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!');
      navigate('/');
    } catch (error: any) {
      toast.error(
        i18n.language === 'ar'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : 'Invalid email or password'
      );
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-3 md:p-4">
      {/* Language Toggle - Top Right */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute top-3 right-3 md:top-4 md:right-4 text-white hover:bg-white/10 h-8 md:h-9"
      >
        <Languages className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
        <span className="text-xs md:text-sm">{i18n.language === 'ar' ? 'EN' : 'ع'}</span>
      </Button>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-3 md:space-y-4 text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <img
                src={logoImage}
                alt="Logo"
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <CardTitle className="text-xl md:text-2xl font-bold text-primary">
              {t('app.title')}
            </CardTitle>
            <CardDescription className="text-sm md:text-base mt-1 md:mt-2">
              {t('app.subtitle')}
            </CardDescription>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span>{i18n.language === 'ar' ? 'منصة آمنة ومحمية' : 'Secure Platform'}</span>
          </div>
        </CardHeader>

        <CardContent className="pt-4 md:pt-6">
          {/* Demo Mode Notice */}
          {!firebaseConfigured && (
            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 border-2 border-blue-400 rounded-lg">
              <div className="flex items-start gap-2 md:gap-3">
                <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm md:text-base font-bold text-blue-900 mb-2">
                    {i18n.language === 'ar' ? '🚀 الوضع التجريبي' : '🚀 Demo Mode'}
                  </p>
                  <p className="text-xs md:text-sm text-blue-800 mb-2">
                    {i18n.language === 'ar'
                      ? 'يمكنك تجربة المنصة الآن! استخدم أحد الحسابات التجريبية أدناه.'
                      : 'You can try the platform now! Use one of the demo accounts below.'}
                  </p>
                  <p className="text-xs md:text-sm text-blue-800">
                    {i18n.language === 'ar'
                      ? 'لاستخدام قاعدة بيانات حقيقية، راجع ملف FIREBASE_SETUP.md'
                      : 'For a real database, see FIREBASE_SETUP.md'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <User className="h-3 w-3 md:h-4 md:w-4" />
                {i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={i18n.language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                required
                disabled={isLoading}
                className="h-10 md:h-11 text-sm md:text-base"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                <Lock className="h-3 w-3 md:h-4 md:w-4" />
                {i18n.language === 'ar' ? 'كلمة المرور' : 'Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={i18n.language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                  required
                  disabled={isLoading}
                  className="h-10 md:h-11 pr-10 text-sm md:text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 md:h-9 md:w-9"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3 md:h-4 md:w-4" />
                  ) : (
                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-10 md:h-11 text-sm md:text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 md:h-4 md:w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {i18n.language === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging in...'}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  {i18n.language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </>
              )}
            </Button>

            {/* Demo Accounts or Note */}
            {!firebaseConfigured ? (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs md:text-sm font-medium text-green-900 mb-3 flex items-center gap-1.5 md:gap-2">
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  {i18n.language === 'ar' ? 'حسابات تجريبية:' : 'Demo Accounts:'}
                </p>
                <div className="space-y-3 text-xs md:text-sm text-green-800">
                  {/* Admin Account */}
                  <div className="bg-green-100 rounded p-2">
                    <p className="font-bold mb-1">
                      {i18n.language === 'ar' ? '👤 المسؤول (جميع الصلاحيات)' : '👤 Admin (Full Access)'}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{' '}
                      <code className="bg-white px-2 py-0.5 rounded">admin@university.edu</code>
                    </p>
                    <p>
                      <span className="font-medium">{i18n.language === 'ar' ? 'كلمة المرور:' : 'Password:'}</span>{' '}
                      <code className="bg-white px-2 py-0.5 rounded">admin123</code>
                    </p>
                  </div>

                  {/* Employee Account */}
                  <div className="bg-green-100 rounded p-2">
                    <p className="font-bold mb-1">
                      {i18n.language === 'ar' ? '👤 موظف (صلاحيات محدودة)' : '👤 Employee (Limited Access)'}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{' '}
                      <code className="bg-white px-2 py-0.5 rounded">employee@university.edu</code>
                    </p>
                    <p>
                      <span className="font-medium">{i18n.language === 'ar' ? 'كلمة المرور:' : 'Password:'}</span>{' '}
                      <code className="bg-white px-2 py-0.5 rounded">employee123</code>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs md:text-sm font-medium text-blue-900 mb-2 flex items-center gap-1.5 md:gap-2">
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  {i18n.language === 'ar' ? 'ملاحظة:' : 'Note:'}
                </p>
                <div className="space-y-1 text-xs md:text-sm text-blue-800">
                  <p>
                    {i18n.language === 'ar'
                      ? 'يجب إنشاء حساب من قبل المسؤول أولاً للدخول إلى المنصة.'
                      : 'An account must be created by the administrator first to access the platform.'}
                  </p>
                </div>
              </div>
            )}
          </form>
        </CardContent>

        {/* Footer */}
        <div className="px-4 md:px-6 pb-4 md:pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 {i18n.language === 'ar' ? 'جامعة الإمام عبدالرحمن بن فيصل' : 'IAU University'}
          </p>
        </div>
      </Card>
    </div>
  );
};
