import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getEssay,
  dispatchScoring,
  getJobStatus,
  getEssayScore,
  EssayDetailResponse,
  EssayScoreResponse,
  JobResponse,
} from '../api';

export const EssayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [essay, setEssay] = useState<EssayDetailResponse | null>(null);
  const [scoreData, setScoreData] = useState<EssayScoreResponse | null>(null);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // 1. Fetch Essay on mount / id change
  useEffect(() => {
    if (!id) return;
    loadEssayData(id);
  }, [id]);

  const loadEssayData = async (essayId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[EssayDetailPage] Loading essay:', essayId);
      const data = await getEssay(essayId);
      setEssay(data);

      if (data.status === 'SCORED') {
        loadScoreData(essayId);
      }
    } catch (err: any) {
      console.error('[EssayDetailPage] Error loading essay:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load essay');
    } finally {
      setLoading(false);
    }
  };

  const loadScoreData = async (essayId: string) => {
    try {
      console.log('[EssayDetailPage] Loading score for essay:', essayId);
      const score = await getEssayScore(essayId);
      setScoreData(score);
    } catch (err: any) {
      console.error('[EssayDetailPage] Error loading score data:', err);
      // If score is not yet ready, that's expected while processing
    }
  };

  // 2. Dispatch scoring and poll job status
  const handleDispatchScoring = async () => {
    if (!id) return;
    setActionMessage('Dispatching scoring job...');
    setError(null);

    try {
      const dispatchRes = await dispatchScoring(id);
      console.log('[EssayDetailPage] Dispatched scoring job:', dispatchRes);
      setActionMessage(`Scoring job dispatched: ${dispatchRes.job_id}. Polling worker status...`);

      // Start polling job status
      pollJob(dispatchRes.job_id, id);
    } catch (err: any) {
      console.error('[EssayDetailPage] Error dispatching scoring:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to dispatch scoring job');
      setActionMessage(null);
    }
  };

  const pollJob = async (jobId: string, essayId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const job = await getJobStatus(jobId);
        console.log('[EssayDetailPage] Polling job status:', job.status);
        setActiveJob(job);

        if (job.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setActionMessage('Job COMPLETED! Loading score results...');
          await loadEssayData(essayId);
          await loadScoreData(essayId);
        } else if (job.status === 'FAILED') {
          clearInterval(pollInterval);
          setError(`Scoring job failed: ${job.error_message || 'Unknown worker error'}`);
          setActionMessage(null);
        }
      } catch (pollErr) {
        console.error('[EssayDetailPage] Polling error:', pollErr);
      }
    }, 2000);
  };

  if (loading && !essay) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-slate-400">
        Loading essay details...
      </div>
    );
  }

  if (error && !essay) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
        <Link to="/" className="inline-block text-sm text-brand-400 hover:underline">
          &larr; Return to Submission Page
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-white">Essay Assessment Details</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                essay?.status === 'SCORED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {essay?.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">ID: {essay?.id}</p>
        </div>
        <Link
          to="/"
          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
        >
          &larr; Submit Another
        </Link>
      </div>

      {actionMessage && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-lg text-xs font-mono">
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-mono">
          {error}
        </div>
      )}

      {/* Action / Scoring Trigger Bar if not scored yet */}
      {essay?.status !== 'SCORED' && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="text-sm text-slate-300">
            This essay has not been evaluated yet.
            {activeJob && (
              <span className="ml-2 font-mono text-xs text-amber-400">
                Current Job Status: {activeJob.status} (Attempts: {activeJob.attempts})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDispatchScoring}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow transition"
          >
            Dispatch Scoring Job
          </button>
        </div>
      )}

      {/* Score & Dimensions Display */}
      {scoreData && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-700 pb-4 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Holistic Score
              </span>
              <div className="flex items-baseline space-x-3 mt-1">
                <span className="text-4xl font-extrabold text-emerald-400">
                  {scoreData.holisticScore.toFixed(2)}
                </span>
                <span className="px-2.5 py-1 bg-slate-700 text-slate-200 text-xs font-semibold rounded-md">
                  {scoreData.rubricBand}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Confidence: <span className="text-slate-200 font-semibold">{(scoreData.confidence * 100).toFixed(1)}%</span>
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Model: {scoreData.modelVersion}
              </p>
            </div>
          </div>

          {/* Dimension Cards */}
          <div>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Multi-Dimensional Pedagogical Feedback
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scoreData.dimensions.map((dim) => (
                <div
                  key={dim.dimension}
                  className="bg-slate-900 border border-slate-700/80 rounded-lg p-4 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {dim.dimension}
                      </span>
                      {dim.score !== null && dim.score !== undefined && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded">
                          {dim.score.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-2">
                      {dim.feedback || dim.feedbackText}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Essay Content Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-200">Submitted Essay Text</h2>
          {essay?.download_url && (
            <a
              href={essay.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-400 hover:underline"
            >
              Download Original Document &darr;
            </a>
          )}
        </div>
        <div className="bg-slate-900 border border-slate-700/60 rounded-lg p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {essay?.raw_text}
        </div>
      </div>
    </div>
  );
};

export default EssayDetailPage;
