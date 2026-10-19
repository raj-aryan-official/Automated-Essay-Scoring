import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      id,
      disabled,
      children,
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    return (
      <div className={`w-full flex flex-col space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-slate-300 tracking-wide select-none"
          >
            {label}
            {props.required && <span className="text-rose-400 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full text-sm bg-slate-900 border rounded-lg pl-3.5 pr-10 py-2 transition-colors text-slate-100 appearance-none
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
              disabled:opacity-50 disabled:bg-slate-950 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                  : 'border-slate-700 hover:border-slate-600 focus:border-primary-500 focus:ring-primary-500/30'
              }
              ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-slate-500 bg-slate-900">
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-slate-900 text-slate-100 py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {error ? (
          <p id={errorId} className="text-xs text-rose-400 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
