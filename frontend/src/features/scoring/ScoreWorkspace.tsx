import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EssayDetailResponse, EssayScoreResponse, FeedbackSpan } from '../../api';
import { ScoreCard } from './ScoreCard';
import { ControlRail, DimensionKey } from './ControlRail';
import { ReviewerOverridePanel } from './ReviewerOverridePanel';
import { AnnotatedEssayReader } from './AnnotatedEssayReader';
import { InspectionDrawer } from '../feedback/InspectionDrawer';
import { Drawer } from '../../components/ui';
import { BookOpen, Sliders, ChevronUp, ChevronDown } from 'lucide-react';

interface ScoreWorkspaceProps {
  essay: EssayDetailResponse;
  scoreData: EssayScoreResponse;
  onReviewSubmitted?: (updatedScore: EssayScoreResponse) => void;
}

// WHY: Core 3-zone human-in-the-loop assessment workspace: Left Control Rail, Center Essay prose, Right Inspection Drawer.
export const ScoreWorkspace: React.FC<ScoreWorkspaceProps> = ({
  essay,
  scoreData,
  onReviewSubmitted,
}) => {
  // 1. Control Rail Dimension Focus State
  const [activeDimensions, setActiveDimensions] = useState<Record<DimensionKey, boolean>>({
    grammar: true,
    coherence: true,
    argumentation: true,
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.80);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [isTabletOverrideOpen, setIsTabletOverrideOpen] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);

  // 2. Desktop Resizable Drawer State
  const [drawerWidth, setDrawerWidth] = useState<number>(380);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(380);

  // 3. Screen Mode Detection: Desktop (>=1024), Tablet (768-1023), Mobile (<768)
  const [screenMode, setScreenMode] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setScreenMode('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenMode('tablet');
      } else {
        setScreenMode('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 4. Desktop Drag-to-Resize Logic
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = drawerWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Anchored to the right: dragging left increases drawer width
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(600, Math.max(280, startWidthRef.current + delta));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, drawerWidth]);

  // Dimension Handlers
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

  // 4. Inline Highlighting & Span Navigation State (Prompt 9)
  const [showHighlights, setShowHighlights] = useState<boolean>(true);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // Extract API-provided spans; if none exist, degrade gracefully with no highlights and no errors
  const apiSpans: FeedbackSpan[] = useMemo(() => {
    if (scoreData.spans && scoreData.spans.length > 0) {
      return scoreData.spans;
    }
    const dimSpans = scoreData.dimensions?.flatMap((d) => d.spans || []) || [];
    if (dimSpans.length > 0) {
      return dimSpans;
    }
    return [];
  }, [scoreData]);

  // Bi-directional click handler: Clicking a highlighted span scrolls to and opens the matching card in the drawer
  const handleSelectSpan = (span: FeedbackSpan) => {
    setSelectedSpanId(span.id || null);
    setIsDrawerOpen(true);
    const dimKey = span.dimension.toLowerCase().trim();
    const card = document.getElementById(`drawer-item-${dimKey}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-primary-500', 'transition-all');
      setTimeout(() => card.classList.remove('ring-2', 'ring-primary-500'), 1600);
    }
  };

  // Bi-directional click handler: Clicking a card in the drawer scrolls to its matching text span
  const handleSelectDimensionFromDrawer = (dimKey: DimensionKey) => {
    const matchingSpan = apiSpans.find(
      (s) => s.dimension.toLowerCase().trim() === dimKey.toLowerCase().trim()
    );
    if (matchingSpan) {
      setSelectedSpanId(matchingSpan.id || null);
      const spanElem = document.getElementById(`text-span-${matchingSpan.id}`);
      if (spanElem) {
        spanElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        spanElem.classList.add('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-slate-900');
        setTimeout(
          () =>
            spanElem.classList.remove('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-slate-900'),
          1600
        );
      }
    } else {
      const essayPanel = document.getElementById('essay-text-panel');
      essayPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Text Analytics
  const wordCount = useMemo(() => {
    return essay.raw_text.trim() ? essay.raw_text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [essay.raw_text]);

  const charCount = essay.raw_text.length;

  // Paragraph Extraction for Margin Line Numbers
  const paragraphs = useMemo(() => {
    if (!essay.raw_text) return [];
    const blocks = essay.raw_text.split(/\n\s*\n/);
    if (blocks.length > 1) {
      return blocks.map((b) => b.trim()).filter(Boolean);
    }
    const lines = essay.raw_text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines;
    }
    return [essay.raw_text.trim()];
  }, [essay.raw_text]);

  return (
    <div id="score-workspace" className="space-y-6">
      {/* 1. STICKY SCORE SUMMARY HEADER: holistic score, rubric band, confidence badge */}
      <ScoreCard
        scoreData={scoreData}
        confidenceThreshold={confidenceThreshold}
        essay={essay}
        isSticky={true}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
      />

      {/* 2. TABLET TOOLBAR (Collapses into top toolbar on tablet screens 768px-1023px) */}
      {screenMode === 'tablet' && (
        <div className="space-y-4">
          <ControlRail
            variant="toolbar"
            activeDimensions={activeDimensions}
            onToggleDimension={toggleDimension}
            confidenceThreshold={confidenceThreshold}
            onChangeThreshold={setConfidenceThreshold}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
            onResetFilters={resetFilters}
          />

          {/* Collapsible Tablet Reviewer Override Accordion */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <button
              type="button"
              onClick={() => setIsTabletOverrideOpen((prev) => !prev)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition"
            >
              <span>Teacher Reviewer Override Panel</span>
              <span className="flex items-center gap-1 text-primary-400">
                {isTabletOverrideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{isTabletOverrideOpen ? 'Collapse' : 'Expand'}</span>
              </span>
            </button>
            {isTabletOverrideOpen && (
              <div className="p-4 border-t border-slate-800">
                <ReviewerOverridePanel
                  essayId={essay.id}
                  scoreData={scoreData}
                  onReviewSubmitted={(updated) => {
                    if (onReviewSubmitted) onReviewSubmitted(updated);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN 3-ZONE LAYOUT */}
      <div className="flex gap-6 items-start relative min-h-[680px]">
        {/* ===================================================================
            ZONE 1 (LEFT): CONTROL RAIL + REVIEWER OVERRIDE (DESKTOP)
            =================================================================== */}
        {screenMode === 'desktop' && (
          <aside className="w-80 shrink-0 sticky top-36 space-y-5">
            {/* Control Rail */}
            <ControlRail
              variant="vertical"
              activeDimensions={activeDimensions}
              onToggleDimension={toggleDimension}
              confidenceThreshold={confidenceThreshold}
              onChangeThreshold={setConfidenceThreshold}
              isDrawerOpen={isDrawerOpen}
              onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
              onResetFilters={resetFilters}
            />

            {/* Reviewer Override Panel */}
            <ReviewerOverridePanel
              essayId={essay.id}
              scoreData={scoreData}
              onReviewSubmitted={(updatedScore) => {
                if (onReviewSubmitted) {
                  onReviewSubmitted(updatedScore);
                }
              }}
            />
          </aside>
        )}

        {/* ===================================================================
            ZONE 2 (CENTER): ESSAY TEXT READER (~75ch READABLE COLUMN)
            =================================================================== */}
        <section
          id="essay-text-panel"
          className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur flex flex-col"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Essay Text
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
                </span>
              </div>
              {essay.prompt_title && (
                <p className="text-xs text-primary-400 font-medium mt-1 truncate max-w-lg">
                  {essay.prompt_title}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Words:</span>
                <span className="text-white font-semibold">{wordCount}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Chars:</span>
                <span className="text-white font-semibold">{charCount.toLocaleString()}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Read:</span>
                <span className="text-white font-semibold">
                  ~{Math.max(1, Math.ceil(wordCount / 200))} min
                </span>
              </div>
            </div>
          </div>

          {/* Annotated Essay Prose with Inline Highlighting, Margin Numbers, Legend, and Tooltips */}
          <AnnotatedEssayReader
            rawText={essay.raw_text}
            spans={apiSpans}
            activeDimensions={activeDimensions}
            showHighlights={showHighlights}
            onToggleHighlights={setShowHighlights}
            selectedSpanId={selectedSpanId}
            onSelectSpan={handleSelectSpan}
          />

          {/* Footer with Document Download if applicable */}
          {essay.download_url && (
            <div className="pt-4 mt-6 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Uploaded Document Submission</span>
              <a
                href={essay.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 font-medium underline transition flex items-center gap-1"
              >
                <span>Download Original Document</span>
                <span>&darr;</span>
              </a>
            </div>
          )}
        </section>

        {/* ===================================================================
            ZONE 3 (RIGHT): RESIZABLE INSPECTION DRAWER (DESKTOP)
            =================================================================== */}
        {screenMode === 'desktop' && isDrawerOpen && (
          <aside
            id="inspection-drawer-container"
            style={{ width: `${drawerWidth}px` }}
            className="shrink-0 sticky top-36 relative transition-[width] duration-75 flex flex-col h-[720px]"
          >
            {/* Left Drag-to-Resize Handle */}
            <div
              onMouseDown={handleResizeStart}
              onDoubleClick={() => setDrawerWidth(380)}
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={drawerWidth}
              aria-valuemin={280}
              aria-valuemax={600}
              tabIndex={0}
              className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize group z-20 flex items-center justify-center select-none"
              title="Drag to resize Inspection Drawer (Double-click to reset)"
            >
              <div className="w-1.5 h-16 rounded-full bg-slate-700 group-hover:bg-primary-500 transition-colors shadow-sm" />
            </div>

            {/* Inspection Drawer Content */}
            <InspectionDrawer
              dimensions={scoreData.dimensions}
              activeDimensions={activeDimensions}
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onSelectDimension={handleSelectDimensionFromDrawer}
              rubricMin={scoreData.rubricMin ?? 2.0}
              rubricMax={scoreData.rubricMax ?? 12.0}
              isDesktop={true}
            />
          </aside>
        )}

        {/* Collapsed Drawer Reopen Handle (Desktop) */}
        {screenMode === 'desktop' && !isDrawerOpen && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 shrink-0 sticky top-36 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col items-center gap-3 text-slate-400 hover:text-white transition shadow-lg group"
            title="Expand Inspection Drawer"
          >
            <div className="w-2 h-2 rounded-full bg-primary-400 group-hover:scale-125 transition-transform" />
            <span className="[writing-mode:vertical-lr] rotate-180 text-xs font-bold tracking-wider uppercase">
              Inspect Feedback ({scoreData.dimensions?.length || 3})
            </span>
          </button>
        )}
      </div>

      {/* 4. SLIDE-OVER INSPECTION DRAWER (Tablet & Mobile Screens <1024px) */}
      {screenMode !== 'desktop' && (
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          position="right"
          size={screenMode === 'mobile' ? 'full' : 'md'}
          title="Inspection Drawer"
          description="Diagnostic pedagogical feedback sorted by severity"
        >
          <InspectionDrawer
            dimensions={scoreData.dimensions}
            activeDimensions={activeDimensions}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onSelectDimension={handleSelectDimensionFromDrawer}
            rubricMin={scoreData.rubricMin ?? 2.0}
            rubricMax={scoreData.rubricMax ?? 12.0}
            isDesktop={false}
          />
        </Drawer>
      )}

      {/* 5. MOBILE BOTTOM SHEET (Screens <768px) */}
      {screenMode === 'mobile' && (
        <>
          {/* Sticky Mobile Floating Dock */}
          <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Controls:</span>
              <span className="text-xs font-mono font-semibold text-primary-400">
                {(confidenceThreshold * 100).toFixed(0)}% Min
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200"
              >
                Feedback ({scoreData.dimensions?.length || 3})
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Controls</span>
              </button>
            </div>
          </div>

          {/* Expandable Mobile Bottom Sheet Drawer */}
          <Drawer
            isOpen={isMobileSheetOpen}
            onClose={() => setIsMobileSheetOpen(false)}
            position="bottom"
            size="lg"
            title="Reviewer Controls & Override"
            description="Adjust dimension focus and human grading override"
          >
            <div className="space-y-6 pb-6">
              <ControlRail
                variant="bottomSheet"
                activeDimensions={activeDimensions}
                onToggleDimension={toggleDimension}
                confidenceThreshold={confidenceThreshold}
                onChangeThreshold={setConfidenceThreshold}
                isDrawerOpen={isDrawerOpen}
                onToggleDrawer={() => {
                  setIsMobileSheetOpen(false);
                  setIsDrawerOpen(true);
                }}
                onResetFilters={resetFilters}
              >
                <div className="pt-4 border-t border-slate-800">
                  <ReviewerOverridePanel
                    essayId={essay.id}
                    scoreData={scoreData}
                    onReviewSubmitted={(updated) => {
                      if (onReviewSubmitted) onReviewSubmitted(updated);
                      setIsMobileSheetOpen(false);
                    }}
                  />
                </div>
              </ControlRail>
            </div>
          </Drawer>
        </>
      )}
    </div>
  );
};

export default ScoreWorkspace;
