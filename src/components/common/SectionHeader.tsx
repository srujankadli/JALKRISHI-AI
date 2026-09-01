import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  badge,
  action,
  icon,
}) => {
  return (
    <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-xl">{icon}</span>}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-stone-500 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="self-start sm:self-auto">{action}</div>}
    </div>
  );
};
