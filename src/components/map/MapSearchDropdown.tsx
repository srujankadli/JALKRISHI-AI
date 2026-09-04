import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import type { DWLRStation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatDepth } from '../../utils/formatters';
import { useLanguage } from '../../context/LanguageContext';

interface MapSearchDropdownProps {
  stations: DWLRStation[];
  onSelectStation: (station: DWLRStation) => void;
  placeholder?: string;
}

export const MapSearchDropdown: React.FC<MapSearchDropdownProps> = ({
  stations,
  onSelectStation,
  placeholder,
}) => {
  const { t } = useLanguage();
  const defaultPlaceholder = t('Search by Station ID, Village, District, State or Block...');
  const searchPlaceholder = placeholder ? t(placeholder) : defaultPlaceholder;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DWLRStation[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = stations
      .filter(
        (s) =>
          s.stationName.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.block.toLowerCase().includes(q) ||
          s.stationCode.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      )
      .slice(0, 8); // Top 8 matches for speed

    setResults(matches);
    setIsOpen(matches.length > 0);
  }, [query, stations]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (station: DWLRStation) => {
    setQuery(station.stationName);
    setIsOpen(false);
    onSelectStation(station);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400 shadow-xs focus:border-agri-600 focus:outline-none focus:ring-2 focus:ring-agri-600/20"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[2000] mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl divide-y divide-stone-100">
          {results.map((station) => (
            <div
              key={station.id}
              onClick={() => handleSelect(station)}
              className="flex items-center justify-between p-3 transition-colors hover:bg-stone-50 cursor-pointer"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate">
                    {station.stationName}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {station.block} Block &bull; {station.district}, {station.state} &bull;{' '}
                    <span className="font-mono text-stone-600">{station.stationCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-xs font-extrabold text-stone-900 font-mono">
                  {formatDepth(station.waterLevel)}
                </span>
                <StatusBadge status={station.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
