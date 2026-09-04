import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-subtle ${className}`}
    >
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-stone-900 sm:text-lg">{t(title)}</h3>
            {badge}
          </div>
          {subtitle && <p className="text-xs text-stone-500">{t(subtitle)}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="flex-1 w-full min-h-[260px]">{children}</div>
    </div>
  );
};
