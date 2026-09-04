import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedOfficialRouteProps {
  children: React.ReactNode;
}

const OFFICIAL_ROLES = [
  'ADMIN',
  'STATE_OFFICIAL',
  'DISTRICT_OFFICIAL',
  'HYDROLOGIST_ANALYST',
  'READ_ONLY_OFFICIAL',
  'admin',
  'state_official',
  'district_official',
  'hydrologist_analyst',
  'read_only_official',
];

export const ProtectedOfficialRoute: React.FC<ProtectedOfficialRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white p-4">
        <div className="flex items-center gap-3 bg-stone-850 p-4 rounded-2xl border border-stone-750 shadow-xl">
          <div className="w-6 h-6 border-2 border-agri-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-stone-200">Verifying Official Authorization...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated user -> redirect to /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check role authorization
  const sysRole = (user.system_role || '').toUpperCase();
  const roleTitle = (user.role || '').toUpperCase();
  const userEmail = (user.email || '').toLowerCase();

  const isFarmer =
    sysRole === 'FARMER' ||
    userEmail === 'farmer@jalkrishi.in' ||
    (roleTitle.includes('FARMER') && !roleTitle.includes('OFFICIAL') && !roleTitle.includes('HYDROLOGIST'));

  const isOfficial =
    !isFarmer &&
    (OFFICIAL_ROLES.includes(sysRole) ||
      userEmail.includes('@jalkrishi.gov.in') ||
      roleTitle.includes('HYDROLOGIST') ||
      roleTitle.includes('OFFICER') ||
      roleTitle.includes('SCIENTIST') ||
      roleTitle.includes('OBSERVER') ||
      roleTitle.includes('ADMIN'));

  // 3. Forbidden for FARMER or non-officials -> redirect to Farmer Dashboard
  if (isFarmer || !isOfficial) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
