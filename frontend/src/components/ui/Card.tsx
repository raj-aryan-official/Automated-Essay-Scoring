import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'sunken' | 'bordered';
  interactive?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-surface border border-base text-stone-900 dark:text-stone-200 shadow-sm',
  elevated:
    'bg-surface border border-base shadow-md text-stone-900 dark:text-stone-200',
  sunken:
    'bg-surface-level border border-faint shadow-inner text-stone-900 dark:text-stone-200',
  bordered:
    'bg-transparent border border-strong text-stone-900 dark:text-stone-200 shadow-none',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl transition-colors duration-200
          ${VARIANT_STYLES[variant]}
          ${
            interactive
              ? 'hover:border-ink-500/50 hover:shadow-md hover:bg-surface-level active:scale-[0.99] cursor-pointer'
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
      className={`text-serif text-base font-bold tracking-tight text-heading ${className}`}
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
    <p className={`text-xs text-muted ${className}`} {...props}>
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
      className={`p-5 pt-3 border-t border-faint flex items-center justify-between text-xs text-muted ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
