import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import { COLLECTIONS } from '../config/firestore-collections';
import type { UserProfile, UserRole } from '../types/permissions';
import { ADMIN_PERMISSIONS, EMPLOYEE_DEFAULT_PERMISSIONS } from '../types/permissions';
import { demoAuth } from '../lib/demoAuth';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createEmployee: (email: string, password: string, username: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured() || !auth) {
      // Demo Mode - استخدام المصادقة التجريبية
      const demoUser = demoAuth.getCurrentUser();
      if (demoUser) {
        // محاكاة المستخدم
        setCurrentUser({ uid: demoUser.uid, email: demoUser.email } as User);
        setUserProfile({
          uid: demoUser.uid,
          email: demoUser.email,
          username: demoUser.username,
          role: demoUser.role,
          permissions: demoUser.role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_DEFAULT_PERMISSIONS,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user && db) {
        // Load user profile from Firestore
        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Demo Mode - استخدام المصادقة التجريبية
    if (!isFirebaseConfigured() || !auth || !db) {
      const demoUser = demoAuth.login(email, password);

      if (!demoUser) {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }

      // تعيين المستخدم
      setCurrentUser({ uid: demoUser.uid, email: demoUser.email } as User);
      setUserProfile({
        uid: demoUser.uid,
        email: demoUser.email,
        username: demoUser.username,
        role: demoUser.role,
        permissions: demoUser.role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_DEFAULT_PERMISSIONS,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return;
    }

    // Firebase Mode - استخدام Firebase
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Load user profile
      const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // رسائل خطأ واضحة بالعربية
      if (error.code === 'auth/api-key-not-valid') {
        throw new Error('Firebase غير مُعد بشكل صحيح. راجع ملف FIREBASE_SETUP.md');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        throw new Error(error.message || 'فشل تسجيل الدخول');
      }
    }
  };

  const logout = async (): Promise<void> => {
    // Demo Mode
    if (!isFirebaseConfigured() || !auth) {
      demoAuth.logout();
      setCurrentUser(null);
      setUserProfile(null);
      return;
    }

    // Firebase Mode
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
    if (!isFirebaseConfigured() || !auth || !db) {
      throw new Error(
        'Firebase غير مُعد. يرجى إعداد Firebase أولاً.\n\nراجع ملف FIREBASE_SETUP.md للتعليمات الكاملة.'
      );
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email,
        username,
        role,
        permissions: role === 'admin' ? ADMIN_PERMISSIONS : EMPLOYEE_DEFAULT_PERMISSIONS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Create employee error:', error);
      throw new Error(error.message || 'فشل إنشاء حساب الموظف');
    }
  };

  const value = {
    currentUser,
    userProfile,
    isAuthenticated: !!currentUser,
    loading,
    username: userProfile?.username || null,
    login,
    logout,
    createEmployee,
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
