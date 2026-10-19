import React, { useState } from 'react';
import {
  AlertCircle,
  ShieldAlert,
  SearchX,
  HardDriveUpload,
  ServerCrash,
  WifiOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Home,
  ArrowLeft,
} from 'lucide-react';
import { Button } from './Button';

export type ErrorCategory =
  | 'auth' // 401
  | 'forbidden' // 403
  | 'not-found' // 404
  | 'payload' // 413
  | 'validation' // 422
  | 'server' // 500 / 502 / 503
  | 'network' // Offline or Network Error
  | 'generic';

export interface FormattedError {
  statusCode?: number;
  category: ErrorCategory;
  title: string;
  message: string;
  suggestion?: string;
  isRetryable: boolean;
  technicalDetails?: string;
}

// WHY: Translates raw HTTP codes, network errors, and Python/Pydantic tracebacks into human-readable pedagogical messages.
export function formatApiError(err: any): FormattedError {
  if (!err) {
    return {
      category: 'generic',
      title: 'Unexpected Application State',
      message: 'An unexpected issue occurred while processing your request.',
      suggestion: 'Please refresh the page or try again in a few moments.',
      isRetryable: true,
    };
  }

  // Network offline or failed request
  if (
    err.code === 'ERR_NETWORK' ||
    err.message === 'Network Error' ||
    !navigator.onLine ||
    (!err.response && err.request)
  ) {
    return {
      category: 'network',
      title: 'Network Connection Lost',
      message: 'Unable to establish a secure connection to the Automated Essay Scoring service.',
      suggestion: 'Please verify your internet connection or check if a firewall is blocking API traffic.',
      isRetryable: true,
      technicalDetails: err.message,
    };
  }

  const status = err.response?.status;
  const rawDetail = err.response?.data?.detail || err.message;
  let detailString = '';

  if (typeof rawDetail === 'string') {
    detailString = rawDetail;
  } else if (Array.isArray(rawDetail)) {
    // Pydantic 422 validation array
    detailString = rawDetail
      .map((item: any) => `${item.loc ? item.loc.join('.') + ': ' : ''}${item.msg || 'Invalid field'}`)
      .join('; ');
  } else if (rawDetail && typeof rawDetail === 'object') {
    detailString = JSON.stringify(rawDetail);
  }

  // 401 Unauthorized
  if (status === 401) {
    return {
      statusCode: 401,
      category: 'auth',
      title: 'Session Expired or Unauthorized',
      message: 'Your active session has expired or your login token is no longer valid.',
      suggestion: 'Please sign in again to re-authenticate your institutional session.',
      isRetryable: true,
      technicalDetails: detailString,
    };
  }

  // 403 Forbidden
  if (status === 403) {
    return {
      statusCode: 403,
      category: 'forbidden',
      title: 'Access Restricted',
      message: 'Your account role does not have authorization to view or modify this resource.',
      suggestion: 'If you need educator override or ML inspection rights, contact your administrator.',
      isRetryable: false,
      technicalDetails: detailString,
    };
  }

  // 404 Not Found
  if (status === 404) {
    return {
      statusCode: 404,
      category: 'not-found',
      title: 'Resource Not Found',
      message: 'The requested essay, scoring job, or model evaluation benchmark could not be located.',
      suggestion: 'The item may have been deleted, or the URL identifier may be mistyped.',
      isRetryable: false,
      technicalDetails: detailString,
    };
  }

  // 413 Payload Too Large
  if (status === 413) {
    return {
      statusCode: 413,
      category: 'payload',
      title: 'Submission Payload Too Large',
      message: 'The submitted document or essay prose exceeds our maximum size thresholds.',
      suggestion: 'Document uploads must be under 20 MB, and pasted prose must be under 8,000 characters.',
      isRetryable: false,
      technicalDetails: detailString,
    };
  }

  // 422 Unprocessable Content
  if (status === 422) {
    return {
      statusCode: 422,
      category: 'validation',
      title: 'Input Validation Notice',
      message: 'The data submitted does not match the prompt rubric requirements or field schema.',
      suggestion: detailString || 'Please review highlighted input fields and correct any formatting issues.',
      isRetryable: false,
      technicalDetails: detailString,
    };
  }

  // 500 / 502 / 503 / 504 Server Error
  if (status && status >= 500) {
    return {
      statusCode: status,
      category: 'server',
      title: 'Inference Service Temporarily Unavailable',
      message: 'Our backend PyTorch BERT scoring worker encountered an internal execution issue.',
      suggestion: 'Our engineering telemetry has recorded this incident. Please retry in a few moments.',
      isRetryable: true,
      technicalDetails: detailString || `HTTP ${status} Internal Server Error`,
    };
  }

  return {
    statusCode: status,
    category: 'generic',
    title: 'Action Could Not Be Completed',
    message: detailString || 'An unexpected error occurred while communicating with the scoring server.',
    suggestion: 'Please try again or return to the main dashboard if this persists.',
    isRetryable: true,
    technicalDetails: detailString,
  };
}

export interface ErrorStateProps {
  error?: any;
  title?: string;
  message?: string;
  suggestion?: string;
  onRetry?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  retryLabel?: string;
  backLabel?: string;
  homeLabel?: string;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title: overrideTitle,
  message: overrideMessage,
  suggestion: overrideSuggestion,
  onRetry,
  onBack,
  onHome,
  retryLabel = 'Retry Request',
  backLabel = 'Go Back',
  homeLabel = 'Dashboard',
  isRetrying = false,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const formatted = error ? formatApiError(error) : null;
  const title = overrideTitle || formatted?.title || 'Something went wrong';
  const message = overrideMessage || formatted?.message || 'An unexpected error occurred.';
  const suggestion = overrideSuggestion || formatted?.suggestion;
  const category = formatted?.category || 'generic';
  const isRetryable = onRetry !== undefined || formatted?.isRetryable;
  const details = formatted?.technicalDetails;

  // Icon styling per category
  let IconComponent = AlertCircle;
  let iconWrapperClass = 'bg-rose-500/10 border-rose-500/30 text-rose-400';

  if (category === 'auth' || category === 'forbidden') {
    IconComponent = ShieldAlert;
    iconWrapperClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  } else if (category === 'not-found') {
    IconComponent = SearchX;
    iconWrapperClass = 'bg-slate-800 border-slate-700 text-slate-400';
  } else if (category === 'payload') {
    IconComponent = HardDriveUpload;
    iconWrapperClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
  } else if (category === 'network') {
    IconComponent = WifiOff;
    iconWrapperClass = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
  } else if (category === 'server') {
    IconComponent = ServerCrash;
    iconWrapperClass = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
  }

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur max-w-xl mx-auto space-y-4 animate-fade-in ${className}`}
    >
      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg ${iconWrapperClass}`}>
        <IconComponent className="w-7 h-7" />
      </div>

      {/* Title & Status Badge */}
      <div className="space-y-1">
        {formatted?.statusCode && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 uppercase font-bold tracking-wider inline-block mb-1">
            HTTP {formatted.statusCode}
          </span>
        )}
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      </div>

      {/* Friendly Explanation */}
      <p className="text-xs text-slate-300 leading-relaxed max-w-md">{message}</p>

      {/* Suggestion Prompt */}
      {suggestion && (
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 text-left w-full space-y-1">
          <span className="font-semibold text-slate-300 block">Recommended Action:</span>
          <p>{suggestion}</p>
        </div>
      )}

      {/* Action CTA Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {onRetry && isRetryable && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : retryLabel}
          </Button>
        )}

        {onBack && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            onClick={onBack}
          >
            {backLabel}
          </Button>
        )}

        {onHome && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Home className="w-3.5 h-3.5 text-slate-400" />}
            onClick={onHome}
          >
            {homeLabel}
          </Button>
        )}
      </div>

      {/* Collapsible Technical Details (for ML engineers/developers) */}
      {details && (
        <div className="w-full pt-2 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[10px] text-slate-500 hover:text-slate-400 font-mono transition flex items-center justify-center gap-1 mx-auto"
          >
            <span>{showDetails ? 'Hide' : 'Show'} technical diagnostic details</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-left overflow-x-auto text-[10px] font-mono text-rose-300/90 whitespace-pre-wrap">
              {details}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorState;
