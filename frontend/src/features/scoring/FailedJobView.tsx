import React, { useState } from 'react';
import {
  AlertOctagon,
  RefreshCw,
  PenTool,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button, Badge } from '../../components/ui';

export interface FailedJobViewProps {
  essayId: string;
  jobId?: string;
  errorMessage?: string | null;
  status: 'FAILED' | 'PROCESSING_FAILED' | string;
  onRetryScoring?: () => void;
  onRetry?: () => void;
  onEditEssay?: () => void;
  onResubmit?: () => void;
  isRetrying?: boolean;
  className?: string;
}

// WHY: Specialized view for FAILED / PROCESSING_FAILED inference jobs translating worker exceptions into plain language with retry capabilities.
export const FailedJobView: React.FC<FailedJobViewProps> = ({
  essayId,
  jobId,
  errorMessage,
  status,
  onRetryScoring,
  onRetry,
  onEditEssay,
  onResubmit,
  isRetrying = false,
  className = '',
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const handleRetry = onRetryScoring || onRetry || (() => {});
  const handleEdit = onEditEssay || onResubmit;

  // Translate worker error message into friendly pedagogical explanation
  const errorNarrative = React.useMemo(() => {
    const raw = (errorMessage || '').toLowerCase();

    if (raw.includes('timeout') || raw.includes('timed out') || raw.includes('time limit')) {
      return {
        headline: 'Inference Worker Timed Out',
        explanation:
          'The background worker exceeded the allowed processing time. This usually occurs when the GPU server is under heavy load or warming up after idle.',
        recommendation:
          'Retrying immediately will assign your essay to an available worker with high priority.',
      };
    }

    if (raw.includes('token') || raw.includes('sequence length') || raw.includes('too long')) {
      return {
        headline: 'Essay Exceeded Transformer Context Window',
        explanation:
          'The submitted essay exceeded the maximum token capacity (~1,024 tokens) supported by the DeBERTa model.',
        recommendation:
          'Try editing the essay to focus on the core argument or split into standard length paragraphs.',
      };
    }

    if (raw.includes('pdf') || raw.includes('docx') || raw.includes('corrupt') || raw.includes('parse')) {
      return {
        headline: 'Document Text Extraction Failed',
        explanation:
          'The scoring pipeline was unable to parse readable text from the uploaded document file.',
        recommendation:
          'We recommend copying the essay text directly and using the "Paste Text" tab instead.',
      };
    }

    if (raw.includes('cuda') || raw.includes('memory') || raw.includes('oom')) {
      return {
        headline: 'Worker Memory Spike',
        explanation:
          'The GPU inference server experienced a momentary memory constraint while calculating attention maps.',
        recommendation:
          'A fresh attempt will route to a worker with cleared cache.',
      };
    }

    return {
      headline: 'Scoring Job Could Not Complete',
      explanation:
        'The automated scoring worker encountered an unexpected exception while computing holistic scores and dimension feedback.',
      recommendation:
        'Please retry the scoring process. If the issue persists, you can edit or re-submit the essay.',
    };
  }, [errorMessage]);

  return (
    <div
      role="alert"
      id="failed-job-view"
      className={`p-6 md:p-8 rounded-2xl bg-slate-900/95 border border-rose-500/40 shadow-2xl backdrop-blur space-y-6 max-w-3xl mx-auto text-left animate-fade-in ${className}`}
    >
      {/* Header with Alert Icon & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-md">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                {errorNarrative.headline}
              </h2>
              <Badge variant="danger" size="sm">
                {status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Essay #{essayId.slice(0, 8)}... {jobId ? `• Job #${jobId.slice(0, 8)}...` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Plain Language Explanation */}
      <div className="space-y-3">
        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
          {errorNarrative.explanation}
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-primary-300 block">Recommended Action:</span>
          <p className="text-slate-400 font-sans">{errorNarrative.recommendation}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />}
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40"
        >
          {isRetrying ? 'Dispatching New Job...' : 'Retry AI Scoring Now'}
        </Button>

        {handleEdit && (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<PenTool className="w-4 h-4" />}
            onClick={handleEdit}
          >
            Edit / Resubmit Essay
          </Button>
        )}
      </div>

      {/* Technical Details Accordion for ML Engineers */}
      {errorMessage && (
        <div className="pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[11px] text-slate-500 hover:text-slate-400 font-mono flex items-center gap-1.5 transition"
          >
            <span>{showTechnicalDetails ? 'Hide' : 'Inspect'} raw worker diagnostics</span>
            {showTechnicalDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showTechnicalDetails && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300/90 whitespace-pre-wrap overflow-x-auto">
              <span className="text-slate-500 block mb-1">Raw Error Output:</span>
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FailedJobView;
