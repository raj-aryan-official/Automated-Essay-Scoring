import React, { useEffect, useRef, useState } from 'react';
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
import { ScoreWorkspace } from '../features/scoring';

export const EssayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [essay, setEssay] = useState<EssayDetailResponse | null>(null);
  const [scoreData, setScoreData] = useState<EssayScoreResponse | null>(null);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pollSecondsElapsed, setPollSecondsElapsed] = useState<number>(0);

  const pollTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  // 1. Fetch Essay on mount / id change
  useEffect(() => {
    if (!id) return;
    loadEssay(id);
  }, [id]);

  const loadEssay = async (essayId: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[EssayDetailPage] Loading essay:', essayId);
      const data = await getEssay(essayId);
      setEssay(data);

      if (
        data.status === 'SCORED' ||
        data.status === 'FEEDBACK_READY' ||
        data.status === 'UNDER_REVIEW' ||
        data.status === 'FINALIZED'
      ) {
        await loadScore(essayId);
      } else if (data.status === 'QUEUED' || data.status === 'PROCESSING') {
        startEssayPolling(essayId);
      }
    } catch (err: any) {
      console.error('[EssayDetailPage] Error loading essay:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load essay');
    } finally {
      setLoading(false);
    }
  };

  const loadScore = async (essayId: string) => {
    try {
      console.log('[EssayDetailPage] Fetching score for essay:', essayId);
      const score = await getEssayScore(essayId);
      setScoreData(score);
    } catch (err: any) {
      console.error('[EssayDetailPage] Error loading score data:', err);
      // If score is not yet ready or failed, report appropriately
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || err.message || 'Failed to load score');
      }
    }
  };

  // 2. Dispatch Scoring Job
  const handleDispatchScoring = async () => {
    if (!id) return;
    setIsDispatching(true);
    setError(null);
    setPollSecondsElapsed(0);

    try {
      console.log('[EssayDetailPage] Dispatching scoring for essay:', id);
      const dispatchRes = await dispatchScoring(id);
      console.log('[EssayDetailPage] Job dispatched:', dispatchRes);

      // Start polling worker status and essay status
      startEssayPolling(id, dispatchRes.job_id);
    } catch (err: any) {
      console.error('[EssayDetailPage] Error dispatching scoring:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to dispatch scoring job');
      setIsDispatching(false);
    }
  };

  // 3. Poll while QUEUED or PROCESSING
  const startEssayPolling = (essayId: string, jobId?: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

    setIsDispatching(true);
    setPollSecondsElapsed(0);

    elapsedTimerRef.current = window.setInterval(() => {
      setPollSecondsElapsed((prev) => prev + 1);
    }, 1000);

    pollTimerRef.current = window.setInterval(async () => {
      try {
        if (jobId) {
          try {
            const job = await getJobStatus(jobId);
            setActiveJob(job);
            if (job.status === 'FAILED') {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
              setIsDispatching(false);
              setError(`Scoring job failed: ${job.error_message || 'Worker execution failed'}`);
              return;
            }
          } catch (jobErr) {
            console.debug('Error checking job status:', jobErr);
          }
        }

        const currentEssay = await getEssay(essayId);
        setEssay(currentEssay);

        if (
          currentEssay.status === 'SCORED' ||
          currentEssay.status === 'FEEDBACK_READY' ||
          currentEssay.status === 'FINALIZED'
        ) {
          console.log('[EssayDetailPage] Essay reached scored state! Auto-transitioning to score view...');
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

          setIsDispatching(false);
          await loadScore(essayId);
        } else if (currentEssay.status === 'FAILED') {
          console.warn('[EssayDetailPage] Essay status is FAILED');
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);

          setIsDispatching(false);
          setError('Scoring failed for this essay.');
        }
      } catch (pollErr: any) {
        console.error('[EssayDetailPage] Error during polling:', pollErr);
      }
    }, 1500);
  };

  if (loading && !essay) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center text-slate-400 space-y-3">
        <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading essay details...</p>
      </div>
    );
  }

  if (error && !essay) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-sm">
          <strong>Error:</strong> {error}
        </div>
        <Link to="/" className="inline-block text-xs text-brand-400 hover:underline">
          &larr; Return to Submission Page
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-6">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-xl px-5 py-3.5 backdrop-blur">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition"
          >
            &larr; Back to Submit
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-xs text-slate-300 font-mono">
            Essay {essay?.id.slice(0, 8)}...
          </span>
          <span
            id="essay-status-pill"
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              essay?.status === 'FINALIZED'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : essay?.status === 'SCORED' || essay?.status === 'FEEDBACK_READY'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : essay?.status === 'UNDER_REVIEW'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                : essay?.status === 'PROCESSING' || isDispatching
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isDispatching ? 'PROCESSING' : essay?.status}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {essay?.status !== 'SCORED' &&
            essay?.status !== 'FEEDBACK_READY' &&
            essay?.status !== 'FINALIZED' &&
            essay?.status !== 'UNDER_REVIEW' &&
            !isDispatching && (
              <button
                id="btn-dispatch-scoring"
                type="button"
                onClick={handleDispatchScoring}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow transition"
              >
                Start AI Scoring
              </button>
            )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs font-mono flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleDispatchScoring}
            className="underline text-rose-200 hover:text-white ml-4 font-sans font-medium"
          >
            Retry Scoring
          </button>
        </div>
      )}

      {/* Processing State: Polling Progress Box */}
      {isDispatching && (
        <div
          id="job-processing-panel"
          className="bg-slate-800 border border-blue-500/40 rounded-xl p-6 shadow-xl text-center space-y-4 animate-fade-in"
        >
          <div className="inline-flex p-3 bg-blue-500/10 rounded-full text-blue-400 mb-1">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Evaluating Essay with BERT &amp; Multi-Dimensional Feedback...
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
              Inference worker is calculating holistic score, rubric band, confidence metrics, and pedagogical diagnostics across grammar, coherence, and argumentation.
            </p>
          </div>

          <div className="flex justify-center items-center space-x-6 text-xs text-slate-400 font-mono pt-2">
            <div>
              Status:{' '}
              <span className="text-blue-400 font-semibold uppercase">
                {activeJob?.status || 'DISPATCHED'}
              </span>
            </div>
            <div>
              Elapsed: <span className="text-white font-semibold">{pollSecondsElapsed}s</span>
            </div>
            {activeJob && (
              <div>
                Attempt:{' '}
                <span className="text-white font-semibold">
                  {activeJob.attempts}/{activeJob.max_attempts}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Workspace (Section 4.2 UI): Rendered once essay is scored */}
      {essay && scoreData && !isDispatching && (
        <ScoreWorkspace
          essay={essay}
          scoreData={scoreData}
          onReviewSubmitted={(updatedScore) => {
            setScoreData(updatedScore);
            setEssay((prev) => (prev ? { ...prev, status: 'FINALIZED' } : null));
          }}
        />
      )}

      {/* Fallback Unscored Reader: Rendered if essay is NOT scored yet and NOT dispatching */}
      {essay && !scoreData && !isDispatching && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-700/80 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Submitted Essay Text
              </h2>
              {essay.prompt_title && (
                <p className="text-xs text-brand-400 mt-0.5">{essay.prompt_title}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDispatchScoring}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              Score This Essay Now &rarr;
            </button>
          </div>
          <div className="bg-slate-900/90 border border-slate-700/60 rounded-lg p-5 text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-wrap">
            {essay.raw_text}
          </div>
        </div>
      )}
    </div>
  );
};

export default EssayDetailPage;
