import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Droplets, Clock, CloudRain, Sprout, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const WaterSmartFarmingAdvice: React.FC = () => {
  const { t } = useLanguage();
  const tips = [
    {
      title: 'Drip & Micro-Sprinkler Irrigation',
      desc: 'Delivers water directly to the crop root zone, reducing surface evaporation by 40-50% compared with conventional flood irrigation.',
      icon: Droplets,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      title: 'Night-Time Pumping Rosters',
      desc: 'Irrigating between 9 PM and 5 AM cuts evaporative losses by 25% and avoids peak electrical grid voltage dropoffs.',
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Farm-Pond Rainwater Harvesting',
      desc: 'Catching surface runoff in unlined percolation ponds creates localized unconfined groundwater recharge buffers.',
      icon: CloudRain,
      color: 'text-water-700 bg-water-50 border-water-200',
    },
    {
      title: 'Organic Mulching & Direct Seeding',
      desc: 'Retains topsoil moisture for 5-7 additional days between irrigation turns, minimizing mid-season water stress.',
      icon: Sprout,
      color: 'text-agri-700 bg-agri-50 border-agri-200',
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Water-Smart Farming Practices & Ground Rules')}
        subtitle={t('Practical techniques to maximize crop yields while stabilizing local groundwater reserves')}
        icon={<CheckCircle2 className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tips.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.title}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-subtle flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className={`w-fit rounded-2xl border p-2.5 ${t.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-extrabold text-stone-900 leading-snug">
                  {t.title}
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
