import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpCircle, X, Sparkles, BookOpen, Layers, ShieldCheck } from 'lucide-react';

export type HelpTopic =
  | 'confidence'
  | 'qwk'
  | 'rubricBand'
  | 'grammar'
  | 'coherence'
  | 'argumentation';

export interface HelpTopicDefinition {
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  summary: string;
  details: string;
  tip?: string;
}

export const HELP_TOPICS: Record<HelpTopic, HelpTopicDefinition> = {
  confidence: {
    title: 'Model Confidence',
    badge: 'Certainty Metric',
    badgeColor: 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/30',
    icon: Sparkles,
    summary: 'Measures how certain the fine-tuned BERT model is about this essay score (0% to 100%).',
    details:
      'High confidence (85%+) means the essay clearly matches standard patterns in the ASAP training corpus. Lower confidence occurs on borderline scores or unusual writing styles, flagging the essay for teacher inspection.',
    tip: 'If confidence falls below your set threshold, use the Reviewer Override panel to verify the score.',
  },
  qwk: {
    title: 'Quadratic Weighted Kappa (QWK)',
    badge: 'Statistical Standard',
    badgeColor: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    icon: ShieldCheck,
    summary: 'The gold standard benchmark measuring agreement between AI scoring and certified human raters.',
    details:
      'QWK ranges from 0.0 (chance agreement) to 1.0 (perfect agreement). Penalizes distant score errors more heavily than adjacent ones. A QWK of 0.70 or higher represents near-human grading parity.',
    tip: 'Our model is gated at ≥ 0.70 across all 8 ASAP prompt benchmarks.',
  },
  rubricBand: {
    title: 'Rubric Performance Band',
    badge: 'Pedagogical Tier',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    icon: BookOpen,
    summary: 'Maps raw numeric scores into standardized qualitative proficiency tiers.',
    details:
      'Categorizes performance into Below Basic, Basic, Proficient, and Exemplary/Advanced tiers corresponding to state standards. Allows students and educators to understand qualitative strengths beyond raw numbers.',
    tip: 'Rubric bands calibrate automatically depending on whether the prompt uses a 2–12, 1–6, or 0–30 scale.',
  },
  grammar: {
    title: 'Grammar & Mechanics',
    badge: 'Syntactic Dimension',
    badgeColor: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30',
    icon: Layers,
    summary: 'Evaluates grammatical correctness, punctuation, sentence boundaries, and spelling.',
    details:
      'Scans for sentence fragments, comma splices, subject-verb agreement, and typographical errors. Distinguishes between minor surface slips and persistent structural errors.',
    tip: 'Click on individual diagnostic items to locate matching highlights directly in the essay text.',
  },
  coherence: {
    title: 'Coherence & Organization',
    badge: 'Discourse Dimension',
    badgeColor: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    icon: Layers,
    summary: 'Evaluates paragraph structure, logical progression, transitional flow, and thesis clarity.',
    details:
      'Checks whether arguments unfold logically from introduction to conclusion, with appropriate connective devices and consistent topical focus across paragraphs.',
    tip: 'Look for transitional phrase feedback to help students connect paragraphs more smoothly.',
  },
  argumentation: {
    title: 'Argumentation & Evidence',
    badge: 'Rhetorical Dimension',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    icon: Layers,
    summary: 'Evaluates the depth of claims, textual citations, reasoning strength, and persuasiveness.',
    details:
      'Assesses whether the student provides concrete evidence to substantiate claims, addresses potential counterarguments, and synthesizes source material effectively.',
    tip: 'High argumentation scores require clear citations and thorough elaboration of reasoning.',
  },
};

export interface ContextHelpProps {
  topic?: HelpTopic;
  title?: string;
  content?: string;
  tip?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

export const ContextHelp: React.FC<ContextHelpProps> = ({
  topic,
  title: customTitle,
  content: customContent,
  tip: customTip,
  position = 'top',
  className = '',
  iconClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const data = topic ? HELP_TOPICS[topic] : null;
  const title = customTitle || data?.title || 'Help Information';
  const summary = data?.summary || customContent || '';
  const details = data?.details;
  const tip = customTip || data?.tip;
  const IconComponent = data?.icon || HelpCircle;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Position styles for popover container
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        aria-label={`Help explanation for ${title}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 select-none ${iconClassName}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="tooltip"
          className={`absolute z-50 w-72 sm:w-80 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl text-left transform animate-modal-in select-text ${positionClasses}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shrink-0">
                <IconComponent className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {title}
                </h4>
                {data?.badge && (
                  <span
                    className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${data.badgeColor}`}
                  >
                    {data.badge}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close help popover"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="py-2.5 space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            <p className="font-medium text-slate-800 dark:text-slate-200">{summary}</p>
            {details && <p className="text-[11px] text-slate-500 dark:text-slate-400">{details}</p>}
          </div>

          {/* Footer Tip */}
          {tip && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5 text-[10px] text-primary-700 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-950/40 p-2 rounded-lg">
              <span className="font-bold shrink-0">Teacher Tip:</span>
              <span>{tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextHelp;
