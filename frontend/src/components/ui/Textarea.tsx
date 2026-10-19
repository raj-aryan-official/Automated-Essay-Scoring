import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  showCount?: boolean;
  maxCharacters?: number;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      showCount = false,
      maxCharacters,
      maxLength,
      value,
      id,
      disabled,
      className = '',
      containerClassName = '',
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const limit = maxCharacters ?? maxLength;
    const currentLength = typeof value === 'string' ? value.length : 0;
    const isNearLimit = limit ? currentLength > limit * 0.9 : false;
    const isAtLimit = limit ? currentLength >= limit : false;

    return (
      <div className={`w-full flex flex-col space-y-1.5 ${containerClassName}`}>
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={textareaId}
              className="text-xs font-semibold text-slate-300 tracking-wide select-none"
            >
              {label}
              {props.required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
          )}

          {showCount && limit && (
            <span
              className={`text-[11px] font-mono select-none ${
                isAtLimit
                  ? 'text-rose-400 font-bold'
                  : isNearLimit
                  ? 'text-amber-400'
                  : 'text-slate-500'
              }`}
            >
              {currentLength} / {limit}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          maxLength={limit}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full text-sm bg-slate-900 border rounded-lg p-3 transition-colors placeholder:text-slate-500 text-slate-100
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:bg-slate-950 disabled:cursor-not-allowed
            min-h-[100px] resize-y
            ${
              error
                ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30'
                : 'border-slate-700 hover:border-slate-600 focus:border-primary-500 focus:ring-primary-500/30'
            }
            ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
