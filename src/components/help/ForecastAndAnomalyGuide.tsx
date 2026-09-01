import React from 'react';
import {
  TrendingDown,
  AlertTriangle,
  Activity,
  Radio,
  Clock,
  Waves,
  Zap,
} from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const ForecastAndAnomalyGuide: React.FC = () => {
  const anomalyCategories = [
    {
      title: 'Sudden Groundwater Drop',
      desc: 'Observation well records rapid hydrostatic drawdown exceeding 15 cm/day, significantly faster than typical diurnal baselines.',
      action: 'Verify if local irrigation pumping clusters were switched on simultaneously.',
      icon: TrendingDown,
      badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
    },
    {
      title: 'Possible Abnormal Extraction',
      desc: 'Multi-day continuous water table decline with zero overnight recharge or recovery cycle.',
      action: 'Check neighborhood tube-well density and inspect local aquifer drawdown slope.',
      icon: Zap,
      badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
    },
    {
      title: 'Missing / Delayed Data',
      desc: 'Sensor missed scheduled 6-hour cellular transmission intervals due to solar battery depletion or GSM mast maintenance.',
      action: 'Check station telemetry status; readings resume automatically once packets re-sync.',
      icon: Radio,
      badgeColor: 'text-stone-700 bg-stone-100 border-stone-300',
    },
    {
      title: 'Potential Sensor Error',
      desc: 'Flatline readings (zero variance across 48h) or impossible single-hour step jumps (>8 m/hr) caused by transducer noise.',
      action: 'Flag for physical piezometer inspection or hydrostatic calibration.',
      icon: Activity,
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Sudden Groundwater Rise',
      desc: 'Sharp, unpredicted water table rise following localized cloudbursts, canal releases, or check-dam percolation.',
      action: 'Confirm localized rainfall accumulation and note recharge benefit.',
      icon: Waves,
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    },
  ];

  return (
    <div id="forecast-guide" className="space-y-6">
      {/* 1. Forecasting & Days-to-Critical Section */}
      <div className="space-y-3">
        <SectionHeader
          title="How Groundwater Forecasting Works"
          subtitle="Understanding multi-horizon projections, uncertainty envelopes, and Days-to-Critical indicators"
          icon={<TrendingDown className="h-5 w-5 text-sky-700" />}
        />

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-subtle space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-stone-900">
                <Clock className="h-4 w-4 text-sky-700" />
                <span>1. Observed Telemetry History</span>
              </div>
              <p className="text-stone-600 leading-relaxed font-medium">
                The model continuously analyzes past 90-day hydrostatic depth readings to establish seasonal drawdown velocity and natural recharge lags.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-stone-900">
                <TrendingDown className="h-4 w-4 text-amber-700" />
                <span>2. Projection & Confidence Bounds</span>
              </div>
              <p className="text-stone-600 leading-relaxed font-medium">
                Projections estimate where the water table will be in 7, 30, 60, and 90 days, surrounded by upper and lower confidence uncertainty bands.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-extrabold text-stone-900">
                <AlertTriangle className="h-4 w-4 text-rose-700" />
                <span>3. Days-to-Critical Countdown</span>
              </div>
              <p className="text-stone-600 leading-relaxed font-medium">
                Calculates remaining days before water falls below the critical threshold where tube-well pumps experience suction failure.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Anomaly Detection Guide */}
      <div className="space-y-3">
        <SectionHeader
          title="Understanding Groundwater Telemetry Anomalies"
          subtitle="How the automated quality control engine isolates genuine extraction spikes from sensor hardware faults"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {anomalyCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="rounded-3xl border border-stone-200 bg-white p-5 shadow-subtle flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black uppercase ${cat.badgeColor}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cat.title}
                  </span>

                  <p className="text-xs text-stone-600 leading-relaxed font-medium">
                    {cat.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-700">
                  <strong className="text-stone-900 block font-bold">Suggested Action:</strong>
                  <span>{cat.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
