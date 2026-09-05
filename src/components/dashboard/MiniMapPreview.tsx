import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Radio } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { GroundwaterMap } from '../map/GroundwaterMap';
import { stationService } from '../../services/stationService';
import type { DWLRStation } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface MiniMapPreviewProps {
  onSelectStation: (station: DWLRStation) => void;
}

export const MiniMapPreview: React.FC<MiniMapPreviewProps> = ({ onSelectStation }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stations, setStations] = useState<DWLRStation[]>([]);

  useEffect(() => {
    async function load() {
      // Load representative sample stations for dashboard preview
      const all = await stationService.getAllStations();
      setStations(all);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title={t('Groundwater Across India')}
        subtitle={t('Geographic snapshot of telemetric observation wells and regional aquifer stress')}
        icon={<MapPin className="h-5 w-5 text-water-600" />}
        action={
          <button
            onClick={() => navigate('/map')}
            className="text-xs font-bold text-agri-700 hover:text-agri-900 inline-flex items-center gap-1"
          >
            {t('Explore Full Map')} ({stations.length} {t('Stations')}) <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="relative rounded-2xl border border-stone-200 bg-white p-4 shadow-subtle overflow-hidden">
        {/* Top Overlay Bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-water-50 border border-water-200 px-2.5 py-0.5 font-bold text-water-800">
              <Radio className="h-3 w-3 text-water-600 animate-pulse" />
              {t('DWLR Network')} • 5,260 {t('Stations (Simulated Demo)')}
            </span>
            <span className="text-stone-500 font-medium hidden sm:inline">
              {t('All India Representative Grid')}
            </span>
          </div>

          <button
            onClick={() => navigate('/map')}
            className="rounded-lg bg-agri-700 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-agri-800 transition-all flex items-center gap-1"
          >
            <span>{t('Open Interactive Map')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Map Container (Compact Height: 380px) */}
        <GroundwaterMap
          stations={stations}
          onViewStationDetails={onSelectStation}
          height="380px"
        />
      </div>
    </div>
  );
};
