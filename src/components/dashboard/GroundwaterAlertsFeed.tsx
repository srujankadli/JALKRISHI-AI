import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldCheck,
  ArrowRight,
  Clock,
  MapPin,
} from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import { useLanguage } from '../../context/LanguageContext';

interface GroundwaterAlertsFeedProps {
  onSelectStation: (stationId: string) => void;
}

export const GroundwaterAlertsFeed: React.FC<GroundwaterAlertsFeedProps> = ({ onSelectStation }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const alerts = [
    {
      id: 'ALT-PB-01',
      stationId: 'DWLR-PB-001',
      severity: 'CRITICAL',
      location: 'Sangrur, Punjab',
      block: 'Sunam Block',
      whatHappened: 'Rapid groundwater decline detected (-28 cm/month).',
      whyItMatters: 'Water levels have fallen significantly compared with the recent baseline. 22 days remaining to critical threshold.',
      timestamp: 'Today, 06:30 AM',
      style: {
        border: 'border-rose-300 bg-rose-50/40',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: AlertTriangle,
        iconColor: 'text-rose-600',
      },
    },
    {
      id: 'ALT-RJ-02',
      stationId: 'DWLR-RJ-002',
      severity: 'HIGH ALERT',
      location: 'Jodhpur, Rajasthan',
      block: 'Mandore Block',
      whatHappened: 'Severe aquifer drawdown with zero monsoon recharge recovery.',
      whyItMatters: 'Deep tube-wells operating near bottom suction head. Immediate deficit irrigation required.',
      timestamp: 'Yesterday, 04:15 PM',
      style: {
        border: 'border-orange-300 bg-orange-50/40',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
      },
    },
    {
      id: 'ALT-GJ-03',
      stationId: 'DWLR-GJ-007',
      severity: 'WARNING',
      location: 'Mehsana, Gujarat',
      block: 'Kadi Block',
      whatHappened: 'Uncoordinated overnight pumping wave detected.',
      whyItMatters: 'Aquifer recovery lag has tripled from 6 hours to >20 hours. Staggering shifts recommended.',
      timestamp: '2 days ago',
      style: {
        border: 'border-amber-300 bg-amber-50/40',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Info,
        iconColor: 'text-amber-600',
      },
    },
    {
      id: 'ALT-UP-04',
      stationId: 'DWLR-UP-005',
      severity: 'HEALTHY',
      location: 'Varanasi, Uttar Pradesh',
      block: 'Kashi Block',
      whatHappened: 'Gangetic alluvial recharge operating at optimal +0.21m recovery.',
      whyItMatters: 'Water table is robust for multi-crop rotations with zero extraction restriction.',
      timestamp: '5 mins ago',
      style: {
        border: 'border-emerald-300 bg-emerald-50/40',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: ShieldCheck,
        iconColor: 'text-emerald-600',
      },
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Groundwater Alerts"
        subtitle="Automated severity warnings from DWLR telemetry with plain-language farmer impact"
        icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
        action={
          <button
            onClick={() => navigate('/anomalies')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 inline-flex items-center gap-1"
          >
            {t('View all 4 anomalies')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.style.icon;
          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4.5 transition-all hover:shadow-subtle ${alert.style.border} bg-white`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 rounded-xl bg-white p-2 shadow-xs border border-stone-100">
                  <Icon className={`h-5 w-5 ${alert.style.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Top Bar: Severity, Location, Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${alert.style.badge}`}
                      >
                        {t(alert.severity)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-stone-900">
                        <MapPin className="h-3.5 w-3.5 text-stone-400" />
                        {alert.location}
                      </span>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] text-stone-500">
                      <Clock className="h-3 w-3" />
                      {t(alert.timestamp)}
                    </span>
                  </div>

                  {/* What Happened */}
                  <p className="mt-2 text-xs sm:text-sm font-bold text-stone-900">
                    {t(alert.whatHappened)}
                  </p>

                  {/* Why it Matters */}
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                    <strong className="text-stone-800">{t('Why it matters:')} </strong>
                    {t(alert.whyItMatters)}
                  </p>

                  {/* CTA */}
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      onClick={() => onSelectStation(alert.stationId)}
                      className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
                    >
                      <span>{t('View Station Details')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
