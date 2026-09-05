import React from 'react';
import { Sprout, Droplets, TrendingDown, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface HelpQuickCardsProps {
  onScrollTo: (sectionId: string) => void;
}

export const HelpQuickCards: React.FC<HelpQuickCardsProps> = ({ onScrollTo }) => {
  const { t } = useLanguage();
  
  const cards = [
    {
      id: 'farmer-guide',
      title: t('For Farmers'),
      subtitle: t('How should I use JalKrishi AI on my farm?'),
      icon: Sprout,
      color: 'text-agri-700 bg-agri-50 border-agri-200 hover:border-agri-400',
    },
    {
      id: 'status-guide',
      title: t('Groundwater Status'),
      subtitle: t('What do water depth & warning levels mean?'),
      icon: Droplets,
      color: 'text-water-700 bg-water-50 border-water-200 hover:border-water-400',
    },
    {
      id: 'forecast-guide',
      title: t('Forecasts & Alerts'),
      subtitle: t('How are depletion & anomalies estimated?'),
      icon: TrendingDown,
      color: 'text-sky-700 bg-sky-50 border-sky-200 hover:border-sky-400',
    },
    {
      id: 'sources-transparency',
      title: t('Sources & Reports'),
      subtitle: t('Where does data come from & how to export?'),
      icon: FileText,
      color: 'text-amber-700 bg-amber-50 border-amber-200 hover:border-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            onClick={() => onScrollTo(c.id)}
            className={`rounded-3xl border p-5 shadow-subtle flex flex-col justify-between space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-elevated cursor-pointer ${c.color}`}
          >
            <div className="space-y-2">
              <div className="w-fit rounded-2xl bg-white p-2.5 shadow-xs border border-stone-200/60">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-black text-stone-900 leading-snug">
                {c.title}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                {c.subtitle}
              </p>
            </div>
            <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1 pt-1">
              <span>Explore Section &rarr;</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
