import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

export const CropMethodologyNote: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4.5 text-xs text-stone-700 space-y-2">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 font-extrabold text-stone-900">
          <Info className="h-4 w-4 text-agri-700" />
          <span>How Crop Recommendations Are Calculated (Hydro-Agronomic Model & Disclaimer)</span>
        </div>
        <button className="text-stone-500 hover:text-stone-800 cursor-pointer">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-[11px] text-stone-600 leading-relaxed">
        The JalKrishi AI Crop Advisor evaluates potential crop candidates using a multi-factor suitability scoring model that balances soil physics, seasonal thermal windows, expected monsoon precipitation, and local aquifer extraction limits.
      </p>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2 text-[11px] text-stone-600 animate-fadeIn">
          <div>
            <strong className="text-stone-900">1. Weighted Scoring Framework: </strong>
            Soil Compatibility (25%), Water Availability vs Crop Demand (25%), Season Window (15%), Expected Rainfall (15%), Groundwater Level & Drawdown Trajectory (20%).
          </div>
          <div>
            <strong className="text-stone-900">2. Aquifer-Aware Weighting: </strong>
            When a local DWLR node reports falling water tables (&lt;30 days to critical threshold), high-water crops (such as puddled paddy and sugarcane) receive sharp score penalties, while low-water drought-hardy pulses and millets receive positive preference bonuses.
          </div>
          <div>
            <strong className="text-stone-900">3. Simulation Disclaimer: </strong>
            All recommendations generated are calculated simulation models intended for decision-support reference. Real-world farming decisions should be cross-verified with local Krishi Vigyan Kendras (KVK), state agricultural extension officers, and soil health card laboratory tests.
          </div>
        </div>
      )}
    </div>
  );
};
