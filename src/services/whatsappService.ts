import { apiClient } from './apiClient';
import type { WhatsAppIntentEnum } from '../types';

export interface WhatsAppActionItem {
  label: string;
  action: string;
  payload?: Record<string, any>;
}

export interface WhatsAppMessagePayload {
  from_number?: string;
  district?: string;
  message: string;
  language?: string;
  conversation_id?: string;
  latitude?: number;
  longitude?: number;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  conversation_id: string;
  intent: WhatsAppIntentEnum | string;
  language: string;
  reply: string;
  actions: WhatsAppActionItem[];
  context?: Record<string, any>;
  data_mode: string;
  disclaimer: string;
}

export const whatsappService = {
  /**
   * Sends a conversational query to the FastAPI WhatsApp webhook.
   * Seamlessly falls back to deterministic local responses if backend is offline.
   */
  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppMessageResponse> {
    try {
      const res = await apiClient.post<WhatsAppMessageResponse>(
        '/whatsapp/webhook',
        payload,
        { timeoutMs: 3500 }
      );
      if (res && res.reply) {
        return res;
      }
    } catch {
      // Backend offline -> Local deterministic fallback
    }

    return this.getLocalFallbackResponse(payload);
  },

  /**
   * Deterministic local fallback generator when backend is offline.
   */
  getLocalFallbackResponse(payload: WhatsAppMessagePayload): WhatsAppMessageResponse {
    const text = (payload.message || '').trim().toLowerCase();
    const isHindi = /[\u0900-\u097f]/.test(text) || payload.language === 'hi';
    let targetDistrict = payload.district || '';
    if (!targetDistrict) {
      try {
        targetDistrict = localStorage.getItem('jalkrishi_selected_location') || 'Your Region';
      } catch {
        targetDistrict = 'Your Region';
      }
    }

    if (text === '1' || text.includes('water') || text.includes('पानी')) {
      return {
        success: true,
        conversation_id: payload.conversation_id || 'demo-offline-session',
        intent: 'WATER_STATUS',
        language: isHindi ? 'hi' : 'en',
        reply: isHindi
          ? `💧 *जलकृषि एआई — ${targetDistrict}*\n\nभूजल स्थिति: 🟠 *मध्यम / सतर्कता*\n📊 औसत गहराई: *18.4 मीटर mbgl*\n📉 वर्तमान रुझान: *नीचे गिर रहा है (-0.2 m/mo)*\n⚠️ जोखिम सूचकांक: *52/100*\n\n💡 *सलाह:* भूजल स्तर घट रहा है। कम पानी वाली दलहन फसलें चुनें।\n\n_ऑफ़लाइन डेमो फ़ॉलबैक मोड_`
          : `💧 *JalKrishi AI — ${targetDistrict}*\n\nWater Status: 🟠 *Moderate / Warning*\n📊 Current Depth: *18.4 m mbgl*\n📉 Groundwater Trend: *Falling (-0.2 m/mo)*\n⚠️ Risk Index: *52/100*\n\n💡 *What this means:* Water table is depleting. Prioritize water-smart crops (Gram, Millets) and schedule night-time irrigation.\n\n_Offline Demo Fallback Mode_`,
        actions: [
          { label: '🔮 30-Day Forecast', action: 'forecast', payload: { district: targetDistrict } },
          { label: '🌱 Crop Advice', action: 'crop', payload: { district: targetDistrict } },
        ],
        data_mode: 'DEMO_FALLBACK',
        disclaimer: 'Offline Fallback: Local deterministic simulation response.',
      };
    }

    if (text === '2' || text.includes('forecast') || text.includes('पूर्वानुमान') || text.includes('भविष्यवाणी')) {
      return {
        success: true,
        conversation_id: payload.conversation_id || 'demo-offline-session',
        intent: 'FORECAST',
        language: isHindi ? 'hi' : 'en',
        reply: isHindi
          ? `🔮 *जलकृषि 30-दिवसीय भूजल पूर्वानुमान — ${targetDistrict}*\n\n📊 वर्तमान गहराई: *18.4 मीटर*\n📉 30 दिन बाद अनुमानित गहराई: *18.9 मीटर mbgl*\n⏳ संकट में बचे दिन: *115 दिन*\n🎯 मॉडल विश्वसनीयता: *88%*\n\n🌾 *सलाह:* भूजल में निरंतर गिरावट है। ड्रिप सिंचाई अपनाएं।\n\n_ऑफ़लाइन डेमो फ़ॉलबैक_`
          : `🔮 *JalKrishi 30-Day Groundwater Forecast — ${targetDistrict}*\n\n📊 Current Depth: *18.4 m mbgl*\n📉 Projected Depth (30d): *18.9 m mbgl*\n⏳ Days to Critical: *115 Days* (60+ Days Watch Zone)\n🎯 Model Confidence: *88%*\n\n🌾 *Farmer Advice:* Steady drawdown detected. Switch to micro-irrigation and night hours pumping.\n\n_Offline Demo Fallback_`,
        actions: [
          { label: '🌱 Suitable Crops', action: 'crop' },
          { label: '💧 Water Status', action: 'water' },
        ],
        data_mode: 'DEMO_FALLBACK',
        disclaimer: 'Offline Fallback: Local deterministic simulation response.',
      };
    }

    if (text === '3' || text.includes('crop') || text.includes('फसल') || text.includes('kheti')) {
      return {
        success: true,
        conversation_id: payload.conversation_id || 'demo-offline-session',
        intent: 'CROP_RECOMMENDATION',
        language: isHindi ? 'hi' : 'en',
        reply: isHindi
          ? `🌱 *जलकृषि फसल सलाहकार — ${targetDistrict}*\nमौसम: रबी (Rabi) | पानी: सीमित\n\n🥇 *1. चना / बंगाल ग्राम* (स्कोर: *93/100*)\n   • पानी: 280 मिमी | कम पानी में उत्तम पैदावार\n\n🥈 *2. सरसों (Mustard)* (स्कोर: *88/100*)\n   • पानी: 310 मिमी | सीमित जल में अनुकूल\n\n⚠️ *इनसे बचें:* ❌ गन्ना (Sugarcane) — अत्यधिक जल मांग।\n\n_ऑफ़लाइन डेमो फ़ॉलबैक_`
          : `🌱 *JalKrishi Crop Advisor — ${targetDistrict}*\nSeason: Rabi | Water: Limited\n\n🥇 *1. Chickpea / Bengal Gram (Chana)* — Score: *93/100*\n   • Water Need: 280 mm (Low water footprint)\n\n🥈 *2. Mustard (Sarson)* — Score: *88/100*\n   • Water Need: 310 mm (High drought tolerance)\n\n⚠️ *Crops to Avoid:* ❌ Sugarcane (1800mm) — High risk of borewell dry-up.\n\n_Offline Demo Fallback_`,
        actions: [
          { label: '🔮 Forecast', action: 'forecast' },
          { label: '💧 Water Status', action: 'water' },
        ],
        data_mode: 'DEMO_FALLBACK',
        disclaimer: 'Offline Fallback: Local deterministic simulation response.',
      };
    }

    if (text === '4' || text.includes('alert') || text.includes('warning') || text.includes('चेतावनी')) {
      return {
        success: true,
        conversation_id: payload.conversation_id || 'demo-offline-session',
        intent: 'ANOMALIES',
        language: isHindi ? 'hi' : 'en',
        reply: isHindi
          ? `⚠️ *जलकृषि चेतावनी केंद्र — ${targetDistrict}*\n\nसक्रिय चेतावनियां: *4*\n🚨 *मुख्य अलर्ट:* Possible Abnormal Extraction\nविवरण: निरंतर दोहन के कारण जल स्तर तेजी से घटा है।\nसलाह: सिंचाई के घंटों को कम करें और सामूहिक जल उपयोग अपनाएं।\n\n_ऑफ़लाइन डेमो फ़ॉलबैक_`
          : `⚠️ *JalKrishi Alert Center — ${targetDistrict}*\n\nActive Telemetry Anomalies: *4*\n🚨 *Primary Alert:* Possible Abnormal Extraction\nObserved: Continuous multi-day drawdown.\nAction: Restrict pumping hours and verify well recovery.\n\n_Offline Demo Fallback_`,
        actions: [
          { label: '💧 Water Status', action: 'water' },
          { label: '🔮 Forecast', action: 'forecast' },
        ],
        data_mode: 'DEMO_FALLBACK',
        disclaimer: 'Offline Fallback: Local deterministic simulation response.',
      };
    }

    return {
      success: true,
      conversation_id: payload.conversation_id || 'demo-offline-session',
      intent: 'HELP',
      language: isHindi ? 'hi' : 'en',
      reply: isHindi
        ? `🌾 *जलकृषि एआई किसान सहायक में आपका स्वागत है!*\n\nआप किसी भी जिले का भूजल, पूर्वानुमान व फसल सलाह पूछ सकते हैं:\n• *1* या “पानी” — भूजल स्तर\n• *2* या “पूर्वानुमान” — 30-दिन भविष्यवाणी\n• *3* या “फसल सलाह” — कम पानी वाली फसलें\n• *4* या “अलर्ट” — भूजल चेतावनी\n\n_ऑफ़लाइन डेमो फ़ॉलबैक_`
        : `🌾 *Welcome to JalKrishi AI Farmer Assistant!*\n\nYou can query groundwater, forecast, and crop advice:\n• *1* or "Water" — Current groundwater status\n• *2* or "Forecast" — 30-Day projections\n• *3* or "Crop" — Water-smart crop recommendations\n• *4* or "Alerts" — Depletion warnings\n\n_Offline Demo Fallback_`,
      actions: [
        { label: '💧 Water Status', action: 'water' },
        { label: '🔮 Forecast', action: 'forecast' },
        { label: '🌱 Crop Advice', action: 'crop' },
        { label: '⚠️ Alerts', action: 'alerts' },
      ],
      data_mode: 'DEMO_FALLBACK',
      disclaimer: 'Offline Fallback: Local deterministic simulation response.',
    };
  },
};
