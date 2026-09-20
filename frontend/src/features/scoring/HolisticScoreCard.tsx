import React from 'react';
import { EssayScoreResponse } from '../../api';

interface HolisticScoreCardProps {
  scoreData: EssayScoreResponse;
  confidenceThreshold: number;
}

export const HolisticScoreCard: React.FC<HolisticScoreCardProps> = ({
  scoreData,
  confidenceThreshold,
}) => {
  const {
    holisticScore,
    rubricBand,
    confidence,
    modelVersion,
    reviewerOverrideScore,
    reviewerOverrideReason,
  } = scoreData;

  // Confidence color-coding:
  // Low (< 0.70): Red
  // Mid (0.70 - 0.85): Amber
  // High (>= 0.85): Green
  let confidenceColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let confidenceLabel = 'High Confidence';
  let dotColor = 'bg-emerald-400';

  if (confidence < 0.70) {
    confidenceColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    confidenceLabel = 'Low Confidence';
    dotColor = 'bg-rose-400';
  } else if (confidence < 0.85) {
    confidenceColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    confidenceLabel = 'Moderate Confidence';
    dotColor = 'bg-amber-400';
  }

  // Check if score falls below the user's adjustable threshold
  const isBelowThreshold = confidence < confidenceThreshold;

  return (
    <div
      id="holistic-score-card"
      className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden space-y-4 backdrop-blur"
    >
      {/* Subtle glowing accent background */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Row: Rubric Band & Model Version */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-slate-300">
          Automated Assessment
        </span>
        <span className="font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/60 text-slate-400">
          Model {modelVersion}
        </span>
      </div>

      {/* Main Score Display */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="flex items-baseline space-x-3">
            <span
              id="holistic-score-value"
              className="text-5xl font-black tracking-tight text-white drop-shadow-sm font-sans"
            >
              {holisticScore.toFixed(2)}
            </span>
            <span
              id="rubric-band-badge"
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-700/80 text-slate-200 border border-slate-600/60"
            >
              {rubricBand}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rubric-calibrated holistic score
          </p>
        </div>

        {/* Confidence Badge */}
        <div className="text-right flex flex-col items-end">
          <div
            id="confidence-badge"
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${confidenceColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
            <span>{(confidence * 100).toFixed(1)}%</span>
            <span className="text-[10px] opacity-80">({confidenceLabel})</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">
            Certainty Metric
          </span>
        </div>
      </div>

      {/* Threshold Warning Banner (if confidence < threshold) */}
      {isBelowThreshold && (
        <div
          id="confidence-threshold-warning"
          className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start space-x-2"
        >
          <span className="text-amber-400 font-bold mt-0.5">&bull;</span>
          <div>
            <span className="font-semibold">Flagged for Human Review:</span> Model
            confidence ({(confidence * 100).toFixed(1)}%) is below your active threshold ({(confidenceThreshold * 100).toFixed(0)}%). Manual verification is recommended.
          </div>
        </div>
      )}

      {/* Reviewer Override Section if present */}
      {reviewerOverrideScore !== null && reviewerOverrideScore !== undefined && (
        <div
          id="reviewer-override-box"
          className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 space-y-1"
        >
          <div className="flex justify-between font-semibold">
            <span>Human Reviewer Override:</span>
            <span className="text-blue-200 font-mono text-sm">
              {reviewerOverrideScore.toFixed(2)}
            </span>
          </div>
          {reviewerOverrideReason && (
            <p className="text-[11px] text-blue-300/80 italic">
              &ldquo;{reviewerOverrideReason}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default HolisticScoreCard;
