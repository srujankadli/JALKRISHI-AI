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

const API_BASE_URL = '/api/v1/voice';

export class VoiceAssistantService {
  /**
   * Fetches supported language configuration from backend.
   */
  static async getSupportedLanguages(): Promise<LanguageConfig[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/languages`);
      if (!res.ok) throw new Error('Failed to fetch languages');
      return await res.json();
    } catch {
      // Offline / fallback static array
      return [
        { language_code: 'en', display_name: 'English', native_name: 'English', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'hi', display_name: 'Hindi', native_name: 'हिन्दी', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'te', display_name: 'Telugu', native_name: 'తెలుగు', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'mr', display_name: 'Marathi', native_name: 'मराठी', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
        { language_code: 'ta', display_name: 'Tamil', native_name: 'தமிழ்', speech_supported: true, translation_supported: true, tts_supported: true, status: 'CONFIGURED' },
      ];
    }
  }

  /**
   * Sends voice query or text query to Unified Farmer Intelligence pipeline.
   */
  static async sendVoiceQuery(
    queryText: string,
    latitude?: number,
    longitude?: number,
    language: string = 'en',
    audioBase64?: string
  ): Promise<VoiceQueryResponse> {
    const res = await fetch(`${API_BASE_URL}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryText,
        latitude,
        longitude,
        language,
        audio_base64: audioBase64 || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Voice assistant query failed.');
    }

    return await res.json();
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
    utterance.lang = language;
    utterance.rate = 0.9;
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
