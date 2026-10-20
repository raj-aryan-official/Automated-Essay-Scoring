import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

const POSITION_STYLES = {
  right: {
    container: 'inset-y-0 right-0',
    translateClosed: 'translate-x-full',
    border: 'border-l border-slate-200 dark:border-slate-700/80',
    width: {
      sm: 'w-full max-w-sm',
      md: 'w-full max-w-md',
      lg: 'w-full max-w-lg',
      xl: 'w-full max-w-2xl',
      full: 'w-screen',
    },
  },
  left: {
    container: 'inset-y-0 left-0',
    translateClosed: '-translate-x-full',
    border: 'border-r border-slate-200 dark:border-slate-700/80',
    width: {
      sm: 'w-full max-w-sm',
      md: 'w-full max-w-md',
      lg: 'w-full max-w-lg',
      xl: 'w-full max-w-2xl',
      full: 'w-screen',
    },
  },
  bottom: {
    container: 'inset-x-0 bottom-0',
    translateClosed: 'translate-y-full',
    border: 'border-t border-slate-200 dark:border-slate-700/80',
    width: {
      sm: 'h-64',
      md: 'h-96',
      lg: 'h-[32rem]',
      xl: 'h-[40rem]',
      full: 'h-screen',
    },
  },
};

const ANIMATION_BY_POSITION: Record<'right' | 'left' | 'bottom', string> = {
  right: 'animate-drawer-right-in',
  left: 'animate-drawer-left-in',
  bottom: 'animate-drawer-bottom-in',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  position = 'right',
  size = 'md',
  title,
  description,
  children,
  footer,
  closeOnOverlayClick = true,
}) => {
  const titleId = React.useId();
  const descId = React.useId();
  const drawerPanelRef = useRef<HTMLDivElement>(null);
  const styles = POSITION_STYLES[position];
  const sizeClass = styles.width[size];

  // Focus trap: traps Tab key within drawer, handles Escape, and returns focus on close
  useFocusTrap(drawerPanelRef, isOpen, onClose);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/75 backdrop-blur-sm animate-backdrop-in"
        onClick={() => closeOnOverlayClick && onClose()}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerPanelRef}
        className={`fixed ${styles.container} ${sizeClass} ${styles.border} bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col z-10 transform ${ANIMATION_BY_POSITION[position]}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col space-y-1 pr-6">
            {title && (
              <h2 id={titleId} className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-200">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
