import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface A11yAnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const A11yAnnouncerContext = createContext<A11yAnnouncerContextType | null>(null);

/**
 * WCAG 2.1 AA Screen Reader Live Region Announcer
 * Programmatically announces dynamic status changes (such as async scoring job steps,
 * network updates, and notifications) without interrupting user focus.
 */
export const A11yAnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!message) return;

    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 7000);
  }, []);

  return (
    <A11yAnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Screen-reader live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="a11y-live-polite-region"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="a11y-live-assertive-region"
      >
        {assertiveMessage}
      </div>
    </A11yAnnouncerContext.Provider>
  );
};

export const useA11yAnnounce = (): A11yAnnouncerContextType => {
  const context = useContext(A11yAnnouncerContext);
  if (!context) {
    return {
      announce: (msg: string) => {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[A11y Live Announce]:', msg);
        }
      },
    };
  }
  return context;
};
