import React, { useMemo, useState } from 'react';
import { EssayScoreResponse, EssayDetailResponse } from '../../api';
import { Tooltip, ContextHelp } from '../../components/ui';
import { useCountUp } from '../../hooks';
import {
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface ScoreCardProps {
  scoreData: EssayScoreResponse;
  confidenceThreshold: number;
  essay?: EssayDetailResponse;
  isSticky?: boolean;
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  className?: string;
}

// WHY: Comprehensive ScoreCard visualizer implementing large score with denominator, segmented rubric bands, confidence meter, and threshold warning banner.
const ScoreCardComponent: React.FC<ScoreCardProps> = ({
  scoreData,
  confidenceThreshold,
  essay,
  isSticky = true,
  isDrawerOpen = true,
  onToggleDrawer,
  className = '',
}) => {
  const {
    holisticScore,
    rubricBand,
    confidence,
    modelVersion,
    reviewerOverrideScore,
    reviewerOverrideReason,
  } = scoreData;

  const rubricMin = scoreData.rubricMin ?? 2.0;
  const rubricMax = scoreData.rubricMax ?? 12.0;
  const rubricSpan = Math.max(1, rubricMax - rubricMin);

  // Animate the holistic score counting up (300ms cubic ease-out, zero delay)
  const animatedScore = useCountUp(holisticScore, rubricMin, 300);

  // Normalized score between 0% and 100% of the rubric range
  const normalizedPercent = Math.round(
    Math.max(0, Math.min(1, (holisticScore - rubricMin) / rubricSpan)) * 100
  );

  // Segmented Rubric Bands definition (4 standard tiers color-coded red / amber / green with explicit icons & descriptors)
  const bands = useMemo(() => {
    return [
      {
        key: 'below_basic',
        label: 'Below Basic',
        descriptor: 'Needs Revision',
        icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" aria-hidden="true" />,
        min: rubricMin,
        max: rubricMin + 0.25 * rubricSpan,
        colorClass: 'text-rose-500 dark:text-rose-400',
        barBg: 'bg-rose-500',
        activeBg: 'bg-rose-50 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500 text-rose-900 dark:text-rose-200 ring-1 ring-rose-400/50 shadow-md shadow-rose-500/10',
        badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40',
      },
      {
        key: 'basic',
        label: 'Basic',
        descriptor: 'Developing',
        icon: <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />,
        min: rubricMin + 0.25 * rubricSpan,
        max: rubricMin + 0.50 * rubricSpan,
        colorClass: 'text-amber-500 dark:text-amber-400',
        barBg: 'bg-amber-500',
        activeBg: 'bg-amber-50 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/10',
        badgeClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
      },
      {
        key: 'proficient',
        label: 'Proficient',
        descriptor: 'Meets Standard',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
        min: rubricMin + 0.50 * rubricSpan,
        max: rubricMin + 0.75 * rubricSpan,
        colorClass: 'text-emerald-500 dark:text-emerald-400',
        barBg: 'bg-emerald-500',
        activeBg: 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-400/50 shadow-md shadow-emerald-500/10',
        badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
      },
      {
        key: 'advanced',
        label: 'Advanced',
        descriptor: 'Exceeds Standard',
        icon: <Sparkles className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 shrink-0" aria-hidden="true" />,
        min: rubricMin + 0.75 * rubricSpan,
        max: rubricMax,
        colorClass: 'text-teal-500 dark:text-teal-400',
        barBg: 'bg-teal-400',
        activeBg: 'bg-teal-50 dark:bg-teal-500/20 border-teal-300 dark:border-teal-500 text-teal-900 dark:text-teal-200 ring-1 ring-teal-400/50 shadow-md shadow-teal-500/10',
        badgeClass: 'bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/40',
      },
    ];
  }, [rubricMin, rubricMax, rubricSpan]);

  // Determine which band is active
  const activeBandIndex = useMemo(() => {
    const bandLower = (rubricBand || '').toLowerCase().replace(/\s+/g, '_');
    const indexByLabel = bands.findIndex(
      (b) => bandLower.includes(b.key) || b.label.toLowerCase() === (rubricBand || '').toLowerCase()
    );
    if (indexByLabel !== -1) return indexByLabel;

    // Fallback: match by score range
    return bands.findIndex((b, idx) => {
      if (idx === bands.length - 1) return holisticScore >= b.min;
      return holisticScore >= b.min && holisticScore < b.max;
    });
  }, [rubricBand, holisticScore, bands]);

  const activeBand = bands[activeBandIndex >= 0 ? activeBandIndex : 2];

  // Model Confidence Categorization
  let confidenceColor = 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40';
  let confidenceBarBg = 'bg-emerald-500';
  let confidenceLabel = 'High Confidence';
  let dotColor = 'bg-emerald-500 dark:bg-emerald-400';

  if (confidence < 0.70) {
    confidenceColor = 'text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40';
    confidenceBarBg = 'bg-rose-500';
    confidenceLabel = 'Low Confidence';
    dotColor = 'bg-rose-500 dark:bg-rose-400';
  } else if (confidence < 0.85) {
    confidenceColor = 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40';
    confidenceBarBg = 'bg-amber-500';
    confidenceLabel = 'Moderate Confidence';
    dotColor = 'bg-amber-500 dark:bg-amber-400';
  }

  const [isScaleOpenMobile, setIsScaleOpenMobile] = useState<boolean>(true);

  // Warning check: confidence drops below reviewer's slider threshold
  const isBelowThreshold = confidence < confidenceThreshold;

  return (
    <div
      id="holistic-score-card"
      className={`${
        isSticky
          ? 'sticky top-16 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 shadow-xl'
          : 'bg-white dark:bg-slate-900/90'
      } border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-5 transition-all mb-6 space-y-4 sm:space-y-5 ${className}`}
    >
      {/* ===================================================================
          ROW 1: Large Score Number + Denominator + Summary Stats + Quick Actions
          =================================================================== */}
      {/* ===================================================================
          ROW 1: Large Score Number + Denominator + Summary Stats + Quick Actions
          =================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-5">
        {/* Score & Denominator Group */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Holistic Score
              </span>
              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                Scale {rubricMin.toFixed(0)} – {rubricMax.toFixed(0)} pts
              </span>
            </div>

            <div className="flex items-baseline gap-2 sm:gap-2.5">
              <span
                id="holistic-score-value"
                className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-white drop-shadow-sm"
              >
                {animatedScore.toFixed(2)}
              </span>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base md:text-lg font-bold text-slate-500 dark:text-slate-400 font-sans">
                  out of {rubricMax.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Automated BERT rubric calibration
                </span>
              </div>
            </div>
          </div>

          <div className="h-12 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Current Band Highlight Pill */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Assigned Band
              </span>
              <ContextHelp topic="rubricBand" position="bottom" />
            </div>
            <div className="flex items-center gap-2">
              <span
                id="rubric-band-badge"
                className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold border ${activeBand.badgeClass}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {rubricBand || activeBand.label}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Context: Essay info if available */}
        {essay && (
          <div className="hidden xl:flex flex-col justify-center text-xs text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-6 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 dark:text-slate-300 truncate max-w-xs">
                {essay.prompt_title || `Essay ${essay.id.slice(0, 8)}`}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                {essay.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              <span>{essay.raw_text.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
              <span>{essay.raw_text.length.toLocaleString()} chars</span>
            </div>
          </div>
        )}

        {/* Confidence Meter with Tooltip */}
        <div className="flex flex-col sm:items-end justify-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Certainty Metric
              </span>
              <ContextHelp topic="confidence" position="bottom" />
            </div>

            {/* Plain-Words Tooltip */}
            <Tooltip
              content={
                <div className="max-w-xs p-1 space-y-1 text-left">
                  <p className="font-bold text-slate-900 dark:text-white text-xs">What does Confidence mean?</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Confidence reflects the model&apos;s statistical certainty that the essay matches
                    the scoring criteria of the ASAP benchmark.
                  </p>
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700/80 space-y-0.5 text-[10px]">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>• &ge;85%:</span>
                      <span className="text-slate-600 dark:text-slate-300">Strong consensus with human rubrics</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <span>• 70%–84%:</span>
                      <span className="text-slate-600 dark:text-slate-300">Moderate feature agreement</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                      <span>• &lt;70%:</span>
                      <span className="text-slate-600 dark:text-slate-300">Atypical syntax — human review advised</span>
                    </div>
                  </div>
                </div>
              }
              position="left"
              className="z-50 p-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200"
            >
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded transition focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
                aria-label="Explain confidence metric"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>

          <div className="flex items-center gap-3">
            {/* Confidence Bar Meter */}
            <div className="w-28 sm:w-36 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center">
              <div
                className={`h-full rounded-full transition-all duration-700 ${confidenceBarBg}`}
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>

            {/* Confidence Badge */}
            <div
              id="confidence-badge"
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${confidenceColor}`}
            >
              <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
              <span className="font-mono font-bold">{(confidence * 100).toFixed(1)}%</span>
              <span className="text-[10px] opacity-90 hidden sm:inline">({confidenceLabel})</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          ROW 2: Segmented Rubric-Band Bar
          =================================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
            <span>Rubric Band Calibration Scale</span>
            <ContextHelp topic="rubricBand" position="bottom" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScaleOpenMobile((prev: boolean) => !prev)}
              aria-expanded={isScaleOpenMobile}
              className="sm:hidden text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-1 px-2.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 min-h-[32px] flex items-center"
            >
              {isScaleOpenMobile ? 'Compact' : 'Expand Scale'}
            </button>
            <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Score: <strong className="text-slate-900 dark:text-white font-mono">{holisticScore.toFixed(2)}</strong> / {rubricMax.toFixed(1)} ({activeBand.label} · {normalizedPercent}%)
            </span>
          </div>
        </div>

        {/* 4-Segment Grid */}
        {isScaleOpenMobile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {bands.map((band, idx) => {
              const isCurrent = idx === activeBandIndex;
              return (
                <div
                  key={band.key}
                  className={`relative rounded-xl border p-2.5 sm:p-3 transition-all duration-200 flex flex-col justify-between ${
                    isCurrent
                      ? `${band.activeBg} transform scale-[1.01]`
                      : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Band Indicator Accent Line */}
                  <div
                    className={`h-1 w-full rounded-full mb-1.5 sm:mb-2 ${
                      isCurrent ? band.barBg : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />

                  <div className="flex items-center justify-between mb-1 gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {band.icon}
                      <span
                        className={`text-xs font-bold tracking-tight truncate ${
                          isCurrent ? 'text-slate-900 dark:text-white font-black' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {band.label}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-600 dark:bg-white/20 text-white uppercase tracking-wider shrink-0">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-0.5">
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {band.min.toFixed(1)} – {band.max.toFixed(1)} pts
                    </span>
                    <span className={`text-[10px] font-semibold ${isCurrent ? 'text-slate-700 dark:text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                      {band.descriptor}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================
          ROW 3: Human Reviewer Override Chip (if applied)
          =================================================================== */}
      {reviewerOverrideScore !== null && reviewerOverrideScore !== undefined && (
        <div
          id="reviewer-override-box"
          className="p-3 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-xl text-xs text-primary-900 dark:text-primary-200 flex flex-wrap items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500 dark:bg-primary-400 animate-pulse" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Teacher Reviewer Override:
              </span>{' '}
              <span className="font-mono font-bold text-sm text-primary-700 dark:text-primary-300 ml-1">
                {reviewerOverrideScore.toFixed(2)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono ml-1">/ {rubricMax.toFixed(1)}</span>
            </div>
          </div>
          {reviewerOverrideReason && (
            <p className="text-xs text-primary-800 dark:text-primary-300/90 italic font-sans max-w-xl truncate">
              &ldquo;{reviewerOverrideReason}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* ===================================================================
          ROW 4: "Low confidence — recommend human review" Warning Banner
          =================================================================== */}
      {isBelowThreshold && (
        <div
          id="confidence-threshold-warning"
          role="alert"
          className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-lg animate-fade-in"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
              <span>Low confidence — recommend human review</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                {(confidence * 100).toFixed(1)}% &lt; {(confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed font-sans">
              The model&apos;s certainty of{' '}
              <strong className="font-mono text-slate-900 dark:text-white">{(confidence * 100).toFixed(1)}%</strong> is below
              your active confidence threshold (
              <strong className="font-mono text-slate-900 dark:text-white">{(confidenceThreshold * 100).toFixed(0)}%</strong>
              ). This essay presents non-standard syntactical structures or borderline rubric traits.
              Manual inspection in the Reviewer Override Panel is strongly advised before finalization.
            </p>
          </div>
        </div>
      )}

      {/* Optional Topbar Drawer Toggle & Model Footer Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Neural Engine:</span>
          <span className="text-slate-700 dark:text-slate-300">PyTorch BERT LoRA</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>Checkpoint v{modelVersion}</span>
        </div>

        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition flex items-center gap-1"
          >
            <span>{isDrawerOpen ? 'Hide Diagnostics' : 'Inspect Diagnostic Drawer'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const ScoreCard = React.memo(ScoreCardComponent);
export default ScoreCard;
