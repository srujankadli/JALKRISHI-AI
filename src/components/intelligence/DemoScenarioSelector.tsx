import React from 'react';
import { Sliders, Radio } from 'lucide-react';

export type DemoScenarioId = 'baseline' | 'stress' | 'rapid_depletion' | 'anomalies';

export interface DemoScenario {
  id: DemoScenarioId;
  name: string;
  badge: string;
  description: string;
  highlightDistrict: string;
  focusModulePath: string;
  focusModuleLabel: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'baseline',
    name: '1. Normal Baseline Conditions',
    badge: 'Standard Monitored Network',
    description: 'Overview of all 5,260 DWLR wells across 37 Indian states and Union Territories.',
    highlightDistrict: 'All 37 States',
    focusModulePath: '/map',
    focusModuleLabel: 'View Map',
  },
  {
    id: 'stress',
    name: '2. Regional Water Stress (Kolar & Sangrur)',
    badge: 'Critical Stress Zone',
    description: 'Simulates severe tube-well drawdown during peak agricultural pumping season.',
    highlightDistrict: 'Sangrur, Punjab & Kolar, Karnataka',
    focusModulePath: '/crops',
    focusModuleLabel: 'View Crop Advice',
  },
  {
    id: 'rapid_depletion',
    name: '3. Rapid Depletion & Days-to-Critical',
    badge: 'Forecast Trajectory Focus',
    description: 'Highlights 30-day hydrodynamic projection showing wells reaching threshold depth.',
    highlightDistrict: 'Jaipur, Rajasthan',
    focusModulePath: '/forecast',
    focusModuleLabel: 'View 30d Forecast',
  },
  {
    id: 'anomalies',
    name: '4. Telemetry Sensor Anomaly Triage',
    badge: 'Data Quality & Telemetry Audit',
    description: 'Focuses on 819 statistically flagged telemetry events requiring verification.',
    highlightDistrict: 'Karnal, Haryana',
    focusModulePath: '/anomalies',
    focusModuleLabel: 'Inspect Anomalies',
  },
];

interface DemoScenarioSelectorProps {
  selectedScenario: DemoScenarioId;
  onSelectScenario: (scenario: DemoScenario) => void;
}

export const DemoScenarioSelector: React.FC<DemoScenarioSelectorProps> = ({
  selectedScenario,
  onSelectScenario,
}) => {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-emerald-700" />
          <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider">
            Hackathon Judge Demo Scenario Switcher
          </h4>
        </div>
        <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          Demo Presentation Mode
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {DEMO_SCENARIOS.map((scen) => {
          const isSelected = selectedScenario === scen.id;
          return (
            <button
              key={scen.id}
              onClick={() => onSelectScenario(scen)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                isSelected
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-400'
                  : 'bg-stone-50/60 hover:bg-white border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    isSelected ? 'text-emerald-950' : 'text-stone-800'
                  }`}
                >
                  {scen.name}
                </span>
                <Radio
                  className={`h-3.5 w-3.5 ${
                    isSelected ? 'text-emerald-700 fill-emerald-700' : 'text-stone-300'
                  }`}
                />
              </div>
              <p className="text-[11px] text-stone-600 leading-snug">{scen.description}</p>
              <div className="flex items-center justify-between text-[10px] font-medium pt-1 border-t border-stone-200/50">
                <span className="text-stone-500">{scen.highlightDistrict}</span>
                <span className="font-bold text-emerald-700">{scen.focusModuleLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
