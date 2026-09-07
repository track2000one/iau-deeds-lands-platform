import fs from 'node:fs';

const path = 'src/app/pages/LoginPage.tsx';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Could not find anchor: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
  "import { toast } from 'sonner';\n\nexport const LoginPage: React.FC = () => {",
  `import { toast } from 'sonner';\n\nconst REMEMBER_LOGIN_ENABLED_KEY = 'iau.login.rememberCredentials';\nconst REMEMBER_LOGIN_EMAIL_KEY = 'iau.login.rememberedEmail';\n\nconst readRememberLoginEnabled = () => {\n  if (typeof window === 'undefined') return false;\n  try {\n    return window.localStorage.getItem(REMEMBER_LOGIN_ENABLED_KEY) === '1';\n  } catch {\n    return false;\n  }\n};\n\nconst readRememberedEmail = () => {\n  if (typeof window === 'undefined') return '';\n  try {\n    return window.localStorage.getItem(REMEMBER_LOGIN_EMAIL_KEY) || '';\n  } catch {\n    return '';\n  }\n};\n\nexport const LoginPage: React.FC = () => {`,
  'remember-login constants',
);

replaceOnce(
  `  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');\n  const [showPassword, setShowPassword] = useState(false);\n  const [isLoading, setIsLoading] = useState(false);`,
  `  const [email, setEmail] = useState(readRememberedEmail);\n  const [password, setPassword] = useState('');\n  const [rememberCredentials, setRememberCredentials] = useState(readRememberLoginEnabled);\n  const [showPassword, setShowPassword] = useState(false);\n  const [isLoading, setIsLoading] = useState(false);`,
  'login state',
);

replaceOnce(
  `  const handleSubmit = async (event: React.FormEvent) => {\n    event.preventDefault();\n    setIsLoading(true);\n\n    try {\n      await login(email.trim(), password);\n      toast.success(isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful');`,
  `  const handleRememberCredentialsChange = (checked: boolean) => {\n    setRememberCredentials(checked);\n\n    if (!checked) {\n      try {\n        window.localStorage.removeItem(REMEMBER_LOGIN_ENABLED_KEY);\n        window.localStorage.removeItem(REMEMBER_LOGIN_EMAIL_KEY);\n      } catch {\n        // قد تكون مساحة التخزين محجوبة بسياسة المتصفح؛ لا نمنع تسجيل الدخول بسبب ذلك.\n      }\n    }\n  };\n\n  const saveCredentialsAfterSuccessfulLogin = async (normalizedEmail: string) => {\n    if (!rememberCredentials) return;\n\n    try {\n      window.localStorage.setItem(REMEMBER_LOGIN_ENABLED_KEY, '1');\n      window.localStorage.setItem(REMEMBER_LOGIN_EMAIL_KEY, normalizedEmail);\n    } catch {\n      // البريد فقط وسيلة راحة محلية، ولا يؤثر تعذر حفظه على المصادقة.\n    }\n\n    // كلمة المرور لا تُحفظ في localStorage مطلقًا. عند دعم المتصفح لواجهة\n    // Credential Management API نمررها إلى مدير كلمات المرور الآمن الخاص بالمتصفح.\n    try {\n      const credentialWindow = window as typeof window & {\n        PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential;\n      };\n      const PasswordCredentialConstructor = credentialWindow.PasswordCredential;\n\n      if (PasswordCredentialConstructor && navigator.credentials?.store) {\n        const credential = new PasswordCredentialConstructor({\n          id: normalizedEmail,\n          password,\n          name: normalizedEmail,\n        });\n        await navigator.credentials.store(credential);\n      }\n    } catch {\n      // بعض المتصفحات تدير الحفظ تلقائيًا عبر autocomplete أو قد تمنع التخزين البرمجي.\n    }\n  };\n\n  const handleSubmit = async (event: React.FormEvent) => {\n    event.preventDefault();\n    setIsLoading(true);\n\n    try {\n      const normalizedEmail = email.trim();\n      await login(normalizedEmail, password);\n\n      if (rememberCredentials) {\n        await saveCredentialsAfterSuccessfulLogin(normalizedEmail);\n      } else {\n        try {\n          window.localStorage.removeItem(REMEMBER_LOGIN_ENABLED_KEY);\n          window.localStorage.removeItem(REMEMBER_LOGIN_EMAIL_KEY);\n        } catch {\n          // لا نمنع تسجيل الدخول إذا تعذر الوصول لمساحة التخزين المحلية.\n        }\n      }\n\n      toast.success(isArabic ? 'تم تسجيل الدخول بنجاح' : 'Login successful');`,
  'submit handler',
);

replaceOnce(
  `        .neo-form-row {\n          display: flex;\n          align-items: center;\n          justify-content: flex-end;\n          min-height: 18px;\n          padding-inline: 5px;\n        }\n\n        .neo-forgot {`,
  `        .neo-form-row {\n          display: flex;\n          align-items: center;\n          justify-content: space-between;\n          gap: 12px;\n          min-height: 20px;\n          padding-inline: 5px;\n        }\n\n        .neo-remember {\n          display: inline-flex;\n          align-items: center;\n          gap: 7px;\n          color: #5f6b77;\n          font-size: 10.5px;\n          font-weight: 800;\n          cursor: pointer;\n          user-select: none;\n        }\n\n        .neo-remember input {\n          width: 15px;\n          height: 15px;\n          flex: 0 0 auto;\n          margin: 0;\n          accent-color: var(--neo-accent);\n          cursor: pointer;\n        }\n\n        .neo-remember input:focus-visible {\n          outline: 2px solid rgba(24,75,119,.28);\n          outline-offset: 2px;\n        }\n\n        .neo-remember span {\n          white-space: nowrap;\n        }\n\n        .neo-forgot {`,
  'remember checkbox styles',
);

replaceOnce(
  `          .neo-form-row {\n            min-height: 13px;\n          }\n\n          .neo-forgot {`,
  `          .neo-form-row {\n            gap: 8px;\n            min-height: 16px;\n          }\n\n          .neo-remember {\n            gap: 5px;\n            font-size: 8.5px;\n          }\n\n          .neo-remember input {\n            width: 13px;\n            height: 13px;\n          }\n\n          .neo-forgot {`,
  'mobile remember styles',
);

replaceOnce(
  `<form onSubmit={handleSubmit} className=\"neo-form\">`,
  `<form onSubmit={handleSubmit} className=\"neo-form\" autoComplete=\"on\">`,
  'form autocomplete',
);

replaceOnce(
  `                    id=\"email\"\n                    className=\"neo-input\"\n                    type=\"email\"`,
  `                    id=\"email\"\n                    name=\"username\"\n                    className=\"neo-input\"\n                    type=\"email\"`,
  'email name',
);

replaceOnce(
  `                    autoComplete=\"email\"`,
  `                    autoComplete=\"username\"`,
  'username autocomplete',
);

replaceOnce(
  `                    id=\"password\"\n                    className=\"neo-input\"\n                    type={showPassword ? 'text' : 'password'}`,
  `                    id=\"password\"\n                    name=\"password\"\n                    className=\"neo-input\"\n                    type={showPassword ? 'text' : 'password'}`,
  'password name',
);

replaceOnce(
  `              <div className=\"neo-form-row\">\n                <Link to=\"/forgot-password\" className=\"neo-forgot\">\n                  {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}\n                </Link>\n              </div>`,
  `              <div className=\"neo-form-row\">\n                <label\n                  className=\"neo-remember\"\n                  title={isArabic\n                    ? 'يُحفظ اسم المستخدم محليًا، وتُحفظ كلمة المرور بواسطة مدير كلمات المرور في المتصفح عند دعمه.'\n                    : 'The username is remembered locally; the password is stored by the browser password manager when supported.'}\n                >\n                  <input\n                    type=\"checkbox\"\n                    checked={rememberCredentials}\n                    onChange={(event) => handleRememberCredentialsChange(event.target.checked)}\n                    disabled={isLoading}\n                    aria-label={isArabic ? 'حفظ اسم المستخدم وكلمة المرور' : 'Save username and password'}\n                  />\n                  <span>{isArabic ? 'حفظ اسم المستخدم وكلمة المرور' : 'Save username & password'}</span>\n                </label>\n\n                <Link to=\"/forgot-password\" className=\"neo-forgot\">\n                  {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}\n                </Link>\n              </div>`,
  'remember checkbox UI',
);

fs.writeFileSync(path, source);
console.log('Added secure remember-login option to LoginPage.');
