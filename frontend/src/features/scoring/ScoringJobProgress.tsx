import React, { useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Cpu,
  Sparkles,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';
import { useA11yAnnounce } from '../../context/A11yAnnouncerContext';

export type ScoringStepKey = 'QUEUED' | 'PROCESSING' | 'SCORING' | 'FEEDBACK' | 'DONE';

export interface ScoringJobProgressProps {
  jobId?: string;
  jobStatus?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  essayStatus?: string;
  elapsedSeconds: number;
  attempts?: number;
  maxAttempts?: number;
  onCancel?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

interface StepMeta {
  key: ScoringStepKey;
  stepNumber: number;
  title: string;
  shortDesc: string;
  friendlyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepMeta[] = [
  {
    key: 'QUEUED',
    stepNumber: 1,
    title: 'Queued',
    shortDesc: 'Broker Queue',
    friendlyMessage: 'Job dispatched to Celery worker queue. Awaiting worker assignment...',
    icon: Clock,
  },
  {
    key: 'PROCESSING',
    stepNumber: 2,
    title: 'Processing',
    shortDesc: 'Parsing Tokens',
    friendlyMessage: 'Extracting essay prose, computing word counts, and validating tokens...',
    icon: Cpu,
  },
  {
    key: 'SCORING',
    stepNumber: 3,
    title: 'Scoring',
    shortDesc: 'DeBERTa Ensemble',
    friendlyMessage: 'Running DeBERTa & LightGBM ensemble models to evaluate holistic rubric band...',
    icon: Sparkles,
  },
  {
    key: 'FEEDBACK',
    stepNumber: 4,
    title: 'Generating feedback',
    shortDesc: 'Multi-Dimension Analysis',
    friendlyMessage: 'Analyzing pedagogical dimensions: Grammar mechanics, Coherence, and Argumentation...',
    icon: PenTool,
  },
  {
    key: 'DONE',
    stepNumber: 5,
    title: 'Done',
    shortDesc: 'Assessment Ready',
    friendlyMessage: 'Assessment complete! Holistic score, rubrics, and diagnostic feedback ready.',
    icon: CheckCircle2,
  },
];

// WHY: Non-blocking async-job progress stepper driven by GET /jobs/{id} with elapsed ticker, friendly step narratives, and slow-job fallback.
export const ScoringJobProgress: React.FC<ScoringJobProgressProps> = ({
  jobId,
  jobStatus = 'PROCESSING',
  essayStatus,
  elapsedSeconds,
  attempts = 1,
  maxAttempts = 3,
  onCancel,
  onRefresh,
  isRefreshing = false,
  className = '',
}) => {
  // Determine current active step index (0 to 4)
  const currentStepIndex = useMemo(() => {
    // Done state
    if (
      jobStatus === 'COMPLETED' ||
      essayStatus === 'SCORED' ||
      essayStatus === 'FEEDBACK_READY' ||
      essayStatus === 'FINALIZED'
    ) {
      return 4; // DONE
    }

    // Queued state
    if (jobStatus === 'QUEUED' || essayStatus === 'QUEUED' || essayStatus === 'SUBMITTED') {
      return 0; // QUEUED
    }

    // Processing transitions based on worker progress & elapsed time
    if (elapsedSeconds < 2.5) {
      return 1; // PROCESSING
    } else if (elapsedSeconds < 6.0) {
      return 2; // SCORING
    } else {
      return 3; // FEEDBACK
    }
  }, [jobStatus, essayStatus, elapsedSeconds]);

  const activeStep = STEPS[currentStepIndex];
  const { announce } = useA11yAnnounce();
  const lastAnnouncedStepRef = useRef<number>(-1);

  // Announce step transitions to assistive screen readers
  useEffect(() => {
    if (lastAnnouncedStepRef.current !== currentStepIndex) {
      lastAnnouncedStepRef.current = currentStepIndex;
      const step = STEPS[currentStepIndex];
      announce(
        `Scoring job status: ${step.title}. Step ${step.stepNumber} of 5. ${step.friendlyMessage}`,
        'polite'
      );
    }
  }, [currentStepIndex, announce]);

  // Slow job detection (>= 10s elapsed while not done)
  const isLongRunning = elapsedSeconds >= 10 && currentStepIndex < 4;

  const formattedElapsed = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${secs.toFixed(0)}s`;
  }, [elapsedSeconds]);

  return (
    <div
      id="job-processing-panel"
      role="region"
      aria-label="Asynchronous scoring job progress"
      className={`rounded-2xl bg-slate-900/95 border border-primary-500/30 p-5 md:p-6 shadow-2xl backdrop-blur space-y-5 transition-all ${className}`}
    >
      {/* ===================================================================
          TOP ROW: Status Badge, Job ID, and Live Elapsed Time
          =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Asynchronous Scoring Job
              </h3>
              <Badge variant="info" size="sm" withDot>
                {activeStep.title.toUpperCase()}
              </Badge>
            </div>
            {jobId && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Job ID: #{jobId.substring(0, 8)}... (Attempt {attempts} of {maxAttempts})
              </p>
            )}
          </div>
        </div>

        {/* Live Elapsed Time Ticker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-slate-400">Elapsed:</span>
            <span className="text-white font-bold">{formattedElapsed}</span>
          </div>

          {onRefresh && (
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Poll worker state now"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* ===================================================================
          STEPPER: Queued → Processing → Scoring → Generating feedback → Done
          =================================================================== */}
      <div
        className="py-2"
        role="progressbar"
        aria-label="Scoring progression pipeline"
        aria-valuenow={currentStepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuetext={`Step ${activeStep.stepNumber} of 5: ${activeStep.title}. ${activeStep.friendlyMessage}`}
      >
        <div className="grid grid-cols-5 relative">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const IconComp = step.icon;

            return (
              <div
                key={step.key}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Connecting Track Line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 z-0 transition-colors duration-500 ${
                      idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                )}

                {/* Step Node Icon */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-primary-600 text-white ring-4 ring-primary-500/30 animate-pulse'
                      : 'bg-slate-800 border border-slate-700 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <IconComp className="w-4 h-4" />
                  ) : (
                    <span className="text-[11px]">{step.stepNumber}</span>
                  )}
                </div>

                {/* Step Title & Subtitle */}
                <div className="mt-2 space-y-0.5">
                  <div
                    className={`text-[11px] font-bold tracking-tight transition-colors ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[9px] text-slate-500 hidden sm:block truncate max-w-[90px]">
                    {step.shortDesc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          FRIENDLY NARRATIVE MESSAGE FOR ACTIVE STEP
          =================================================================== */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 text-xs leading-relaxed">
        <div className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 shrink-0 mt-0.5">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 space-y-0.5">
          <span className="font-bold text-slate-300">
            Step {activeStep.stepNumber} of 5: {activeStep.title}
          </span>
          <p className="text-slate-400 font-sans">{activeStep.friendlyMessage}</p>
        </div>
      </div>

      {/* ===================================================================
          "STILL WORKING…" BANNER (When job exceeds 10s threshold)
          =================================================================== */}
      {isLongRunning && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Still working…</span>
              <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                Complex essays with extended vocabulary or worker cold-starts can take slightly longer. Your job is still actively running.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onRefresh && (
              <Button
                size="xs"
                variant="secondary"
                leftIcon={<RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />}
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                Refresh
              </Button>
            )}

            {onCancel && (
              <Button
                size="xs"
                variant="danger"
                leftIcon={<XCircle className="w-3 h-3" />}
                onClick={onCancel}
              >
                Cancel Job
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringJobProgress;
