import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

const SIZE_STYLES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
}) => {
  const titleId = React.useId();
  const descId = React.useId();

  // Escape key handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => closeOnOverlayClick && onClose()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${SIZE_STYLES[size]} bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-800">
          <div className="flex flex-col space-y-1 pr-6">
            {title && (
              <h2 id={titleId} className="text-base font-bold text-white tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p id={descId} className="text-xs text-slate-400">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 text-sm text-slate-200">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
