import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  EvaluationDashboardData,
  JobStatusCounts,
  getEvaluationDashboard,
  getJobStatusCounts,
} from '../api';

export const ModelEvaluationPage: React.FC = () => {
  const [data, setData] = useState<EvaluationDashboardData | null>(null);
  const [jobCounts, setJobCounts] = useState<JobStatusCounts | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Fetch full dashboard payload on mount
  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const dashboardData = await getEvaluationDashboard();
      setData(dashboardData);
      setJobCounts(dashboardData.job_counts);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('[ModelEvaluationPage] Error loading evaluation dashboard:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load evaluation metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll live job status counts
  const pollJobCounts = useCallback(async () => {
    try {
      const counts = await getJobStatusCounts();
      setJobCounts(counts);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('[ModelEvaluationPage] Error polling job counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Set up live polling interval for job counts (every 5 seconds)
  useEffect(() => {
    if (!isPollingActive) return;
    const interval = setInterval(() => {
      pollJobCounts();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPollingActive, pollJobCounts]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center space-y-4">
        <div className="inline-block w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Loading model evaluation metrics and telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-rose-300">Unable to Load Model Evaluation</h2>
          <p className="text-xs text-rose-400">{error || 'Unknown error occurred while fetching dashboard data.'}</p>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchDashboard();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { qwk_summary, loss_curves } = data;
  const currentLossPoints = loss_curves[String(selectedPrompt)] || [];
  const currentPromptQwk = qwk_summary.prompts.find((p) => p.prompt_id === selectedPrompt);

  // Transform QWK data for Recharts BarChart
  const qwkChartData = qwk_summary.prompts.map((p) => ({
    name: `P${p.prompt_id}`,
    prompt_id: p.prompt_id,
    qwk: Number(p.qwk.toFixed(4)),
    target: p.target_qwk,
    genre: p.genre,
    rubric: `[${p.rubric_min}, ${p.rubric_max}]`,
    passed: p.passed,
  }));

  // Custom Tooltip for QWK Bar Chart
  const CustomQwkTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur text-xs space-y-1">
          <div className="font-bold text-white flex items-center justify-between space-x-3">
            <span>Prompt {p.prompt_id}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                p.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {p.passed ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <div className="text-slate-300">
            Genre: <span className="text-slate-200 capitalize">{p.genre}</span>
          </div>
          <div className="text-slate-300">
            Rubric: <span className="font-mono text-slate-200">{p.rubric}</span>
          </div>
          <div className="text-slate-300">
            Achieved QWK: <span className="font-mono font-bold text-emerald-400">{p.qwk.toFixed(4)}</span>
          </div>
          <div className="text-slate-400">
            Target Gate: <span className="font-mono text-slate-300">&ge; {p.target.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Loss Curves
  const CustomLossTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-xl shadow-xl backdrop-blur text-xs space-y-1">
          <div className="font-bold text-white border-b border-slate-700 pb-1">
            Step / Epoch {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between space-x-4">
              <span style={{ color: entry.color }} className="font-medium">
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-white">
                {typeof entry.value === 'number' ? entry.value.toFixed(5) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="model-eval-page" className="max-w-6xl mx-auto px-6 space-y-8 animate-fade-in pb-16">
      {/* Top Banner & Key Metrics */}
      <div className="bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-white tracking-tight">Model Evaluation & Diagnostics</h1>
              <span
                id="acceptance-gate-badge"
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  qwk_summary.all_passed
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {qwk_summary.all_passed ? '✓ Acceptance Gate: PASSED' : '✗ Gate: FAILED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Section 12.1 Held-Out Test Evaluation across all 8 ASAP prompts (Target QWK &ge; {qwk_summary.target_qwk.toFixed(2)})
            </p>
          </div>

          {/* Quick Telemetry Summary */}
          <div className="flex items-center space-x-4 text-xs">
            <div className="bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Average QWK</div>
              <div id="average-qwk-value" className="text-lg font-black text-emerald-400 font-mono">
                {qwk_summary.average_qwk.toFixed(4)}
              </div>
            </div>
            <div className="bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Base Architecture</div>
              <div className="text-xs font-bold text-white font-mono mt-1">BERT + LoRA (r=8)</div>
            </div>
          </div>
        </div>

        {/* Live Job Pipeline Summary */}
        <div className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Inference Job Queue Telemetry
              </h2>
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="hidden sm:inline">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                id="btn-toggle-polling"
                type="button"
                onClick={() => setIsPollingActive(!isPollingActive)}
                className="px-2 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition"
              >
                {isPollingActive ? 'Pause Live Poll' : 'Resume Live Poll'}
              </button>
              <button
                id="btn-refresh-jobs"
                type="button"
                onClick={pollJobCounts}
                className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[10px] font-semibold transition"
              >
                Refresh
              </button>
            </div>
          </div>

          {jobCounts && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div
                id="job-card-queued"
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>QUEUED</span>
                  {jobCounts.queued > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </div>
                <div className="text-xl font-black font-mono text-amber-400 mt-1">
                  {jobCounts.queued}
                </div>
              </div>

              <div
                id="job-card-processing"
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                  <span>PROCESSING</span>
                  {jobCounts.processing > 0 && (
                    <div className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <div className="text-xl font-black font-mono text-cyan-400 mt-1">
                  {jobCounts.processing}
                </div>
              </div>

              <div
                id="job-card-completed"
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="text-slate-400 text-[11px] font-medium">COMPLETED</div>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {jobCounts.completed}
                </div>
              </div>

              <div
                id="job-card-failed"
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div className="text-slate-400 text-[11px] font-medium">FAILED</div>
                <div className="text-xl font-black font-mono text-rose-400 mt-1">
                  {jobCounts.failed}
                </div>
              </div>

              <div
                id="job-card-total"
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div className="text-slate-400 text-[11px] font-medium">TOTAL RUNS</div>
                <div className="text-xl font-black font-mono text-white mt-1">
                  {jobCounts.total}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Per-Prompt QWK Bars (Week 7 Evaluation) */}
      <div id="qwk-section" className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Per-Prompt Quadratic Weighted Kappa (QWK)
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated on held-out test splits. Target acceptance gate is QWK &ge; 0.70 (amber reference line).
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-block w-3 h-3 bg-emerald-500 rounded" />
            <span className="text-slate-300">Achieved QWK</span>
            <span className="inline-block w-3 h-0.5 bg-amber-400 ml-2" />
            <span className="text-slate-300">Gate Target (0.70)</span>
          </div>
        </div>

        {/* QWK Bar Chart */}
        <div id="qwk-chart-container" className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={qwkChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                domain={[0, 1.1]}
                ticks={[0, 0.2, 0.4, 0.6, 0.7, 0.8, 1.0]}
              />
              <Tooltip content={<CustomQwkTooltip />} />
              <ReferenceLine
                y={0.70}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Target: 0.70',
                  fill: '#f59e0b',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
              <Bar dataKey="qwk" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* QWK Details Table */}
        <div className="overflow-x-auto">
          <table id="qwk-table" className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Prompt</th>
                <th className="py-2.5 px-3">Genre</th>
                <th className="py-2.5 px-3">Rubric Range</th>
                <th className="py-2.5 px-3">Test Samples</th>
                <th className="py-2.5 px-3">Target QWK</th>
                <th className="py-2.5 px-3">Achieved QWK</th>
                <th className="py-2.5 px-3 text-right">Gate Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono">
              {qwk_summary.prompts.map((p) => (
                <tr
                  key={p.prompt_id}
                  className={`hover:bg-slate-700/30 transition cursor-pointer ${
                    selectedPrompt === p.prompt_id ? 'bg-slate-700/40' : ''
                  }`}
                  onClick={() => setSelectedPrompt(p.prompt_id)}
                >
                  <td className="py-2.5 px-3 font-bold text-white">Prompt {p.prompt_id}</td>
                  <td className="py-2.5 px-3 font-sans capitalize text-slate-300">{p.genre}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    [{p.rubric_min}, {p.rubric_max}]
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{p.n_test_samples}</td>
                  <td className="py-2.5 px-3 text-amber-400">&ge; {p.target_qwk.toFixed(2)}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{p.qwk.toFixed(4)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.passed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {p.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Per-Prompt Loss Curves */}
      <div id="loss-curves-section" className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Training & Validation Loss Curves
            </h2>
            <p className="text-xs text-slate-400">
              Loss trajectory logged across fine-tuning epochs/steps for Prompt {selectedPrompt} ({currentPromptQwk?.genre}).
            </p>
          </div>

          {/* Prompt Selection Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((pid) => (
              <button
                key={pid}
                id={`tab-prompt-${pid}`}
                type="button"
                onClick={() => setSelectedPrompt(pid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedPrompt === pid
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                }`}
              >
                P{pid}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Prompt Telemetry Strip */}
        {currentPromptQwk && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Prompt Genre</div>
              <div className="text-sm font-bold text-white capitalize mt-0.5">{currentPromptQwk.genre}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Rubric Scale</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {currentPromptQwk.rubric_min} &rarr; {currentPromptQwk.rubric_max} pts
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Final Train Loss</div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                {currentLossPoints.length > 0 && currentLossPoints[currentLossPoints.length - 1].train_loss != null
                  ? currentLossPoints[currentLossPoints.length - 1].train_loss?.toFixed(5)
                  : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl p-3">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Final Val Loss</div>
              <div className="text-sm font-bold text-purple-400 font-mono mt-0.5">
                {currentLossPoints.length > 0 && currentLossPoints[currentLossPoints.length - 1].val_loss != null
                  ? currentLossPoints[currentLossPoints.length - 1].val_loss?.toFixed(5)
                  : 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Loss Curve Line Chart */}
        <div id="loss-chart-container" className="h-80 w-full">
          {currentLossPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentLossPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="step"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Step / Epoch', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'MSE Loss', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip content={<CustomLossTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="train_loss"
                  name="Train Loss"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#06b6d4' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="val_loss"
                  name="Validation Loss"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#a855f7' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No loss telemetry recorded for Prompt {selectedPrompt}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelEvaluationPage;
