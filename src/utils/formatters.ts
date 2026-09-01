export function formatDepth(meters: number): string {
  return `${meters.toFixed(1)} m`;
}

export function formatRiskScore(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

export function formatDaysToCritical(days: number | null): string {
  if (days === null) return 'No Critical Risk';
  if (days <= 0) return 'Immediate Criticality';
  return `${days} Days to Critical`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}
