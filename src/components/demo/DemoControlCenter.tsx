import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import type { DemoScenarioId } from '../intelligence/DemoScenarioSelector';

export interface DemoStep {
  stepIndex: number;
  title: string;
  modulePath: string;
  moduleLabel: string;
  judgeQuestion: string;
  aiAnswer: string;
  actionGuidance: string;
}

interface DemoControlCenterProps {
  currentStep: number;
  totalSteps: number;
  activeStepData: DemoStep;
  activeScenario?: DemoScenarioId;
  onNextStep: () => void;
  onPrevStep: () => void;
  onReset: () => void;
  onSelectScenario?: (scenarioId: DemoScenarioId) => void;
}

export const DemoControlCenter: React.FC<DemoControlCenterProps> = ({
  currentStep,
  totalSteps,
  activeStepData,
  onNextStep,
  onPrevStep,
  onReset,
}) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-3xl border border-emerald-300 bg-stone-900 text-white p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                JalKrishi AI — Live Hackathon Demo Presenter Bar
              </h3>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Guided 3-Minute Hackathon Judging Flow (Deterministic Presentation Simulation)
            </p>
          </div>
        </div>

        {/* Presenter Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevStep}
            disabled={currentStep <= 1}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Previous Demo Step"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>

          <span className="text-xs font-mono font-bold text-emerald-400 px-1">
            {currentStep}/{totalSteps}
          </span>

          <button
            onClick={onNextStep}
            disabled={currentStep >= totalSteps}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Next Demo Step"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-all cursor-pointer"
            title="Reset Journey to Step 1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate(activeStepData.modulePath)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-all shadow-xs cursor-pointer ml-2"
          >
            <span>Open {activeStepData.moduleLabel}</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Active Step Highlight Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-stone-800/80 rounded-2xl p-3.5 border border-stone-700/80 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
            JUDGE QUESTION / FOCUS
          </span>
          <p className="font-bold text-white text-xs mt-0.5">{activeStepData.judgeQuestion}</p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-water-300 block tracking-wider">
            JALKRISHI AI ANSWER
          </span>
          <p className="text-stone-300 text-xs mt-0.5 leading-snug">{activeStepData.aiAnswer}</p>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-agri-300 block tracking-wider">
            PRESENTER ACTION
          </span>
          <p className="text-stone-300 text-xs mt-0.5 leading-snug">{activeStepData.actionGuidance}</p>
        </div>
      </div>
    </div>
  );
};
