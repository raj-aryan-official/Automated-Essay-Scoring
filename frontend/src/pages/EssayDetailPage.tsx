import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  EssayDetailResponse,
  EssayScoreResponse,
  JobResponse,
  dispatchScoring,
  getEssay,
  getEssayScore,
  getJobStatus,
  getLatestEssayJob,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { FailedJobView, ScoreWorkspace, ScoringJobProgress } from '../features/scoring';
import { ErrorState, ScoreWorkspaceSkeleton, Skeleton, formatApiError, useToast } from '../components/ui';
import { FileText } from 'lucide-react';

const SCORED_STATUSES = ['SCORED', 'FEEDBACK_READY', 'UNDER_REVIEW', 'FINALIZED'];
const IN_FLIGHT_STATUSES = ['QUEUED', 'PROCESSING'];
const FAILED_STATUSES = ['PROCESSING_FAILED', 'FAILED'];

const statusPillClass = (status?: string): string => {
  if (status === 'FINALIZED') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (status === 'SCORED' || status === 'FEEDBACK_READY') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'UNDER_REVIEW') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (status === 'PROCESSING') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (FAILED_STATUSES.includes(status ?? '')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

export const EssayDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const canScore = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const [essay, setEssay] = useState<EssayDetailResponse | null>(null);
  const [scoreData, setScoreData] = useState<EssayScoreResponse | null>(null);
  const [activeJob, setActiveJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pollTimerRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  const stopTimers = useCallback(() => {
    if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    pollTimerRef.current = null;
    elapsedTimerRef.current = null;
    setIsPolling(false);
  }, []);

  useEffect(() => stopTimers, [stopTimers]);

  const loadScore = useCallback(async (essayId: string) => {
    try {
      const score = await getEssayScore(essayId);
      setScoreData(score);
      setError(null);
    } catch (err) {
      setError(formatApiError(err).message);
    }
  }, []);

  const startPolling = useCallback(
    (essayId: string, jobId?: string) => {
      stopTimers();
      setIsPolling(true);
      setElapsedSeconds(0);

      elapsedTimerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const currentEssay = await getEssay(essayId);
          setEssay(currentEssay);

          if (jobId) {
            try {
              const job = await getJobStatus(jobId);
              setActiveJob(job);
              if (job.status === 'FAILED') {
                stopTimers();
                setError(job.error_message || 'The scoring worker reported a failure.');
                return;
              }
            } catch {
              // Job may be purged; essay status remains the source of truth.
            }
          }

          if (SCORED_STATUSES.includes(currentEssay.status)) {
            stopTimers();
            await loadScore(essayId);
          } else if (FAILED_STATUSES.includes(currentEssay.status)) {
            stopTimers();
            setError('Scoring failed for this essay. You can retry the job below.');
          }
        } catch (pollError) {
          stopTimers();
          setError(formatApiError(pollError).message);
        }
      }, 2000);
    },
    [loadScore, stopTimers]
  );

  const loadEssay = useCallback(
    async (essayId: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEssay(essayId);
        setEssay(data);

        if (SCORED_STATUSES.includes(data.status)) {
          await loadScore(essayId);
        } else if (IN_FLIGHT_STATUSES.includes(data.status)) {
          try {
            const latestJob = await getLatestEssayJob(essayId);
            setActiveJob(latestJob);
            startPolling(essayId, latestJob.id);
          } catch {
            startPolling(essayId);
          }
        }
      } catch (err) {
        setError(formatApiError(err).message);
      } finally {
        setLoading(false);
      }
    },
    [loadScore, startPolling]
  );

  useEffect(() => {
    if (id) loadEssay(id);
    return () => stopTimers();
  }, [id, loadEssay, stopTimers]);

  const handleDispatchScoring = async () => {
    if (!id) return;
    setIsDispatching(true);
    setError(null);
    try {
      const dispatch = await dispatchScoring(id);
      const refreshed = await getEssay(id);
      setEssay(refreshed);
      startPolling(id, dispatch.job_id);
    } catch (err) {
      setError(formatApiError(err).message);
    } finally {
      setIsDispatching(false);
    }
  };

  if (loading && !essay) {
    return <ScoreWorkspaceSkeleton />;
  }

  if (error && !essay) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          error={error}
          onRetry={() => id && loadEssay(id)}
          onBack={() => navigate('/essays')}
          onHome={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const isFailed = essay ? FAILED_STATUSES.includes(essay.status) || activeJob?.status === 'FAILED' : false;
  const showProgress = isPolling || (essay ? IN_FLIGHT_STATUSES.includes(essay.status) : false);
  const canDispatch = essay ? essay.status === 'SUBMITTED' || FAILED_STATUSES.includes(essay.status) : false;

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/essays" className="text-xs font-medium text-muted hover:text-heading inline-flex items-center min-h-[44px]">
            ← Back to Essays
          </Link>
          <span className="text-tertiary hidden sm:inline">/</span>
          <span className="text-xs font-mono text-body">Essay {essay?.id.slice(0, 8)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusPillClass(essay?.status)}`}>
            {essay?.status}
          </span>
        </div>

        {canScore && canDispatch && !isDispatching && (
          <button
            type="button"
            onClick={handleDispatchScoring}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition"
          >
            Start Scoring
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-error-border bg-error-bg text-error-text text-xs flex items-center justify-between gap-4">
          <span>{error}</span>
          {canScore && canDispatch && (
            <button type="button" onClick={handleDispatchScoring} className="underline font-medium shrink-0">
              Retry scoring
            </button>
          )}
        </div>
      )}

      {showProgress && (
        <div className="space-y-6">
          <ScoringJobProgress
            jobId={activeJob?.id}
            jobStatus={activeJob?.status ?? essay?.status ?? 'QUEUED'}
            essayStatus={essay?.status}
            elapsedSeconds={elapsedSeconds}
            attempts={activeJob?.attempts ?? 1}
            maxAttempts={activeJob?.max_attempts ?? 3}
            onRefresh={async () => {
              if (!id) return;
              try {
                const refreshed = await getEssay(id);
                setEssay(refreshed);
                if (activeJob?.id) setActiveJob(await getJobStatus(activeJob.id));
              } catch (refreshError) {
                setError(formatApiError(refreshError).message);
              }
            }}
          />

          {essay && (
            <div className="rounded-xl border border-base bg-surface p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-faint pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-body">Essay text being evaluated</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-level border border-base text-muted">
                    {essay.raw_text.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <span className="text-xs text-primary font-medium">
                  {essay.prompt_title ?? `Prompt ${essay.prompt_id.slice(0, 8)}`}
                </span>
              </div>
              <div className="max-w-[75ch] mx-auto py-2 font-serif text-sm leading-relaxed text-body whitespace-pre-wrap">
                {essay.raw_text}
              </div>
              <div className="pt-4 border-t border-faint grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton height={72} />
                <Skeleton height={72} />
                <Skeleton height={72} />
              </div>
            </div>
          )}
        </div>
      )}

      {essay && isFailed && !showProgress && (
        <FailedJobView
          essayId={essay.id}
          jobId={activeJob?.id}
          errorMessage={activeJob?.error_message ?? error}
          status={essay.status === 'PROCESSING_FAILED' ? 'PROCESSING_FAILED' : 'FAILED'}
          onRetryScoring={handleDispatchScoring}
          onEditEssay={() => navigate('/essays')}
          isRetrying={isDispatching}
        />
      )}

      {essay && scoreData && !showProgress && (
        <ScoreWorkspace
          essay={essay}
          scoreData={scoreData}
          onReviewSubmitted={(updatedScore) => {
            setScoreData(updatedScore);
            setEssay((prev) => (prev ? { ...prev, status: 'FINALIZED' } : null));
            toast.success('Review finalized', 'The override was recorded for this essay.');
          }}
        />
      )}

      {essay && !scoreData && !showProgress && !isFailed && (
        <div className="rounded-xl border border-base bg-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-faint pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-body">Submitted essay</h2>
              {essay.prompt_title && <p className="text-xs text-muted mt-0.5">{essay.prompt_title}</p>}
            </div>
          </div>
          <div className="rounded-lg border border-faint bg-surface-level p-5 text-sm text-body font-serif leading-relaxed whitespace-pre-wrap">
            {essay.raw_text}
          </div>
        </div>
      )}
    </div>
  );
};

export default EssayDetailPage;
