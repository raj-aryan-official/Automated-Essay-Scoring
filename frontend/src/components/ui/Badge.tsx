import React from 'react';

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
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
  },
  primary: {
    badge: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
    dot: 'bg-primary-400',
  },
  success: {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  danger: {
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
  },
  info: {
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
  },
  'score-low': {
    badge: 'bg-red-500/15 text-red-300 border-red-500/35 font-semibold',
    dot: 'bg-red-400',
  },
  'score-mid': {
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/35 font-semibold',
    dot: 'bg-amber-400',
  },
  'score-high': {
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 font-semibold',
    dot: 'bg-emerald-400',
  },
  outline: {
    badge: 'bg-transparent text-slate-300 border-slate-600',
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

  return (
    <span
      className={`inline-flex items-center font-medium border leading-none tracking-wide select-none ${currentVariant.badge} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      {withDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentVariant.dot}`}
          aria-hidden="true"
        />
      )}
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
    </span>
  );
};
