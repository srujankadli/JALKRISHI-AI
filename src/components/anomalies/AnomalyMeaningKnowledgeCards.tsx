import React from 'react';
import { HelpCircle, TrendingDown, TrendingUp, Radio, Activity, Wrench } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const AnomalyMeaningKnowledgeCards: React.FC = () => {
  const cards = [
    {
      title: 'Sudden Groundwater Drop',
      subtitle: 'Water level fell faster than expected',
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200',
      description:
        'The water depth increased sharply over a few hours. Usually caused by simultaneous heavy pumping in nearby borewells or peak seasonal irrigation shifts.',
    },
    {
      title: 'Possible Abnormal Extraction',
      subtitle: 'Continuous multi-day drawdown',
      icon: Wrench,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
      description:
        'Water level is dropping continuously without the normal night-time pressure recovery. Suggests intense uncoordinated pumping across village clusters.',
    },
    {
      title: 'Missing / Delayed Data',
      subtitle: 'Station has not transmitted readings',
      icon: Radio,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      description:
        'The station missed its 6-hour scheduled satellite or cellular ping. Commonly caused by overcast skies (solar battery depletion) or local tower maintenance.',
    },
    {
      title: 'Potential Sensor Error',
      subtitle: 'Unusual reading pattern detected',
      icon: Activity,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-200',
      description:
        'The sensor is reporting flatline numbers, sudden impossible jumps, or voltage ripples. Requires verification before making critical crop decisions.',
    },
    {
      title: 'Sudden Groundwater Rise',
      subtitle: 'Water level rose faster than expected',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      description:
        'Water table rebounded quickly following local cloudbursts or river canal releases. Positive recharge condition for upcoming sowing cycles.',
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="What Does an Anomaly Mean? (Farmer Guide)"
        subtitle="Simple explanations of automated telemetry quality flags and hydrostatic alerts"
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
                    {c.title}
                  </h4>
                  <span className="text-[11px] font-semibold text-stone-600">{c.subtitle}</span>
                </div>
              </div>

              <p className="text-xs text-stone-700 leading-relaxed pt-1">
                {c.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
