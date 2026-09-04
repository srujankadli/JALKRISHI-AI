import { useLanguage } from '../../context/LanguageContext';
import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';
import type { FAQItem } from '../../data/helpContent';

interface FAQAccordionProps {
  faqs: FAQItem[];
  searchQuery: string;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ faqs, searchQuery }) => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(faqs[0]?.id || null);

  const categories = ['All', 'General', 'DWLR & Telemetry', 'Forecasting', 'Anomalies', 'Crop Advisor', 'Data & Demo'];

  const filteredFaqs = faqs.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQ = item.question.toLowerCase().includes(q);
      const matchA = item.answer.toLowerCase().includes(q);
      const matchT = item.farmerTakeaway?.toLowerCase().includes(q);
      return matchQ || matchA || matchT;
    }
    return true;
  });

  return (
    <div id="faq-section" className="space-y-4">
      <SectionHeader
        title={t('Frequently Asked Questions (FAQ)')}
        subtitle={t('Clear answers to common questions about groundwater depth, sensor telemetry, forecasts, anomalies, and crop recommendations')}
        icon={<HelpCircle className="h-5 w-5 text-agri-700" />}
      />

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-2 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-agri-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-xs text-stone-500 space-y-1">
          <p className="font-bold text-stone-700">{t('No questions matched your search query.')}</p>
          <p>{t('Try searching for words like &ldquo;DWLR&rdquo;, &ldquo;Paddy&rdquo;, &ldquo;Critical&rdquo;, or &ldquo;Forecast&rdquo;.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-stone-200 bg-white shadow-subtle overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors cursor-pointer select-none"
                  aria-expanded={isExpanded}
                >
                  <div className="space-y-1 pr-2">
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold text-stone-600 uppercase">
                      {faq.category}
                    </span>
                    <h4 className="text-sm sm:text-base font-extrabold text-stone-900 leading-snug">
                      {faq.question}
                    </h4>
                  </div>

                  <div className="rounded-full p-1 text-stone-400 shrink-0">
                    <ChevronDown
                      className={`h-5 w-5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-agri-700' : ''
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-stone-700 leading-relaxed border-t border-stone-100 space-y-3 animate-fadeIn">
                    <p className="whitespace-pre-line font-medium text-stone-700">
                      {faq.answer}
                    </p>

                    {faq.farmerTakeaway && (
                      <div className="rounded-xl border border-agri-200 bg-agri-50/70 p-3 text-xs text-agri-950 flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-agri-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-agri-900 font-extrabold block">
                            Farmer Takeaway:
                          </strong>
                          <span className="font-medium">{faq.farmerTakeaway}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
