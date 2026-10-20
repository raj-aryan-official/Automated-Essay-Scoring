import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTour } from '../../context/TourContext';
import { Breadcrumbs } from './Breadcrumbs';
import { Button, Badge, Tooltip } from '../ui';
import { Menu, Sun, Moon, Laptop, LogOut, Sparkles, HelpCircle, ChevronDown } from 'lucide-react';

export interface TopBarProps {
  onOpenMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Submit Essay for Assessment',
  '/dashboard': 'Dashboard Overview',
  '/submit': 'Submit Essay for Assessment',
  '/essays': 'Essay Manager & Submissions',
  '/jobs': 'Inference Job Telemetry',
  '/evaluation': 'Model Evaluation & QWK Metrics',
  '/help': 'Help & Frequently Asked Questions',
  '/dev/components': 'UI Component Library & Style Guide',
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { openTour } = useTour();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState<boolean>(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close user dropdown on click outside or Escape
  React.useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Determine page title
  let pageTitle = PAGE_TITLES[location.pathname];
  if (!pageTitle) {
    if (location.pathname.startsWith('/essays/')) {
      pageTitle = 'Essay Score Workspace';
    } else {
      pageTitle = 'Automated Essay Scoring';
    }
  }

  const roleVariant =
    user?.role === 'ADMIN'
      ? 'danger'
      : user?.role === 'TEACHER'
      ? 'primary'
      : user?.role === 'ML_ENGINEER'
      ? 'info'
      : 'default';

  return (
    <header className="h-16 bg-white/85 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between transition-colors duration-150">
      {/* Left: Mobile Toggle & Page Title & Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {pageTitle}
          </span>
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Tour + Help + Theme Toggle & User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Tour Button for Teachers / Admins */}
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <Tooltip content="Launch 4-Step Product Tour" position="bottom">
            <button
              type="button"
              id="topbar-launch-tour-btn"
              onClick={() => openTour(0)}
              aria-label="Restart Teacher Product Tour"
              className="min-h-[44px] px-2.5 py-1 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              <span className="hidden sm:inline text-xs font-bold">Tour</span>
            </button>
          </Tooltip>
        )}

        {/* Quick Access Help & FAQ Link */}
        <Tooltip content="Help, FAQs & Documentation" position="bottom">
          <button
            type="button"
            id="topbar-help-btn"
            onClick={() => navigate('/help')}
            aria-label="Open Help and FAQs"
            className="min-h-[44px] min-w-[36px] px-2.5 py-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 select-none"
          >
            <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden lg:inline text-xs font-semibold">Help</span>
          </button>
        </Tooltip>

        {/* 3-State Theme Toggle (Light / Dark / System) */}
        <div
          role="radiogroup"
          aria-label="Color theme selection"
          className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-inner"
        >
          {/* Light Mode Button */}
          <Tooltip content="Light theme" position="bottom">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => setTheme('light')}
              id="theme-btn-light"
              aria-label="Set light theme"
              className={`min-h-[44px] min-w-[36px] sm:min-w-0 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                theme === 'light'
                  ? 'bg-white text-primary-700 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden md:inline">Light</span>
            </button>
          </Tooltip>

          {/* Dark Mode Button */}
          <Tooltip content="Dark theme" position="bottom">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => setTheme('dark')}
              id="theme-btn-dark"
              aria-label="Set dark theme"
              className={`min-h-[44px] min-w-[36px] sm:min-w-0 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-700 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden md:inline">Dark</span>
            </button>
          </Tooltip>

          {/* System Mode Button */}
          <Tooltip
            content={`System theme (currently ${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
            position="bottom"
          >
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'system'}
              onClick={() => setTheme('system')}
              id="theme-btn-system"
              aria-label={`Set system auto theme (currently ${resolvedTheme})`}
              className={`min-h-[44px] min-w-[36px] sm:min-w-0 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                theme === 'system'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Auto</span>
            </button>
          </Tooltip>
        </div>

        {/* User Session Info & Interactive Dropdown Menu */}
        {isAuthenticated && user ? (
          <div ref={userMenuRef} className="relative flex items-center pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              type="button"
              id="user-menu-button"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-bold text-xs flex items-center justify-center border border-primary-200 dark:border-primary-500/30">
                {user.email.slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span id="header-user-email" className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                  {user.email}
                </span>
                <Badge id="header-role-badge" variant={roleVariant} size="sm" withDot>
                  {user.role}
                </Badge>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-modal-in"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Role: {user.role}</p>
                </div>

                <div className="py-1">
                  {/* Restart Product Tour */}
                  <button
                    type="button"
                    role="menuitem"
                    id="btn-restart-tour"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openTour(0);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    <span>Restart Product Tour</span>
                  </button>

                  {/* Help & FAQs */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/help');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-sky-500" />
                    <span>Help &amp; FAQs</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    role="menuitem"
                    id="btn-logout-menu"
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Sign Out Button */}
            <Tooltip content="Sign out of platform" position="bottom">
              <button
                type="button"
                id="btn-logout"
                onClick={handleLogout}
                aria-label="Sign out"
                className="hidden sm:flex min-h-[44px] px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 select-none"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </Tooltip>
          </div>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
};
