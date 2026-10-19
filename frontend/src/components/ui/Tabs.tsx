import React from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
  variant: 'pills' | 'underline' | 'bordered';
}

const TabsContext = React.createContext<TabsContextType | null>(null);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  variant?: 'pills' | 'underline' | 'bordered';
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  variant = 'pills',
  children,
  className = '',
}) => {
  const [internalTab, setInternalTab] = React.useState<string>(defaultValue || '');
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (newTab: string) => {
    if (value === undefined) {
      setInternalTab(newTab);
    }
    onValueChange?.(newTab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={`w-full flex flex-col space-y-3 ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  ariaLabel?: string;
}

export const TabList: React.FC<TabListProps> = ({
  ariaLabel = 'Tabs',
  className = '',
  children,
  ...props
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabList must be used inside Tabs');

  const listStyles = {
    pills: 'bg-slate-900/90 p-1 border border-slate-800 rounded-xl inline-flex items-center gap-1',
    underline: 'border-b border-slate-700/80 flex items-center gap-6',
    bordered: 'border border-slate-700 rounded-lg p-0.5 inline-flex items-center gap-1 bg-slate-900',
  }[context.variant];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${listStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface TabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
}

export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabTrigger must be used inside Tabs');

  const isSelected = context.activeTab === value;

  const triggerStyles = {
    pills: isSelected
      ? 'bg-primary-600 text-white shadow-sm font-semibold'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium',
    underline: isSelected
      ? 'border-b-2 border-primary-500 text-primary-400 font-semibold pb-2.5 -mb-[1px]'
      : 'text-slate-400 hover:text-slate-200 font-medium pb-2.5 border-b-2 border-transparent',
    bordered: isSelected
      ? 'bg-slate-800 text-white font-semibold'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium',
  }[context.variant];

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => context.setActiveTab(value)}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs rounded-lg transition-all select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${triggerStyles}
        ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export interface TabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  value,
  children,
  className = '',
  ...props
}) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabContent must be used inside Tabs');

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded-lg animate-in fade-in duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
