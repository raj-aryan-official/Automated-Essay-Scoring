import React, { useMemo } from 'react';
import { FeedbackSpan } from '../../api';
import { DimensionKey } from './ControlRail';
import { Tooltip, Toggle } from '../../components/ui';
import {
  PenTool,
  Layers,
  Scale,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';

export interface AnnotatedEssayReaderProps {
  rawText: string;
  spans?: FeedbackSpan[];
  activeDimensions: Record<DimensionKey, boolean>;
  showHighlights: boolean;
  onToggleHighlights: (val: boolean) => void;
  selectedSpanId?: string | null;
  onSelectSpan?: (span: FeedbackSpan) => void;
  className?: string;
}

interface ParagraphBlock {
  index: number;
  text: string;
  start: number;
  end: number;
}

// WHY: Inline annotated reader rendering wavy underlines for grammar, soft background for coherence, and side markers for argumentation with bi-directional syncing.
const AnnotatedEssayReaderComponent: React.FC<AnnotatedEssayReaderProps> = ({
  rawText,
  spans = [],
  activeDimensions,
  showHighlights,
  onToggleHighlights,
  selectedSpanId,
  onSelectSpan,
  className = '',
}) => {
  // 1. Parse paragraphs while computing exact character offsets relative to rawText
  const paragraphs = useMemo<ParagraphBlock[]>(() => {
    if (!rawText) return [];

    const blocks = rawText.split(/\n\s*\n/);
    if (blocks.length > 1) {
      let cursor = 0;
      return blocks.map((b, idx) => {
        const trimmed = b.trim();
        const start = rawText.indexOf(trimmed, cursor);
        const end = start !== -1 ? start + trimmed.length : cursor + trimmed.length;
        cursor = end;
        return { index: idx + 1, text: trimmed, start, end };
      });
    }

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      let cursor = 0;
      return lines.map((l, idx) => {
        const trimmed = l.trim();
        const start = rawText.indexOf(trimmed, cursor);
        const end = start !== -1 ? start + trimmed.length : cursor + trimmed.length;
        cursor = end;
        return { index: idx + 1, text: trimmed, start, end };
      });
    }

    return [{ index: 1, text: rawText.trim(), start: 0, end: rawText.trim().length }];
  }, [rawText]);

  // 2. Filter active spans by dimension toggles and validity
  const validSpans = useMemo(() => {
    if (!spans || spans.length === 0 || !showHighlights) return [];

    return spans
      .map((s, idx) => ({
        ...s,
        id: s.id || `span-${idx}`,
        start: Math.max(0, s.start),
        end: Math.min(rawText.length, s.end),
      }))
      .filter((s) => {
        const dimKey = s.dimension.toLowerCase().trim() as DimensionKey;
        const isActive = activeDimensions[dimKey] !== false;
        return isActive && s.start < s.end && s.start >= 0 && s.end <= rawText.length;
      })
      .sort((a, b) => a.start - b.start);
  }, [spans, showHighlights, activeDimensions, rawText.length]);

  // Render individual highlighted paragraph text
  const renderParagraphContent = (para: ParagraphBlock) => {
    // If highlights are disabled or no spans exist for this paragraph, render plain text
    if (!showHighlights || validSpans.length === 0) {
      return <span>{para.text}</span>;
    }

    // Find spans intersecting this paragraph
    const paraSpans = validSpans.filter(
      (s) => s.start < para.end && s.end > para.start
    );

    if (paraSpans.length === 0) {
      return <span>{para.text}</span>;
    }

    const segments: React.ReactNode[] = [];
    let localCursor = 0;

    paraSpans.forEach((span) => {
      // Relative indices inside this paragraph string
      const spanLocalStart = Math.max(0, span.start - para.start);
      const spanLocalEnd = Math.min(para.text.length, span.end - para.start);

      // Text segment before this span
      if (spanLocalStart > localCursor) {
        segments.push(
          <span key={`text-${para.index}-${localCursor}`}>
            {para.text.slice(localCursor, spanLocalStart)}
          </span>
        );
      }

      // Span text slice
      const spanText = para.text.slice(spanLocalStart, spanLocalEnd);
      if (spanText.length > 0) {
        const dimKey = span.dimension.toLowerCase().trim() as DimensionKey;
        const isSelected = selectedSpanId === span.id;

        // Visual Highlight Styles:
        // - Grammar: wavy underline (red/rose)
        // - Coherence: soft background highlight (amber)
        // - Argumentation: colored side marker (emerald)
        let styleClasses = '';
        let IconComp = Info;
        let dimTitle = 'Dimension Feedback';
        let chipBg = 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600';

        if (dimKey === 'grammar') {
          IconComp = PenTool;
          dimTitle = 'Grammar & Mechanics';
          chipBg = 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40';
          styleClasses =
            'underline decoration-wavy decoration-rose-500 dark:decoration-rose-400 decoration-[2px] underline-offset-4 text-rose-950 dark:text-rose-100 bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20';
        } else if (dimKey === 'coherence') {
          IconComp = Layers;
          dimTitle = 'Coherence & Organization';
          chipBg = 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40';
          styleClasses =
            'bg-amber-400/20 dark:bg-amber-500/20 text-amber-950 dark:text-amber-100 border-b-2 border-amber-500/60 rounded px-1 hover:bg-amber-400/30 dark:hover:bg-amber-500/30';
        } else if (dimKey === 'argumentation') {
          IconComp = Scale;
          dimTitle = 'Argumentation & Evidence';
          chipBg = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40';
          styleClasses =
            'border-l-4 border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 pl-1.5 pr-1 rounded-r inline-block hover:bg-emerald-500/25';
        }

        const tooltipContent = (
          <div className="max-w-xs p-1 space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <IconComp className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
                <span>{dimTitle}</span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${chipBg}`}>
                {span.severity || 'Observation'}
              </span>
            </div>

            <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
              {span.feedback || span.label || `Targeted feedback for ${dimTitle}.`}
            </p>

            <div className="text-[10px] text-primary-600 dark:text-primary-300 font-semibold pt-0.5 flex items-center justify-end">
              Click to inspect in drawer &rarr;
            </div>
          </div>
        );

        segments.push(
          <Tooltip
            key={`span-${span.id}-${para.index}`}
            content={tooltipContent}
            position="top"
            className="z-50 p-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200"
          >
            <span
              id={`text-span-${span.id}`}
              data-dimension={dimKey}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectSpan) onSelectSpan(span);
              }}
              className={`cursor-pointer transition-all duration-150 ${styleClasses} ${
                isSelected
                  ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-lg font-medium'
                  : ''
              }`}
            >
              {spanText}
            </span>
          </Tooltip>
        );
      }

      localCursor = spanLocalEnd;
    });

    // Remainder of paragraph
    if (localCursor < para.text.length) {
      segments.push(
        <span key={`text-${para.index}-end`}>{para.text.slice(localCursor)}</span>
      );
    }

    return <>{segments}</>;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ===================================================================
          TOOLBAR: Master Toggle + Visual Highlighting Legend
          =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs backdrop-blur-sm">
        {/* Left: Master Highlights Toggle */}
        <div className="flex items-center gap-3">
          <Toggle
            checked={showHighlights}
            onChange={onToggleHighlights}
            label={
              <span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                {showHighlights ? (
                  <Eye className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                )}
                <span>Show Highlights</span>
              </span>
            }
            size="sm"
          />

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Highlights count */}
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {validSpans.length > 0 ? (
              <span className="text-primary-600 dark:text-primary-300 font-semibold">
                {validSpans.length} {validSpans.length === 1 ? 'annotation' : 'annotations'}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">
                {spans.length === 0 ? 'No API annotations' : 'Highlights disabled'}
              </span>
            )}
          </span>
        </div>

        {/* Right: Legend Chips */}
        {showHighlights && (
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {/* Grammar Legend: Wavy underline */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-opacity ${
                activeDimensions.grammar
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : 'opacity-40 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="underline decoration-wavy decoration-rose-500 font-bold">~</span>
              <span className="font-semibold">Grammar (Wavy)</span>
            </div>

            {/* Coherence Legend: Soft background */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-opacity ${
                activeDimensions.coherence
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : 'opacity-40 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/40" />
              <span className="font-semibold">Coherence (Soft BG)</span>
            </div>

            {/* Argumentation Legend: Colored side marker */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-opacity ${
                activeDimensions.argumentation
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'opacity-40 border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500'
              }`}
            >
              <span className="w-1 h-3 rounded-full bg-emerald-500" />
              <span className="font-semibold">Argumentation (Marker)</span>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================
          ESSAY PROSE DISPLAY: ~75ch readable column + Margin paragraph numbers
          =================================================================== */}
      <div className="flex justify-center overflow-y-auto max-h-[700px] px-1 sm:px-2">
        <div id="essay-content-display" className="w-full max-w-[75ch] py-2 space-y-4">
          {paragraphs.map((para) => (
            <div
              key={para.index}
              className="flex items-start group relative transition-colors rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/30 p-2 -mx-2"
            >
              {/* Paragraph number in margin */}
              <span
                className="w-10 pr-4 pt-0.5 text-right font-mono text-xs text-slate-400 dark:text-slate-500 select-none shrink-0 group-hover:text-primary-500 group-hover:font-semibold transition-colors"
                title={`Paragraph ${para.index}`}
                aria-label={`Paragraph ${para.index}`}
              >
                ¶ {para.index}
              </span>

              {/* Paragraph body with inline annotations */}
              <p className="flex-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans selection:bg-primary-500/30 selection:text-white">
                {renderParagraphContent(para)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AnnotatedEssayReader = React.memo(AnnotatedEssayReaderComponent);
export default AnnotatedEssayReader;
