import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EvaluationDashboardData,
  JobStatusCounts,
  getEvaluationDashboard,
  getJobStatusCounts,
} from '../api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  ModelEvaluationSkeleton,
  formatApiError,
  useToast,
} from '../components/ui';
import {
  JobStatusDonutChart,
  KpiCard,
  LossCurvesChart,
  PerPromptQwkChart,
} from '../features/analytics';
import { BarChart3, Clock, FileCheck2, RefreshCw, Sparkles } from 'lucide-react';

export const ModelEvaluationPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState<EvaluationDashboardData | null>(null);
  const [jobCounts, setJobCounts] = useState<JobStatusCounts | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<unknown>(null);

  const fetchDashboard = useCallback(
    async (isManual = false) => {
      setError(null);
      try {
        const dashboardData = await getEvaluationDashboard();
        setData(dashboardData);
        setJobCounts(dashboardData.job_counts);
        setSelectedPrompt((prev) =>
          prev ?? dashboardData.qwk_summary?.prompts?.[0]?.prompt_id ?? null
        );
        setLastRefreshed(new Date());
        if (isManual) toast.success('Evaluation metrics refreshed');
      } catch (err) {
        setError(err);
        if (isManual) {
          const parsed = formatApiError(err);
          toast.error(parsed.title, parsed.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const pollJobCounts = useCallback(
    async (isManual = false) => {
      setIsRefreshingJobs(true);
      try {
        setJobCounts(await getJobStatusCounts());
        setLastRefreshed(new Date());
        if (isManual) toast.success('Queue telemetry refreshed');
      } catch (err) {
        if (isManual) {
          const parsed = formatApiError(err);
          toast.error(parsed.title, parsed.message);
        }
      } finally {
        setIsRefreshingJobs(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!isPollingActive) return;
    const interval = window.setInterval(() => pollJobCounts(false), 10000);
    return () => window.clearInterval(interval);
  }, [isPollingActive, pollJobCounts]);

  if (isLoading) return <ModelEvaluationSkeleton />;

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <ErrorState
          error={error}
          onRetry={() => {
            setIsLoading(true);
            fetchDashboard(true);
          }}
          onHome={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const { qwk_summary, loss_curves } = data;
  const prompts = qwk_summary.prompts ?? [];

  if (prompts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <EmptyState
          icon={<BarChart3 className="w-8 h-8 text-tertiary" />}
          title="No evaluation benchmarks recorded"
          description="Per-prompt QWK results and loss curves appear here after an evaluation run has been persisted."
          action={{
            label: 'Refresh evaluation',
            onClick: () => {
              setIsLoading(true);
              fetchDashboard(true);
            },
          }}
        />
      </div>
    );
  }

  const activeQueue = (jobCounts?.queued ?? 0) + (jobCounts?.processing ?? 0);
  const activePrompt = selectedPrompt ?? prompts[0]?.prompt_id ?? null;
  const activeQueueLabel = jobCounts
    ? `${jobCounts.queued} queued · ${jobCounts.processing} processing`
    : 'Queue telemetry unavailable';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter pb-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-base pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-heading tracking-tight">
              Model Evaluation
            </h1>
            <Badge variant={qwk_summary.all_passed ? 'success' : 'danger'} size="sm" withDot>
              {qwk_summary.all_passed ? 'Gate passed' : 'Gate failed'}
            </Badge>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            Held-out QWK per ASAP prompt against the {qwk_summary.target_qwk.toFixed(2)} acceptance target.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {
              setIsLoading(true);
              fetchDashboard(true);
            }}
          >
            Refresh
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Average QWK"
          value={qwk_summary.average_qwk.toFixed(4)}
          subtitle={`target ≥ ${qwk_summary.target_qwk.toFixed(2)}`}
          variant="primary"
          icon={<Sparkles className="w-5 h-5" />}
        />
        <KpiCard
          title="Prompts Evaluated"
          value={qwk_summary.evaluated_prompts_count.toLocaleString()}
          subtitle={`${qwk_summary.passed_prompts_count} passed · ${qwk_summary.failed_prompts_count} failed`}
          variant="emerald"
          icon={<FileCheck2 className="w-5 h-5" />}
        />
        <KpiCard
          title="Active Queue"
          value={activeQueue.toLocaleString()}
          subtitle="jobs queued or processing"
          variant="amber"
          icon={<Clock className="w-5 h-5" />}
        />
        <KpiCard
          title="Jobs Completed"
          value={(jobCounts?.completed ?? 0).toLocaleString()}
          subtitle={`${(jobCounts?.failed ?? 0).toLocaleString()} failed`}
          variant="sky"
          icon={<BarChart3 className="w-5 h-5" />}
        />
      </section>

      <section>
        <PerPromptQwkChart
          prompts={prompts}
          targetQwk={qwk_summary.target_qwk}
          selectedPrompt={activePrompt ?? undefined}
          onSelectPrompt={setSelectedPrompt}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
            <div className="space-y-1">
              <CardTitle>Job Queue</CardTitle>
              <p className="text-xs text-muted">
                Updated {lastRefreshed.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="xs" onClick={() => setIsPollingActive((prev) => !prev)}>
                {isPollingActive ? 'Pause' : 'Resume'}
              </Button>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<RefreshCw className={`w-3 h-3 ${isRefreshingJobs ? 'animate-spin' : ''}`} />}
                onClick={() => pollJobCounts(true)}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QueueStat label="Queued" value={jobCounts?.queued ?? 0} tone="text-warning-600" />
            <QueueStat label="Processing" value={jobCounts?.processing ?? 0} tone="text-info-600" />
            <QueueStat label="Completed" value={jobCounts?.completed ?? 0} tone="text-success-600" />
            <QueueStat label="Failed" value={jobCounts?.failed ?? 0} tone="text-danger-600" />
            <p className="col-span-2 sm:col-span-4 text-[11px] text-tertiary font-mono">{activeQueueLabel}</p>
          </CardContent>
        </Card>

        <JobStatusDonutChart
          counts={jobCounts ?? undefined}
          onRefresh={() => pollJobCounts(true)}
          isRefreshing={isRefreshingJobs}
        />
      </section>

      <Card>
        <CardHeader className="pb-3 border-b border-base">
          <CardTitle className="text-sm">ASAP prompt evaluation matrix</CardTitle>
          <p className="text-xs text-muted">Select a prompt row to inspect its loss curve below.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table id="qwk-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-level border-b border-base text-muted uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-3 px-4">Prompt</th>
                  <th className="py-3 px-4">Genre</th>
                  <th className="py-3 px-4">Rubric</th>
                  <th className="py-3 px-4">Test samples</th>
                  <th className="py-3 px-4">Target QWK</th>
                  <th className="py-3 px-4">Achieved QWK</th>
                  <th className="py-3 px-4">Margin</th>
                  <th className="py-3 px-4 text-right">Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-faint font-mono">
                {prompts.map((prompt) => {
                  const margin = prompt.qwk - (prompt.target_qwk || qwk_summary.target_qwk);
                  const isSelected = activePrompt === prompt.prompt_id;
                  return (
                    <tr
                      key={prompt.prompt_id}
                      onClick={() => setSelectedPrompt(prompt.prompt_id)}
                      className={`cursor-pointer transition-colors hover:bg-surface-level ${
                        isSelected ? 'bg-surface-level border-l-2 border-primary' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-heading">
                        <div className="flex items-center gap-2">
                          <span>Prompt {prompt.prompt_id}</span>
                          {isSelected && <Badge variant="primary" size="sm">Active</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-sans text-body">{prompt.genre}</td>
                      <td className="py-3 px-4 text-body">[{prompt.rubric_min}, {prompt.rubric_max}]</td>
                      <td className="py-3 px-4 text-muted">{prompt.n_test_samples}</td>
                      <td className="py-3 px-4 text-warning-600">≥ {prompt.target_qwk.toFixed(2)}</td>
                      <td className="py-3 px-4 font-bold text-heading">{prompt.qwk.toFixed(4)}</td>
                      <td className={`py-3 px-4 font-bold ${margin >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {margin >= 0 ? '+' : ''}{margin.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={prompt.passed ? 'success' : 'danger'} size="sm" withDot>
                          {prompt.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <LossCurvesChart
        lossCurves={loss_curves}
        initialPromptId={activePrompt ?? undefined}
        onPromptSelect={setSelectedPrompt}
      />
    </div>
  );
};

const QueueStat: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <div className="rounded-lg border border-faint bg-surface-level p-3">
    <div className="text-[10px] uppercase tracking-wider font-semibold text-tertiary">{label}</div>
    <div className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</div>
  </div>
);

export default ModelEvaluationPage;
