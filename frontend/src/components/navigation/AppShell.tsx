import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Drawer } from '../ui';
import { WifiOff } from 'lucide-react';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);
  const [isOnline, setIsOnline] = React.useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Auto-collapse on resize to tablet width & reset mobile menu on desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Online / offline connection detection
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-heading flex flex-col font-sans">
      {/* Skip to Main Content Link for WCAG Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink-500 focus:text-white focus:rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-500"
      >
        Skip to main content
      </a>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Tablet Sidebar */}
        <div className="hidden md:flex shrink-0 h-screen sticky top-0 z-20">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
        </div>

        {/* Mobile Slide-Over Drawer Navigation */}
        <Drawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          position="left"
          size="sm"
          title="Navigation"
          description="AES Platform"
        >
          <div className="h-full -m-5">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onItemClick={() => setIsMobileMenuOpen(false)}
              isMobileDrawer
            />
          </div>
        </Drawer>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto bg-surface-level">
          <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <div key={location.pathname} className="min-h-0">
              {children}
            </div>
          </main>

          {/* Offline Connection Banner */}
          {!isOnline && (
            <div className="banner-warning-bg border border-warning-border bg-warning-bg text-warning-text px-4 py-2 text-center text-xs font-medium">
              <span className="flex items-center justify-center gap-1.5">
                <WifiOff className="w-3 h-3 shrink-0" />
                You are offline — changes will sync when connection is restored
              </span>
            </div>
          )}

          <footer className="border-t border-faint py-4 px-6 text-center text-xs text-tertiary">
            Automated Essay Scoring | Editorial Academic Platform
          </footer>
        </div>
      </div>
    </div>
  );
};
