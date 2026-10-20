import React from 'react';
import { Sliders, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { ContextHelp } from '../../components/ui';

// WHY: Restricts evaluative rubric aspects to grammar, coherence, and argumentation to align with multi-trait scoring criteria.
export type DimensionKey = 'grammar' | 'coherence' | 'argumentation';

export interface ControlRailProps {
  activeDimensions: Record<DimensionKey, boolean>;
  onToggleDimension: (dim: DimensionKey) => void;
  confidenceThreshold: number;
  onChangeThreshold: (val: number) => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onResetFilters: () => void;
  variant?: 'vertical' | 'toolbar' | 'bottomSheet';
  children?: React.ReactNode;
}

// WHY: Metadata dictionary defining user-friendly labels and subtitles for the rubric dimensions displayed in the control panel.
const DIMENSIONS: { key: DimensionKey; label: string; description: string; color: string }[] = [
  { key: 'grammar', label: 'Grammar', description: 'Syntax & Mechanics', color: 'bg-rose-400' },
  { key: 'coherence', label: 'Coherence', description: 'Flow & Transitions', color: 'bg-amber-400' },
  { key: 'argumentation', label: 'Argumentation', description: 'Claims & Evidence', color: 'bg-emerald-400' },
];

export const ControlRail: React.FC<ControlRailProps> = ({
  activeDimensions,
  onToggleDimension,
  confidenceThreshold,
  onChangeThreshold,
  isDrawerOpen,
  onToggleDrawer,
  onResetFilters,
  variant = 'vertical',
  children,
}) => {
  // 1. TABLET TOOLBAR VARIANT: Horizontal toolbar collapsed across the top
  if (variant === 'toolbar') {
    return (
      <div
        id="control-rail"
        className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-md backdrop-blur mb-6 flex flex-wrap items-center justify-between gap-4"
      >
        {/* Left: Focus Dimension Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
            Focus:
          </span>
          {DIMENSIONS.map(({ key, label, color }) => {
            const isActive = activeDimensions[key];
            return (
              <button
                key={key}
                id={`toggle-dimension-${key}`}
                type="button"
                role="switch"
                aria-pressed={isActive}
                onClick={() => onToggleDimension(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-500/15 border-primary-200 dark:border-primary-500/60 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? color : 'bg-slate-400 dark:bg-slate-600'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Center: Inline Confidence Slider */}
        <div className="flex items-center gap-3 min-h-[44px]">
          <label
            htmlFor="confidence-threshold-slider"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap"
          >
            Min Conf:
          </label>
          <input
            id="confidence-threshold-slider"
            type="range"
            min="0.50"
            max="0.99"
            step="0.01"
            value={confidenceThreshold}
            aria-valuenow={Math.round(confidenceThreshold * 100)}
            aria-valuemin={50}
            aria-valuemax={99}
            aria-valuetext={`${Math.round(confidenceThreshold * 100)} percent threshold`}
            onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
            className="w-28 h-2 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <span
            id="confidence-threshold-display"
            className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary-600 dark:text-primary-400 font-semibold"
          >
            {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>

        {/* Right: Drawer Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-toggle-inspection-drawer"
            onClick={onToggleDrawer}
            className={`min-h-[44px] px-3.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
              isDrawerOpen
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                : 'bg-primary-600 border-primary-500 text-white hover:bg-primary-500'
            }`}
          >
            {isDrawerOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isDrawerOpen ? 'Close Drawer' : 'View Drawer'}</span>
          </button>

          <button
            type="button"
            id="btn-reset-filters"
            onClick={onResetFilters}
            title="Reset Filters to Default"
            aria-label="Reset filters to default"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. MOBILE BOTTOM SHEET VARIANT
  if (variant === 'bottomSheet') {
    return (
      <div
        id="control-rail"
        className="space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Reviewer Controls
            </h2>
          </div>
          <button
            type="button"
            id="btn-reset-filters"
            onClick={onResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Dimension Toggles */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Dimension Focus
          </label>
          <div className="grid grid-cols-1 gap-2">
            {DIMENSIONS.map(({ key, label, description, color }) => {
              const isActive = activeDimensions[key];
              return (
                <button
                  key={key}
                  id={`toggle-dimension-${key}`}
                  type="button"
                  role="switch"
                  aria-pressed={isActive}
                  onClick={() => onToggleDimension(key)}
                  className={`p-3 rounded-xl text-left border text-xs transition flex items-center justify-between ${
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-500/15 border-primary-200 dark:border-primary-500/60 text-primary-700 dark:text-primary-200 shadow-sm'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
                  </div>
                  <span
                    className={`w-3 h-3 rounded-full ${isActive ? color : 'bg-slate-300 dark:bg-slate-700'}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="confidence-threshold-slider" className="font-semibold text-slate-700 dark:text-slate-300">
              Confidence Threshold
            </label>
            <span
              id="confidence-threshold-display"
              className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-primary-600 dark:text-primary-400 font-bold"
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
            aria-valuenow={Math.round(confidenceThreshold * 100)}
            aria-valuemin={50}
            aria-valuemax={99}
            aria-valuetext={`${Math.round(confidenceThreshold * 100)} percent standard threshold`}
            onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
        </div>

        {/* Drawer Toggle */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            id="btn-toggle-inspection-drawer"
            onClick={onToggleDrawer}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border transition flex items-center justify-between ${
              isDrawerOpen
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white'
                : 'bg-primary-600 border-primary-500 text-white'
            }`}
          >
            <span>{isDrawerOpen ? 'Close Inspection Drawer' : 'Open Inspection Drawer'}</span>
            <span className="font-mono text-xs">{isDrawerOpen ? '▲ Hide' : '▼ View Details'}</span>
          </button>
        </div>

        {/* Optional slot for Reviewer Override on mobile */}
        {children && <div className="pt-2">{children}</div>}
      </div>
    );
  }

  // 3. VERTICAL DESKTOP VARIANT: Persistent left control rail
  return (
    <div
      id="control-rail"
      className="bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl space-y-5 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Control Rail
          </h2>
        </div>
        <button
          type="button"
          id="btn-reset-filters"
          onClick={onResetFilters}
          className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 1. Dimension Toggles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Dimension Focus Toggles
          </label>
          <ContextHelp topic="rubricBand" position="left" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          {DIMENSIONS.map(({ key, label, description, color }) => {
            const isActive = activeDimensions[key];
            return (
              <button
                key={key}
                id={`toggle-dimension-${key}`}
                type="button"
                role="switch"
                aria-pressed={isActive}
                onClick={() => onToggleDimension(key)}
                className={`py-2 px-3 rounded-lg text-left border text-xs transition flex flex-col justify-between ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-500/15 border-primary-200 dark:border-primary-500/60 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{label}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                      isActive ? `${color} scale-110 shadow-sm` : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Confidence Threshold Slider */}
      <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <label htmlFor="confidence-threshold-slider" className="font-semibold text-slate-700 dark:text-slate-300">
              Confidence Threshold
            </label>
            <ContextHelp topic="confidence" position="right" />
          </div>
          <span
            id="confidence-threshold-display"
            className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-primary-600 dark:text-primary-400 font-semibold"
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
          aria-valuenow={Math.round(confidenceThreshold * 100)}
          aria-valuemin={50}
          aria-valuemax={99}
          aria-valuetext={`${Math.round(confidenceThreshold * 100)} percent standard threshold`}
          onChange={(e) => onChangeThreshold(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>50% (Permissive)</span>
          <span>80% (Standard)</span>
          <span>99% (Strict)</span>
        </div>
      </div>

      {/* 3. Inspection Drawer Toggle Button */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          id="btn-toggle-inspection-drawer"
          onClick={onToggleDrawer}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
            isDrawerOpen
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
              : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          <span>{isDrawerOpen ? 'Close Inspection Drawer' : 'Open Inspection Drawer'}</span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {isDrawerOpen ? '▲ Hide' : '▼ View Details'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ControlRail;
