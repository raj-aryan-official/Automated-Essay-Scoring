import React from 'react';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'muted' | 'success' | 'danger' | 'warning';
  label?: string;
}

const SIZE_MAP = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const VARIANT_MAP = {
  primary: 'text-primary-500',
  white: 'text-white',
  muted: 'text-slate-400',
  success: 'text-emerald-500',
  danger: 'text-rose-500',
  warning: 'text-amber-500',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className = '',
  ...props
}) => {
  return (
    <svg
      role="status"
      aria-label={label}
      className={`animate-spin ${SIZE_MAP[size]} ${VARIANT_MAP[variant]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
