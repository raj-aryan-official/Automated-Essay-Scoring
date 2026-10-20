import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTour, TOUR_STEPS } from '../../context/TourContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  PenTool,
  Sparkles,
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const STEP_ICONS: Record<string, React.ElementType> = {
  submit: PenTool,
  score: Sparkles,
  feedback: Layers,
  override: ShieldCheck,
};

const STEP_ACCENT_COLORS: Record<
  string,
  { bg: string; text: string; border: string; glow: string }
> = {
  submit: {
    bg: 'bg-primary-50 dark:bg-primary-500/10',
    text: 'text-primary-600 dark:text-primary-400',
    border: 'border-primary-200 dark:border-primary-500/30',
    glow: 'from-primary-500/20 to-indigo-500/10',
  },
  score: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    glow: 'from-indigo-500/20 to-purple-500/10',
  },
  feedback: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30',
    glow: 'from-amber-500/20 to-rose-500/10',
  },
  override: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    glow: 'from-emerald-500/20 to-teal-500/10',
  },
};

export const ProductTour: React.FC = () => {
  const { isOpen, currentStep, closeTour, nextStep, prevStep, goToStep, isFirstRun } = useTour();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus trap for WCAG keyboard accessibility
  useFocusTrap(cardRef, isOpen, closeTour);

  // Keyboard navigation: ArrowRight / Enter for Next, ArrowLeft for Prev
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep, prevStep]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const StepIcon = STEP_ICONS[step.id] || Sparkles;
  const accent = STEP_ACCENT_COLORS[step.id] || STEP_ACCENT_COLORS.submit;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleActionClick = () => {
    closeTour();
    if (step.routeTarget) {
      navigate(step.routeTarget);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-dialog-title"
      aria-describedby="tour-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-backdrop-in"
        onClick={closeTour}
        aria-hidden="true"
      />

      {/* Tour Dialog Card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden transform animate-modal-in flex flex-col"
      >
        {/* Subtle Ambient Header Gradient */}
        <div
          className={`absolute top-0 inset-x-0 h-28 bg-gradient-to-b ${accent.glow} opacity-60 pointer-events-none`}
        />

        {/* Header Bar */}
        <div className="relative flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-500/30">
              {isFirstRun ? 'Teacher Onboarding Guide' : 'Platform Tour'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Step {step.stepNumber} of {step.totalSteps}
            </span>
          </div>

          <button
            type="button"
            onClick={closeTour}
            aria-label="Skip and dismiss product tour"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="px-5 pt-3 flex items-center justify-between gap-1.5 sm:gap-2">
          {TOUR_STEPS.map((s, idx) => {
            const isCurrent = idx === currentStep;
            const isCompleted = idx < currentStep;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(idx)}
                aria-label={`Go to step ${idx + 1}: ${s.title}`}
                className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all border text-center truncate ${
                  isCurrent
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : isCompleted
                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800/50'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="hidden sm:inline">{idx + 1}. </span>
                <span>{s.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="relative p-6 space-y-5 text-left">
          {/* Step Hero: Icon + Title */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${accent.bg} ${accent.text} ${accent.border}`}
            >
              <StepIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {step.subtitle}
              </span>
              <h2
                id="tour-dialog-title"
                className="text-lg font-black text-slate-900 dark:text-white tracking-tight"
              >
                {step.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p
            id="tour-dialog-desc"
            className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans"
          >
            {step.description}
          </p>

          {/* Key Bullet Features */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Key Capabilities
            </span>
            {step.bulletPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 px-6 bg-slate-50/80 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeTour}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium py-1.5 px-2 rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleActionClick}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-500 active:scale-[0.98] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span>Finish &amp; Start Grading</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-500 active:scale-[0.98] transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTour;
