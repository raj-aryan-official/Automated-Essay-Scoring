import React, { useMemo } from 'react';
import { DimensionScoreDetail } from '../../api';
import { DimensionKey } from '../scoring/ControlRail';

interface InspectionDrawerProps {
  dimensions: DimensionScoreDetail[];
  activeDimensions: Record<DimensionKey, boolean>;
  isOpen: boolean;
  onClose: () => void;
  rubricMin?: number;
  rubricMax?: number;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  dimensions,
  activeDimensions,
  isOpen,
  onClose,
  rubricMin = 2.0,
  rubricMax = 12.0,
}) => {
  // Sort dimensions by severity (lowest sub-score = highest pedagogical severity)
  const sortedAndFiltered = useMemo(() => {
    // 1. Filter by active dimension toggles
    const filtered = dimensions.filter((dim) => {
      const key = dim.dimension.toLowerCase().trim() as DimensionKey;
      return activeDimensions[key] !== false;
    });

    // 2. Sort by sub-score ascending (most critical areas for improvement first)
    return [...filtered].sort((a, b) => {
      const scoreA = a.score ?? a.subScore ?? 0;
      const scoreB = b.score ?? b.subScore ?? 0;
      return scoreA - scoreB;
    });
  }, [dimensions, activeDimensions]);

  // Compute severity level based on score position in rubric range
  const getSeverity = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return {
        label: 'Info',
        badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600/60',
      };
    }

    const span = Math.max(1, rubricMax - rubricMin);
    const normalized = (score - rubricMin) / span;

    if (normalized < 0.35) {
      return {
        label: 'High Priority',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
        cardClass: 'border-l-4 border-l-rose-500',
      };
    } else if (normalized < 0.70) {
      return {
        label: 'Moderate',
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        cardClass: 'border-l-4 border-l-amber-500',
      };
    } else {
      return {
        label: 'Proficient',
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        cardClass: 'border-l-4 border-l-emerald-500',
      };
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id="inspection-drawer"
      className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xl space-y-4 transition-all duration-300"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span>Inspection Drawer</span>
            <span className="text-[10px] font-normal lowercase px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-full text-slate-400">
              Sorted by severity
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnostic pedagogical feedback highlighting priority growth areas.
          </p>
        </div>
        <button
          type="button"
          id="btn-close-inspection-drawer"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 text-xs transition"
          aria-label="Close drawer"
        >
          &times; Close
        </button>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/60 rounded-lg border border-slate-800">
          No dimensions selected. Toggle dimensions in the Control Rail to view feedback.
        </div>
      ) : (
        <div className="space-y-3" id="inspection-drawer-items">
          {sortedAndFiltered.map((dim, idx) => {
            const currentScore = dim.score ?? dim.subScore;
            const severity = getSeverity(currentScore);

            return (
              <div
                key={dim.dimension}
                id={`drawer-item-${dim.dimension}`}
                className={`bg-slate-900/90 border border-slate-700/80 rounded-lg p-4 space-y-2 shadow-sm ${
                  severity.cardClass || ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      {idx + 1}. {dim.dimension}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${severity.badgeClass}`}
                    >
                      {severity.label}
                    </span>
                  </div>
                  {currentScore !== null && currentScore !== undefined && (
                    <div className="text-xs font-mono text-slate-300">
                      Sub-Score:{' '}
                      <span className="font-bold text-brand-400">
                        {currentScore.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                  {dim.feedback || dim.feedbackText}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InspectionDrawer;
