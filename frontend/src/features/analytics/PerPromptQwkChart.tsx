import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { PromptQwkResult } from '../../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, ContextHelp } from '../../components/ui';
import { BarChart3, Table as TableIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks';

export interface PerPromptQwkChartProps {
  prompts: PromptQwkResult[];
  targetQwk?: number;
  selectedPrompt?: number;
  onSelectPrompt?: (promptId: number) => void;
  className?: string;
}

const PerPromptQwkChartComponent: React.FC<PerPromptQwkChartProps> = ({
  prompts,
  targetQwk = 0.70,
  selectedPrompt,
  onSelectPrompt,
  className = '',
}) => {
  const { isDark } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Chart data formatting
  const chartData = prompts.map((p) => ({
    name: `P${p.prompt_id}`,
    prompt_id: p.prompt_id,
    qwk: Number(p.qwk.toFixed(4)),
    target: p.target_qwk || targetQwk,
    genre: p.genre,
    rubric: `[${p.rubric_min}, ${p.rubric_max}]`,
    passed: p.passed,
    samples: p.n_test_samples,
  }));

  // Custom Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[180px]">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-1">
            <span>Prompt {p.prompt_id}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                p.passed
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
              }`}
            >
              {p.passed ? '✓ GATE PASS' : '✗ GATE FAIL'}
            </span>
          </div>

          <div className="text-slate-600 dark:text-slate-300 flex justify-between">
            <span className="text-slate-400 dark:text-slate-400">Genre:</span>
            <span className="text-slate-800 dark:text-slate-200 capitalize font-medium">{p.genre}</span>
          </div>

          <div className="text-slate-600 dark:text-slate-300 flex justify-between">
            <span className="text-slate-400 dark:text-slate-400">Rubric Range:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{p.rubric}</span>
          </div>

          <div className="text-slate-600 dark:text-slate-300 flex justify-between pt-0.5 border-t border-slate-200 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-400">Achieved QWK:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.qwk.toFixed(4)}</span>
          </div>

          <div className="text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Target Gate:</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">&ge; {p.target.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Per-Prompt Quadratic Weighted Kappa (QWK)</span>
            <ContextHelp topic="qwk" position="right" />
          </CardTitle>
          <CardDescription>
            Held-out test evaluations against ASAP rubric sets. Amber line marks the 0.70 acceptance threshold.
          </CardDescription>
        </div>

        {/* View Mode Switcher (Chart vs Table alternative) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-md text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                viewMode === 'chart'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Chart</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-md text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Table View</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {viewMode === 'chart' ? (
          <div className="space-y-4">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  <span className="text-slate-700 dark:text-slate-300">Achieved QWK (&ge; 0.70)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-amber-500 dark:bg-amber-400 inline-block" />
                  <span className="text-slate-700 dark:text-slate-300">Gate Target (0.70)</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any bar to inspect prompt loss curve
              </span>
            </div>

            {/* Recharts Bar Chart */}
            <div id="qwk-chart-container" className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? '#475569' : '#cbd5e1'}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    stroke={isDark ? '#475569' : '#cbd5e1'}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    domain={[0, 1.05]}
                    ticks={[0, 0.2, 0.4, 0.6, 0.7, 0.8, 1.0]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={targetQwk}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: `Target: ${targetQwk.toFixed(2)}`,
                      fill: isDark ? '#f59e0b' : '#d97706',
                      fontSize: 11,
                      position: 'insideTopRight',
                    }}
                  />
                  <Bar
                    dataKey="qwk"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={300}
                    animationEasing="ease-out"
                    onClick={(entry: any) => onSelectPrompt && onSelectPrompt(entry.prompt_id)}
                    className="cursor-pointer"
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.prompt_id}`}
                        fill={
                          selectedPrompt === entry.prompt_id
                            ? '#38bdf8' // Highlight selected prompt in sky blue
                            : entry.qwk >= targetQwk
                            ? '#10b981' // Passed gate in emerald
                            : '#f43f5e' // Failed gate in rose
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Accessible Table Alternative */
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60">
            <table id="per-prompt-inline-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Prompt</th>
                  <th className="py-2.5 px-3">Genre</th>
                  <th className="py-2.5 px-3">Rubric Range</th>
                  <th className="py-2.5 px-3">Samples</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Achieved QWK</th>
                  <th className="py-2.5 px-3">Delta vs Gate</th>
                  <th className="py-2.5 px-3 text-right">Gate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono">
                {prompts.map((p) => {
                  const delta = p.qwk - (p.target_qwk || targetQwk);
                  const isSelected = selectedPrompt === p.prompt_id;

                  return (
                    <tr
                      key={p.prompt_id}
                      onClick={() => onSelectPrompt && onSelectPrompt(p.prompt_id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                        isSelected ? 'bg-primary-50/50 dark:bg-primary-950/30 border-l-2 border-primary-500' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Prompt {p.prompt_id}</td>
                      <td className="py-2.5 px-3 font-sans capitalize text-slate-700 dark:text-slate-300">{p.genre}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        [{p.rubric_min}, {p.rubric_max}]
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{p.n_test_samples}</td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">&ge; {p.target_qwk.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">{p.qwk.toFixed(4)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        +{delta.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge variant={p.passed ? 'success' : 'danger'} size="sm" withDot>
                          {p.passed ? 'PASS' : 'FAIL'}
                        </Badge>
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
  );
};

export const PerPromptQwkChart = React.memo(PerPromptQwkChartComponent);
export default PerPromptQwkChart;
