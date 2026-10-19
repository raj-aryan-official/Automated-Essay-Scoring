import React from 'react';
import { Skeleton } from './Skeleton';

// WHY: Layout-matching skeleton for Score Workspace (3-zone: Control Rail + Center Essay + Inspection Drawer).
export const ScoreWorkspaceSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6 animate-fade-in ${className}`}>
      {/* Sticky Score Summary Bar Skeleton */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton width={80} height={44} className="rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton width={120} height={18} />
            <Skeleton width={160} height={12} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width={180} height={28} className="rounded-full" />
          <Skeleton width={140} height={28} className="rounded-full" />
        </div>
      </div>

      {/* 3-Zone Layout */}
      <div className="flex gap-6 items-start min-h-[640px]">
        {/* Zone 1 (Left Rail Skeleton) */}
        <aside className="w-80 shrink-0 hidden lg:block space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton width={100} height={16} />
              <Skeleton width={50} height={16} />
            </div>
            <div className="space-y-2.5 pt-2">
              <Skeleton height={36} className="w-full rounded-lg" />
              <Skeleton height={36} className="w-full rounded-lg" />
              <Skeleton height={36} className="w-full rounded-lg" />
            </div>
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <Skeleton width={120} height={14} />
              <Skeleton height={20} className="w-full rounded-full" />
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <Skeleton width={140} height={16} />
            <Skeleton height={48} className="w-full rounded-lg" />
          </div>
        </aside>

        {/* Zone 2 (Center Essay Text Skeleton ~75ch) */}
        <section className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <Skeleton width={140} height={18} />
              <Skeleton width={220} height={12} />
            </div>
            <Skeleton width={160} height={14} />
          </div>

          {/* Paragraphs with margin numbers */}
          <div className="max-w-[75ch] mx-auto py-2 space-y-6">
            {[1, 2, 3].map((p) => (
              <div key={p} className="flex items-start gap-4">
                <Skeleton width={28} height={16} className="shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton height={14} className="w-full" />
                  <Skeleton height={14} className="w-11/12" />
                  <Skeleton height={14} className="w-full" />
                  <Skeleton height={14} className="w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Zone 3 (Right Inspection Drawer Skeleton) */}
        <aside className="w-96 shrink-0 hidden xl:block space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton width={130} height={16} />
              <Skeleton width={60} height={16} />
            </div>
            {/* Radar chart skeleton */}
            <div className="h-44 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center p-4">
              <Skeleton width={120} height={120} circle />
            </div>
            {/* Dimension cards skeletons */}
            <div className="space-y-3">
              <Skeleton height={56} className="w-full rounded-xl" />
              <Skeleton height={56} className="w-full rounded-xl" />
              <Skeleton height={56} className="w-full rounded-xl" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

// WHY: Layout-matching skeleton for Dashboard page (KPI metrics, chart containers, recent activity table).
export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-fade-in ${className}`}>
      {/* Banner Skeleton */}
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <Skeleton width={100} height={20} className="rounded-full" />
        <Skeleton width={280} height={28} />
        <Skeleton width={420} height={14} />
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton width={90} height={12} />
              <Skeleton width={60} height={26} />
              <Skeleton width={110} height={12} />
            </div>
            <Skeleton width={40} height={40} className="rounded-xl" />
          </div>
        ))}
      </div>

      {/* 2 Telemetry Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <Skeleton width={160} height={18} />
          <Skeleton height={220} className="w-full rounded-xl" />
        </div>
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <Skeleton width={180} height={18} />
          <Skeleton height={220} className="w-full rounded-xl" />
        </div>
      </div>

      {/* Recent Essays Table Skeleton */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton width={140} height={18} />
          <Skeleton width={80} height={14} />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((r) => (
            <Skeleton key={r} height={44} className="w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
};

// WHY: Layout-matching skeleton for Essay Manager table (filter pill bar + search + table columns).
export const EssayTableSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-6 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4 animate-fade-in ${className}`}>
      {/* Table Header Row Skeleton */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <Skeleton width={90} height={14} />
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={14} />
        <Skeleton width={70} height={14} />
        <Skeleton width={100} height={14} />
        <Skeleton width={60} height={14} />
      </div>

      {/* Row Skeletons */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="flex justify-between items-center py-3 border-b border-slate-800/60 last:border-0"
        >
          <div className="w-28">
            <Skeleton width={85} height={16} />
          </div>
          <div className="w-36">
            <Skeleton width={110} height={16} />
          </div>
          <div className="w-24">
            <Skeleton width={60} height={20} className="rounded-full" />
          </div>
          <div className="w-24">
            <Skeleton width={75} height={20} className="rounded-full" />
          </div>
          <div className="w-28">
            <Skeleton width={90} height={14} />
          </div>
          <div className="w-16 text-right flex justify-end">
            <Skeleton width={48} height={24} className="rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

// WHY: Layout-matching skeleton for Model Evaluation dashboard (Telemetry header + 4 metric cards + confusion matrix).
export const ModelEvaluationSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-fade-in ${className}`}>
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <Skeleton width={240} height={26} />
          <Skeleton width={380} height={14} />
        </div>
        <Skeleton width={130} height={32} className="rounded-lg" />
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <Skeleton width={100} height={12} />
            <Skeleton width={70} height={32} />
            <Skeleton width={130} height={12} />
          </div>
        ))}
      </div>

      {/* Confusion Matrix / Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <Skeleton width={200} height={18} />
          <Skeleton height={260} className="w-full rounded-xl" />
        </div>
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <Skeleton width={140} height={18} />
          <Skeleton height={260} className="w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};
