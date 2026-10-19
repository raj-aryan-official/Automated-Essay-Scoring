import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-primary-400 mb-4 shadow-sm">
          {icon}
        </div>
      )}

      <h3 className="text-base font-bold text-white tracking-tight mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel || children) && (
        <div className="flex items-center gap-3">
          {secondaryActionLabel && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}

          {actionLabel && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}

          {children}
        </div>
      )}
    </div>
  );
};
