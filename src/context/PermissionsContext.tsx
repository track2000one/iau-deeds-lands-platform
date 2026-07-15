import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { COLLECTIONS } from '../config/firestore-collections';
import { useAuth } from './AuthContext';
import type {
  UserPermissions,
  ModuleName,
  ModulePermissions,
  ADMIN_PERMISSIONS,
  EMPLOYEE_DEFAULT_PERMISSIONS,
  UserProfile
} from '../types/permissions';
import { ADMIN_PERMISSIONS as DEFAULT_ADMIN_PERMISSIONS, EMPLOYEE_DEFAULT_PERMISSIONS as DEFAULT_EMPLOYEE_PERMISSIONS } from '../types/permissions';

interface PermissionsContextType {
  permissions: UserPermissions | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasPermission: (module: ModuleName, action: keyof ModulePermissions) => boolean;
  isAdmin: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile: authUserProfile } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserPermissions = async () => {
    if (!currentUser) {
      setPermissions(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if Firebase is configured
      if (!isFirebaseConfigured() || !db) {
        // وضع التشغيل بدون Firebase: الاعتماد على ملف المستخدم القادم من AuthContext
        setUserProfile(authUserProfile);

        if (authUserProfile?.role === 'admin') {
          setPermissions(DEFAULT_ADMIN_PERMISSIONS);
        } else {
          setPermissions(authUserProfile?.permissions || DEFAULT_EMPLOYEE_PERMISSIONS);
        }

        setLoading(false);
        return;
      }

      // جلب بيانات المستخدم من Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setUserProfile(userData);

        // إذا كان المستخدم مسؤول، امنحه جميع الصلاحيات
        if (userData.role === 'admin') {
          setPermissions(DEFAULT_ADMIN_PERMISSIONS);
        } else {
          // إذا كان موظف، استخدم صلاحياته المحفوظة
          setPermissions(userData.permissions || DEFAULT_EMPLOYEE_PERMISSIONS);
        }
      } else {
        // إذا لم يكن هناك بيانات للمستخدم، استخدم الصلاحيات الافتراضية
        setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserPermissions();
  }, [currentUser, authUserProfile]);

  const hasPermission = (module: ModuleName, action: keyof ModulePermissions): boolean => {
    if (!permissions) return false;

    // المسؤول لديه جميع الصلاحيات
    if (userProfile?.role === 'admin') return true;

    return permissions[module]?.[action] || false;
  };

  const isAdmin = userProfile?.role === 'admin';

  const refreshPermissions = async () => {
    await loadUserPermissions();
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        userProfile,
        loading,
        hasPermission,
        isAdmin,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
