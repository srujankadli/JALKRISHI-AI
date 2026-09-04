import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import { HelpCircle, TrendingDown, TrendingUp, Radio, Activity, ShieldAlert } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const AnomalyMeaningKnowledgeCards: React.FC = () => {
  const { t } = useLanguage();
  const cards = [
    {
      title: 'Sudden Groundwater Drop',
      subtitle: 'Water level falling faster than expected',
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200',
      description:
        'Groundwater level is falling faster than the expected local pattern. This may indicate concentrated pumping or rapid localized depletion.',
    },
    {
      title: 'Possible Abnormal Extraction',
      subtitle: 'Repeated drawdown without normal recovery',
      icon: ShieldAlert,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
      description:
        'Repeated drawdown may indicate unusually high or sustained water withdrawal without the usual recharge window.',
    },
    {
      title: 'Missing / Delayed Data',
      subtitle: 'Expected readings not received',
      icon: Radio,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      description:
        'Expected observations are missing or arriving later than expected. Commonly caused by temporary network interruptions or power cycling.',
    },
    {
      title: 'Possible Sensor Data Issue',
      subtitle: 'Unusual reading patterns requiring check',
      icon: Activity,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-200',
      description:
        'Readings show patterns that may require sensor or telemetry verification before drawing firm hydrogeological conclusions.',
    },
    {
      title: 'Sudden Groundwater Rise',
      subtitle: 'Rapid water level increase',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      description:
        'Groundwater level has increased sharply, potentially following heavy localized rainfall, canal release, or surface recharge.',
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Understanding Groundwater Anomalies')}
        subtitle={t('Plain-language guide to groundwater early warning flags and data quality signals')}
        icon={<HelpCircle className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.title} className={`rounded-2xl border p-4 shadow-subtle ${c.bg} space-y-2`}>
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${c.color} shrink-0`} />
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 leading-tight">
                    {t(c.title)}
                  </h4>
                  <span className="text-[11px] font-semibold text-stone-600">{t(c.subtitle)}</span>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed pt-1">
                {t(c.description)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
