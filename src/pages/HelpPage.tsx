import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Radio } from 'lucide-react';
import { FAQ_DATA } from '../data/helpContent';

// Help UI Sub-components
import { PageHeader } from '../components/common/PageHeader';
import { HelpQuickCards } from '../components/help/HelpQuickCards';
import { HelpSearchBar } from '../components/help/HelpSearchBar';
import { FAQAccordion } from '../components/help/FAQAccordion';
import { FarmerGuide } from '../components/help/FarmerGuide';
import { GroundwaterStatusGuide } from '../components/help/GroundwaterStatusGuide';
import { ForecastAndAnomalyGuide } from '../components/help/ForecastAndAnomalyGuide';
import { DataSourcesAndTransparency } from '../components/help/DataSourcesAndTransparency';
import { SystemArchitectureCard } from '../components/help/SystemArchitectureCard';
import { AboutHackstackCard } from '../components/help/AboutHackstackCard';
import { FeedbackForm } from '../components/help/FeedbackForm';
import { DataIssueForm } from '../components/help/DataIssueForm';
import { SystemDiagnosticsCard } from '../components/common/SystemDiagnosticsCard';
import { AIIntelligencePipelineCard } from '../components/help/AIIntelligencePipelineCard';

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleScrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Count matching FAQs for search feedback
  const matchingFaqCount = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    const q = searchQuery.toLowerCase();
    return FAQ_DATA.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.farmerTakeaway?.toLowerCase().includes(q)
    ).length;
  }, [searchQuery]);

  return (
    <div className="space-y-8 animate-fadeIn pb-8">
      {/* Top Demo Simulation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-agri-600 animate-pulse" />
          <span className="font-extrabold text-stone-900">
            JalKrishi Knowledge Base &amp; System Documentation
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="text-stone-500 font-medium">Smart Horizon 2026 Hackathon (SH-AGR-005)</span>
        </div>

        <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
          <Radio className="h-3 w-3 text-agri-600" />
          Demo Simulation
        </span>
      </div>

      {/* 1. Page Header */}
      <PageHeader
        title="Help & Knowledge Center"
        subtitle="Understand JalKrishi AI, groundwater depth indicators, forecasting models, anomaly triage, and crop recommendation logic."
        farmerNote="Everything you need to know about understanding your local water table, interpreting alerts, and choosing the right crop for your land."
        badge={
          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-bold text-white flex items-center gap-1.5 shadow-xs">
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            Documentation &amp; FAQ
          </span>
        }
      />

      {/* 2. Quick Help Navigation Cards */}
      <HelpQuickCards onScrollTo={handleScrollTo} />

      {/* 3. Live Help & FAQ Search Bar */}
      <HelpSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchCount={matchingFaqCount}
      />

      {/* 4. Farmer 6-Step Decision Guide */}
      <FarmerGuide onNavigate={(path) => navigate(path)} />

      {/* 5. Groundwater Status Understanding Guide */}
      <GroundwaterStatusGuide />

      {/* 6. Forecasting & Telemetry Anomalies Guide */}
      <ForecastAndAnomalyGuide />

      {/* 7. Interactive FAQ Accordion */}
      <FAQAccordion faqs={FAQ_DATA} searchQuery={searchQuery} />

      {/* 8. Data Sources & Demo Mode Transparency */}
      <DataSourcesAndTransparency />

      {/* 9. Live System Health & Engine Diagnostics (Phase J) */}
      <SystemDiagnosticsCard />

      {/* 9.5 End-to-End AI Intelligence Pipeline Card (Phase L) */}
      <AIIntelligencePipelineCard />

      {/* 10. System Architecture & Engineering Flow */}
      <SystemArchitectureCard />

      {/* 10. About Project & Team HACKSTACK */}
      <AboutHackstackCard />

      {/* 11. Interactive Feedback & Report Data Issue Forms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FeedbackForm />
        <DataIssueForm />
      </div>
    </div>
  );
};
