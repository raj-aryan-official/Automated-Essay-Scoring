import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EssayDetailResponse, EssayScoreResponse, FeedbackSpan, DimensionScoreDetail } from '../../api';
import { ScoreCard } from './ScoreCard';
import { ControlRail, DimensionKey } from './ControlRail';
import { ReviewerOverridePanel } from './ReviewerOverridePanel';
import { AnnotatedEssayReader } from './AnnotatedEssayReader';
import { InspectionDrawer } from '../feedback/InspectionDrawer';
import { DimensionCard } from '../feedback/DimensionCard';
import { DimensionRadarChart } from '../feedback/DimensionRadarChart';
import { Drawer } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Sliders,
  ChevronUp,
  ChevronDown,
  PenTool,
  Layers,
  Scale,
  BarChart3,
} from 'lucide-react';

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
  const { user } = useAuth();
  const canReview = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // OBJ-004 Performance Instrumentation: Track score and feedback render duration (< 500 ms target)
  useEffect(() => {
    if (typeof performance !== 'undefined' && essay?.id) {
      performance.mark('score-render-start');
      const timer = setTimeout(() => {
        performance.mark('score-render-end');
        try {
          performance.measure('score-feedback-render-duration', 'score-render-start', 'score-render-end');
          const entries = performance.getEntriesByName('score-feedback-render-duration');
          const latest = entries[entries.length - 1];
          if (latest) {
            console.log(`[OBJ-004] Score & Feedback Render Duration: ${latest.duration.toFixed(1)} ms (< 500 ms target)`);
          }
        } catch {
          // Ignore if measurement marks were cleared
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [essay?.id, scoreData.holisticScore]);

  // 1. Control Rail Dimension Focus State
  const [activeDimensions, setActiveDimensions] = useState<Record<DimensionKey, boolean>>({
    grammar: true,
    coherence: true,
    argumentation: true,
  });

  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.80);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    return true;
  });
  const [isTabletOverrideOpen, setIsTabletOverrideOpen] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [mobileDimensionTab, setMobileDimensionTab] = useState<'grammar' | 'coherence' | 'argumentation' | 'radar'>('grammar');

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

  // 4. Desktop Drag-to-Resize Logic (mouse + touch support)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    startWidthRef.current = drawerWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      // Anchored to the right: dragging left increases drawer width
      const delta = startXRef.current - clientX;
      const newWidth = Math.min(600, Math.max(280, startWidthRef.current + delta));
      setDrawerWidth(newWidth);
    };

    const handleUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMove as EventListener);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    document.addEventListener('touchend', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMove as EventListener);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove as EventListener);
      document.removeEventListener('touchend', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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

  const rubricMin = scoreData.rubricMin ?? essay.rubric_min ?? 0;
  const rubricMax = scoreData.rubricMax ?? essay.rubric_max ?? 0;

  // Normalized dimension map for mobile tabs and inspector. Missing dimensions keep a null score
  // and an explicit "not returned" message instead of synthesised values.
  const dimensionMap = useMemo(() => {
    const map: Record<DimensionKey, DimensionScoreDetail> = {
      grammar: {
        dimension: 'grammar',
        score: null,
        feedback: 'The model did not return grammar feedback for this essay.',
      },
      coherence: {
        dimension: 'coherence',
        score: null,
        feedback: 'The model did not return coherence feedback for this essay.',
      },
      argumentation: {
        dimension: 'argumentation',
        score: null,
        feedback: 'The model did not return argumentation feedback for this essay.',
      },
    };

    (scoreData.dimensions || []).forEach((d) => {
      const key = d.dimension.toLowerCase().trim() as DimensionKey;
      if (key in map) {
        map[key] = d;
      }
    });

    return map;
  }, [scoreData.dimensions]);

  // Bi-directional click handler: Clicking a highlighted span scrolls to and opens the matching card in the drawer or mobile tab
  const handleSelectSpan = (span: FeedbackSpan) => {
    setSelectedSpanId(span.id || null);
    const dimKey = span.dimension.toLowerCase().trim() as DimensionKey;

    if (dimKey === 'grammar' || dimKey === 'coherence' || dimKey === 'argumentation') {
      setMobileDimensionTab(dimKey);
    }

    if (screenMode === 'desktop') {
      setIsDrawerOpen(true);
      const card = document.getElementById(`drawer-item-${dimKey}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('ring-2', 'ring-primary-500', 'transition-all');
        setTimeout(() => card.classList.remove('ring-2', 'ring-primary-500'), 1600);
      }
    } else {
      const tabsElem = document.getElementById('mobile-dimensions-tabs');
      tabsElem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        spanElem.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2', 'ring-offset-white');
        setTimeout(
          () =>
            spanElem.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'ring-offset-white'),
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
    <div id="score-workspace" className={`space-y-6 ${screenMode === 'mobile' ? 'pb-24' : ''}`}>
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
          {canReview && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsTabletOverrideOpen((prev) => !prev)}
              className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 transition"
            >
              <span>Teacher Reviewer Override Panel</span>
              <span className="flex items-center gap-1 text-primary-600">
                {isTabletOverrideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{isTabletOverrideOpen ? 'Collapse' : 'Expand'}</span>
              </span>
            </button>
            {isTabletOverrideOpen && (
              <div className="p-4 border-t border-slate-200">
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
          )}
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
            {canReview && (
              <ReviewerOverridePanel
                essayId={essay.id}
                scoreData={scoreData}
                onReviewSubmitted={(updatedScore) => {
                  if (onReviewSubmitted) {
                    onReviewSubmitted(updatedScore);
                  }
                }}
              />
            )}
          </aside>
        )}

        {/* ===================================================================
            ZONE 2 (CENTER): ESSAY TEXT READER (~75ch READABLE COLUMN)
            =================================================================== */}
        <section
          id="essay-text-panel"
          className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Essay Text
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono">
                  {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
                </span>
              </div>
              {essay.prompt_title && (
                <p className="text-xs text-primary-700 font-medium mt-1 truncate max-w-lg">
                  {essay.prompt_title}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Words:</span>
                <span className="text-slate-900 font-semibold">{wordCount}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Chars:</span>
                <span className="text-slate-900 font-semibold">{charCount.toLocaleString()}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Read:</span>
                <span className="text-slate-900 font-semibold">
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
            <div className="pt-4 mt-6 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Uploaded Document Submission</span>
              <a
                href={essay.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium underline transition flex items-center gap-1"
              >
                <span>Download Original Document</span>
                <span>&darr;</span>
              </a>
            </div>
          )}

          {/* ===================================================================
              MOBILE ONLY: DIMENSIONS IN TABS (PROMPT 16)
              Essay on top, Score summary pinned, Dimensions in tabs
              =================================================================== */}
          {screenMode === 'mobile' && (
            <div id="mobile-dimensions-tabs" className="mt-8 pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Dimensional Analysis
                  </h3>
                </div>
              </div>

              {/* Mobile Dimension Tabs Bar (min-h-[44px] touch targets) */}
              <div
                role="tablist"
                aria-label="Pedagogical dimension feedback tabs"
                className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200"
              >
                {[
                  {
                    key: 'grammar' as const,
                    label: 'Grammar',
                    icon: PenTool,
                    score: dimensionMap.grammar.score ?? dimensionMap.grammar.subScore,
                  },
                  {
                    key: 'coherence' as const,
                    label: 'Coherence',
                    icon: Layers,
                    score: dimensionMap.coherence.score ?? dimensionMap.coherence.subScore,
                  },
                  {
                    key: 'argumentation' as const,
                    label: 'Argument',
                    icon: Scale,
                    score: dimensionMap.argumentation.score ?? dimensionMap.argumentation.subScore,
                  },
                  {
                    key: 'radar' as const,
                    label: 'Radar',
                    icon: BarChart3,
                    score: null,
                  },
                ].map((tab) => {
                  const isSelected = mobileDimensionTab === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      id={`mobile-tab-${tab.key}`}
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={`mobile-tabpanel-${tab.key}`}
                      onClick={() => setMobileDimensionTab(tab.key)}
                      className={`min-h-[44px] px-2 py-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        isSelected
                          ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-900/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] leading-tight truncate">{tab.label}</span>
                      </div>
                      {tab.score != null && (
                        <span
                          className={`text-[10px] font-mono leading-none ${
                            isSelected ? 'text-primary-100 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {Number(tab.score).toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Content Panel */}
              <div
                id={`mobile-tabpanel-${mobileDimensionTab}`}
                role="tabpanel"
                aria-labelledby={`mobile-tab-${mobileDimensionTab}`}
                className="space-y-4 pt-1"
              >
                {mobileDimensionTab === 'radar' ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        3-Axis Holistic Radar Geometry
                      </span>
                      <span className="text-[10px] font-mono text-primary-600">
                        Scale [{rubricMin.toFixed(0)} - {rubricMax.toFixed(0)}]
                      </span>
                    </div>
                    <DimensionRadarChart
                      dimensions={scoreData.dimensions || []}
                      activeDimensions={activeDimensions}
                      rubricMin={rubricMin}
                      rubricMax={rubricMax}
                    />
                  </div>
                ) : (
                  <DimensionCard
                    dimension={dimensionMap[mobileDimensionTab as DimensionKey]}
                    dimKey={mobileDimensionTab as DimensionKey}
                    isVisible={true}
                    isExpanded={true}
                    onToggleExpand={() => {}}
                    onSelectDimension={handleSelectDimensionFromDrawer}
                    rubricMin={rubricMin}
                    rubricMax={rubricMax}
                  />
                )}
              </div>

              {/* Collapsible Mobile Reviewer Override Accordion */}
              {canReview && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-md mt-6">
                <button
                  type="button"
                  onClick={() => setIsTabletOverrideOpen((prev) => !prev)}
                  className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 transition"
                >
                  <span>Teacher Reviewer Override</span>
                  <span className="flex items-center gap-1 text-primary-600">
                    {isTabletOverrideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>{isTabletOverrideOpen ? 'Hide' : 'Adjust'}</span>
                  </span>
                </button>
                {isTabletOverrideOpen && (
                  <div className="p-4 border-t border-slate-200">
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
              )}
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
            className="shrink-0 sticky top-36 relative transition-[width] duration-75 flex flex-col"
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
              <div className="w-1.5 h-16 rounded-full bg-slate-300 group-hover:bg-primary-500 transition-colors shadow-sm" />
            </div>

            {/* Inspection Drawer Content */}
            <InspectionDrawer
              dimensions={scoreData.dimensions}
              activeDimensions={activeDimensions}
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onSelectDimension={handleSelectDimensionFromDrawer}
              rubricMin={rubricMin}
              rubricMax={rubricMax}
              isDesktop={true}
            />
          </aside>
        )}

        {/* Collapsed Drawer Reopen Handle (Desktop) */}
        {screenMode === 'desktop' && !isDrawerOpen && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 shrink-0 sticky top-36 bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col items-center gap-3 text-slate-500 hover:text-slate-900 transition shadow-sm group"
            title="Expand Inspection Drawer"
          >
            <div className="w-2 h-2 rounded-full bg-primary-500 group-hover:scale-125 transition-transform" />
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
            rubricMin={rubricMin}
            rubricMax={rubricMax}
            isDesktop={false}
          />
        </Drawer>
      )}

      {/* 5. MOBILE BOTTOM SHEET (Screens <768px) */}
      {screenMode === 'mobile' && (
        <>
          {/* Sticky Mobile Floating Dock */}
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Controls:</span>
              <span className="text-xs font-mono font-semibold text-primary-700">
                {(confidenceThreshold * 100).toFixed(0)}% Min
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="px-3.5 py-2 min-h-[44px] rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Feedback ({scoreData.dimensions?.length || 3})
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(true)}
                className="px-4 py-2 min-h-[44px] rounded-lg bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white text-xs font-bold shadow flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Sliders className="w-4 h-4" />
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
                <div className="pt-4 border-t border-slate-200">
                  {canReview ? (
                    <ReviewerOverridePanel
                      essayId={essay.id}
                      scoreData={scoreData}
                      onReviewSubmitted={(updated) => {
                        if (onReviewSubmitted) onReviewSubmitted(updated);
                        setIsMobileSheetOpen(false);
                      }}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">
                      Only teachers and administrators can file score overrides.
                    </p>
                  )}
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
