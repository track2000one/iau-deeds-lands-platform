import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { COLLECTIONS } from '../config/firestore-collections';
import type { UserProfile, UserRole } from '../types/permissions';
import {
  ADMIN_PERMISSIONS,
  EMPLOYEE_DEFAULT_PERMISSIONS,
  getPermissionsByRole,
} from '../types/permissions';
import { demoAuth } from '../lib/demoAuth';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  users: UserProfile[];
  isAuthenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createEmployee: (email: string, password: string, username: string, role: UserRole) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const makeDemoProfile = (demoUser: {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}): UserProfile => {
  return {
    uid: demoUser.uid,
    email: demoUser.email,
    username: demoUser.username,
    role: demoUser.role,
    permissions: demoUser.role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_DEFAULT_PERMISSIONS,
    createdAt: demoUser.createdAt ? new Date(demoUser.createdAt) : new Date(),
    updatedAt: demoUser.updatedAt ? new Date(demoUser.updatedAt) : new Date(),
  };
};

const normalizeFirestoreProfile = (data: any): UserProfile => {
  const role: UserRole = data.role === 'admin' ? 'admin' : 'employee';

  return {
    uid: data.uid,
    email: data.email,
    username: data.username,
    role,
    permissions: data.permissions || getPermissionsByRole(role),
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = async (): Promise<void> => {
    if (!isFirebaseConfigured() || !db) {
      setUsers(demoAuth.getUsers().map(makeDemoProfile));
      return;
    }

    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    const profiles = snapshot.docs.map((userDoc) => normalizeFirestoreProfile(userDoc.data()));
    setUsers(profiles);
  };

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      const demoUser = demoAuth.getCurrentUser();

      if (demoUser) {
        setCurrentUser({ uid: demoUser.uid, email: demoUser.email } as User);
        setUserProfile(makeDemoProfile(demoUser));
      }

      refreshUsers().finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user && db) {
        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUserProfile(normalizeFirestoreProfile(userDoc.data()));
          } else {
            setUserProfile(null);
          }

          await refreshUsers();
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setUsers([]);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured() || !auth || !db) {
      const demoUser = demoAuth.login(email, password);

      if (!demoUser) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }

      setCurrentUser({ uid: demoUser.uid, email: demoUser.email } as User);
      setUserProfile(makeDemoProfile(demoUser));
      await refreshUsers();
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserProfile(normalizeFirestoreProfile(userDoc.data()));
      }

      await refreshUsers();
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.code === 'auth/api-key-not-valid') {
        throw new Error('Firebase غير مُعد بشكل صحيح. راجع ملف FIREBASE_SETUP.md');
      }

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }

      throw new Error(error.message || 'فشل تسجيل الدخول');
    }
  };

  const logout = async (): Promise<void> => {
    if (!isFirebaseConfigured() || !auth) {
      demoAuth.logout();
      setCurrentUser(null);
      setUserProfile(null);
      return;
    }

    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'فشل تسجيل الخروج');
    }
  };

  const createEmployee = async (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ): Promise<void> => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      throw new Error('يرجى تعبئة جميع بيانات المستخدم');
    }

    if (!isFirebaseConfigured() || !auth || !db) {
      demoAuth.createUser(email, password, username, role);
      await refreshUsers();
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userProfile: UserProfile = {
        uid: user.uid,
        email,
        username,
        role,
        permissions: getPermissionsByRole(role),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await refreshUsers();
    } catch (error: any) {
      console.error('Create employee error:', error);

      if (error.code === 'auth/email-already-in-use') {
        throw new Error('يوجد حساب مسجل بهذا البريد الإلكتروني مسبقًا');
      }

      throw new Error(error.message || 'فشل إنشاء حساب المستخدم');
    }
  };

  const value = {
    currentUser,
    userProfile,
    users,
    isAuthenticated: !!currentUser,
    loading,
    username: userProfile?.username || null,
    login,
    logout,
    createEmployee,
    refreshUsers,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
