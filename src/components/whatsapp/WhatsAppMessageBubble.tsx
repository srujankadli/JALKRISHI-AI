import React from 'react';
import { CheckCheck } from 'lucide-react';
import type { WhatsAppActionItem } from '../../services/whatsappService';

export interface ChatMessage {
  id: string;
  sender: 'farmer' | 'jalkrishi';
  text: string;
  timestamp: string;
  actions?: WhatsAppActionItem[];
  intent?: string;
  dataMode?: string;
}

interface WhatsAppMessageBubbleProps {
  message: ChatMessage;
  onActionClick: (action: WhatsAppActionItem) => void;
}

export const WhatsAppMessageBubble: React.FC<WhatsAppMessageBubbleProps> = ({
  message,
  onActionClick,
}) => {
  const isFarmer = message.sender === 'farmer';

  // Format message text: convert *bold* to <strong>, _italic_ to <em>, and linebreaks
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, lineIdx) => {
      // Replace *bold* with <strong>
      const formatted = line.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
      return (
        <span
          key={lineIdx}
          className="block"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <div
      className={`flex flex-col ${
        isFarmer ? 'items-end' : 'items-start'
      } mb-3 group animate-fadeIn`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs text-xs sm:text-sm leading-relaxed ${
          isFarmer
            ? 'bg-[#dcf8c6] text-stone-900 rounded-tr-xs border border-emerald-200/50'
            : 'bg-white text-stone-800 rounded-tl-xs border border-stone-200/80'
        }`}
      >
        {/* Message Content */}
        <div className="space-y-1 select-text">{renderFormattedText(message.text)}</div>

        {/* Action Buttons (WhatsApp Interactive Buttons) */}
        {!isFarmer && message.actions && message.actions.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap gap-1.5">
            {message.actions.map((act, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(act)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95"
              >
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Bubble Timestamp & Status */}
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${
            isFarmer ? 'text-emerald-700/80' : 'text-stone-400'
          }`}
        >
          <span>{message.timestamp}</span>
          {isFarmer && <CheckCheck className="h-3.5 w-3.5 text-water-600" />}
        </div>
      </div>
    </div>
  );
};
