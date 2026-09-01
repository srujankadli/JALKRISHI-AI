import React, { useState } from 'react';
import { Send, MapPin, Smile, Paperclip, Mic } from 'lucide-react';

interface WhatsAppInputProps {
  onSendMessage: (text: string) => void;
  onSendLocation: (lat: number, lon: number) => void;
  disabled?: boolean;
}

export const WhatsAppInput: React.FC<WhatsAppInputProps> = ({
  onSendMessage,
  onSendLocation,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleShareDemoLocation = () => {
    // Default to Kolar coordinates for demonstration
    onSendLocation(13.13, 78.13);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2.5 sm:p-3 bg-stone-100 border-t border-stone-200 flex items-center gap-2"
    >
      {/* Location Share / GPS Button */}
      <button
        type="button"
        onClick={handleShareDemoLocation}
        disabled={disabled}
        title="Share GPS Location (Kolar 13.13N, 78.13E)"
        className="p-2 rounded-full text-stone-500 hover:text-emerald-700 hover:bg-stone-200 transition-colors cursor-pointer"
      >
        <MapPin className="h-5 w-5" />
      </button>

      {/* Attachment Button */}
      <button
        type="button"
        disabled={disabled}
        title="Attach Document / Farm Photo"
        className="hidden sm:inline-flex p-2 rounded-full text-stone-500 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
      >
        <Paperclip className="h-5 w-5" />
      </button>

      {/* Emoji Button */}
      <button
        type="button"
        disabled={disabled}
        title="Insert Emoji"
        className="hidden sm:inline-flex p-2 rounded-full text-stone-500 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
      >
        <Smile className="h-5 w-5" />
      </button>

      {/* Text Input Box */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={disabled}
          placeholder="Type a message (e.g. 'Kolar water', '1', 'फसल सलाह')..."
          className="w-full rounded-2xl bg-white border border-stone-200 px-4 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Send or Mic Button */}
      {inputText.trim().length > 0 ? (
        <button
          type="submit"
          disabled={disabled}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send message"
        >
          <Send className="h-4 w-4 sm:h-4.5 sm:w-4.5 ml-0.5" />
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          title="Voice Message (Demo)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 flex items-center justify-center transition-all cursor-pointer"
        >
          <Mic className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
        </button>
      )}
    </form>
  );
};
