import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

// WHY: Global React Error Boundary preventing white screens and offering friendly recovery options.
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Application Rendering Encountered an Issue
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                An unexpected client-side error occurred while rendering this view. Your saved essays and data on the server remain completely safe.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={this.handleReload}
              >
                Reload Application
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Home className="w-3.5 h-3.5" />}
                onClick={this.handleGoHome}
              >
                Return to Dashboard
              </Button>
            </div>

            {this.state.error && (
              <div className="pt-3 border-t border-slate-800/80 text-left">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="text-[10px] text-slate-500 hover:text-slate-400 font-mono flex items-center justify-center gap-1 mx-auto transition"
                >
                  <span>{this.state.showDetails ? 'Hide' : 'Show'} crash diagnostics</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-rose-300/90 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    <p className="font-bold text-rose-200 mb-1">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
