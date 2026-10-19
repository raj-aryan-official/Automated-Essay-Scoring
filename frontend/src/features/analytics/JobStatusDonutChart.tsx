import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { JobStatusCounts } from '../../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../../components/ui';
import { PieChart as PieChartIcon, Table as TableIcon, Layers, RefreshCw, Cpu } from 'lucide-react';

export interface JobStatusDonutChartProps {
  counts?: JobStatusCounts;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

const DEFAULT_JOB_COUNTS: JobStatusCounts = {
  queued: 8,
  processing: 3,
  completed: 1845,
  failed: 4,
  total: 1860,
};

interface SliceData {
  name: string;
  statusKey: keyof Omit<JobStatusCounts, 'total'>;
  value: number;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export const JobStatusDonutChart: React.FC<JobStatusDonutChartProps> = ({
  counts,
  onRefresh,
  isRefreshing = false,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const dataCounts = counts || DEFAULT_JOB_COUNTS;
  const total = dataCounts.total || (dataCounts.queued + dataCounts.processing + dataCounts.completed + dataCounts.failed) || 1;

  const slices: SliceData[] = [
    {
      name: 'Completed',
      statusKey: 'completed',
      value: dataCounts.completed,
      color: '#10B981', // emerald
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
      badgeText: 'text-emerald-400',
      description: 'Successfully scored & feedback generated',
    },
    {
      name: 'Processing',
      statusKey: 'processing',
      value: dataCounts.processing,
      color: '#0EA5E9', // sky
      badgeBg: 'bg-sky-500/10 border-sky-500/30',
      badgeText: 'text-sky-400',
      description: 'Active model inference & token analysis',
    },
    {
      name: 'Queued',
      statusKey: 'queued',
      value: dataCounts.queued,
      color: '#F59E0B', // amber
      badgeBg: 'bg-amber-500/10 border-amber-500/30',
      badgeText: 'text-amber-400',
      description: 'Waiting for worker allocation in Redis',
    },
    {
      name: 'Failed',
      statusKey: 'failed',
      value: dataCounts.failed,
      color: '#F43F5E', // rose
      badgeBg: 'bg-rose-500/10 border-rose-500/30',
      badgeText: 'text-rose-400',
      description: 'Errored out or timed out (can retry)',
    },
  ];

  const successRate = ((dataCounts.completed / total) * 100).toFixed(1);

  // Custom Glassmorphism Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: SliceData = payload[0].payload;
      const pct = ((item.value / total) * 100).toFixed(1);

      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-white flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </span>
            <span className="font-mono text-white font-bold">{item.value.toLocaleString()}</span>
          </div>

          <div className="text-slate-300 flex justify-between">
            <span className="text-slate-400">Proportion:</span>
            <span className="font-mono font-semibold" style={{ color: item.color }}>
              {pct}%
            </span>
          </div>

          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            {item.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Async Worker Job Distribution</span>
          </CardTitle>
          <CardDescription>
            Live job executor throughput across queuing, inferencing, and settlement.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-slate-800 transition-colors disabled:opacity-50"
              title="Refresh Queue Metrics"
              aria-label="Refresh Queue Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary-400' : ''}`} />
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'chart'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Donut Chart"
              aria-label="Switch to Donut Chart"
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Donut</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-slate-800 text-amber-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Accessible Table View"
              aria-label="Switch to Accessible Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Worker Pool Status Header */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">
              Worker Pool: <strong className="text-white">Active (4 Concurrency)</strong> &bull; Success Rate:{' '}
              <strong className="text-emerald-400 font-mono">{successRate}%</strong>
            </span>
          </div>
          <Badge
            variant="default"
            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
          >
            Healthy
          </Badge>
        </div>

        {viewMode === 'chart' ? (
          <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
            {/* Center total count label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
              <span className="text-2xl font-black text-white font-mono tracking-tight">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Total Jobs
              </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => {
                    const slice = slices.find((s) => s.name === value);
                    return (
                      <span className="text-slate-300 font-medium mr-2">
                        {value}: <strong className="text-white font-mono">{slice?.value.toLocaleString()}</strong>
                      </span>
                    );
                  }}
                />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  onMouseEnter={(_, index) => setHoveredSlice(slices[index]?.name || null)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  {slices.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke="#0F172A"
                      strokeWidth={2}
                      className="cursor-pointer transition-opacity duration-200"
                      opacity={hoveredSlice === null || hoveredSlice === entry.name ? 1 : 0.6}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Accessible Text / Table Alternative */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Status</th>
                  <th scope="col" className="py-2.5 px-3">Description</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Job Count</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Share (%)</th>
                  <th scope="col" className="py-2.5 px-3 text-center">Health Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {slices.map((slice) => {
                  const pct = ((slice.value / total) * 100).toFixed(1);

                  return (
                    <tr key={slice.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span>{slice.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">
                        {slice.description}
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-bold">
                        {slice.value.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold" style={{ color: slice.color }}>
                        {pct}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-sans font-semibold border ${slice.badgeBg} ${slice.badgeText}`}
                        >
                          {slice.name === 'Failed' && slice.value > 10 ? 'Degraded' : 'Nominal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Completed ({dataCounts.completed})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              <span>Processing ({dataCounts.processing})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>Queued ({dataCounts.queued})</span>
            </span>
          </div>
          <span>Redis Broker Queue: 0 dropped</span>
        </div>
      </CardContent>
    </Card>
  );
};
