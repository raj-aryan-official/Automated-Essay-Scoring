import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  className?: string;
}

const SIZE_STYLES = {
  sm: {
    track: 'w-7 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-3',
  },
  md: {
    track: 'w-10 h-6',
    thumb: 'w-4 h-4',
    translate: 'translate-x-4',
  },
  lg: {
    track: 'w-12 h-7',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
  },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
  className = '',
}) => {
  const toggleId = id || React.useId();
  const descId = `${toggleId}-desc`;
  const styles = SIZE_STYLES[size];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-start gap-3 select-none ${className}`}>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex shrink-0 items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${styles.track}
          ${checked ? 'bg-primary-600' : 'bg-slate-700'}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block rounded-full bg-white shadow-md transform transition duration-200 ease-in-out
            ${styles.thumb}
            ${checked ? styles.translate : 'translate-x-0'}`}
        />
      </button>

      {(label || description) && (
        <div
          className="flex flex-col cursor-pointer"
          onClick={() => !disabled && onChange(!checked)}
        >
          {label && (
            <label htmlFor={toggleId} className="text-xs font-semibold text-slate-200 cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p id={descId} className="text-[11px] text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
