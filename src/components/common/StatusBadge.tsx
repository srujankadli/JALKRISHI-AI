import React from 'react';
import type { StationStatus } from '../../types';
import { getStatusLabel, getStatusTheme } from '../../utils/statusHelpers';
import { useLanguage } from '../../context/LanguageContext';

interface StatusBadgeProps {
  status: StationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const { t } = useLanguage();
  const theme = getStatusTheme(status);
  const label = getStatusLabel(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${theme.badge} ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={`Groundwater status: ${t(label)}`}
    >
      {showIcon && (
        <span
          className={`h-2 w-2 rounded-full ${theme.dot} ring-2`}
          aria-hidden="true"
        />
      )}
      <span>{t(label)}</span>
    </span>
  );
};
