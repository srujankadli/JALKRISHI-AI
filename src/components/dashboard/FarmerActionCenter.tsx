import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Sprout,
  CloudRain,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { useLanguage } from '../../context/LanguageContext';

export const FarmerActionCenter: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions = [
    {
      id: 'water-action',
      title: 'Water Management',
      description: 'Groundwater is declining in some monitored areas. Check depletion velocity before running pumps.',
      cta: 'View Risk Areas',
      icon: Droplets,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-700',
      borderHover: 'hover:border-rose-300',
      badge: 'Depletion Warning',
      badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200',
      onClick: () => navigate('/forecast'),
    },
    {
      id: 'crop-action',
      title: 'Crop Planning',
      description: 'Consider lower-water crops (Bajra, Gram, Mustard) for stressed aquifers to protect yield profit.',
      cta: 'Open Crop Advisor',
      icon: Sprout,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-700',
      borderHover: 'hover:border-emerald-300',
      badge: 'AI Recommendations',
      badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      onClick: () => navigate('/crops'),
    },
    {
      id: 'rain-action',
      title: 'Monsoon & Rainfall',
      description: 'Check the upcoming 15-day rainfall outlook and expected infiltration rate in your district.',
      cta: 'View Rainfall Forecast',
      icon: CloudRain,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-700',
      borderHover: 'hover:border-sky-300',
      badge: 'Precipitation Model',
      badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200',
      onClick: () => navigate('/forecast'),
    },
    {
      id: 'station-action',
      title: 'Find Local Well',
      description: 'Find the nearest DWLR groundwater monitoring station to your farm or village.',
      cta: 'Find My Station',
      icon: MapPin,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-700',
      borderHover: 'hover:border-amber-300',
      badge: '5,260 Nodes',
      badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
      onClick: () => navigate('/map'),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Recommended Actions for Farmers"
        subtitle="Practical steps based on real-time groundwater depth and seasonal recharge models"
        icon={<Sparkles className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              onClick={act.onClick}
              className={`group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-subtle transition-all duration-200 hover:shadow-card ${act.borderHover} cursor-pointer`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className={`rounded-xl p-3 shadow-inner ${act.iconBg}`}>
                    <Icon className={`h-6 w-6 ${act.iconColor}`} />
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${act.badgeStyle}`}>
                    {t(act.badge)}
                  </span>
                </div>

                <h3 className="mt-3.5 text-base font-bold text-stone-900 group-hover:text-agri-800 transition-colors">
                  {t(act.title)}
                </h3>

                <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                  {t(act.description)}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-agri-700 group-hover:text-agri-900">
                  {t(act.cta)}
                </span>
                <ArrowRight className="h-4 w-4 text-agri-700 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
