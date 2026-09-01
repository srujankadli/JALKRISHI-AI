import React, { useEffect, useState } from 'react';
import { Server, WifiOff, RefreshCw } from 'lucide-react';
import { apiClient, type BackendConnectionStatus } from '../../services/apiClient';

interface BackendStatusBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export const BackendStatusBadge: React.FC<BackendStatusBadgeProps> = ({
  className = '',
  showDetails = false,
}) => {
  const [status, setStatus] = useState<BackendConnectionStatus>(apiClient.getConnectionStatus());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = apiClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    // Check initial health
    apiClient.checkHealth();
    return () => unsubscribe();
  }, []);

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    await apiClient.checkHealth(true);
    setIsChecking(false);
  };

  if (status === 'connected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition-all ${className}`}
        title="FastAPI intelligence backend connected. Current data mode: demonstration simulation."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
        </span>
        <Server className="h-3 w-3 text-emerald-600" />
        <span>Backend Connected</span>
        {showDetails && (
          <span className="text-[10px] text-emerald-600 font-normal border-l border-emerald-200 pl-1.5 ml-0.5">
            Demo Sim
          </span>
        )}
        <button
          onClick={handleManualCheck}
          className="ml-1 text-emerald-600 hover:text-emerald-900 p-0.5 rounded"
          title="Recheck backend health"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  if (status === 'fallback') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-all ${className}`}
        title="FastAPI backend offline or unreachable. Operating in Demo Fallback mode."
      >
        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
        <WifiOff className="h-3 w-3 text-amber-600" />
        <span>Demo Fallback</span>
        <button
          onClick={handleManualCheck}
          className="ml-1 text-amber-700 hover:text-amber-950 p-0.5 rounded"
          title="Retry connecting to FastAPI"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 ${className}`}
      title="Checking backend connection..."
    >
      <span className="h-2 w-2 rounded-full bg-stone-400 animate-pulse"></span>
      <span>Checking API...</span>
    </div>
  );
};
