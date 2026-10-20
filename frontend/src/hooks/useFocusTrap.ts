import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * WCAG 2.1 AA Focus Trap Hook
 * Traps keyboard Tab navigation within an open modal/drawer container,
 * prevents background element interaction, and restores focus on close.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onClose?: () => void
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Save previous active element before trapping focus
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    // Delay slightly to ensure children are mounted in DOM
    const timer = setTimeout(() => {
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length > 0) {
        const autoFocusEl = container.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
        (autoFocusEl || focusables[0]).focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    }, 16);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const currentFocusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (currentFocusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = currentFocusables[0];
        const lastElement = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: Wrap from first to last
          if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: Wrap from last to first
          if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to original trigger element upon closing
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function' &&
        document.body.contains(previousActiveElement.current)
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, onClose, containerRef]);
}
