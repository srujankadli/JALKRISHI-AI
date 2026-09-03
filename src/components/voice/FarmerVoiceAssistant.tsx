import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Square,
  Sparkles,
  AlertCircle,
  Globe,
  Radio,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';
import { VoiceAssistantService, type VoiceQueryResponse } from '../../services/voiceAssistantService';
import { t, SUPPORTED_LANGUAGES } from '../../i18n';

type AssistantState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';

interface FarmerVoiceAssistantProps {
  currentLanguage: string;
  selectedLat?: number;
  selectedLng?: number;
  locationName?: string;
  onClose?: () => void;
}

export const FarmerVoiceAssistant: React.FC<FarmerVoiceAssistantProps> = ({
  currentLanguage,
  selectedLat = 13.1367,
  selectedLng = 78.1291,
  locationName = 'Selected Farm Location',
}) => {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [queryText, setQueryText] = useState('');
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [responseLang, setResponseLang] = useState(currentLanguage);

  useEffect(() => {
    setResponseLang(currentLanguage);
  }, [currentLanguage]);

  // Web Speech Recognition setup if supported by browser
  const startListening = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = responseLang;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setState('LISTENING');
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQueryText(transcript);
        handleSendQuery(transcript);
      };

      recognition.onerror = () => {
        setState('ERROR');
        setErrorMessage('Cloud speech-to-text is not configured. Please use the text input, or enable a speech provider.');
      };

      recognition.onend = () => {
        if (state === 'LISTENING') {
          setState('IDLE');
        }
      };

      try {
        recognition.start();
      } catch {
        setState('ERROR');
        setErrorMessage('Cloud speech-to-text is not configured. Please use the text input, or enable a speech provider.');
      }
    } else {
      // Browser mic speech recognition fallback
      setState('ERROR');
      setErrorMessage('Cloud speech-to-text is not configured. Please use the text input, or enable a speech provider.');
    }
  };

  const handleSendQuery = async (textToSend?: string) => {
    const text = textToSend || queryText;
    if (!text.trim()) return;

    setState('PROCESSING');
    setErrorMessage('');

    try {
      const res = await VoiceAssistantService.sendVoiceQuery(
        text,
        selectedLat,
        selectedLng,
        responseLang
      );
      setResponse(res);
      setState('RESPONDING');
    } catch (err: any) {
      setState('ERROR');
      const msg = err?.message || '';
      if (msg.includes('JSON') || msg.includes('json') || msg.includes('NOT_CONFIGURED')) {
        setErrorMessage('Cloud speech-to-text is not configured. Please use the text input, or enable a speech provider.');
      } else {
        setErrorMessage(msg || 'Failed to generate farmer advice. Please try again.');
      }
    }
  };

  const handleSpeakResponse = () => {
    if (!response) return;

    if (isSpeaking) {
      VoiceAssistantService.stopBrowserSpeech();
      setIsSpeaking(false);
    } else {
      const success = VoiceAssistantService.speakTextInBrowser(
        response.text_response,
        response.farmer_response_language
      );
      if (success) {
        setIsSpeaking(true);
      } else {
        alert('Browser text-to-speech is unavailable on this device.');
      }
    }
  };

  const handleReset = () => {
    VoiceAssistantService.stopBrowserSpeech();
    setIsSpeaking(false);
    setState('IDLE');
    setQueryText('');
    setResponse(null);
    setErrorMessage('');
  };

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shadow-2xs">
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-stone-900">
                {t('voice_assistant', currentLanguage)}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                <Sparkles className="h-3.5 w-3.5" />
                Multilingual AI
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Ask groundwater, crop, or irrigation advice for {locationName} in 13 Indian regional languages
            </p>
          </div>
        </div>

        {/* Farmer Response Language Override */}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-stone-500" />
          <select
            value={responseLang}
            onChange={(e) => setResponseLang(e.target.value)}
            className="text-xs font-bold bg-stone-100 border border-stone-300 text-stone-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Microphone Interaction Circle */}
      <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center bg-stone-50/70 rounded-3xl border border-stone-200/80 p-6">
        <button
          onClick={state === 'LISTENING' ? () => setState('IDLE') : startListening}
          disabled={state === 'PROCESSING'}
          className={`h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
            state === 'LISTENING'
              ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-200'
              : state === 'PROCESSING'
              ? 'bg-teal-600 text-white animate-spin'
              : 'bg-teal-700 text-white hover:bg-teal-800 hover:scale-105 active:scale-95'
          }`}
          aria-label={state === 'LISTENING' ? 'Stop listening' : 'Start speaking'}
        >
          {state === 'PROCESSING' ? (
            <RefreshCw className="h-10 w-10" />
          ) : state === 'LISTENING' ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>

        <div>
          <h4 className="text-base font-black text-stone-900">
            {state === 'IDLE' && t('tap_to_speak', currentLanguage)}
            {state === 'LISTENING' && t('listening', currentLanguage)}
            {state === 'PROCESSING' && t('preparing_advice', currentLanguage)}
            {state === 'RESPONDING' && 'Advice Ready'}
            {state === 'ERROR' && 'Voice Error'}
          </h4>
          <p className="text-xs text-stone-500 font-medium max-w-sm mt-0.5">
            {state === 'IDLE' && 'Speak naturally e.g. "मेरे खेत के पास भूजल कैसा है?"'}
            {state === 'LISTENING' && 'Listening to your voice query... Speak now.'}
            {state === 'PROCESSING' && 'Routing query to Unified Farmer Intelligence Engine...'}
            {state === 'RESPONDING' && 'Voice advice generated based on hydrogeological assessment.'}
          </p>
        </div>
      </div>

      {/* Manual Text Input Fallback */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
          placeholder="Or type your query in any language..."
          className="flex-1 text-xs font-medium bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={() => handleSendQuery()}
          disabled={state === 'PROCESSING' || !queryText.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-2xs"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Ask</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{errorMessage}</p>
            <p className="text-[11px] text-amber-700">
              Provider Status: STT is NOT_CONFIGURED. Manual text queries execute normally.
            </p>
          </div>
        </div>
      )}

      {/* Response Card */}
      {response && (
        <div className="p-5 rounded-3xl border border-teal-200 bg-teal-50/50 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/80 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-teal-600 animate-pulse" />
              <span className="text-xs font-extrabold uppercase text-teal-900 tracking-wider">
                Farmer Advice ({response.farmer_response_language.toUpperCase()}):
              </span>
            </div>

            {/* Audio Playback Controls */}
            <button
              onClick={handleSpeakResponse}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-teal-700 text-white hover:bg-teal-800 shadow-2xs'
              }`}
            >
              {isSpeaking ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>{t('stop', currentLanguage)}</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>{t('listen', currentLanguage)}</span>
                </>
              )}
            </button>
          </div>

          {/* Structured Text Response */}
          <div className="whitespace-pre-line text-xs font-medium text-stone-800 leading-relaxed font-sans bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs">
            {response.text_response}
          </div>

          {/* Scientific Data-Honesty Footer */}
          <div className="flex items-center justify-between text-[11px] font-mono text-teal-800 pt-1">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-teal-600" />
              {response.intelligence.coverage_type} Mode ({response.intelligence.estimation_mode})
            </span>
            <button
              onClick={handleReset}
              className="text-xs text-teal-700 hover:text-teal-900 underline font-bold cursor-pointer"
            >
              Ask Another Question
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
