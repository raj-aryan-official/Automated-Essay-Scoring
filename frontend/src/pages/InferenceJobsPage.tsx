import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobStatusCounts, JobStatusCounts } from '../api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
  formatApiError,
} from '../components/ui';
import { Cpu, RefreshCw, Clock, CheckCircle2, XCircle, Activity } from 'lucide-react';

export const InferenceJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [counts, setCounts] = useState<JobStatusCounts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown | null>(null);

  const fetchJobCounts = useCallback(async (isManual = false) => {
    setIsLoading(true);
    try {
      const data = await getJobStatusCounts();
      setCounts(data);
      setError(null);
      if (isManual) {
        toast.success('Inference worker queue refreshed successfully');
      }
    } catch (err) {
      console.warn('Failed to fetch job status counts:', err);
      setError(err);
      if (isManual) {
        const parsed = formatApiError(err);
        toast.error(`${parsed.title}: ${parsed.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchJobCounts();
    const interval = setInterval(() => fetchJobCounts(false), 10000);
    return () => clearInterval(interval);
  }, [fetchJobCounts]);

  if (error && !counts) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <ErrorState
          error={error}
          onRetry={() => fetchJobCounts(true)}
          onHome={() => navigate('/')}
        />
      </div>
    );
  }

  const totalJobs = counts ? counts.queued + counts.processing + counts.completed + counts.failed : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inference Job Telemetry
            </h1>
            <Badge variant="info" size="sm" withDot>
              Live Queue
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Asynchronous background workers executing PyTorch BERT tokenization, forward passes, and rubric scaling.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          onClick={() => fetchJobCounts(true)}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Queue Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Queued */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Queued Backlog
              </span>
              <div className="text-2xl font-black text-amber-500 dark:text-amber-400 font-mono">
                {isLoading ? <Skeleton width={50} height={28} /> : counts?.queued ?? 0}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Awaiting available worker
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Processing
              </span>
              <div className="text-2xl font-black text-sky-500 dark:text-sky-400 font-mono">
                {isLoading ? <Skeleton width={50} height={28} /> : counts?.processing ?? 0}
              </div>
              <span className="text-[11px] text-sky-600 dark:text-sky-300 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse" />
                <span>Running forward pass</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400 font-mono">
                {isLoading ? <Skeleton width={50} height={28} /> : counts?.completed ?? 0}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Feedback ready &amp; cached
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Failed Jobs
              </span>
              <div className="text-2xl font-black text-rose-500 dark:text-rose-400 font-mono">
                {isLoading ? <Skeleton width={50} height={28} /> : counts?.failed ?? 0}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Validation / timeout errors
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty queue callout if 0 total jobs */}
      {!isLoading && totalJobs === 0 && (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={<Cpu className="w-8 h-8 text-primary-400" />}
              title="No inference jobs yet — submit your first essay"
              description="Background Celery workers are currently idle. Submit an essay to start asynchronous tokenization, embedding generation, and automated rubric scoring."
              action={{
                label: "Submit essay for inference",
                onClick: () => navigate('/submit'),
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Architecture & Pipeline Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <span>Worker Queue Lifecycle Architecture</span>
          </CardTitle>
          <CardDescription>
            Multi-stage pipeline dispatching jobs to Celery workers with persistent database transaction locks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                1. Stage: Queued
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Essay raw text is validated, written to PostgreSQL, and a Celery task payload is pushed to Redis broker.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                2. Stage: Processing
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                PyTorch BERT model computes sequence embeddings, regression head predicts [0, 1] normalized score, and rescales to rubric range.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                3. Stage: Completed
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Holistic score, confidence interval, and 3-axis dimensional feedback (Grammar, Coherence, Argumentation) are committed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
