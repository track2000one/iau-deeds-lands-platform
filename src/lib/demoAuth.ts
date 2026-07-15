// Demo Authentication System - للعمل بدون Firebase

export interface DemoUser {
  uid: string;
  email: string;
  username: string;
  role: 'admin' | 'employee';
  createdAt?: string;
  updatedAt?: string;
}

type DemoPasswordMap = Record<string, string>;

const DEFAULT_USERS: DemoUser[] = [
  {
    uid: 'demo-admin-001',
    email: 'admin@university.edu',
    username: 'المسؤول',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'demo-employee-001',
    email: 'employee@university.edu',
    username: 'موظف محدود',
    role: 'employee',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_PASSWORDS: DemoPasswordMap = {
  'admin@university.edu': 'admin123',
  'employee@university.edu': 'employee123',
};

const SESSION_KEY = 'demo_auth_session';
const USERS_KEY = 'demo_auth_users';
const PASSWORDS_KEY = 'demo_auth_passwords';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readUsers = (): DemoUser[] => {
  const stored = localStorage.getItem(USERS_KEY);

  if (!stored) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
};

const writeUsers = (users: DemoUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const readPasswords = (): DemoPasswordMap => {
  const stored = localStorage.getItem(PASSWORDS_KEY);

  if (!stored) {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(DEFAULT_PASSWORDS));
    return DEFAULT_PASSWORDS;
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : DEFAULT_PASSWORDS;
  } catch {
    return DEFAULT_PASSWORDS;
  }
};

const writePasswords = (passwords: DemoPasswordMap) => {
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
};

export const demoAuth = {
  login: (email: string, password: string): DemoUser | null => {
    const normalizedEmail = normalizeEmail(email);
    const users = readUsers();
    const passwords = readPasswords();

    const user = users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!user) return null;

    const correctPassword = passwords[normalizedEmail];
    if (password !== correctPassword) return null;

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  logout: (): void => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): DemoUser | null => {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;

    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(SESSION_KEY);
  },

  getUsers: (): DemoUser[] => {
    return readUsers();
  },

  createUser: (
    email: string,
    password: string,
    username: string,
    role: 'admin' | 'employee'
  ): DemoUser => {
    const normalizedEmail = normalizeEmail(email);
    const users = readUsers();
    const passwords = readPasswords();

    const exists = users.some((user) => normalizeEmail(user.email) === normalizedEmail);
    if (exists) {
      throw new Error('يوجد حساب مسجل بهذا البريد الإلكتروني مسبقًا');
    }

    const now = new Date().toISOString();
    const newUser: DemoUser = {
      uid: `demo-user-${Date.now()}`,
      email: normalizedEmail,
      username: username.trim(),
      role,
      createdAt: now,
      updatedAt: now,
    };

    writeUsers([...users, newUser]);
    writePasswords({
      ...passwords,
      [normalizedEmail]: password,
    });

    return newUser;
  },
};
