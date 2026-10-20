import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sunken' | 'bordered';
  interactive?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 shadow-sm text-slate-900 dark:text-slate-100',
  elevated:
    'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md text-slate-900 dark:text-slate-100',
  sunken:
    'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-inner text-slate-900 dark:text-slate-100',
  bordered:
    'bg-transparent border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl border backdrop-blur-sm transition-all duration-150
          ${VARIANT_STYLES[variant]}
          ${
            interactive
              ? 'hover:border-primary-500/50 hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-[0.99]'
              : ''
          }
          ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-5 pb-3 flex flex-col space-y-1 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }
> = ({ as: Component = 'h3', className = '', children, ...props }) => {
  return (
    <Component
      className={`text-base font-bold tracking-tight text-slate-900 dark:text-white ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <p className={`text-xs text-slate-500 dark:text-slate-400 ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-5 pt-0 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-5 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
