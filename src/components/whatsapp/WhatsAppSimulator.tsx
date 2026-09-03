import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  Languages,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  whatsappService,
  type WhatsAppActionItem,
} from '../../services/whatsappService';
import { WhatsAppMessageBubble, type ChatMessage } from './WhatsAppMessageBubble';
import { WhatsAppQuickReplies } from './WhatsAppQuickReplies';
import { WhatsAppTypingIndicator } from './WhatsAppTypingIndicator';
import { WhatsAppInput } from './WhatsAppInput';

interface WhatsAppSimulatorProps {
  className?: string;
  initialDistrict?: string;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  className = '',
  initialDistrict = 'Kolar',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [conversationId] = useState<string>(() => `conv-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Initial Greeting on mount
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'msg-welcome-1',
      sender: 'jalkrishi',
      text:
        currentLang === 'hi'
          ? `🌾 *जलकृषि एआई (JalKrishi AI) में आपका स्वागत है!*\n“अपना पानी जानें, समझदारी से फसल उगाएं।”\n\nनमस्ते किसान भाई! मैं आपके क्षेत्र (${initialDistrict}) का रियल-टाइम भूजल स्तर, 30-दिन का पूर्वानुमान और फसल सलाह बता सकता हूँ।\n\n👉 *आप यह पूछ सकते हैं:*\n• “${initialDistrict} में पानी”\n• “पूर्वानुमान”\n• “कम पानी वाली फसलें”\n• “कोई चेतावनी है?”\n\n⚡ *तुरंत शॉर्टकट:*\n*1* पानी  |  *2* पूर्वानुमान  |  *3* फसल  |  *4* अलर्ट`
          : `🌾 *Welcome to JalKrishi AI Farmer Assistant!*\n“Know Your Water. Grow Smarter.”\n\nHello Farmer! I can check real-time DWLR groundwater levels, 30-day depletion forecasts, and recommend water-smart crops for your district (${initialDistrict}).\n\n👉 *Try asking:*\n• “${initialDistrict} water status”\n• “${initialDistrict} forecast”\n• “What crop should I grow?”\n• “Any warnings or alerts?”\n\n⚡ *Quick Shortcuts:*\n*1* Water  |  *2* Forecast  |  *3* Crop Advice  |  *4* Alerts`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: '💧 Water Status', action: 'water', payload: { district: initialDistrict } },
        { label: '🔮 30d Forecast', action: 'forecast', payload: { district: initialDistrict } },
        { label: '🌱 Crop Advice', action: 'crop', payload: { district: initialDistrict } },
        { label: '⚠️ Alerts', action: 'alerts', payload: { district: initialDistrict } },
      ],
      intent: 'GREETING',
      dataMode: 'DEMO_SIMULATION',
    };

    setMessages([welcomeMsg]);
  }, [initialDistrict, currentLang]);

  const handleSendMessage = async (text: string, lat?: number, lon?: number) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-farmer-${Date.now()}`,
      sender: 'farmer',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Simulate realistic WhatsApp typing delay (400ms - 800ms)
      await new Promise((resolve) => setTimeout(resolve, 550));

      const res = await whatsappService.sendMessage({
        message: text.trim(),
        language: currentLang,
        conversation_id: conversationId,
        latitude: lat,
        longitude: lon,
      });

      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'jalkrishi',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: res.actions,
        intent: res.intent,
        dataMode: res.data_mode,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Fallback
      const botMsg: ChatMessage = {
        id: `msg-bot-err-${Date.now()}`,
        sender: 'jalkrishi',
        text: '🌾 *JalKrishi AI (Offline Mode)*\n\nShowing local simulated groundwater data.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = (action: WhatsAppActionItem) => {
    if (action.action === 'water') {
      handleSendMessage(action.payload?.district ? `${action.payload.district} water` : '1');
    } else if (action.action === 'forecast') {
      handleSendMessage(action.payload?.station_id ? `forecast ${action.payload.station_id}` : action.payload?.district ? `${action.payload.district} forecast` : '2');
    } else if (action.action === 'crop') {
      handleSendMessage('What crop should I grow?');
    } else if (action.action === 'alerts') {
      handleSendMessage('Any warnings?');
    } else if (action.action === 'nearest') {
      if (action.payload?.lat && action.payload?.lon) {
        handleSendMessage('📍 Shared GPS Location', action.payload.lat, action.payload.lon);
      } else {
        handleSendMessage('nearest station');
      }
    } else {
      handleSendMessage(action.label);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setCurrentLang((prev) => prev); // triggers initial greeting
  };

  const toggleLanguage = () => {
    setCurrentLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return (
    <div
      className={`flex flex-col h-[650px] max-w-xl mx-auto rounded-3xl overflow-hidden border border-stone-300 shadow-2xl bg-[#efeae2] ${className}`}
    >
      {/* 1. Realistic WhatsApp Top Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md select-none">
        {/* Left Side: Avatar & Name */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl shadow-xs">
              🌾
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#075e54]"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm leading-tight tracking-wide">JalKrishi AI</h3>
              <span title="Verified Assistant">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1">
              <span>Farmer Water Assistant</span>
              <span>&bull;</span>
              <span className="text-emerald-300 font-medium">Online</span>
            </p>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={toggleLanguage}
            title="Switch Language (English / Hindi)"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-800/70 hover:bg-emerald-800 text-[11px] font-bold text-emerald-100 border border-emerald-700/60 transition-colors cursor-pointer"
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{currentLang === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>

          {/* Reset Chat */}
          <button
            onClick={handleResetChat}
            title="Reset Conversation"
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Sub-Banner: Simulation Mode & Privacy Notice */}
      <div className="bg-[#128c7e]/10 border-b border-stone-200/60 px-3 py-1.5 flex items-center justify-between text-[11px] text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
          <span>Simulation Data (5,260 DWLR Nodes)</span>
        </div>
        <span className="text-[10px] text-stone-500 hidden sm:inline">
          No real WhatsApp SMS sent
        </span>
      </div>

      {/* 3. Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#e5ddd5]/60 bg-[radial-gradient(#00000008_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Encryption Banner */}
        <div className="text-center my-2">
          <span className="inline-block bg-[#ffeecd] border border-amber-200/80 rounded-lg px-3 py-1 text-[10px] text-amber-900 font-medium shadow-2xs">
            🔒 Simulated WhatsApp conversational interface for JalKrishi AI.
          </span>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => (
          <WhatsAppMessageBubble
            key={msg.id}
            message={msg}
            onActionClick={handleActionClick}
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && <WhatsAppTypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Reply Suggestions */}
      <WhatsAppQuickReplies
        onSelect={(query) => handleSendMessage(query)}
        disabled={isTyping}
      />

      {/* 5. Realistic Bottom Input Bar */}
      <WhatsAppInput
        onSendMessage={(text) => handleSendMessage(text)}
        onSendLocation={(lat, lon) =>
          handleSendMessage('📍 Shared GPS Location', lat, lon)
        }
        disabled={isTyping}
      />
    </div>
  );
};
