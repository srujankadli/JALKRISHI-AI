import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FarmerSummaryBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-agri-800 via-agri-700 to-water-800 text-white px-4 py-2.5 sm:px-6 shadow-sm">
      <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-center md:text-left">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs">
            🌾
          </span>
          <p className="font-medium text-emerald-50">
            <strong className="text-white font-bold">Farmer Advisory: </strong>
            Monsoon groundwater recharge active across 64% of DWLR stations. 3 Punjab & Rajasthan districts flagged with rapid drawdown alerts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/crops"
            className="inline-flex items-center gap-1 font-bold text-emerald-200 hover:text-white transition-colors underline"
          >
            <span>Get Water-Smart Crop Plan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
