import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitEssay, dispatchScoring, EssayCreateResponse } from '../api';

const DEFAULT_PROMPTS = [
  { id: '11111111-1111-1111-1111-111111111111', set: 1, title: 'Prompt 1: Effects of Computers on Society (2-12)' },
  { id: '22222222-2222-2222-2222-222222222222', set: 2, title: 'Prompt 2: Censorship in Libraries (1-6)' },
  { id: '33333333-3333-3333-3333-333333333333', set: 3, title: 'Prompt 3: Rough Road Ahead / Cyclist (0-3)' },
];

export const SubmissionPage: React.FC = () => {
  const navigate = useNavigate();

  const [promptId, setPromptId] = useState<string>(DEFAULT_PROMPTS[0].id);
  const [sourceType, setSourceType] = useState<'PASTE' | 'DOCUMENT'>('PASTE');
  const [rawText, setRawText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<EssayCreateResponse | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
  const charCount = rawText.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitResult(null);
    setDispatchStatus(null);
    setIsSubmitting(true);

    try {
      let res: EssayCreateResponse;
      if (sourceType === 'PASTE') {
        if (!rawText.trim()) {
          throw new Error('Please enter essay text before submitting.');
        }
        res = await submitEssay({
          prompt_id: promptId,
          source_type: 'PASTE',
          raw_text: rawText,
        });
      } else {
        if (!selectedFile) {
          throw new Error('Please select a document file (.txt, .pdf, .docx) before submitting.');
        }
        const formData = new FormData();
        formData.append('prompt_id', promptId);
        formData.append('source_type', 'DOCUMENT');
        formData.append('file', selectedFile);
        if (rawText.trim()) {
          formData.append('raw_text', rawText);
        }
        res = await submitEssay(formData);
      }

      console.log('[SubmissionPage] Essay successfully submitted:', res);
      setSubmitResult(res);
    } catch (err: any) {
      console.error('[SubmissionPage] Error submitting essay:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : err.message || 'Failed to submit essay');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchScore = async () => {
    if (!submitResult?.id) return;
    setDispatchStatus('Dispatching scoring job...');
    try {
      const jobRes = await dispatchScoring(submitResult.id);
      console.log('[SubmissionPage] Scoring dispatched:', jobRes);
      setDispatchStatus(`Scoring Job Queued (Job ID: ${jobRes.job_id})`);
      // Navigate to detail page after a short delay
      setTimeout(() => {
        navigate(`/essays/${submitResult.id}`);
      }, 1000);
    } catch (err: any) {
      console.error('[SubmissionPage] Error dispatching scoring:', err);
      setDispatchStatus(`Error: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Submit Essay for Scoring</h1>
        <p className="text-slate-400 text-sm">
          Submit free-response student essays for BERT-based holistic scoring and dimension-level feedback.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          <strong>Submission Error:</strong> {error}
        </div>
      )}

      {submitResult && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-400">Essay Submitted Successfully!</p>
              <p className="text-xs text-slate-300 font-mono mt-1">ID: {submitResult.id}</p>
              <p className="text-xs text-slate-400">Status: {submitResult.status}</p>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleDispatchScore}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded shadow transition"
              >
                Score Essay Now
              </button>
              <button
                type="button"
                onClick={() => navigate(`/essays/${submitResult.id}`)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition"
              >
                View Details &rarr;
              </button>
            </div>
          </div>
          {dispatchStatus && (
            <div className="text-xs text-emerald-200 border-t border-emerald-500/20 pt-2 font-mono">
              {dispatchStatus}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Target Rubric Prompt
          </label>
          <div className="space-y-2">
            <select
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
            >
              {DEFAULT_PROMPTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or enter custom prompt UUID..."
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-400 font-mono focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Submission Mode
          </label>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setSourceType('PASTE')}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${
                sourceType === 'PASTE'
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Essay Text
            </button>
            <button
              type="button"
              onClick={() => setSourceType('DOCUMENT')}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition ${
                sourceType === 'DOCUMENT'
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload Document File
            </button>
          </div>
        </div>

        {sourceType === 'PASTE' ? (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-300">
                Essay Body
              </label>
              <span className="text-xs text-slate-500">
                {wordCount} words | {charCount} / 8000 chars
              </span>
            </div>
            <textarea
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Type or paste student essay text here (minimum 10 characters, 2 words)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
              Upload Essay File (.txt, .pdf, .docx, &le; 20MB)
            </label>
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
            />
            {selectedFile && (
              <p className="text-xs text-slate-400">
                Selected: <span className="text-slate-200 font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow transition"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Essay'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionPage;
