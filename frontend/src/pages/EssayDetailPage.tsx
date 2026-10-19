import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getEssay,
  dispatchScoring,
  getJobStatus,
  getEssayScore,
  EssayDetailResponse,
  EssayScoreResponse,
  JobResponse,
} from '../api';
import { ScoreWorkspace, ScoringJobProgress, FailedJobView } from '../features/scoring';
import { ScoreWorkspaceSkeleton, Skeleton, ErrorState, useToast } from '../components/ui';
import { FileText } from 'lucide-react';

// WHY: Central essay view coordinating lifecycle states (RAW -> QUEUED -> SCORED -> FINALIZED) with live polling and workspace display.
export const EssayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

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

  // WHY: Retrieves the latest essay metadata and decides whether to load existing score data or initiate queue polling.
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

  // WHY: Fetches the holistic score, confidence metrics, rubric scale, and dimension feedback items once inference completes.
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

  // WHY: Enqueues an asynchronous scoring job in the database and triggers polling to monitor worker execution.
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

  // WHY: Periodically polls job and essay status every 1.5s to display real-time worker progress and switch to ScoreWorkspace upon completion.
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
    return <ScoreWorkspaceSkeleton />;
  }

  if (error && !essay) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <ErrorState
          error={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            if (id) {
              getEssay(id)
                .then((data) => {
                  setEssay(data);
                  if (
                    data.status === 'SCORED' ||
                    data.status === 'FEEDBACK_READY' ||
                    data.status === 'FINALIZED'
                  ) {
                    loadScore(id);
                  }
                })
                .catch((e) => setError(e))
                .finally(() => setLoading(false));
            }
          }}
          onBack={() => navigate('/essays')}
          onHome={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6">
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

      {/* Non-blocking Async Job Progress Card with 5-step Stepper (Prompt 11) */}
      {isDispatching && (
        <div className="space-y-6 animate-fade-in">
          <ScoringJobProgress
            jobId={activeJob?.id || activeJob?.job_id}
            jobStatus={activeJob?.status || 'PROCESSING'}
            essayStatus={essay?.status}
            elapsedSeconds={pollSecondsElapsed}
            attempts={activeJob?.attempts ?? 1}
            maxAttempts={activeJob?.max_attempts ?? 3}
            onCancel={() => {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
              setIsDispatching(false);
            }}
            onRefresh={async () => {
              if (essay) {
                try {
                  const refreshed = await getEssay(essay.id);
                  setEssay(refreshed);
                  if (activeJob?.id) {
                    const refreshedJob = await getJobStatus(activeJob.id);
                    setActiveJob(refreshedJob);
                  }
                } catch (e) {
                  console.warn('Manual poll refresh error:', e);
                }
              }
            }}
          />

          {/* Non-blocking Essay Content Preview + Upcoming Workspace Skeleton */}
          {essay && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Essay Text Being Evaluated
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                    {essay.raw_text.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <span className="text-xs text-primary-400 font-medium">
                  {essay.prompt_title || `Prompt ${essay.prompt_id.slice(0, 8)}`}
                </span>
              </div>

              {/* Readable essay text */}
              <div className="max-w-[75ch] mx-auto py-2 space-y-3 font-serif text-sm leading-relaxed text-slate-300 whitespace-pre-wrap selection:bg-primary-500/30">
                {essay.raw_text}
              </div>

              {/* Placeholder Skeleton for upcoming holistic score & dimension inspection */}
              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <Skeleton width={120} height={14} />
                  <Skeleton height={28} className="w-2/3" />
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <Skeleton width={140} height={14} />
                  <Skeleton height={28} className="w-2/3" />
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <Skeleton width={160} height={14} />
                  <Skeleton height={28} className="w-2/3" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Failed Scoring Job View (Prompt 12 requirement (e)) */}
      {essay &&
        (essay.status === 'FAILED' ||
          essay.status === 'PROCESSING_FAILED' ||
          activeJob?.status === 'FAILED') &&
        !isDispatching && (
          <FailedJobView
            essayId={essay.id}
            jobId={activeJob?.id || activeJob?.job_id}
            errorMessage={activeJob?.error_message || (typeof error === 'string' ? error : null)}
            status={essay.status === 'PROCESSING_FAILED' ? 'PROCESSING_FAILED' : 'FAILED'}
            onRetryScoring={handleDispatchScoring}
            onEditEssay={() => navigate('/submit')}
            isRetrying={isDispatching}
          />
        )}

      {/* Score Workspace (Section 4.2 UI): Rendered once essay is scored */}
      {essay && scoreData && !isDispatching && (
        <ScoreWorkspace
          essay={essay}
          scoreData={scoreData}
          onReviewSubmitted={(updatedScore) => {
            setScoreData(updatedScore);
            setEssay((prev) => (prev ? { ...prev, status: 'FINALIZED' } : null));
            toast.success(
              'Review Finalized',
              'Teacher override successfully recorded in institutional audit log.'
            );
          }}
        />
      )}

      {/* Fallback Unscored Reader: Rendered if essay is NOT scored yet and NOT failed */}
      {essay &&
        !scoreData &&
        !isDispatching &&
        essay.status !== 'FAILED' &&
        essay.status !== 'PROCESSING_FAILED' &&
        activeJob?.status !== 'FAILED' && (
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
