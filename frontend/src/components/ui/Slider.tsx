import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  formatValue?: (val: number) => string;
  onChange?: (val: number) => void;
  ticks?: { value: number; label: string }[];
  containerClassName?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  helperText,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 50,
  formatValue = (v) => `${v}`,
  onChange,
  ticks,
  disabled,
  id,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const [internalValue, setInternalValue] = React.useState<number>(
    value ?? defaultValue
  );

  const currentValue = value !== undefined ? value : internalValue;
  const sliderId = id || React.useId();
  const percentage = Math.min(
    100,
    Math.max(0, ((currentValue - min) / (max - min)) * 100)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    setInternalValue(nextVal);
    onChange?.(nextVal);
  };

  return (
    <div className={`w-full flex flex-col space-y-2 select-none ${containerClassName}`}>
      <div className="flex items-center justify-between text-xs">
        {label && (
          <label htmlFor={sliderId} className="font-semibold text-slate-300">
            {label}
          </label>
        )}
        <span className="font-mono font-semibold text-primary-400 bg-primary-950/60 border border-primary-800/40 px-2 py-0.5 rounded text-[11px]">
          {formatValue(currentValue)}
        </span>
      </div>

      <div className="relative flex flex-col items-center">
        <input
          type="range"
          id={sliderId}
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={handleChange}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          aria-valuetext={formatValue(currentValue)}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-slate-900
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95
            ${className}`}
          style={{
            background: `linear-gradient(to right, rgb(99 102 241) 0%, rgb(99 102 241) ${percentage}%, rgb(30 41 59) ${percentage}%, rgb(30 41 59) 100%)`,
          }}
          {...props}
        />

        {ticks && ticks.length > 0 && (
          <div className="w-full flex justify-between mt-1 px-1">
            {ticks.map((t) => (
              <span
                key={t.value}
                onClick={() => !disabled && (setInternalValue(t.value), onChange?.(t.value))}
                className={`text-[10px] font-mono cursor-pointer transition-colors ${
                  currentValue === t.value ? 'text-primary-300 font-bold' : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {helperText && <p className="text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
