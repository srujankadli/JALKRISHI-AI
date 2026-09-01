import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  farmerNote?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isPositive?: boolean;
  };
  highlightColor?: 'default' | 'healthy' | 'warning' | 'critical' | 'water';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  farmerNote,
  icon: Icon,
  iconBgColor = 'bg-stone-100',
  iconColor = 'text-stone-700',
  trend,
  highlightColor = 'default',
  onClick,
}) => {
  const borderHighlight = {
    default: 'border-stone-200 hover:border-stone-300',
    healthy: 'border-emerald-200 hover:border-emerald-300 bg-emerald-50/20',
    warning: 'border-amber-200 hover:border-amber-300 bg-amber-50/20',
    critical: 'border-rose-200 hover:border-rose-300 bg-rose-50/20',
    water: 'border-sky-200 hover:border-sky-300 bg-sky-50/20',
  };

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border bg-white p-5 shadow-subtle transition-all duration-200 ${
        borderHighlight[highlightColor]
      } ${onClick ? 'cursor-pointer hover:shadow-card' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {value}
            </span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trend.isPositive === true
                    ? 'text-emerald-700'
                    : trend.isPositive === false
                    ? 'text-rose-700'
                    : 'text-stone-600'
                }`}
              >
                {trend.direction === 'up' && <TrendingUp className="mr-0.5 h-3.5 w-3.5" />}
                {trend.direction === 'down' && <TrendingDown className="mr-0.5 h-3.5 w-3.5" />}
                {trend.direction === 'neutral' && <Minus className="mr-0.5 h-3.5 w-3.5" />}
                {trend.value}
              </span>
            )}
          </div>
        </div>

        <div className={`rounded-xl p-3 shadow-inner ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>

      {subtitle && (
        <p className="mt-2 text-xs font-medium text-stone-600">{subtitle}</p>
      )}

      {farmerNote && (
        <div className="mt-3 border-t border-stone-100 pt-2.5">
          <p className="text-xs text-stone-700">
            <span className="font-semibold text-agri-800">🌾 Insight: </span>
            {farmerNote}
          </p>
        </div>
      )}
    </div>
  );
};
