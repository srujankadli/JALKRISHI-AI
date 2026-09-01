import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { DWLRStation, StationStatus } from '../../types';
import { APP_CONFIG } from '../../utils/constants';
import { RotateCcw, Locate, Maximize2, Minimize2 } from 'lucide-react';

interface GroundwaterMapProps {
  stations: DWLRStation[];
  selectedStation?: DWLRStation | null;
  onSelectStation?: (station: DWLRStation) => void;
  onViewStationDetails: (station: DWLRStation) => void;
  onUserLocationFound?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
  panToCoords?: { lat: number; lng: number; zoom?: number } | null;
}

// Marker Icon Generator
const createMarkerIcon = (status: StationStatus, isSelected = false) => {
  const colors: Record<StationStatus, { main: string; glow: string }> = {
    healthy: { main: '#16a34a', glow: 'rgba(22, 163, 74, 0.4)' },
    moderate: { main: '#eab308', glow: 'rgba(234, 179, 8, 0.4)' },
    warning: { main: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
    critical: { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
  };

  const { main, glow } = colors[status] || colors.healthy;
  const size = isSelected ? 28 : 20;

  return L.divIcon({
    className: 'custom-dwlr-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background-color: ${main};
        border: ${isSelected ? '3px' : '2px'} solid #ffffff;
        box-shadow: 0 0 0 ${isSelected ? '4px' : '2px'} ${glow}, 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
        transform: translate(-50%, -50%);
        cursor: pointer;
      ">
        <div style="
          width: ${isSelected ? '8px' : '4px'};
          height: ${isSelected ? '8px' : '4px'};
          background-color: #ffffff;
          border-radius: 9999px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -12],
  });
};

// High Performance Cluster Layer using Leaflet MarkerCluster
const ClusteredStationMarkers: React.FC<{
  stations: DWLRStation[];
  selectedStation?: DWLRStation | null;
  onSelectStation?: (station: DWLRStation) => void;
  onViewStationDetails: (station: DWLRStation) => void;
}> = ({ stations, selectedStation, onSelectStation, onViewStationDetails }) => {
  const map = useMap();
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Create marker cluster group with custom cluster styling
    const clusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let sizeClass = 'cluster-small';
        if (count > 200) sizeClass = 'cluster-xlarge';
        else if (count > 80) sizeClass = 'cluster-large';
        else if (count > 20) sizeClass = 'cluster-medium';

        return L.divIcon({
          html: `<div class="cluster-bubble ${sizeClass}"><span>${count > 999 ? (count / 1000).toFixed(1) + 'k' : count}</span></div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(40, 40),
          iconAnchor: [20, 20],
        });
      },
    });

    clusterGroupRef.current = clusterGroup;

    // Add markers to cluster
    const markers: any[] = [];
    stations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const marker = L.marker([station.latitude, station.longitude], {
        icon: createMarkerIcon(station.status, isSelected),
      });

      // Hover Tooltip
      const statusLabels: Record<StationStatus, { text: string; color: string }> = {
        healthy: { text: '🟢 Healthy', color: '#15803d' },
        moderate: { text: '🟡 Moderate', color: '#b45309' },
        warning: { text: '🟠 Warning', color: '#c2410c' },
        critical: { text: '🔴 Critical', color: '#b91c1c' },
      };
      const statInfo = statusLabels[station.status];

      marker.bindTooltip(
        `
        <div style="font-family: inherit; padding: 2px 4px; font-size: 11px;">
          <strong style="color: #1c1917; font-size: 12px; display: block;">${station.stationName}</strong>
          <span style="color: #78716c;">${station.district}, ${station.state}</span>
          <div style="margin-top: 3px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <span style="font-weight: 700; color: #0369a1;">Depth: ${station.waterLevel}m</span>
            <span style="font-weight: 700; color: ${statInfo.color};">${statInfo.text}</span>
          </div>
        </div>
        `,
        { direction: 'top', offset: [0, -10], opacity: 0.95 }
      );

      // Popup on click
      const popupHtml = document.createElement('div');
      popupHtml.className = 'p-3.5 bg-white font-sans text-stone-900 w-[270px]';
      popupHtml.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${statInfo.color}; background: #f5f5f4; padding: 2px 6px; border-radius: 4px;">
            ${statInfo.text}
          </span>
          <span style="font-size: 10px; font-family: monospace; color: #78716c;">${station.stationCode}</span>
        </div>
        <h4 style="font-size: 13px; font-weight: 800; margin-top: 6px; color: #1c1917; line-height: 1.2;">
          ${station.stationName}
        </h4>
        <p style="font-size: 11px; color: #78716c; margin-top: 2px;">
          ${station.block} Block, ${station.district}, ${station.state}
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f5f5f4; padding: 8px; border-radius: 8px; margin-top: 8px; font-size: 11px;">
          <div>
            <span style="font-size: 10px; color: #78716c; display: block;">Water Depth</span>
            <strong style="font-size: 13px; color: #1c1917;">${station.waterLevel} mbgl</strong>
          </div>
          <div>
            <span style="font-size: 10px; color: #78716c; display: block;">Risk Score</span>
            <strong style="font-size: 13px; color: #1c1917;">${Math.round(station.riskScore * 100)}/100</strong>
          </div>
        </div>
        <p style="font-size: 11px; color: #44403c; margin-top: 8px; line-height: 1.3;">
          <strong style="color: #15803d;">🌱 Advice: </strong>${station.actionableAdvice || 'Maintain balanced irrigation.'}
        </p>
      `;

      const btn = document.createElement('button');
      btn.className = 'w-full mt-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs';
      btn.innerHTML = '<span>View Station Details</span> &rarr;';
      btn.onclick = (e) => {
        e.stopPropagation();
        onViewStationDetails(station);
      };
      popupHtml.appendChild(btn);

      marker.bindPopup(popupHtml, { minWidth: 270, maxWidth: 290 });

      marker.on('click', () => {
        onSelectStation?.(station);
      });

      markers.push(marker);
    });

    clusterGroup.addLayers(markers);
    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, stations, selectedStation, onSelectStation, onViewStationDetails]);

  return null;
};

// Pan & Zoom Controller
const MapNavigationController: React.FC<{
  panToCoords?: { lat: number; lng: number; zoom?: number } | null;
  selectedStation?: DWLRStation | null;
}> = ({ panToCoords, selectedStation }) => {
  const map = useMap();

  useEffect(() => {
    if (panToCoords) {
      map.flyTo([panToCoords.lat, panToCoords.lng], panToCoords.zoom || 8, {
        duration: 1.2,
      });
    } else if (selectedStation) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 10, {
        duration: 1.2,
      });
    }
  }, [panToCoords, selectedStation, map]);

  return null;
};

// Map Controls Overlay (Inside MapContainer so useMap is valid)
const MapControlsOverlay: React.FC<{
  mapLayer: 'osm' | 'terrain' | 'carto';
  setMapLayer: (layer: 'osm' | 'terrain' | 'carto') => void;
  onLocateMe: () => void;
  isLocating: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}> = ({
  mapLayer,
  setMapLayer,
  onLocateMe,
  isLocating,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const map = useMap();

  return (
    <div className="leaflet-top leaflet-right pointer-events-none p-3 z-[1000]">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {/* Reset All India Button */}
        <button
          onClick={() => map.flyTo(APP_CONFIG.defaultMapCenter, APP_CONFIG.defaultMapZoom, { duration: 1 })}
          className="rounded-xl border border-stone-300 bg-white/95 p-2.5 text-stone-700 shadow-md backdrop-blur-xs hover:bg-white active:scale-95 transition-all cursor-pointer"
          title="Reset Map View (All India)"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Locate Me Button */}
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          className="rounded-xl border border-stone-300 bg-white/95 p-2.5 text-stone-700 shadow-md backdrop-blur-xs hover:bg-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Find Nearest Station to My Location"
        >
          <Locate className={`h-4 w-4 text-water-700 ${isLocating ? 'animate-spin' : ''}`} />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="rounded-xl border border-stone-300 bg-white/95 p-2.5 text-stone-700 shadow-md backdrop-blur-xs hover:bg-white active:scale-95 transition-all cursor-pointer hidden sm:block"
          title={isFullscreen ? 'Exit Expanded View' : 'Expand Map View'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Base Layer Switcher */}
        <div className="flex items-center rounded-xl border border-stone-300 bg-white/95 p-1 shadow-md backdrop-blur-xs text-xs font-semibold">
          <button
            onClick={() => setMapLayer('osm')}
            className={`rounded-lg px-2 py-1 cursor-pointer transition-colors ${
              mapLayer === 'osm' ? 'bg-agri-700 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => setMapLayer('carto')}
            className={`rounded-lg px-2 py-1 cursor-pointer transition-colors ${
              mapLayer === 'carto' ? 'bg-agri-700 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            Clean
          </button>
        </div>
      </div>
    </div>
  );
};

export const GroundwaterMap: React.FC<GroundwaterMapProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onViewStationDetails,
  onUserLocationFound,
  height = '600px',
  className = '',
  panToCoords,
}) => {
  const [mapLayer, setMapLayer] = useState<'osm' | 'terrain' | 'carto'>('osm');
  const [isLocating, setIsLocating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const tileUrls = {
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    carto: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please search for your district above.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        onUserLocationFound?.(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation access denied or unavailable', error);
        alert('Location access is unavailable. You can search for your district or station name above.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-stone-200 shadow-card transition-all ${
        isFullscreen ? 'fixed inset-4 z-[3000] h-[calc(100vh-2rem)]' : ''
      } ${className}`}
      style={{ height: isFullscreen ? undefined : height }}
    >
      <MapContainer
        center={APP_CONFIG.defaultMapCenter}
        zoom={APP_CONFIG.defaultMapZoom}
        scrollWheelZoom={true}
        className="h-full w-full select-none"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrls[mapLayer]}
        />

        <MapNavigationController panToCoords={panToCoords} selectedStation={selectedStation} />

        <MapControlsOverlay
          mapLayer={mapLayer}
          setMapLayer={setMapLayer}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        <ClusteredStationMarkers
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={onSelectStation}
          onViewStationDetails={onViewStationDetails}
        />
      </MapContainer>

      {/* Persistent Map Status Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-stone-200/90 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur-xs text-xs">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <p className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px]">
            Groundwater Status
          </p>
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-mono text-stone-600">
            {stations.length.toLocaleString('en-IN')} Stations
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-semibold text-stone-700">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
            Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
            Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500 ring-2 ring-orange-200" />
            Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-600 ring-2 ring-rose-200" />
            Critical
          </span>
        </div>

        <p className="mt-1.5 text-[10px] text-stone-400 border-t border-stone-100 pt-1">
          Simulated DWLR Network &bull; Click cluster to zoom
        </p>
      </div>
    </div>
  );
};
