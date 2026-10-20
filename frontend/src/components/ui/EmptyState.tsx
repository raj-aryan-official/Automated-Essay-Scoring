import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick?: () => void;
  };
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryAction,
  children,
  className = '',
}) => {
  const effectiveActionLabel = action?.label || actionLabel;
  const effectiveOnAction = action?.onClick || onAction;
  const effectiveSecondaryLabel = secondaryAction?.label || secondaryActionLabel;
  const effectiveOnSecondary = secondaryAction?.onClick || onSecondaryAction;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-4 shadow-sm">
          {icon}
        </div>
      )}

      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {(effectiveActionLabel || effectiveSecondaryLabel || children) && (
        <div className="flex items-center gap-3">
          {effectiveSecondaryLabel && (
            <Button variant="secondary" size="sm" onClick={effectiveOnSecondary}>
              {effectiveSecondaryLabel}
            </Button>
          )}

          {effectiveActionLabel && (
            <Button variant="primary" size="sm" onClick={effectiveOnAction}>
              {effectiveActionLabel}
            </Button>
          )}

          {children}
        </div>
      )}
    </div>
  );
};
