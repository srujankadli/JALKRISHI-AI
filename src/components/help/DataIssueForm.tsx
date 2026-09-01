import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { SectionHeader } from '../common/SectionHeader';

export const DataIssueForm: React.FC = () => {
  const [stationId, setStationId] = useState('');
  const [issueType, setIssueType] = useState('Unexpected water reading');
  const [description, setDescription] = useState('');
  const [reported, setReported] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const issuePayload = {
      stationId: stationId.trim() || 'Unspecified Station',
      issueType,
      description: description.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('jalkrishi_data_issues') || '[]');
      existing.unshift(issuePayload);
      localStorage.setItem('jalkrishi_data_issues', JSON.stringify(existing.slice(0, 20)));
    } catch (err) {
      console.warn('localStorage unavailable', err);
    }

    setReported(true);
    setStationId('');
    setDescription('');
    setTimeout(() => setReported(false), 5000);
  };

  return (
    <div id="data-issue-form" className="space-y-4">
      <SectionHeader
        title="Report a Groundwater Data or Telemetry Issue"
        subtitle="Flag suspicious sensor readings, missing blocks, or GPS coordinate inaccuracies"
        icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
      />

      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 shadow-subtle max-w-2xl">
        {reported ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2 animate-fadeIn">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h4 className="text-base font-black text-emerald-900">
              Data Issue Logged
            </h4>
            <p className="text-xs text-emerald-800 font-medium">
              Thank you. The station flag has been saved to your local session queue for quality control review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Station Code / District */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Station Code / Name / District:
                </label>
                <input
                  type="text"
                  required
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="e.g. DWLR-PB-042 or Sangrur Well 3"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-rose-600 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Issue Type */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Observed Issue Type:
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/80 px-3 py-2.5 text-xs font-semibold text-stone-900 focus:border-rose-600 focus:bg-white focus:outline-none"
                >
                  <option value="Unexpected water reading">⚠️ Unexpected / Improbable Water Depth</option>
                  <option value="Missing data packets">📡 Missing / Delayed Telemetry Packets</option>
                  <option value="Incorrect GPS location">📍 Incorrect Map Pin or GPS Location</option>
                  <option value="Sensor transducer fault">🔌 Potential Transducer / Battery Fault</option>
                  <option value="Other discrepancy">💬 Other Data Discrepancy</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-bold text-stone-600 block mb-1">
                Detailed Description:
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what looks incorrect or needs calibration..."
                className="w-full rounded-xl border border-stone-300 bg-stone-50/80 p-3 text-xs font-semibold text-stone-900 focus:border-rose-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-black text-white hover:bg-stone-800 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5 text-rose-400" />
                <span>Log Data Issue</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
