import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'score-low'
    | 'score-mid'
    | 'score-high'
    | 'outline';
  size?: 'sm' | 'md' | 'lg';
  withDot?: boolean;
  leftIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, { badge: string; dot: string }> = {
  default: {
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
  primary: {
    badge: 'bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-500/30',
    dot: 'bg-primary-500 dark:bg-primary-400',
  },
  success: {
    badge: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  warning: {
    badge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    badge: 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  info: {
    badge: 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
    dot: 'bg-sky-500 dark:bg-sky-400',
  },
  'score-low': {
    badge: 'bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-300 border-red-200 dark:border-red-500/35 font-semibold',
    dot: 'bg-red-500 dark:bg-red-400',
  },
  'score-mid': {
    badge: 'bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/35 font-semibold',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  'score-high': {
    badge: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/35 font-semibold',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  outline: {
    badge: 'bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
    dot: 'bg-slate-400',
  },
};

const SIZE_STYLES: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 rounded gap-1',
  md: 'text-xs px-2.5 py-0.5 rounded-full gap-1.5',
  lg: 'text-sm px-3 py-1 rounded-full gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  withDot = false,
  leftIcon,
  children,
  className = '',
  ...props
}) => {
  const currentVariant = VARIANT_STYLES[variant];

  // Automatic semantic icons for score bands to ensure meaning does not rely on color alone (WCAG 1.4.1)
  const resolvedIcon = React.useMemo(() => {
    if (leftIcon) return leftIcon;
    if (variant === 'score-low') {
      return <AlertCircle className="w-3 h-3 text-red-400 shrink-0" aria-hidden="true" />;
    }
    if (variant === 'score-mid') {
      return <Clock className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />;
    }
    if (variant === 'score-high') {
      return <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />;
    }
    return null;
  }, [leftIcon, variant]);

  return (
    <span
      className={`inline-flex items-center font-medium border leading-none tracking-wide select-none ${currentVariant.badge} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {resolvedIcon ? (
        <span className="inline-flex shrink-0">{resolvedIcon}</span>
      ) : withDot ? (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentVariant.dot}`}
          aria-hidden="true"
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
};
