import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isOfficialUser } from '../../utils/roleUtils';
import { useLanguage } from '../../context/LanguageContext';

interface ProtectedOfficialRouteProps {
  children: React.ReactNode;
}

export const ProtectedOfficialRoute: React.FC<ProtectedOfficialRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white p-4">
        <div className="flex items-center gap-3 bg-stone-850 p-4 rounded-2xl border border-stone-750 shadow-xl">
          <div className="w-6 h-6 border-2 border-agri-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-stone-200">{t("Verifying Official Authorization...")}</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated user -> redirect to /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check role authorization using centralized roleUtils
  if (!isOfficialUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
