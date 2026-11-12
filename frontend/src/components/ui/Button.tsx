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
    'bg-ink-500 text-white hover:bg-ink-600 active:bg-ink-700 border border-transparent focus-visible:ring-ink-500 shadow-sm',
  secondary:
    'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-600 focus-visible:ring-stone-500 shadow-sm',
  outline:
    'bg-transparent text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 focus-visible:ring-ink-500',
  ghost:
    'bg-transparent text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-100 border border-transparent focus-visible:ring-ink-500',
  danger:
    'bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 border border-transparent focus-visible:ring-rose-500 shadow-sm',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5 font-medium',
  sm: 'text-xs px-3 py-2 rounded-md gap-1.5 font-medium',
  md: 'text-sm px-4 py-2.5 rounded-lg gap-2 font-medium',
  lg: 'text-base px-5 py-3 rounded-lg gap-2.5 font-semibold',
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
        className={`inline-flex items-center justify-center transition-colors duration-150 ease-out select-none active:scale-[0.97] motion-reduce:active:scale-100
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-950
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          ${VARIANT_STYLES[variant]}
          ${SIZE_STYLES[size]}
          ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === 'lg' ? 'md' : 'sm'} variant="white" />
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
