import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Activity,
  Sprout,
  Radio,
  ArrowRight,
} from 'lucide-react';

export const QuickActionsGrid: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'map-quick',
      title: 'Explore Groundwater Map',
      description: 'Interactive pan-India map with 5,260 DWLR stations, color-coded health pins, and basin layers.',
      icon: MapPin,
      bgGradient: 'from-white to-water-50/50',
      iconBg: 'bg-water-100 text-water-700 group-hover:bg-water-600 group-hover:text-white',
      borderHover: 'hover:border-water-300',
      onClick: () => navigate('/map'),
    },
    {
      id: 'forecast-quick',
      title: 'Check 30-90 Day Forecast',
      description: 'AI depletion models estimating future water levels, rainfall correlation, and Days-to-Critical.',
      icon: Activity,
      bgGradient: 'from-white to-agri-50/50',
      iconBg: 'bg-agri-100 text-agri-700 group-hover:bg-agri-600 group-hover:text-white',
      borderHover: 'hover:border-agri-300',
      onClick: () => navigate('/forecast'),
    },
    {
      id: 'crops-quick',
      title: 'Get Crop Recommendation',
      description: 'Water-smart crop planning tailored to local aquifer depth, seasonal draw, and soil type.',
      icon: Sprout,
      bgGradient: 'from-white to-emerald-50/50',
      iconBg: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
      borderHover: 'hover:border-emerald-300',
      onClick: () => navigate('/crops'),
    },
    {
      id: 'station-quick',
      title: 'Find My Nearest Station',
      description: 'Locate observation wells in your district, view seasonal depth graphs, and check battery health.',
      icon: Radio,
      bgGradient: 'from-white to-stone-100/50',
      iconBg: 'bg-stone-200 text-stone-700 group-hover:bg-stone-800 group-hover:text-white',
      borderHover: 'hover:border-stone-300',
      onClick: () => navigate('/map'),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`group flex flex-col justify-between rounded-2xl border border-stone-200 bg-gradient-to-br ${card.bgGradient} p-5 shadow-subtle transition-all duration-200 hover:shadow-card ${card.borderHover} cursor-pointer`}
          >
            <div>
              <div className={`inline-flex rounded-xl p-3 shadow-xs transition-colors ${card.iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>

              <h3 className="mt-3.5 text-base font-bold text-stone-900 group-hover:text-agri-800 transition-colors">
                {card.title}
              </h3>

              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                {card.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100/80 flex items-center justify-between text-xs font-bold text-agri-700 group-hover:text-agri-900">
              <span>Open Tool</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
