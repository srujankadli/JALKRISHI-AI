import { useLanguage } from '../../context/LanguageContext';
import React from 'react';
import {
  MapPin,
  Droplets,
  TrendingDown,
  AlertTriangle,
  Sprout,
  Download,
  ArrowRight,
} from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { FARMER_WORKFLOW_STEPS } from '../../data/helpContent';

interface FarmerGuideProps {
  onNavigate: (path: string) => void;
}

export const FarmerGuide: React.FC<FarmerGuideProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const getIcon = (name: string) => {
    switch (name) {
      case 'MapPin':
        return MapPin;
      case 'Droplets':
        return Droplets;
      case 'TrendingDown':
        return TrendingDown;
      case 'AlertTriangle':
        return AlertTriangle;
      case 'Sprout':
        return Sprout;
      case 'Download':
      default:
        return Download;
    }
  };

  return (
    <div id="farmer-guide" className="space-y-4">
      <SectionHeader
        title={t('JalKrishi AI for Farmers: 6-Step Decision Guide')}
        subtitle={t('How to turn local groundwater telemetry into smart, water-secure farming decisions')}
        icon={<Sprout className="h-5 w-5 text-agri-700" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FARMER_WORKFLOW_STEPS.map((step) => {
          const Icon = getIcon(step.iconName);
          return (
            <div
              key={step.step}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-subtle flex flex-col justify-between space-y-4 hover:border-agri-300 hover:shadow-elevated transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-agri-100 px-3 py-1 font-mono text-xs font-black text-agri-900">
                    Step {step.step}
                  </span>
                  <div className="rounded-xl bg-stone-50 p-2 text-agri-700 border border-stone-200/60">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <h4 className="text-base font-black text-stone-900 leading-snug">
                  {step.title}
                </h4>

                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <button
                  onClick={() => onNavigate(step.ctaPath)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-agri-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <span>{step.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
