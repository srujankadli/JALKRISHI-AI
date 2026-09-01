import type { StationStatus, TrendDirection } from '../types';

export function getStatusLabel(status: StationStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy (सुरक्षित)';
    case 'moderate':
      return 'Moderate (मध्यम)';
    case 'warning':
      return 'Warning (चेतावनी)';
    case 'critical':
      return 'Critical (संकटग्रस्त)';
    default:
      return 'Unknown';
  }
}

export function getStatusFarmerDescription(status: StationStatus): string {
  switch (status) {
    case 'healthy':
      return 'Water level is safe and sustainable for farming';
    case 'moderate':
      return 'Water level is manageable, monitor usage';
    case 'warning':
      return 'Water table is falling, reduce water-intensive crops';
    case 'critical':
      return 'Severe depletion, immediate water conservation needed';
    default:
      return 'Monitoring status active';
  }
}

export function getStatusTheme(status: StationStatus) {
  switch (status) {
    case 'healthy':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500 ring-emerald-200',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        hex: '#16a34a',
        icon: '🟢',
      };
    case 'moderate':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 ring-amber-200',
        border: 'border-amber-200',
        text: 'text-amber-700',
        hex: '#eab308',
        icon: '🟡',
      };
    case 'warning':
      return {
        bg: 'bg-orange-50 text-orange-800 border-orange-200',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
        dot: 'bg-orange-500 ring-orange-200',
        border: 'border-orange-200',
        text: 'text-orange-700',
        hex: '#f97316',
        icon: '🟠',
      };
    case 'critical':
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500 ring-rose-200',
        border: 'border-rose-200',
        text: 'text-rose-700',
        hex: '#ef4444',
        icon: '🔴',
      };
  }
}

export function getTrendDetails(trend: TrendDirection) {
  switch (trend) {
    case 'rising':
      return {
        label: 'Recharging / Rising',
        farmerText: 'Water level is rising (जल स्तर बढ़ रहा है)',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        arrow: '↑'
      };
    case 'stable':
      return {
        label: 'Stable',
        farmerText: 'Water level is steady (जल स्तर स्थिर है)',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        arrow: '→'
      };
    case 'falling':
      return {
        label: 'Depleting / Falling',
        farmerText: 'Water level is falling (जल स्तर गिर रहा है)',
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        arrow: '↓'
      };
  }
}
