import { useLanguage } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { Send, Star, CheckCircle2, MessageSquare } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const FeedbackForm: React.FC = () => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Farmer' | 'Student' | 'Researcher' | 'Administrator' | 'Other'>('Farmer');
  const [feedbackType, setFeedbackType] = useState<'Suggestion' | 'Bug' | 'Data Issue' | 'Usability' | 'Other'>('Suggestion');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const feedbackPayload = {
      name: name.trim() || 'Anonymous Farmer / User',
      role,
      feedbackType,
      rating,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store in localStorage for demo resilience
    try {
      const existing = JSON.parse(localStorage.getItem('jalkrishi_feedback') || '[]');
      existing.unshift(feedbackPayload);
      localStorage.setItem('jalkrishi_feedback', JSON.stringify(existing.slice(0, 20)));
    } catch (err) {
      console.warn('localStorage unavailable', err);
    }

    setSubmitted(true);
    setName('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div id="feedback-form" className="space-y-4">
      <SectionHeader
        title={t('Send Us Your Feedback & Suggestions')}
        subtitle={t('Help our agronomy and engineering team refine groundwater decision-support tools')}
        icon={<MessageSquare className="h-5 w-5 text-agri-700" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-subtle max-w-2xl">
        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h4 className="text-base font-black text-emerald-900">
              Thank you for your valuable feedback!
            </h4>
            <p className="text-xs text-emerald-800 font-medium">
              Your feedback has been recorded locally. (Demo feedback form &mdash; server submission will be connected during backend deployment).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Your Name / Organization (Optional):
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('e.g. Ramesh Kumar / Sangrur KVK')}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Your Stakeholder Role:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
                >
                  <option value="Farmer">🌾 Farmer / Landholder</option>
                  <option value="Student">🎓 Student / Academic</option>
                  <option value="Researcher">🔬 Hydrogeology Researcher</option>
                  <option value="Administrator">🏛️ Policy / Water Administrator</option>
                  <option value="Other">💼 Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Feedback Type */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Feedback Category:
                </label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
                >
                  <option value="Suggestion">💡 Feature Suggestion</option>
                  <option value="Bug">🐞 Bug Report</option>
                  <option value="Data Issue">📊 Data Discrepancy</option>
                  <option value="Usability">📱 Usability / Mobile Experience</option>
                  <option value="Other">💬 General Inquiry</option>
                </select>
              </div>

              {/* 5-Star Rating */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Platform Rating:
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-stone-300 hover:text-amber-400 cursor-pointer transition-colors"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-stone-700 ml-2 font-mono">
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Your Feedback or Suggestions:
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('Share your experience, feature requests, or agronomic feedback...')}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/80 p-3 text-xs font-semibold text-stone-900 focus:border-agri-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-stone-500 font-medium">
                * Stored in demo mode &bull; Server link planned
              </span>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-agri-700 px-6 py-2.5 text-xs font-black text-white hover:bg-agri-800 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{t('Submit Feedback')}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
