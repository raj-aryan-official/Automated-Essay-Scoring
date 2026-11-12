import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DashboardSummary,
  EssayListItem,
  JobStatusCounts,
  getDashboardSummary,
  getEssays,
} from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  useToast,
} from '../components/ui';
import { JobStatusDonutChart, KpiCard } from '../features/analytics';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  FileText,
  Gauge,
  PenTool,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

const SCORED_STATUSES = ['SCORED', 'FEEDBACK_READY', 'UNDER_REVIEW', 'FINALIZED'];

const statusVariant = (status: string): 'success' | 'primary' | 'danger' | 'default' => {
  if (SCORED_STATUSES.includes(status)) return 'success';
  if (status === 'QUEUED' || status === 'PROCESSING' || status === 'SUBMITTED') return 'primary';
  if (status === 'PROCESSING_FAILED') return 'danger';
  return 'default';
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentEssays, setRecentEssays] = useState<EssayListItem[]>([]);
  const [jobCounts, setJobCounts] = useState<JobStatusCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [summaryRes, essaysRes] = await Promise.allSettled([
      getDashboardSummary(),
      getEssays({ page: 1, page_size: 5 }),
    ]);

    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value);
      setJobCounts(summaryRes.value.queue);
    }
    if (essaysRes.status === 'fulfilled') {
      setRecentEssays(essaysRes.value.items);
    }
    if (summaryRes.status === 'rejected' && essaysRes.status === 'rejected') {
      setError(summaryRes.reason);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshJobCounts = async () => {
    setIsRefreshingJobs(true);
    try {
      const fresh = await getDashboardSummary();
      setSummary(fresh);
      setJobCounts(fresh.queue);
      toast.success('Queue status updated');
    } catch {
      toast.error('Could not refresh queue status');
    } finally {
      setIsRefreshingJobs(false);
    }
  };

  const canSubmit = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const canViewEvaluation = user?.role === 'ML_ENGINEER' || user?.role === 'ADMIN';
  const canViewJobs = user?.role === 'ML_ENGINEER' || user?.role === 'ADMIN';
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'VIEWER';
  const displayName = user?.email ? user.email.split('@')[0] : 'there';

  if (isLoading && !summary && recentEssays.length === 0) {
    return <DashboardSkeleton />;
  }

  if (error && !summary && recentEssays.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <ErrorState error={error} onRetry={fetchDashboardData} onHome={() => navigate('/dashboard')} />
      </div>
    );
  }

  const activeQueue = (jobCounts?.queued ?? 0) + (jobCounts?.processing ?? 0);
  const averageScore =
    summary?.average_score !== null && summary?.average_score !== undefined
      ? summary.average_score.toFixed(2)
      : '—';
  const averageConfidence =
    summary?.average_confidence !== null && summary?.average_confidence !== undefined
      ? `${(summary.average_confidence * 100).toFixed(1)}%`
      : '—';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-base px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {roleLabel}
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-heading tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-muted max-w-2xl">
            Essay submissions, automated scores and scoring-queue status for the current workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canSubmit && (
            <Button variant="primary" leftIcon={<PenTool className="w-4 h-4" />} onClick={() => navigate('/submit')}>
              Submit Essay
            </Button>
          )}
          {canViewEvaluation && (
            <Button
              variant="secondary"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={() => navigate('/evaluation')}
            >
              Model Evaluation
            </Button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Essays Scored"
          value={(summary?.scored_essays ?? 0).toLocaleString()}
          subtitle={`of ${(summary?.total_essays ?? 0).toLocaleString()} total submissions`}
          variant="emerald"
          icon={<FileText className="w-5 h-5" />}
        />
        <KpiCard
          title="Average Score"
          value={averageScore}
          subtitle="holistic score across scored essays"
          variant="primary"
          icon={<Gauge className="w-5 h-5" />}
        />
        <KpiCard
          title="Average Confidence"
          value={averageConfidence}
          subtitle="model self-reported confidence"
          variant="sky"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          title="Active Queue"
          value={activeQueue.toLocaleString()}
          subtitle={`${summary?.pending_essays ?? 0} essays awaiting a score`}
          variant="amber"
          icon={<Clock className="w-5 h-5" />}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <JobStatusDonutChart
          counts={jobCounts ?? undefined}
          onRefresh={refreshJobCounts}
          isRefreshing={isRefreshingJobs}
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle>Scoring Pipeline</CardTitle>
              <p className="text-xs text-muted">Live state of the job queue and the active scoring model.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshingJobs ? 'animate-spin' : ''}`} />}
              onClick={refreshJobCounts}
              disabled={isRefreshingJobs}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <PipelineRow label="Active model" value={summary?.active_model ?? 'No production model registered'} />
            <PipelineRow label="Completed jobs" value={(jobCounts?.completed ?? 0).toLocaleString()} />
            <PipelineRow label="Pending essays" value={(summary?.pending_essays ?? 0).toLocaleString()} />
            <PipelineRow
              label="Failed essays"
              value={(summary?.failed_essays ?? 0).toLocaleString()}
              tone={summary?.failed_essays ? 'danger' : 'default'}
            />
            {canViewEvaluation && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                onClick={() => navigate('/evaluation')}
              >
                Open model evaluation
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-heading">Recent Submissions</h2>
              <p className="text-xs text-muted">The five most recent essays in this workspace.</p>
            </div>
            <Link to="/essays" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View all essays
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              {recentEssays.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<FileText className="w-8 h-8 text-tertiary" />}
                    title="No essays submitted yet"
                    description={
                      canSubmit
                        ? 'Submit your first essay to see automated scores and feedback.'
                        : 'Essays will appear here once a teacher submits them.'
                    }
                    action={
                      canSubmit
                        ? { label: 'Submit an essay', onClick: () => navigate('/submit') }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-level border-b border-base text-muted uppercase text-[10px] tracking-wider font-semibold">
                        <th className="py-3 px-4">Essay</th>
                        <th className="py-3 px-4">Prompt</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-faint">
                      {recentEssays.map((essay) => {
                        const score = essay.reviewer_override_score ?? essay.holistic_score;
                        return (
                          <tr
                            key={essay.id}
                            className="hover:bg-surface-level transition-colors cursor-pointer group"
                            onClick={() => navigate(`/essays/${essay.id}`)}
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-heading group-hover:text-primary transition-colors">
                              #{essay.id.slice(0, 8)}
                            </td>
                            <td className="py-3 px-4 text-body">
                              {essay.prompt_title ?? `Prompt ${essay.asap_set_id ?? essay.prompt_id}`}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={statusVariant(essay.status)} size="sm" withDot>
                                {essay.status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-mono text-body">
                              {score !== null && score !== undefined
                                ? `${score.toFixed(1)}${essay.rubric_max ? ` / ${essay.rubric_max}` : ''}`
                                : '—'}
                            </td>
                            <td className="py-3 px-4 text-muted text-[11px]">
                              {new Date(essay.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                Inspect
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-heading">Next Steps</h2>
            <p className="text-xs text-muted">Actions available for your role.</p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              {canSubmit ? (
                <NextStep
                  title="Submit and score an essay"
                  description="Paste text or upload a TXT, MD, DOCX or text-based PDF (up to 20 MB)."
                  actionLabel="Submit essay"
                  onAction={() => navigate('/submit')}
                />
              ) : (
                <NextStep
                  title="Review scored essays"
                  description="Open the essay manager to read completed scores and dimension feedback."
                  actionLabel="Open essay manager"
                  onAction={() => navigate('/essays')}
                />
              )}

              {canViewEvaluation && (
                <NextStep
                  title="Inspect model benchmarks"
                  description="Per-prompt QWK results and training curves for the active model."
                  actionLabel="Open evaluation"
                  onAction={() => navigate('/evaluation')}
                />
              )}

              {canViewJobs && (
                <NextStep
                  title="Track inference jobs"
                  description="Monitor queued and processing scoring jobs and retry failed ones."
                  actionLabel="Open jobs"
                  onAction={() => navigate('/jobs')}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

const PipelineRow: React.FC<{ label: string; value: string; tone?: 'default' | 'danger' }> = ({
  label,
  value,
  tone = 'default',
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-faint pb-2 last:border-0 last:pb-0">
    <span className="text-muted">{label}</span>
    <span className={`font-mono font-semibold ${tone === 'danger' ? 'text-danger-600' : 'text-heading'}`}>
      {value}
    </span>
  </div>
);

const NextStep: React.FC<{
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="space-y-2">
    <div className="text-sm font-semibold text-heading">{title}</div>
    <p className="text-xs text-muted leading-relaxed">{description}</p>
    <Button variant="outline" size="sm" onClick={onAction} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
      {actionLabel}
    </Button>
  </div>
);
