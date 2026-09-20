import React, { useState } from 'react';
import { EssayDetailResponse, EssayScoreResponse } from '../../api';
import { HolisticScoreCard } from './HolisticScoreCard';
import { ControlRail, DimensionKey } from './ControlRail';
import { ReviewerOverridePanel } from './ReviewerOverridePanel';
import { InspectionDrawer } from '../feedback/InspectionDrawer';

interface ScoreWorkspaceProps {
  essay: EssayDetailResponse;
  scoreData: EssayScoreResponse;
  onReviewSubmitted?: (updatedScore: EssayScoreResponse) => void;
}

export const ScoreWorkspace: React.FC<ScoreWorkspaceProps> = ({
  essay,
  scoreData,
  onReviewSubmitted,
}) => {
  // Control Rail state
  const [activeDimensions, setActiveDimensions] = useState<Record<DimensionKey, boolean>>({
    grammar: true,
    coherence: true,
    argumentation: true,
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.80);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);

  const toggleDimension = (dim: DimensionKey) => {
    setActiveDimensions((prev) => ({
      ...prev,
      [dim]: !prev[dim],
    }));
  };

  const resetFilters = () => {
    setActiveDimensions({
      grammar: true,
      coherence: true,
      argumentation: true,
    });
    setConfidenceThreshold(0.80);
    setIsDrawerOpen(true);
  };

  const wordCount = essay.raw_text.trim() ? essay.raw_text.trim().split(/\s+/).length : 0;
  const charCount = essay.raw_text.length;

  return (
    <div id="score-workspace" className="space-y-6">
      {/* Split-Screen Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Essay Text Reader (7 columns on desktop) */}
        <section
          id="essay-text-panel"
          className="lg:col-span-7 bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-lg backdrop-blur space-y-4 flex flex-col h-full"
        >
          {/* Header */}
          <div className="border-b border-slate-700/80 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Essay Text
              </h2>
              {essay.prompt_title && (
                <p className="text-xs text-brand-400 mt-0.5 truncate max-w-md">
                  {essay.prompt_title}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-slate-400 font-mono">
              <span>{wordCount} words</span>
              <span className="mx-1.5 text-slate-600">|</span>
              <span>{charCount} chars</span>
            </div>
          </div>

          {/* Essay Body */}
          <div
            id="essay-content-display"
            className="flex-1 bg-slate-900/90 border border-slate-700/60 rounded-lg p-5 text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[620px] shadow-inner selection:bg-brand-500/30 selection:text-white"
          >
            {essay.raw_text}
          </div>

          {/* Footer with Document Download if applicable */}
          {essay.download_url && (
            <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs">
              <span className="text-slate-400">Uploaded Document Submission</span>
              <a
                href={essay.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 font-medium underline transition"
              >
                Download Original File &darr;
              </a>
            </div>
          )}
        </section>

        {/* Right Pane: Holistic Score + Reviewer Override + Control Rail + Inspection Drawer (5 columns on desktop) */}
        <section
          id="score-and-controls-panel"
          className="lg:col-span-5 space-y-6"
        >
          {/* Holistic Score & Confidence */}
          <HolisticScoreCard
            scoreData={scoreData}
            confidenceThreshold={confidenceThreshold}
          />

          {/* Reviewer Override Panel (Section 4.1 Information Architecture) */}
          <ReviewerOverridePanel
            essayId={essay.id}
            scoreData={scoreData}
            onReviewSubmitted={(updatedScore) => {
              if (onReviewSubmitted) {
                onReviewSubmitted(updatedScore);
              }
            }}
          />

          {/* Control Rail */}
          <ControlRail
            activeDimensions={activeDimensions}
            onToggleDimension={toggleDimension}
            confidenceThreshold={confidenceThreshold}
            onChangeThreshold={setConfidenceThreshold}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
            onResetFilters={resetFilters}
          />

          {/* Inspection Drawer */}
          <InspectionDrawer
            dimensions={scoreData.dimensions}
            activeDimensions={activeDimensions}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
          />
        </section>
      </div>
    </div>
  );
};

export default ScoreWorkspace;
