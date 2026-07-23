import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiJson } from '../lib/http';
import { authStorage } from '../lib/authStorage';
import type { UserProfile, UserRole } from '../types/permissions';
import { getPermissionsByRole } from '../types/permissions';

type ApiUser = {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

type CurrentUser = {
  uid: string;
  email: string;
};

type UpdateUserInput = {
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

interface AuthContextType {
  currentUser: CurrentUser | null;
  userProfile: UserProfile | null;
  users: UserProfile[];
  isAuthenticated: boolean;
  loading: boolean;
  username: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createEmployee: (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ) => Promise<void>;
  updateEmployee: (uid: string, input: UpdateUserInput) => Promise<void>;
  deleteEmployee: (uid: string) => Promise<void>;
  resetEmployeePassword: (uid: string, password: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: ApiUser): UserProfile => ({
  uid: user.uid,
  email: user.email,
  username: user.username,
  role: user.role,
  isActive: user.isActive,
  permissions: getPermissionsByRole(user.role),
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
  lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = useMemo<CurrentUser | null>(() => {
    if (!userProfile) return null;

    return {
      uid: userProfile.uid,
      email: userProfile.email,
    };
  }, [userProfile]);

  const loadCurrentUser = async () => {
    const token = authStorage.getToken();

    if (!token) {
      setUserProfile(null);
      setUsers([]);
      return;
    }

    const response = await apiJson<{ user: ApiUser }>('/api/auth/me');
    setUserProfile(normalizeUser(response.user));
  };

  const refreshUsers = async (): Promise<void> => {
    if (userProfile?.role !== 'admin') {
      setUsers([]);
      return;
    }

    const response = await apiJson<ApiUser[]>('/api/users');
    setUsers(response.map(normalizeUser));
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadCurrentUser();
      } catch (error) {
        console.error('Unable to restore session:', error);
        authStorage.clear();
        setUserProfile(null);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const handleExpired = () => {
      setUserProfile(null);
      setUsers([]);
    };

    const refreshSession = () => {
      if (!authStorage.getToken()) return;

      loadCurrentUser().catch((error) => {
        console.error('Unable to refresh session:', error);
      });
    };

    const intervalId = window.setInterval(refreshSession, 60_000);

    window.addEventListener('iau-auth-expired', handleExpired);
    window.addEventListener('focus', refreshSession);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('iau-auth-expired', handleExpired);
      window.removeEventListener('focus', refreshSession);
    };
  }, []);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      refreshUsers().catch((error) => {
        console.error('Unable to load users:', error);
      });
    } else {
      setUsers([]);
    }
  }, [userProfile?.uid, userProfile?.role]);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await apiJson<{ token: string; user: ApiUser }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      }
    );

    authStorage.setToken(response.token);
    setUserProfile(normalizeUser(response.user));
  };

  const logout = async (): Promise<void> => {
    authStorage.clear();
    setUserProfile(null);
    setUsers([]);
  };

  const createEmployee = async (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ): Promise<void> => {
    await apiJson<ApiUser>('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        role,
      }),
    });

    await refreshUsers();
  };

  const updateEmployee = async (
    uid: string,
    input: UpdateUserInput
  ): Promise<void> => {
    const updated = await apiJson<ApiUser>(`/api/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...input,
        email: input.email.trim().toLowerCase(),
        username: input.username.trim(),
      }),
    });

    setUsers((current) =>
      current.map((user) =>
        user.uid === uid ? normalizeUser(updated) : user
      )
    );

    if (userProfile?.uid === uid) {
      setUserProfile(normalizeUser(updated));
    }
  };

  const deleteEmployee = async (uid: string): Promise<void> => {
    await apiJson<void>(`/api/users/${uid}`, {
      method: 'DELETE',
    });

    setUsers((current) => current.filter((user) => user.uid !== uid));
  };

  const resetEmployeePassword = async (
    uid: string,
    password: string
  ): Promise<void> => {
    await apiJson<void>(`/api/users/${uid}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    users,
    isAuthenticated: Boolean(userProfile),
    loading,
    username: userProfile?.username || null,
    login,
    logout,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    resetEmployeePassword,
    refreshUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
