// Demo Authentication System - للعمل بدون Firebase

export interface DemoUser {
  uid: string;
  email: string;
  username: string;
  role: 'admin' | 'employee';
}

// مستخدمون تجريبيون
const DEMO_USERS: DemoUser[] = [
  {
    uid: 'demo-admin-001',
    email: 'admin@university.edu',
    username: 'المسؤول',
    role: 'admin',
  },
  {
    uid: 'demo-employee-001',
    email: 'employee@university.edu',
    username: 'موظف تجريبي',
    role: 'employee',
  },
];

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@university.edu': 'admin123',
  'employee@university.edu': 'employee123',
};

const SESSION_KEY = 'demo_auth_session';

export const demoAuth = {
  // تسجيل الدخول
  login: (email: string, password: string): DemoUser | null => {
    const user = DEMO_USERS.find((u) => u.email === email);
    if (!user) return null;

    const correctPassword = DEMO_PASSWORDS[email];
    if (password !== correctPassword) return null;

    // حفظ الجلسة
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  // تسجيل الخروج
  logout: (): void => {
    localStorage.removeItem(SESSION_KEY);
  },

  // الحصول على المستخدم الحالي
  getCurrentUser: (): DemoUser | null => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;

    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  // التحقق من حالة المصادقة
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(SESSION_KEY);
  },
};
