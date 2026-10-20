import React from 'react';
import { DimensionScoreDetail } from '../../api';
import { DimensionKey } from '../scoring/ControlRail';

export interface DimensionRadarChartProps {
  dimensions: DimensionScoreDetail[];
  activeDimensions: Record<DimensionKey, boolean>;
  rubricMin?: number;
  rubricMax?: number;
  className?: string;
}

// WHY: Lightweight, zero-dependency SVG 3-axis radar chart visualizing Grammar, Coherence, and Argumentation sub-scores.
const DimensionRadarChartComponent: React.FC<DimensionRadarChartProps> = ({
  dimensions,
  activeDimensions,
  rubricMin = 2.0,
  rubricMax = 12.0,
  className = '',
}) => {
  // Extract sub-scores for the 3 core dimensions
  const getSubScore = (key: DimensionKey): number => {
    const found = dimensions.find((d) => d.dimension.toLowerCase().trim() === key);
    return found?.score ?? found?.subScore ?? (rubricMin + (rubricMax - rubricMin) * 0.7);
  };

  const grammarScore = getSubScore('grammar');
  const coherenceScore = getSubScore('coherence');
  const argumentScore = getSubScore('argumentation');

  // Normalize scores to [0.15, 1.0] for visible triangular geometry
  const span = Math.max(1, rubricMax - rubricMin);
  const normalize = (score: number): number => {
    const raw = (score - rubricMin) / span;
    return Math.max(0.18, Math.min(1.0, raw));
  };

  const gNorm = normalize(grammarScore);
  const cNorm = normalize(coherenceScore);
  const aNorm = normalize(argumentScore);

  // SVG Geometry constants
  const cx = 150;
  const cy = 95;
  const maxR = 60;
  const cos30 = 0.866025; // Math.cos(Math.PI / 6)
  const sin30 = 0.5; // Math.sin(Math.PI / 6)

  // Guideline concentric triangles at 33%, 66%, 100%
  const levels = [0.33, 0.66, 1.0];

  // Data vertices (Angles: Grammar = -90°, Coherence = 30°, Argumentation = 150°)
  const pGrammar = {
    x: cx,
    y: cy - maxR * gNorm,
  };
  const pCoherence = {
    x: cx + maxR * cNorm * cos30,
    y: cy + maxR * cNorm * sin30,
  };
  const pArgument = {
    x: cx - maxR * aNorm * cos30,
    y: cy + maxR * aNorm * sin30,
  };

  const dataPolygon = `${pGrammar.x},${pGrammar.y} ${pCoherence.x},${pCoherence.y} ${pArgument.x},${pArgument.y}`;

  // Average sub-score
  const avgSubScore = (grammarScore + coherenceScore + argumentScore) / 3;

  return (
    <div
      className={`bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-inner space-y-2 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            3-Axis Dimensional Profile
          </h3>
        </div>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          Avg: <strong className="text-primary-600 dark:text-primary-300">{avgSubScore.toFixed(1)}</strong> / {rubricMax.toFixed(1)}
        </span>
      </div>

      {/* Responsive SVG Radar Chart */}
      <div className="relative flex justify-center py-1">
        <svg
          viewBox="0 0 300 190"
          className="w-full max-w-[280px] h-auto overflow-visible select-none"
          role="img"
          aria-label="3-axis radar chart summarizing Grammar, Coherence, and Argumentation scores"
        >
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
            </linearGradient>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric Guide Triangles */}
          {levels.map((lvl) => {
            const p0 = `${cx},${cy - maxR * lvl}`;
            const p1 = `${cx + maxR * lvl * cos30},${cy + maxR * lvl * sin30}`;
            const p2 = `${cx - maxR * lvl * cos30},${cy + maxR * lvl * sin30}`;
            return (
              <polygon
                key={lvl}
                points={`${p0} ${p1} ${p2}`}
                fill="none"
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-800"
                strokeWidth="1"
                strokeDasharray={lvl === 1.0 ? 'none' : '3,3'}
              />
            );
          })}

          {/* Radial Axis Spokes */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - maxR}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-700/80"
            strokeWidth="1.2"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + maxR * cos30}
            y2={cy + maxR * sin30}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-700/80"
            strokeWidth="1.2"
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx - maxR * cos30}
            y2={cy + maxR * sin30}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-700/80"
            strokeWidth="1.2"
          />

          {/* Shaded Data Polygon */}
          <polygon
            points={dataPolygon}
            fill="url(#radarGradient)"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#radarGlow)"
            className="transition-all duration-300 ease-out motion-reduce:transition-none"
          />

          {/* Vertex Markers */}
          <circle
            cx={pGrammar.x}
            cy={pGrammar.y}
            r="4.5"
            className={`transition-all duration-300 motion-reduce:transition-none ${
              activeDimensions.grammar ? 'fill-rose-500 dark:fill-rose-400 stroke-white dark:stroke-slate-900' : 'fill-slate-400 dark:fill-slate-600 stroke-white dark:stroke-slate-800'
            }`}
            strokeWidth="2"
          />
          <circle
            cx={pCoherence.x}
            cy={pCoherence.y}
            r="4.5"
            className={`transition-all duration-300 motion-reduce:transition-none ${
              activeDimensions.coherence ? 'fill-amber-500 dark:fill-amber-400 stroke-white dark:stroke-slate-900' : 'fill-slate-400 dark:fill-slate-600 stroke-white dark:stroke-slate-800'
            }`}
            strokeWidth="2"
          />
          <circle
            cx={pArgument.x}
            cy={pArgument.y}
            r="4.5"
            className={`transition-all duration-300 motion-reduce:transition-none ${
              activeDimensions.argumentation ? 'fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900' : 'fill-slate-400 dark:fill-slate-600 stroke-white dark:stroke-slate-800'
            }`}
            strokeWidth="2"
          />

          {/* Top Axis Label: Grammar */}
          <g transform={`translate(${cx}, ${cy - maxR - 16})`}>
            <text
              textAnchor="middle"
              className={`text-[11px] font-bold font-sans transition-colors ${
                activeDimensions.grammar ? 'fill-rose-700 dark:fill-rose-300' : 'fill-slate-500'
              }`}
            >
              Grammar
            </text>
            <text
              textAnchor="middle"
              y="11"
              className="text-[10px] font-mono fill-slate-600 dark:fill-slate-400 font-semibold"
            >
              {grammarScore.toFixed(1)}
            </text>
          </g>

          {/* Bottom Right Axis Label: Coherence */}
          <g transform={`translate(${cx + maxR * cos30 + 14}, ${cy + maxR * sin30 + 10})`}>
            <text
              textAnchor="start"
              className={`text-[11px] font-bold font-sans transition-colors ${
                activeDimensions.coherence ? 'fill-amber-800 dark:fill-amber-300' : 'fill-slate-500'
              }`}
            >
              Coherence
            </text>
            <text
              textAnchor="start"
              y="11"
              className="text-[10px] font-mono fill-slate-600 dark:fill-slate-400 font-semibold"
            >
              {coherenceScore.toFixed(1)}
            </text>
          </g>

          {/* Bottom Left Axis Label: Argumentation */}
          <g transform={`translate(${cx - maxR * cos30 - 14}, ${cy + maxR * sin30 + 10})`}>
            <text
              textAnchor="end"
              className={`text-[11px] font-bold font-sans transition-colors ${
                activeDimensions.argumentation ? 'fill-emerald-800 dark:fill-emerald-300' : 'fill-slate-500'
              }`}
            >
              Argumentation
            </text>
            <text
              textAnchor="end"
              y="11"
              className="text-[10px] font-mono fill-slate-600 dark:fill-slate-400 font-semibold"
            >
              {argumentScore.toFixed(1)}
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Dimension Legend Chips */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800/60 text-[10px] font-mono">
        <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
          <span className="text-slate-500 dark:text-slate-400">Grammar:</span>
          <span className="font-bold text-slate-900 dark:text-white">{grammarScore.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          <span className="text-slate-500 dark:text-slate-400">Coherence:</span>
          <span className="font-bold text-slate-900 dark:text-white">{coherenceScore.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <span className="text-slate-500 dark:text-slate-400">Arg:</span>
          <span className="font-bold text-slate-900 dark:text-white">{argumentScore.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export const DimensionRadarChart = React.memo(DimensionRadarChartComponent);
export default DimensionRadarChart;
