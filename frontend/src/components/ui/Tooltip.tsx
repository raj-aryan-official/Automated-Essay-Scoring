import React from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  delay?: number;
  className?: string;
}

const POSITION_STYLES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_STYLES = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-x-transparent border-b-transparent border-t-4 border-x-4 border-b-0',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-x-transparent border-t-transparent border-b-4 border-x-4 border-t-0',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-y-transparent border-r-transparent border-l-4 border-y-4 border-r-0',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-y-transparent border-l-transparent border-r-4 border-y-4 border-l-0',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  delay = 100,
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {React.cloneElement(children, {
        'aria-describedby': isVisible ? tooltipId : undefined,
      })}

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap bg-slate-800 text-slate-100 border border-slate-700/80 px-2.5 py-1 text-[11px] font-medium rounded-md shadow-lg pointer-events-none animate-in fade-in duration-150 ${POSITION_STYLES[position]} ${className}`}
        >
          {content}
          <div className={`absolute w-0 h-0 border-solid ${ARROW_STYLES[position]}`} />
        </div>
      )}
    </div>
  );
};
