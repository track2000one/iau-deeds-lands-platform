import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import type {
  UserPermissions,
  ModuleName,
  ModulePermissions,
  UserProfile,
} from '../types/permissions';
import {
  ADMIN_PERMISSIONS,
  EMPLOYEE_DEFAULT_PERMISSIONS,
} from '../types/permissions';

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
    if (!currentUser || !authUserProfile) {
      setPermissions(null);
      setUserProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const normalizedPermissions =
      authUserProfile.role === 'admin'
        ? ADMIN_PERMISSIONS
        : authUserProfile.permissions || EMPLOYEE_DEFAULT_PERMISSIONS;

    setUserProfile({
      ...authUserProfile,
      permissions: normalizedPermissions,
    });

    setPermissions(normalizedPermissions);
    setLoading(false);
  };

  useEffect(() => {
    loadUserPermissions();
  }, [currentUser, authUserProfile]);

  const hasPermission = (module: ModuleName, action: keyof ModulePermissions): boolean => {
    if (!permissions) return false;

    if (userProfile?.role === 'admin') return true;

    return Boolean(permissions[module]?.[action]);
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
