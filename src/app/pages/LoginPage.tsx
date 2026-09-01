import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { mosqueApi } from '../api/mosques';
import { PLATFORM_LOGO_URL } from '../config/branding';
import {
  Eye,
  EyeOff,
  Languages,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isArabic = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      toast.success(isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful');

      // منسوبو المساجد (إمام/مؤذن/خطيب/خطيب متعاون) يذهبون مباشرة
      // إلى واجهة الخدمة الذاتية الخاصة بوحدة المساجد بدل الصفحة الرئيسية العامة.
      try {
        const mosqueMe = await mosqueApi.me();
        if (mosqueMe.role === 'personnel') {
          navigate('/mosques', { replace: true });
          return;
        }
      } catch {
        // إذا لم يكن الحساب مرتبطًا بالوحدة نستمر بالتوجيه العام المعتاد.
      }

      navigate('/', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : isArabic
            ? 'اسم المستخدم أو كلمة المرور غير صحيحة.'
            : 'The username or password is incorrect.';

      toast.error(message);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page neo-login-page" dir={isArabic ? 'rtl' : 'ltr'}>
      <style>{`
        .neo-login-page {
          --neo-bg: #e8edf2;
          --neo-text: #27313d;
          --neo-muted: #75808c;
          --neo-accent: #184b77;
          --neo-accent-2: #9f2842;
          --neo-dark-shadow: rgba(148, 163, 184, 0.52);
          --neo-light-shadow: rgba(255, 255, 255, 0.96);
          position: relative;
          isolation: isolate;
          display: flex;
          min-height: 100dvh;
          width: 100%;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 30px;
          background:
            radial-gradient(circle at 50% 42%, rgba(255,255,255,.96) 0 12%, rgba(255,255,255,.38) 34%, transparent 58%),
            linear-gradient(145deg, #edf2f6 0%, var(--neo-bg) 56%, #e3e9ef 100%);
          color: var(--neo-text);
        }

        .neo-login-page::before,
        .neo-login-page::after {
          content: '';
          position: absolute;
          z-index: -1;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(1px);
        }

        .neo-login-page::before {
          width: min(48vw, 620px);
          height: min(48vw, 620px);
          inset-inline-start: -18vw;
          top: -28vw;
          background: rgba(255,255,255,.34);
          box-shadow: 30px 30px 70px rgba(148,163,184,.18);
        }

        .neo-login-page::after {
          width: min(42vw, 540px);
          height: min(42vw, 540px);
          inset-inline-end: -17vw;
          bottom: -27vw;
          background: rgba(214,223,232,.46);
          box-shadow: -25px -25px 60px rgba(255,255,255,.72);
        }

        .neo-language {
          position: absolute;
          top: max(20px, env(safe-area-inset-top));
          inset-inline-end: 24px;
          z-index: 5;
          display: inline-flex;
          height: 46px;
          min-width: 46px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 0;
          border-radius: 999px;
          padding: 0 14px;
          background: var(--neo-bg);
          color: #4c5864;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            -7px -7px 15px var(--neo-light-shadow),
            7px 7px 16px rgba(148,163,184,.42);
          transition: transform .22s ease, box-shadow .22s ease, color .22s ease;
        }

        .neo-language:hover {
          color: var(--neo-accent);
          transform: translateY(-2px);
        }

        .neo-language:active {
          transform: translateY(0);
          box-shadow:
            inset 4px 4px 9px rgba(148,163,184,.30),
            inset -4px -4px 9px rgba(255,255,255,.88);
        }

        .neo-orb-wrap {
          position: relative;
          width: min(86vw, 650px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          perspective: 1400px;
        }

        .neo-orb-shadow {
          position: absolute;
          width: 76%;
          height: 13%;
          bottom: -4%;
          left: 12%;
          border-radius: 50%;
          background: rgba(110, 126, 145, .20);
          filter: blur(24px);
          transform: rotateX(68deg);
        }

        .neo-orb {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.72);
          border-radius: 50%;
          background: linear-gradient(145deg, #eef3f7 0%, #e6ebf0 62%, #e2e8ee 100%);
          box-shadow:
            -28px -28px 55px rgba(255,255,255,.94),
            28px 28px 58px rgba(148,163,184,.46),
            inset -3px -3px 5px rgba(148,163,184,.16),
            inset 3px 3px 5px rgba(255,255,255,.72);
          transform-style: preserve-3d;
          animation: neo-orb-enter .82s cubic-bezier(.2,.72,.2,1) both;
          transition: transform .5s cubic-bezier(.2,.7,.2,1), box-shadow .5s ease;
        }

        .neo-orb:hover {
          transform: perspective(1400px) rotateX(1.1deg) rotateY(-1.25deg) translateY(-3px);
          box-shadow:
            -31px -31px 60px rgba(255,255,255,.98),
            31px 31px 62px rgba(148,163,184,.49),
            inset -3px -3px 5px rgba(148,163,184,.15),
            inset 3px 3px 5px rgba(255,255,255,.76);
        }

        .neo-orb::before {
          content: '';
          position: absolute;
          inset: 4.6%;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.68);
          box-shadow:
            inset 9px 9px 21px rgba(148,163,184,.21),
            inset -9px -9px 22px rgba(255,255,255,.88),
            0 0 0 1px rgba(186,197,208,.18);
          pointer-events: none;
        }

        .neo-orb::after {
          content: '';
          position: absolute;
          width: 76%;
          height: 37%;
          top: 4.5%;
          left: 12%;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(255,255,255,.52) 0%, rgba(255,255,255,.12) 52%, transparent 72%);
          transform: rotate(-7deg);
          pointer-events: none;
        }

        .neo-login-panel {
          position: relative;
          z-index: 2;
          width: 69%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          transform: translateZ(35px);
        }

        .neo-brand {
          text-align: center;
          margin-bottom: 18px;
        }

        .neo-logo-shell {
          width: 72px;
          height: 72px;
          margin: 0 auto 11px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--neo-bg);
          box-shadow:
            -7px -7px 14px rgba(255,255,255,.92),
            7px 7px 15px rgba(148,163,184,.37),
            inset 1px 1px 1px rgba(255,255,255,.8);
        }

        .neo-logo-shell img {
          width: 55px;
          height: 55px;
          object-fit: contain;
          filter: drop-shadow(0 5px 7px rgba(77,90,105,.13));
        }

        .neo-title {
          margin: 0;
          color: #27313d;
          font-size: clamp(20px, 2.05vw, 30px);
          font-weight: 900;
          line-height: 1.25;
          letter-spacing: -.02em;
          text-shadow: 1px 1px 1px rgba(255,255,255,.78);
        }

        .neo-subtitle {
          margin: 6px 0 0;
          color: var(--neo-muted);
          font-size: 12px;
          font-weight: 650;
        }

        .neo-secure-line {
          display: inline-flex;
          align-self: center;
          align-items: center;
          gap: 5px;
          margin-top: 8px;
          color: #6e7985;
          font-size: 10px;
          font-weight: 700;
        }

        .neo-form {
          display: grid;
          gap: 13px;
        }

        .neo-field-group {
          display: grid;
          gap: 6px;
        }

        .neo-field-label {
          padding-inline: 12px;
          color: #6f7b87;
          font-size: 10.5px;
          font-weight: 800;
        }

        /* Login credentials are inherently required; keep the form clean without the global "مطلوب" badge. */
        .neo-login-page .neo-field-label[data-app-required-label="true"] {
          display: block;
        }

        .neo-login-page .neo-field-label[data-app-required-label="true"]::after {
          content: none !important;
          display: none !important;
        }

        .neo-input-shell {
          position: relative;
          height: 48px;
          border-radius: 15px;
          background: #e8edf2;
          box-shadow:
            inset 6px 6px 12px rgba(148,163,184,.34),
            inset -6px -6px 12px rgba(255,255,255,.92),
            0 1px 1px rgba(255,255,255,.78);
          transition: box-shadow .22s ease, transform .22s ease;
        }

        .neo-input-shell:focus-within {
          transform: translateY(-1px);
          box-shadow:
            inset 5px 5px 11px rgba(137,153,173,.35),
            inset -5px -5px 11px rgba(255,255,255,.96),
            0 0 0 2px rgba(24,75,119,.13);
        }

        .neo-input-icon {
          position: absolute;
          top: 50%;
          inset-inline-start: 15px;
          width: 16px;
          height: 16px;
          color: #78838e;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .neo-input {
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          border-radius: inherit;
          padding-inline-start: 44px;
          padding-inline-end: 43px;
          background: transparent;
          color: #303a45;
          font-size: 13px;
          font-weight: 650;
          text-align: start;
        }

        .neo-input::placeholder {
          color: #9aa4ae;
          font-weight: 550;
        }

        .neo-password-toggle {
          position: absolute;
          top: 50%;
          inset-inline-end: 7px;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #7d8791;
          cursor: pointer;
          transform: translateY(-50%);
          transition: background .2s ease, color .2s ease;
        }

        .neo-password-toggle:hover {
          background: rgba(255,255,255,.38);
          color: var(--neo-accent);
        }

        .neo-form-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-height: 18px;
          padding-inline: 5px;
        }

        .neo-forgot {
          color: var(--neo-accent);
          font-size: 10.5px;
          font-weight: 800;
          text-decoration: none;
          transition: color .2s ease, transform .2s ease;
        }

        .neo-forgot:hover {
          color: var(--neo-accent-2);
          text-decoration: underline;
        }

        .neo-submit {
          position: relative;
          height: 49px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          overflow: hidden;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(145deg, #eef3f7 0%, #e2e8ee 100%);
          color: #3d4854;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .04em;
          cursor: pointer;
          box-shadow:
            -7px -7px 14px rgba(255,255,255,.94),
            7px 7px 15px rgba(148,163,184,.40),
            inset 0 0 0 1px rgba(255,255,255,.52);
          transition: transform .18s ease, color .18s ease, box-shadow .18s ease;
        }

        .neo-submit::before {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,.66) 48%, transparent 73%);
          transform: translateX(-120%);
          transition: transform .55s ease;
          pointer-events: none;
        }

        .neo-submit:hover:not(:disabled) {
          color: var(--neo-accent);
          transform: translateY(-2px);
        }

        .neo-submit:hover:not(:disabled)::before {
          transform: translateX(120%);
        }

        .neo-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow:
            inset 5px 5px 11px rgba(148,163,184,.31),
            inset -5px -5px 11px rgba(255,255,255,.90);
        }

        .neo-submit:disabled {
          cursor: wait;
          opacity: .72;
        }

        .neo-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(24,75,119,.22);
          border-top-color: var(--neo-accent);
          border-radius: 50%;
          animation: neo-spin .7s linear infinite;
        }

        .neo-footer {
          margin-top: 14px;
          text-align: center;
          color: #8a949e;
          font-size: 9px;
          font-weight: 650;
        }

        .neo-footer strong {
          color: #66727e;
          font-weight: 800;
        }

        @keyframes neo-orb-enter {
          from {
            opacity: 0;
            transform: perspective(1400px) rotateY(-17deg) rotateX(3deg) scale(.93);
          }
          to {
            opacity: 1;
            transform: perspective(1400px) rotateY(0) rotateX(0) scale(1);
          }
        }

        @keyframes neo-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 700px) {
          .neo-login-page {
            padding: max(70px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom));
            overflow-y: auto;
          }

          .neo-language {
            top: max(14px, env(safe-area-inset-top));
            inset-inline-end: 14px;
            height: 40px;
            min-width: 40px;
            padding: 0 11px;
            font-size: 12px;
          }

          .neo-orb-wrap {
            width: min(96vw, 520px);
          }

          .neo-login-panel {
            width: 72%;
          }

          .neo-brand {
            margin-bottom: 11px;
          }

          .neo-logo-shell {
            width: 54px;
            height: 54px;
            margin-bottom: 7px;
          }

          .neo-logo-shell img {
            width: 41px;
            height: 41px;
          }

          .neo-title {
            font-size: clamp(17px, 5vw, 22px);
          }

          .neo-subtitle {
            margin-top: 3px;
            font-size: 9.5px;
          }

          .neo-secure-line {
            margin-top: 5px;
            font-size: 8.5px;
          }

          .neo-form {
            gap: 8px;
          }

          .neo-field-group {
            gap: 4px;
          }

          .neo-field-label {
            font-size: 9px;
          }

          .neo-input-shell {
            height: 41px;
            border-radius: 13px;
          }

          .neo-input {
            padding-inline-start: 39px;
            padding-inline-end: 39px;
            font-size: 11px;
          }

          .neo-input-icon {
            inset-inline-start: 13px;
            width: 14px;
            height: 14px;
          }

          .neo-password-toggle {
            width: 31px;
            height: 31px;
          }

          .neo-form-row {
            min-height: 13px;
          }

          .neo-forgot {
            font-size: 9px;
          }

          .neo-submit {
            height: 42px;
            border-radius: 13px;
            font-size: 10px;
          }

          .neo-footer {
            margin-top: 8px;
            font-size: 7.5px;
          }
        }

        @media (max-width: 420px) {
          .neo-login-page {
            align-items: flex-start;
            justify-content: center;
            padding-top: max(66px, env(safe-area-inset-top));
          }

          .neo-orb-wrap {
            width: 96vw;
          }

          .neo-login-panel {
            width: 75%;
          }

          .neo-orb {
            box-shadow:
              -15px -15px 32px rgba(255,255,255,.94),
              15px 15px 34px rgba(148,163,184,.44),
              inset -2px -2px 4px rgba(148,163,184,.14),
              inset 2px 2px 4px rgba(255,255,255,.72);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .neo-orb,
          .neo-submit,
          .neo-language {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <button
        type="button"
        className="neo-language"
        onClick={toggleLanguage}
        aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Languages size={16} aria-hidden="true" />
        <span>{isArabic ? 'EN' : 'ع'}</span>
      </button>

      <div className="neo-orb-wrap">
        <div className="neo-orb-shadow" aria-hidden="true" />

        <section className="neo-orb" aria-label={isArabic ? 'تسجيل الدخول إلى المنصة' : 'Platform sign in'}>
          <div className="neo-login-panel">
            <header className="neo-brand">
              <div className="neo-logo-shell">
                <img
                  src={PLATFORM_LOGO_URL}
                  alt={isArabic ? 'شعار المنصة' : 'Platform logo'}
                />
              </div>

              <h1 className="neo-title">
                {t('app.title') || (isArabic ? 'منصة إدارة الصكوك والأراضي' : 'Deeds & Lands Platform')}
              </h1>
              <p className="neo-subtitle">
                {t('app.subtitle') || (isArabic ? 'جامعة الإمام عبدالرحمن بن فيصل' : 'Imam Abdulrahman Bin Faisal University')}
              </p>

              <div className="neo-secure-line">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>
                  {isArabic
                    ? 'دخول آمن للمستخدمين المخولين'
                    : 'Secure access for authorized users'}
                </span>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="neo-form">
              <div className="neo-field-group">
                <label className="neo-field-label" htmlFor="email">
                  {isArabic ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <div className="neo-input-shell">
                  <User className="neo-input-icon" aria-hidden="true" />
                  <input
                    id="email"
                    className="neo-input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={isArabic ? 'أدخل البريد الإلكتروني' : 'Enter email'}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="neo-field-group">
                <label className="neo-field-label" htmlFor="password">
                  {isArabic ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="neo-input-shell">
                  <Lock className="neo-input-icon" aria-hidden="true" />
                  <input
                    id="password"
                    className="neo-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter password'}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="neo-password-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={isLoading}
                    aria-label={
                      showPassword
                        ? isArabic ? 'إخفاء كلمة المرور' : 'Hide password'
                        : isArabic ? 'إظهار كلمة المرور' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="neo-form-row">
                <Link to="/forgot-password" className="neo-forgot">
                  {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>

              <button type="submit" className="neo-submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="neo-spinner" aria-hidden="true" />
                    <span>{isArabic ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <>
                    <LogIn size={17} aria-hidden="true" />
                    <span>{isArabic ? 'تسجيل الدخول' : 'SIGN IN'}</span>
                  </>
                )}
              </button>
            </form>

            <footer className="neo-footer">
              <strong>
                {isArabic
                  ? 'جامعة الإمام عبدالرحمن بن فيصل'
                  : 'Imam Abdulrahman Bin Faisal University'}
              </strong>
              <span> · © 2026</span>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
};
