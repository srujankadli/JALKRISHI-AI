import { apiClient } from './apiClient';

export interface LanguageConfig {
  language_code: string;
  display_name: string;
  native_name: string;
  speech_supported: boolean;
  translation_supported: boolean;
  tts_supported: boolean;
  status: string;
}

export interface VoiceQueryResponse {
  query_text: string;
  detected_language: string;
  farmer_response_language: string;
  text_response: string;
  intelligence: any;
  audio_url: string | null;
  voice_playback_available: boolean;
  stt_provider_status: string;
  tts_provider_status: string;
  translation_provider_status: string;
  data_mode: string;
  disclaimer: string;
}

export interface TranscribeResponse {
  query_text: string;
  detected_language: string;
  stt_provider_status: string;
  message: string;
}

export const LANGUAGE_TO_BCP47: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ur: 'ur-IN',
};

export function getBcp47Locale(langCode: string): string {
  return LANGUAGE_TO_BCP47[langCode] || `${langCode}-IN`;
}

export class VoiceAssistantService {
  /**
   * Fetches supported language configuration from backend via apiClient.
   */
  static async getSupportedLanguages(): Promise<LanguageConfig[]> {
    try {
      return await apiClient.get<LanguageConfig[]>('/voice/languages');
    } catch {
      // Offline / fallback static array for all 13 supported languages
      return [
        { language_code: 'en', display_name: 'English', native_name: 'English', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'hi', display_name: 'Hindi', native_name: 'हिन्दी', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'bn', display_name: 'Bengali', native_name: 'বাংলা', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'te', display_name: 'Telugu', native_name: 'తెలుగు', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'mr', display_name: 'Marathi', native_name: 'मराठी', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'ta', display_name: 'Tamil', native_name: 'தமிழ்', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'gu', display_name: 'Gujarati', native_name: 'ગુજરાતી', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'kn', display_name: 'Kannada', native_name: 'ಕನ್ನಡ', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'ml', display_name: 'Malayalam', native_name: 'മലയാളം', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'pa', display_name: 'Punjabi', native_name: 'ਪੰਜਾਬੀ', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'or', display_name: 'Odia', native_name: 'ଓଡ଼ିଆ', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'as', display_name: 'Assamese', native_name: 'অসমীয়া', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'ur', display_name: 'Urdu', native_name: 'اردو', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
      ];
    }
  }

  /**
   * Transcribes audio stream via cloud STT endpoint using apiClient base URL.
   * Gracefully handles NOT_CONFIGURED status.
   */
  static async transcribeAudio(file?: File | Blob): Promise<TranscribeResponse> {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }

      const url = `${apiClient.getBaseUrl()}/voice/transcribe`;
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        return {
          query_text: '',
          detected_language: 'en',
          stt_provider_status: 'NOT_CONFIGURED',
          message: 'Cloud speech-to-text is not configured.',
        };
      }

      const text = await res.text();
      if (!text || !text.trim()) {
        return {
          query_text: '',
          detected_language: 'en',
          stt_provider_status: 'NOT_CONFIGURED',
          message: 'Cloud speech-to-text is not configured.',
        };
      }

      return JSON.parse(text);
    } catch {
      return {
        query_text: '',
        detected_language: 'en',
        stt_provider_status: 'NOT_CONFIGURED',
        message: 'Cloud speech-to-text is not configured.',
      };
    }
  }

  /**
   * Sends voice query or text query to Unified Farmer Intelligence pipeline via apiClient.
   */
  static async sendVoiceQuery(
    queryText: string,
    latitude?: number,
    longitude?: number,
    language: string = 'en',
    audioBase64?: string,
    stationId?: string
  ): Promise<VoiceQueryResponse> {
    return await apiClient.post<VoiceQueryResponse>('/voice/respond', {
      query: queryText,
      station_id: stationId || null,
      latitude,
      longitude,
      language,
      audio_base64: audioBase64 || null,
    });
  }

  /**
   * Synthesizes audio using browser Web Speech API (speechSynthesis) as client-side fallback
   * if backend TTS provider reports NOT_CONFIGURED.
   */
  static speakTextInBrowser(text: string, language: string = 'en'): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLocale = getBcp47Locale(language);
    utterance.lang = targetLocale;
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find(
        (v) =>
          v.lang === targetLocale ||
          v.lang.replace('_', '-').toLowerCase() === targetLocale.toLowerCase() ||
          v.lang.startsWith(language)
      );
      if (match) {
        utterance.voice = match;
      }
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * Stops browser speech synthesis.
   */
  static stopBrowserSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}



