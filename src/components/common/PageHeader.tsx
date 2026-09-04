import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  farmerNote?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  farmerNote,
}) => {
  const { t } = useLanguage();

  return (
    <div className="mb-6 rounded-2xl border border-stone-200/80 bg-gradient-to-r from-stone-50 via-white to-agri-50/30 p-5 shadow-subtle sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
              {t(title)}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-stone-600 sm:text-base">
              {t(subtitle)}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>

      {farmerNote && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-agri-200 bg-agri-50/70 p-3 text-xs text-agri-950 sm:text-sm">
          <span className="text-base" aria-hidden="true">💡</span>
          <div>
            <span className="font-semibold text-agri-900">{t('Farmer Summary')}: </span>
            {t(farmerNote)}
          </div>
        </div>
      )}
    </div>
  );
};
