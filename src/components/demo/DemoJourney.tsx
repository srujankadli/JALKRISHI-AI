import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { DemoStep } from './DemoControlCenter';

export const DEMO_STEPS: DemoStep[] = [
  {
    stepIndex: 1,
    title: '1. National Groundwater Overview',
    modulePath: '/',
    moduleLabel: 'Dashboard',
    judgeQuestion: '“What is the overall groundwater situation across India?”',
    aiAnswer: 'Monitors 5,260 DWLR wells: 842 Critical (16.0%), 1,280 Warning (24.3%), average depth 18.4m mbgl.',
    actionGuidance: 'Highlight Network Risk Index (0.48/1.0) and 5,260-well active telemetry status.',
  },
  {
    stepIndex: 2,
    title: '2. High-Risk Priority Belt Identification',
    modulePath: '/analytics',
    moduleLabel: 'Regional Analytics',
    judgeQuestion: '“Where is the risk concentrated?”',
    aiAnswer: 'Punjab (Sangrur, Risk: 0.88) & Rajasthan (Jaipur, Risk: 0.85) exhibit severe multi-season depletion.',
    actionGuidance: 'Show State Risk Rankings table and filter by Critical risk category.',
  },
  {
    stepIndex: 3,
    title: '3. Station Drawdown Inspection',
    modulePath: '/map',
    moduleLabel: 'Groundwater Map',
    judgeQuestion: '“How does an individual observation well behave?”',
    aiAnswer: 'Station DWLR-PB-001 (Sangrur) water depth is 28.4m mbgl, falling at 0.28m/month.',
    actionGuidance: 'Click on DWLR-PB-001 marker to view historical depth chart and well details.',
  },
  {
    stepIndex: 4,
    title: '4. 30-Day Hydrodynamic Forecast',
    modulePath: '/forecast',
    moduleLabel: 'Forecast Model',
    judgeQuestion: '“What will happen to groundwater next?”',
    aiAnswer: '30-day projection forecasts depth reaching 28.9m with 115 Days-to-Critical countdown.',
    actionGuidance: 'Review 30/60/90-day forecast trajectory and confidence envelope bands.',
  },
  {
    stepIndex: 5,
    title: '5. Statistical Telemetry Anomaly Triage',
    modulePath: '/anomalies',
    moduleLabel: 'Anomaly Triage',
    judgeQuestion: '“How are sensor glitches or extraction spikes handled?”',
    aiAnswer: 'Engine flags 819 quality events with cautious triage labels (e.g. “Possible abnormal extraction — requires verification”).',
    actionGuidance: 'Inspect Anomaly Severity Matrix and 5 telemetry check categories.',
  },
  {
    stepIndex: 6,
    title: '6. Hydro-Agronomic Crop Advisor',
    modulePath: '/crops',
    moduleLabel: 'Crop Advisor',
    judgeQuestion: '“What should the farmer do with this groundwater intelligence?”',
    aiAnswer: 'Recommends water-smart crops (Chickpea, Mustard, Bajra) over water-intensive paddy/sugarcane.',
    actionGuidance: 'Select Kolar/Sangrur farm profile to view multi-factor crop scoring breakdown.',
  },
  {
    stepIndex: 7,
    title: '7. WhatsApp Conversational Chatbot',
    modulePath: '/whatsapp',
    moduleLabel: 'WhatsApp Assistant',
    judgeQuestion: '“How does a non-technical farmer access this guidance?”',
    aiAnswer: 'Bilingual (Hindi/English) WhatsApp assistant answers queries like “Kolar water” or “Kolar forecast”.',
    actionGuidance: 'Click sample quick reply chips to simulate live conversational farmer interaction.',
  },
  {
    stepIndex: 8,
    title: '8. Executive AI Brief Synthesis',
    modulePath: '/',
    moduleLabel: 'AI Executive Brief',
    judgeQuestion: '“Does the platform convert groundwater data into actionable decisions?”',
    aiAnswer: 'Yes. Synthesizes telemetry, analytics, forecast, anomalies, and crops into a 30-second decision summary.',
    actionGuidance: 'Review Executive Water Brief quadrants and cross-module intelligence links.',
  },
];

interface DemoJourneyProps {
  currentStep: number;
  onSelectStep: (stepIndex: number) => void;
}

export const DemoJourney: React.FC<DemoJourneyProps> = ({ currentStep, onSelectStep }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-base font-black text-stone-900">
            Guided 8-Step Hackathon Judge Demonstration Journey
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Walks judges through the end-to-end flow from piezometer telemetry to farmer crop decision.
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          3-Minute Presentation Journey
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEMO_STEPS.map((step) => {
          const isActive = currentStep === step.stepIndex;
          const isPassed = currentStep > step.stepIndex;

          return (
            <div
              key={step.stepIndex}
              onClick={() => onSelectStep(step.stepIndex)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400'
                  : isPassed
                  ? 'bg-stone-50/80 border-emerald-200 opacity-90'
                  : 'bg-white hover:bg-stone-50 border-stone-200'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {step.stepIndex}
                  </span>

                  {isPassed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>

                <h4 className="text-xs font-bold text-stone-900 leading-snug">{step.title}</h4>
                <p className="text-[11px] text-stone-600 leading-relaxed font-medium">
                  {step.judgeQuestion}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-500">{step.moduleLabel}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(step.modulePath);
                  }}
                  className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
