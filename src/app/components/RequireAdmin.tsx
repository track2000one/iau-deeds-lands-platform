import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { usePermissions } from '../../context/PermissionsContext';

export const RequireAdmin: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { isAdmin, loading } = usePermissions();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
          permissionDenied: true,
        }}
      />
    );
  }

  return <>{children}</>;
};
