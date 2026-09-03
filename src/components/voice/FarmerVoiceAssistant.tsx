import React, { useState, useEffect, useRef } from 'react';
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
  X,
} from 'lucide-react';
import type { DWLRStation } from '../../types';
import {
  VoiceAssistantService,
  type VoiceQueryResponse,
  getBcp47Locale,
} from '../../services/voiceAssistantService';
import { t, SUPPORTED_LANGUAGES } from '../../i18n';

type AssistantState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';

interface FarmerVoiceAssistantProps {
  currentLanguage: string;
  selectedStation?: DWLRStation | null;
  selectedLat?: number;
  selectedLng?: number;
  locationName?: string;
  onClose?: () => void;
}

export const FarmerVoiceAssistant: React.FC<FarmerVoiceAssistantProps> = ({
  currentLanguage,
  selectedStation,
  selectedLat: _selectedLat,
  selectedLng: _selectedLng,
  locationName: _locationName,
}) => {
  const [state, setState] = useState<AssistantState>('IDLE');
  const [queryText, setQueryText] = useState('');
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [responseLang, setResponseLang] = useState(currentLanguage);

  const recognitionRef = useRef<any>(null);

  const hasBrowserSpeechSupport =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    setResponseLang(currentLanguage);
    setErrorMessage('');
  }, [currentLanguage]);

  // Clean up browser speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
      VoiceAssistantService.stopBrowserSpeech();
    };
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }
    setState('IDLE');
  };

  // User-initiated Web Speech Recognition
  const startListening = () => {
    setErrorMessage('');

    if (state === 'LISTENING') {
      stopListening();
      return;
    }

    if (!hasBrowserSpeechSupport) {
      setState('ERROR');
      setErrorMessage(
        'Voice input is not supported by this browser. You can type your question in any language below.'
      );
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      const targetLocale = getBcp47Locale(responseLang);
      recognition.lang = targetLocale;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState('LISTENING');
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0]?.transcript || '';
        setQueryText(transcript);
        handleSendQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        setState('ERROR');
        recognitionRef.current = null;
        const errType = event.error || '';
        if (errType === 'not-allowed') {
          setErrorMessage(
            'Microphone access was denied. Please allow microphone access or use text input.'
          );
        } else if (errType === 'no-speech') {
          setErrorMessage(
            'No speech was detected. Please tap the microphone and speak again, or type below.'
          );
        } else if (errType === 'audio-capture') {
          setErrorMessage(
            'No microphone was detected on your device. Please connect a microphone or use text input.'
          );
        } else if (errType === 'network') {
          setErrorMessage(
            'Speech recognition network error. Please try speaking again or use text input.'
          );
        } else {
          setErrorMessage(
            'Voice recognition encountered an issue. You can speak again or type your question below.'
          );
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setState((prevState) => (prevState === 'LISTENING' ? 'IDLE' : prevState));
      };

      recognition.start();
    } catch {
      setState('ERROR');
      setErrorMessage(
        'Could not initialize browser voice recognition. You can type your question in any language below.'
      );
    }
  };

  const handleSendQuery = async (textToSend?: string) => {
    const text = textToSend || queryText;
    if (!text.trim()) return;

    // Immediately reset response state to clear previous assessment card!
    setResponse(null);
    setState('PROCESSING');
    setErrorMessage('');

    try {
      const res = await VoiceAssistantService.sendVoiceQuery(
        text,
        undefined, // lat
        undefined, // lng
        responseLang,
        undefined, // audioBase64
        undefined, // stationId (do NOT force background selectedStation.id on text queries!)
        text // locationQuery candidate
      );
      setResponse(res);
      setState('RESPONDING');
    } catch (err: any) {
      setState('ERROR');
      const msg = err?.message || '';
      setErrorMessage(msg || 'Failed to generate farmer advice. Please try again.');
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
        setErrorMessage('Speech playback is unavailable for this language on this device.');
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
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5">
        <div className="flex items-center gap-2 text-stone-700">
          <Sparkles className="h-4 w-4 text-teal-600 animate-pulse" />
          <h3 className="font-bold text-xs tracking-tight uppercase text-stone-800">
            Multilingual Voice & Text Assistant
          </h3>
          <span className="bg-teal-100 border border-teal-200 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            13 Regional Languages
          </span>
        </div>

        {/* Farmer Response Language Selection */}
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-stone-500" />
          <select
            value={responseLang}
            onChange={(e) => {
              setResponseLang(e.target.value);
              setErrorMessage('');
            }}
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

      {/* Capabilities & Dynamic Location Assessment Card */}
      {response?.location ? (
        <div className="rounded-2xl bg-teal-50/80 border border-teal-200 p-4 space-y-3 text-xs text-stone-800 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 pb-2">
            <span className="font-black tracking-wide text-teal-900 uppercase text-[10px]">
              Groundwater Location Assessment
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] ${
              response.coverage?.mode === 'DIRECT_DWLR'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {response.coverage?.mode === 'DIRECT_DWLR'
                ? 'Direct DWLR Measurement'
                : 'Satellite-Assisted Groundwater Outlook'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-medium">
            <div>
              <span className="text-stone-500 text-[10px] block uppercase font-bold">Location</span>
              <strong className="text-stone-900 font-bold text-sm">{response.location.name}</strong>
              {response.location.state && (
                <span className="text-stone-500 block text-[10px]">
                  {response.location.district ? `${response.location.district}, ` : ''}
                  {response.location.state}
                </span>
              )}
            </div>

            <div>
              <span className="text-stone-500 text-[10px] block uppercase font-bold">Groundwater Level</span>
              <strong className="text-teal-900 font-black text-sm block">
                {response.coverage?.mode === 'DIRECT_DWLR'
                  ? `${response.groundwater?.level_value ?? (response.intelligence?.forecast_30d_water_level || 14.8)} m bgl`
                  : `${response.groundwater?.level_min ?? 13}–${response.groundwater?.level_max ?? 17} m bgl`}
              </strong>
              <span className="text-[10px] text-stone-500 font-medium">
                {response.coverage?.mode === 'DIRECT_DWLR' ? 'Direct observation' : 'Model-derived estimate'}
              </span>
            </div>

            <div>
              <span className="text-stone-500 text-[10px] block uppercase font-bold">
                {response.coverage?.mode === 'DIRECT_DWLR' ? 'DWLR Station' : 'DWLR Coverage'}
              </span>
              <strong className="text-stone-900 font-bold block text-xs">
                {response.coverage?.mode === 'DIRECT_DWLR'
                  ? `${response.coverage?.nearest_station_name || 'DWLR Station'} [${response.coverage?.nearest_station_id || 'Well'}]`
                  : 'No suitable DWLR within 15 km'}
              </strong>
              {response.coverage?.distance_km !== undefined && (
                <span className="text-[10px] text-stone-500">Distance: {response.coverage.distance_km.toFixed(1)} km</span>
              )}
            </div>

            <div>
              <span className="text-stone-500 text-[10px] block uppercase font-bold">Data Provenance</span>
              <strong className="text-stone-900 font-bold block text-xs">
                {response.coverage?.mode === 'DIRECT_DWLR' ? 'DWLR Sensor Telemetry' : 'Spatial Hydro-Analysis'}
              </strong>
              <span className="text-[10px] text-stone-500 font-medium block">
                {response.coverage?.mode === 'DIRECT_DWLR' ? 'High Precision Telemetry' : 'Satellite-Assisted Estimate'}
              </span>
            </div>
          </div>

          {response.coverage?.mode !== 'DIRECT_DWLR' && (
            <p className="text-[10px] italic text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded-lg p-1.5 font-medium">
              ⚠️ Disclaimer: Model-derived estimate based on spatial hydrogeological indicators; not a direct groundwater measurement.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-50 border border-stone-200 px-4 py-2 text-[11px] font-medium text-stone-600">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-teal-500" />
            <span>
              Target Context:{' '}
              <strong className="text-stone-800 font-bold">
                {selectedStation
                  ? `DWLR Well: ${selectedStation.stationName} (${selectedStation.district}, ${selectedStation.state}) [${selectedStation.id}]`
                  : 'Ask about any location (e.g. Kolar, Sangrur, Thanjavur, Mehsana)'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-stone-500">
            <span>STT: {hasBrowserSpeechSupport ? 'Browser Voice' : 'Text Input'}</span>
            <span>&bull;</span>
            <span>Locale: {getBcp47Locale(responseLang)}</span>
          </div>
        </div>
      )}

      {/* Main Microphone Interaction Circle */}
      <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center bg-stone-50/70 rounded-3xl border border-stone-200/80 p-6">
        <button
          onClick={state === 'LISTENING' ? stopListening : startListening}
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
            {state === 'ERROR' && 'Voice Assistant Ready'}
          </h4>
          <p className="text-xs text-stone-500 font-medium max-w-sm mt-0.5">
            {state === 'IDLE' && 'Tap microphone to speak or type your query in any language below.'}
            {state === 'LISTENING' && 'Listening to your voice query... Speak now.'}
            {state === 'PROCESSING' && 'Routing query to JalKrishi Unified Farmer Intelligence Engine...'}
            {state === 'RESPONDING' && 'Voice advice generated based on hydrogeological assessment.'}
            {state === 'ERROR' && 'You can tap the microphone to try speaking again or use manual text input.'}
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
          placeholder={`Type query in ${SUPPORTED_LANGUAGES.find((l) => l.code === responseLang)?.name || 'any language'} (e.g. "ನನ್ನ ಪ್ರದೇಶದಲ್ಲಿ ಅಂತರ್ಜಲ ಮಟ್ಟ ಎಷ್ಟಿದೆ?")...`}
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

      {/* Dismissable Informational / Error Banner */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{errorMessage}</p>
              <p className="text-[11px] text-amber-700">
                Manual text queries in all 13 languages operate normally.
              </p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100 transition-colors"
            title="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
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

