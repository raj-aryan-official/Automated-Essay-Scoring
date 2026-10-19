import React, { useMemo } from 'react';
import { DimensionScoreDetail } from '../../api';
import { DimensionKey } from '../scoring/ControlRail';
import {
  PenTool,
  Layers,
  Scale,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export interface DimensionCardProps {
  dimension: DimensionScoreDetail;
  dimKey: DimensionKey;
  isVisible: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectDimension?: (dimKey: DimensionKey) => void;
  rubricMin?: number;
  rubricMax?: number;
}

export interface FeedbackItem {
  id: string;
  severity: 'high' | 'moderate' | 'proficient';
  chipLabel: string;
  chipClass: string;
  category: string;
  text: string;
}

// WHY: Expandable dimension card featuring radial/bar sub-score gauge, synthesized one-line summary, and severity-sorted feedback items.
export const DimensionCard: React.FC<DimensionCardProps> = ({
  dimension,
  dimKey,
  isVisible,
  isExpanded,
  onToggleExpand,
  onSelectDimension,
  rubricMin = 2.0,
  rubricMax = 12.0,
}) => {
  const currentScore = dimension.score ?? dimension.subScore ?? rubricMin;
  const rawFeedback = dimension.feedback || dimension.feedbackText || 'Pedagogical feedback pending.';

  // Normalize sub-score to [0, 1] relative to scale
  const span = Math.max(1, rubricMax - rubricMin);
  const normalized = Math.max(0, Math.min(1, (currentScore - rubricMin) / span));
  const percent = Math.round(normalized * 100);

  // Dimension Metadata: Icon & Label & Theme
  const meta = useMemo(() => {
    switch (dimKey) {
      case 'grammar':
        return {
          title: 'Grammar & Mechanics',
          icon: PenTool,
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-500/10 border-rose-500/20',
          borderActive: 'border-l-4 border-l-rose-500',
        };
      case 'coherence':
        return {
          title: 'Coherence & Organization',
          icon: Layers,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/10 border-amber-500/20',
          borderActive: 'border-l-4 border-l-amber-500',
        };
      case 'argumentation':
      default:
        return {
          title: 'Argumentation & Evidence',
          icon: Scale,
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/10 border-emerald-500/20',
          borderActive: 'border-l-4 border-l-emerald-500',
        };
    }
  }, [dimKey]);

  // Overall Severity Badge
  const severityBadge = useMemo(() => {
    if (normalized < 0.35) {
      return {
        label: 'High Priority',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
        strokeColor: '#f43f5e',
      };
    } else if (normalized < 0.70) {
      return {
        label: 'Moderate',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        strokeColor: '#f59e0b',
      };
    } else {
      return {
        label: 'Proficient',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        strokeColor: '#10b981',
      };
    }
  }, [normalized]);

  // Synthesize one-line summary from feedback text
  const oneLineSummary = useMemo(() => {
    // If multiple sentences exist, take the first crisp sentence as the primary takeaway
    const sentences = rawFeedback.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 0 && sentences[0].length < 120) {
      return sentences[0];
    }
    // Default contextual summaries based on score tier
    if (normalized >= 0.70) {
      return `Exemplary command of ${dimKey} conventions with mature stylistic execution.`;
    } else if (normalized >= 0.35) {
      return `Competent foundation in ${dimKey} with actionable opportunities for refinement.`;
    } else {
      return `Priority growth area: structural deficiencies in ${dimKey} warrant focused revision.`;
    }
  }, [rawFeedback, normalized, dimKey]);

  // Parse and sort itemized feedback points by severity (High Priority -> Moderate -> Proficient)
  const feedbackItems = useMemo<FeedbackItem[]>(() => {
    const sentences = rawFeedback.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 10);
    const items: FeedbackItem[] = [];

    // Helper to evaluate severity of individual sentence
    const rankSentence = (sentence: string, idx: number): FeedbackItem => {
      const lower = sentence.toLowerCase();
      let severity: 'high' | 'moderate' | 'proficient' = 'moderate';
      let chipLabel = 'Moderate';
      let chipClass = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      let category = 'Growth Area';

      if (
        lower.includes('review') ||
        lower.includes('exceeding') ||
        lower.includes('run-on') ||
        lower.includes('lacks') ||
        lower.includes('comma splice') ||
        lower.includes('fragment') ||
        lower.includes('missing') ||
        lower.includes('delineate') ||
        normalized < 0.35
      ) {
        severity = 'high';
        chipLabel = 'High Priority';
        chipClass = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
        category = 'Priority Fix';
      } else if (
        lower.includes('exemplary') ||
        lower.includes('good') ||
        lower.includes('effective') ||
        lower.includes('solid') ||
        lower.includes('maintain') ||
        normalized >= 0.70
      ) {
        severity = 'proficient';
        chipLabel = 'Proficient';
        chipClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
        category = 'Strength';
      }

      return {
        id: `${dimKey}-item-${idx}`,
        severity,
        chipLabel,
        chipClass,
        category,
        text: sentence.trim(),
      };
    };

    if (sentences.length > 0) {
      sentences.forEach((s, idx) => items.push(rankSentence(s, idx)));
    } else {
      items.push({
        id: `${dimKey}-item-0`,
        severity: normalized < 0.35 ? 'high' : normalized < 0.70 ? 'moderate' : 'proficient',
        chipLabel: severityBadge.label,
        chipClass: severityBadge.badgeClass,
        category: 'Diagnostic Observation',
        text: rawFeedback,
      });
    }

    // Sort: high (0) -> moderate (1) -> proficient (2)
    const severityOrder = { high: 0, moderate: 1, proficient: 2 };
    return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [rawFeedback, normalized, dimKey, severityBadge]);

  // Small Radial Gauge Math (Circle radius = 13, perimeter = 81.68)
  const circleR = 13;
  const circumference = 2 * Math.PI * circleR;
  const strokeDashoffset = circumference - normalized * circumference;

  const IconComponent = meta.icon;

  return (
    <div
      id={`drawer-item-${dimKey}`}
      className={`transition-all duration-300 ease-in-out ${
        isVisible
          ? 'opacity-100 max-h-[800px] mb-3 transform translate-y-0'
          : 'opacity-0 max-h-0 mb-0 overflow-hidden transform -translate-y-2 pointer-events-none'
      }`}
    >
      <div
        className={`bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all hover:border-slate-700/80 ${
          meta.borderActive
        }`}
      >
        {/* ===================================================================
            CARD HEADER (Collapsible Trigger)
            =================================================================== */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          onClick={() => {
            onToggleExpand();
            if (onSelectDimension) onSelectDimension(dimKey);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand();
              if (onSelectDimension) onSelectDimension(dimKey);
            }
          }}
          className="p-4 cursor-pointer select-none flex items-start justify-between gap-3 bg-slate-900/60 hover:bg-slate-800/40 transition-colors"
        >
          {/* Left: Icon + Title + One-line Summary */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`p-2.5 rounded-lg border shrink-0 mt-0.5 ${meta.iconBg} ${meta.iconColor}`}
            >
              <IconComponent className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {meta.title}
                </h4>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${severityBadge.badgeClass}`}
                >
                  {severityBadge.label}
                </span>
              </div>

              {/* One-Line Summary */}
              <p className="text-xs text-slate-300 leading-snug line-clamp-2 font-sans pr-2">
                {oneLineSummary}
              </p>
            </div>
          </div>

          {/* Right: Small Radial Gauge & Sub-Score + Chevron */}
          <div className="flex items-center gap-3 shrink-0 self-center">
            {/* Small Radial Gauge */}
            <div className="flex items-center gap-2">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-9 h-9 -rotate-90 transform" viewBox="0 0 36 36">
                  {/* Track Circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r={circleR}
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-slate-800"
                    fill="none"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="18"
                    cy="18"
                    r={circleR}
                    stroke={severityBadge.strokeColor}
                    strokeWidth="3.2"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    fill="none"
                  />
                </svg>
                <span className="absolute font-mono text-[9px] font-bold text-white">
                  {percent}%
                </span>
              </div>

              <div className="text-right">
                <div className="font-mono text-xs font-black text-white">
                  {currentScore.toFixed(1)}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  / {rubricMax.toFixed(0)} pts
                </div>
              </div>
            </div>

            {/* Expand / Collapse Chevron */}
            <div
              className={`p-1 text-slate-400 hover:text-white rounded transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Small Horizontal Gauge Bar right under header */}
        <div className="h-1 w-full bg-slate-800/80 overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${percent}%`,
              backgroundColor: severityBadge.strokeColor,
            }}
          />
        </div>

        {/* ===================================================================
            EXPANDED CONTENT: Feedback items sorted by severity with chips
            =================================================================== */}
        {isExpanded && (
          <div className="p-4 pt-3 border-t border-slate-800/70 bg-slate-950/50 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/50">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Diagnostic Observations ({feedbackItems.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">Sorted by Severity</span>
            </div>

            <div className="space-y-2.5">
              {feedbackItems.map((item) => {
                let SeverityIcon = AlertTriangle;
                if (item.severity === 'high') SeverityIcon = AlertCircle;
                else if (item.severity === 'proficient') SeverityIcon = CheckCircle2;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs space-y-1.5 transition-colors hover:border-slate-700/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <SeverityIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-[11px] text-slate-200">
                          {item.category}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${item.chipClass}`}
                      >
                        {item.chipLabel}
                      </span>
                    </div>

                    <p className="text-slate-300 leading-relaxed font-sans pl-5">
                      {item.text}
                    </p>

                    {onSelectDimension && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDimension(dimKey);
                          }}
                          className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold transition flex items-center gap-1"
                        >
                          <span>Locate in essay</span>
                          <span>&rarr;</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DimensionCard;
