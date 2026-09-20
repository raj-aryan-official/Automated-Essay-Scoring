import React from 'react';

export type DimensionKey = 'grammar' | 'coherence' | 'argumentation';

interface ControlRailProps {
  activeDimensions: Record<DimensionKey, boolean>;
  onToggleDimension: (dim: DimensionKey) => void;
  confidenceThreshold: number;
  onChangeThreshold: (val: number) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onResetFilters: () => void;
}

const DIMENSIONS: { key: DimensionKey; label: string; description: string }[] = [
  { key: 'grammar', label: 'Grammar', description: 'Syntax & Mechanics' },
  { key: 'coherence', label: 'Coherence', description: 'Flow & Transitions' },
  { key: 'argumentation', label: 'Argumentation', description: 'Claims & Evidence' },
];

export const ControlRail: React.FC<ControlRailProps> = ({
  activeDimensions,
  onToggleDimension,
  confidenceThreshold,
  onChangeThreshold,
  isDrawerOpen,
  onToggleDrawer,
  onResetFilters,
}) => {
  return (
    <div
      id="control-rail"
      className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-lg space-y-5 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Control Rail
        </h2>
        <button
          type="button"
          id="btn-reset-filters"
          onClick={onResetFilters}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition"
        >
          Reset Defaults
        </button>
      </div>

      {/* 1. Dimension Toggles */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">
          Dimension Focus Toggles
        </label>
        <div className="grid grid-cols-3 gap-2">
          {DIMENSIONS.map(({ key, label, description }) => {
            const isActive = activeDimensions[key];
            return (
              <button
                key={key}
                id={`toggle-dimension-${key}`}
                type="button"
                onClick={() => onToggleDimension(key)}
                className={`py-2 px-2.5 rounded-lg text-left border text-xs transition flex flex-col justify-between ${
                  isActive
                    ? 'bg-brand-500/15 border-brand-500/60 text-brand-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs">{label}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-brand-400' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 truncate">
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Confidence Threshold Slider */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between items-center text-xs">
          <label htmlFor="confidence-threshold-slider" className="font-semibold text-slate-300">
            Confidence Threshold
          </label>
          <span
            id="confidence-threshold-display"
            className="font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-brand-400 font-medium"
          >
            {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <input
          id="confidence-threshold-slider"
          type="range"
          min="0.50"
          max="0.99"
          step="0.01"
          value={confidenceThreshold}
          onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>50% (Permissive)</span>
          <span>80% (Standard)</span>
          <span>99% (Strict)</span>
        </div>
      </div>

      {/* 3. Inspection Drawer Toggle Button */}
      <div className="pt-2 border-t border-slate-700/80">
        <button
          type="button"
          id="btn-toggle-inspection-drawer"
          onClick={onToggleDrawer}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
            isDrawerOpen
              ? 'bg-slate-700 border-slate-600 text-white'
              : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-700/60'
          }`}
        >
          <span>{isDrawerOpen ? 'Close Inspection Drawer' : 'Open Inspection Drawer'}</span>
          <span className="text-[11px] font-mono text-slate-400">
            {isDrawerOpen ? '▲ Hide' : '▼ View Details'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ControlRail;
