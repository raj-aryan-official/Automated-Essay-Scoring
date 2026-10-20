import React, { useState, useMemo } from 'react';
import { DimensionScoreDetail } from '../../api';
import { DimensionKey } from '../scoring/ControlRail';
import { DimensionRadarChart } from './DimensionRadarChart';
import { DimensionCard } from './DimensionCard';
import { X, Sparkles, ChevronsUpDown } from 'lucide-react';

export interface InspectionDrawerProps {
  dimensions: DimensionScoreDetail[];
  activeDimensions: Record<DimensionKey, boolean>;
  isOpen: boolean;
  onClose: () => void;
  onSelectDimension?: (dim: DimensionKey) => void;
  rubricMin?: number;
  rubricMax?: number;
  isDesktop?: boolean;
}

const CORE_DIMENSIONS: { key: DimensionKey; label: string }[] = [
  { key: 'grammar', label: 'Grammar' },
  { key: 'coherence', label: 'Coherence' },
  { key: 'argumentation', label: 'Argumentation' },
];

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({
  dimensions,
  activeDimensions,
  isOpen,
  onClose,
  onSelectDimension,
  rubricMin = 2.0,
  rubricMax = 12.0,
}) => {
  // Map dimensions to a normalized dictionary
  const dimensionMap = useMemo(() => {
    const map: Record<DimensionKey, DimensionScoreDetail> = {
      grammar: {
        dimension: 'grammar',
        score: rubricMin + (rubricMax - rubricMin) * 0.75,
        feedback: 'Solid syntactic control with occasional complex clause run-ons.',
      },
      coherence: {
        dimension: 'coherence',
        score: rubricMin + (rubricMax - rubricMin) * 0.70,
        feedback: 'Effective thematic progression and logical paragraph transitions.',
      },
      argumentation: {
        dimension: 'argumentation',
        score: rubricMin + (rubricMax - rubricMin) * 0.80,
        feedback: 'Compelling central thesis supported by concrete evidence.',
      },
    };

    dimensions.forEach((d) => {
      const key = d.dimension.toLowerCase().trim() as DimensionKey;
      if (key in map) {
        map[key] = d;
      }
    });

    return map;
  }, [dimensions, rubricMin, rubricMax]);

  // Determine which dimension has the lowest score to expand by default
  const lowestScoreDimKey = useMemo<DimensionKey>(() => {
    let minKey: DimensionKey = 'grammar';
    let minVal = Infinity;

    CORE_DIMENSIONS.forEach(({ key }) => {
      const item = dimensionMap[key];
      const val = item.score ?? item.subScore ?? 0;
      if (val < minVal) {
        minVal = val;
        minKey = key;
      }
    });

    return minKey;
  }, [dimensionMap]);

  // Expanded cards state: default the lowest score card to expanded
  const [expandedCards, setExpandedCards] = useState<Record<DimensionKey, boolean>>(() => ({
    grammar: lowestScoreDimKey === 'grammar',
    coherence: lowestScoreDimKey === 'coherence',
    argumentation: lowestScoreDimKey === 'argumentation',
  }));

  const toggleCard = (key: DimensionKey) => {
    setExpandedCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAll = () => {
    const allExpanded = Object.values(expandedCards).every(Boolean);
    setExpandedCards({
      grammar: !allExpanded,
      coherence: !allExpanded,
      argumentation: !allExpanded,
    });
  };

  // Count active dimensions
  const activeCount = useMemo(() => {
    return CORE_DIMENSIONS.filter(({ key }) => activeDimensions[key] !== false).length;
  }, [activeDimensions]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id="inspection-drawer"
      className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur flex flex-col h-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Dimension Inspector
            </h2>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-300">
              {activeCount} of 3 Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pedagogical diagnostics across Grammar, Coherence, and Argumentation.
          </p>
        </div>

        <button
          type="button"
          id="btn-close-inspection-drawer"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
          aria-label="Close drawer"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* 1. 3-Axis Radar Chart Summarizing the Sub-Scores */}
      <div className="shrink-0">
        <DimensionRadarChart
          dimensions={dimensions}
          activeDimensions={activeDimensions}
          rubricMin={rubricMin}
          rubricMax={rubricMax}
        />
      </div>

      {/* 2. Controls & List Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
          <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
            Dimensional Feedback Panels
          </span>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          className="text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition flex items-center gap-1 font-semibold"
        >
          <ChevronsUpDown className="w-3 h-3" />
          <span>
            {Object.values(expandedCards).every(Boolean) ? 'Collapse All' : 'Expand All'}
          </span>
        </button>
      </div>

      {/* 3. Dimension Feedback Cards List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeCount === 0 ? (
          <div className="p-8 text-center text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-300">All Dimensions Filtered Out</p>
            <p className="text-slate-500">
              Enable Grammar, Coherence, or Argumentation in the Control Rail to inspect detailed diagnostic feedback.
            </p>
          </div>
        ) : (
          <div className="space-y-3" id="inspection-drawer-items">
            {CORE_DIMENSIONS.map(({ key }) => {
              const dimData = dimensionMap[key];
              const isVisible = activeDimensions[key] !== false;
              const isExpanded = !!expandedCards[key];

              return (
                <DimensionCard
                  key={key}
                  dimension={dimData}
                  dimKey={key}
                  isVisible={isVisible}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleCard(key)}
                  onSelectDimension={onSelectDimension}
                  rubricMin={rubricMin}
                  rubricMax={rubricMax}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectionDrawer;
