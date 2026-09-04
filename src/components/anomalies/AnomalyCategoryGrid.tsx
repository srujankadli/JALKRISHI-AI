import React from 'react';
import { TrendingDown, ShieldAlert, Radio, Activity, Droplets } from 'lucide-react';
import type { AnomalyCategory } from '../../types';

interface AnomalyCategoryGridProps {
  selectedCategory: string;
  onSelectCategory: (cat: 'all' | AnomalyCategory) => void;
  categoryCounts: {
    category: AnomalyCategory;
    name: string;
    count: number;
    description: string;
    color: string;
  }[];
}

export const AnomalyCategoryGrid: React.FC<AnomalyCategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  
  const getCategoryIcon = (category: AnomalyCategory) => {
    switch (category) {
      case 'Sudden Drop':
        return TrendingDown;
      case 'Possible Extraction':
        return ShieldAlert;
      case 'Missing Data':
        return Radio;
      case 'Sensor Issue':
        return Activity;
      case 'Sudden Rise':
      default:
        return Droplets;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {categoryCounts.map((item) => {
        const Icon = getCategoryIcon(item.category);
        const isSelected = selectedCategory === item.category;

        return (
          <div
            key={item.category}
            onClick={() => onSelectCategory(isSelected ? 'all' : item.category)}
            className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
              isSelected
                ? 'border-agri-600 bg-agri-50/70 shadow-md ring-2 ring-agri-500/20'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-subtle'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div
                  className="rounded-xl p-2"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <span
                  className="font-mono text-base font-black px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${item.color}15`,
                    color: item.color,
                  }}
                >
                  {item.count}
                </span>
              </div>

              <h4 className="mt-3 text-xs sm:text-sm font-extrabold text-stone-900 leading-snug">
                {item.name}
              </h4>

              <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-3 border-t border-stone-100 pt-2 text-[10px] font-bold text-stone-400">
              {isSelected ? '✓ Filter Active (Click to Clear)' : 'Click to Filter'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
