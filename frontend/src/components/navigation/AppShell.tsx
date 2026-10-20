import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Drawer } from '../ui';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);

  // Auto-collapse on resize to tablet width
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* Skip to Main Content Link for WCAG Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop & Tablet Sidebar */}
        <div className="hidden md:flex shrink-0 h-screen sticky top-0 z-40">
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
          description="Automated Essay Scoring Platform"
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
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-150">
          <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            <div key={location.pathname} className="animate-page-enter">
              {children}
            </div>
          </main>

          <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Automated Essay Scoring (BERT + Regression Head &amp; Rubric Feedback) | Raj Aryan (240410700141)
          </footer>
        </div>
      </div>
    </div>
  );
};
