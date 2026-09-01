import React from 'react';
import type { StationStatus } from '../../types';
import { getStatusTheme } from '../../utils/statusHelpers';

interface StatusIndicatorProps {
  status: StationStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  showPulse = false,
}) => {
  const theme = getStatusTheme(status);

  const dotSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative flex">
        {showPulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${theme.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full ${dotSizes[size]} ${theme.dot}`} />
      </span>
      {label && <span className="text-sm font-medium text-stone-700">{label}</span>}
    </div>
  );
};
