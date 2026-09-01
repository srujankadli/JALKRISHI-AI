import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DemoControlCenter, type DemoStep } from '../components/demo/DemoControlCenter';
import { DemoJourney, DEMO_STEPS } from '../components/demo/DemoJourney';
import { HackathonImpactPanel } from '../components/demo/HackathonImpactPanel';
import { ArchitectureDiagram } from '../components/demo/ArchitectureDiagram';
import { ExecutiveWaterBrief } from '../components/intelligence/ExecutiveWaterBrief';
import { DemoScenarioSelector, type DemoScenario, type DemoScenarioId } from '../components/intelligence/DemoScenarioSelector';
import { Radio, Sparkles } from 'lucide-react';

export const DemoPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioId>('baseline');

  const activeStepData = DEMO_STEPS.find((s: DemoStep) => s.stepIndex === currentStep) || DEMO_STEPS[0];

  const handleNext = () => {
    if (currentStep < DEMO_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* Top Demo Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            JalKrishi AI — Live Hackathon Judging Demonstration Mode
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">Smart Horizon 2026 (SH-AGR-005)</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
          <Radio className="h-3 w-3 text-emerald-700" />
          DEMO SIMULATION ACTIVE
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title="JalKrishi AI — Hackathon Judging Command System"
        subtitle="3-minute interactive demonstration story connecting DWLR piezometers, hydrodynamic forecasting, anomaly detection, and farmer crop advice."
        farmerNote="Press 'Next Step' on the presenter bar below to guide judges through the platform story step by step."
        badge={
          <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Hackathon Judging Mode
          </span>
        }
      />

      {/* 2. Top Presenter Control Center Bar */}
      <DemoControlCenter
        currentStep={currentStep}
        totalSteps={DEMO_STEPS.length}
        activeStepData={activeStepData}
        activeScenario={selectedScenario}
        onNextStep={handleNext}
        onPrevStep={handlePrev}
        onReset={handleReset}
        onSelectScenario={(scenId) => setSelectedScenario(scenId)}
      />

      {/* 3. Demo Scenario Selector */}
      <DemoScenarioSelector
        selectedScenario={selectedScenario}
        onSelectScenario={(scen: DemoScenario) => setSelectedScenario(scen.id)}
      />

      {/* 4. Executive Water Brief */}
      <ExecutiveWaterBrief />

      {/* 5. Guided 8-Step Interactive Journey */}
      <DemoJourney
        currentStep={currentStep}
        onSelectStep={(stepIndex) => setCurrentStep(stepIndex)}
      />

      {/* 6. Impact Comparison (Before vs With JalKrishi AI) */}
      <HackathonImpactPanel />

      {/* 7. Full-Stack Technical Architecture View */}
      <ArchitectureDiagram />
    </div>
  );
};
