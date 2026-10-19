import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 focus-visible:ring-primary-500 shadow-sm border border-transparent',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 focus-visible:ring-slate-400 shadow-sm',
  outline:
    'bg-transparent text-slate-200 hover:bg-slate-800 active:bg-slate-900 border border-slate-700 focus-visible:ring-primary-500',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60 active:bg-slate-800 border border-transparent focus-visible:ring-primary-500',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 focus-visible:ring-rose-500 shadow-sm border border-transparent',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'text-xs px-2.5 py-1 rounded-md gap-1.5 font-medium',
  sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 font-medium',
  md: 'text-sm px-4 py-2 rounded-lg gap-2 font-medium',
  lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 font-semibold',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 select-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${VARIANT_STYLES[variant]}
          ${SIZE_STYLES[size]}
          ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner
              size={size === 'lg' ? 'md' : 'sm'}
              variant={variant === 'secondary' || variant === 'ghost' || variant === 'outline' ? 'primary' : 'white'}
            />
            {loadingText ? <span>{loadingText}</span> : children}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
