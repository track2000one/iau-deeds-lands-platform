import React from 'react';
import { Navigate } from 'react-router';
import { usePermissions } from '../../context/PermissionsContext';
import { ModuleName, ModulePermissions } from '../../types/permissions';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

interface PermissionGuardProps {
  children: React.ReactNode;
  module: ModuleName;
  action: keyof ModulePermissions;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  module,
  action,
  fallback,
}) => {
  const { hasPermission, loading, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // المسؤول لديه جميع الصلاحيات
  if (isAdmin) {
    return <>{children}</>;
  }

  // التحقق من الصلاحية
  if (!hasPermission(module, action)) {
    // إذا كان هناك fallback محدد
    if (fallback) {
      return <>{fallback}</>;
    }

    // عرض رسالة عدم وجود صلاحية
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 p-4 bg-destructive/10 rounded-full">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {i18n.language === 'ar' ? 'ليس لديك صلاحية' : 'No Permission'}
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {i18n.language === 'ar'
            ? 'عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة أو القيام بهذا الإجراء. يرجى التواصل مع المسؤول.'
            : 'Sorry, you do not have permission to access this page or perform this action. Please contact the administrator.'}
        </p>
        <Button onClick={() => navigate('/')} variant="default">
          {i18n.language === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Back to Home'}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};
