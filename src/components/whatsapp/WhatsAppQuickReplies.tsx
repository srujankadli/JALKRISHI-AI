import React from 'react';

interface QuickReplyOption {
  label: string;
  query: string;
  hindiLabel?: string;
}

interface WhatsAppQuickRepliesProps {
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export const WhatsAppQuickReplies: React.FC<WhatsAppQuickRepliesProps> = ({
  onSelect,
  disabled = false,
}) => {
  const options: QuickReplyOption[] = [
    { label: '💧 Water Status', query: 'Kolar water', hindiLabel: '💧 पानी की स्थिति' },
    { label: '🔮 30d Forecast', query: 'Kolar forecast', hindiLabel: '🔮 30-दिन पूर्वानुमान' },
    { label: '🌱 Crop Advice', query: 'What crop should I grow?', hindiLabel: '🌱 फसल सलाह' },
    { label: '⚠️ Depletion Alerts', query: 'Any warnings or alerts?', hindiLabel: '⚠️ अलर्ट व चेतावनी' },
    { label: '📍 Nearest Station', query: 'Nearest station', hindiLabel: '📍 नजदीकी कुआं' },
    { label: '❓ Help & Commands', query: 'help', hindiLabel: '❓ सहायता' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-3 no-scrollbar border-t border-stone-200/60 bg-stone-100/70">
      <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap mr-1">
        Quick Ask:
      </span>
      {options.map((opt, i) => (
        <button
          key={i}
          disabled={disabled}
          onClick={() => onSelect(opt.query)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 text-xs font-semibold whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
};
