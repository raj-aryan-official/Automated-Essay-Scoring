import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Breadcrumbs } from './Breadcrumbs';
import { Button, Badge, Tooltip } from '../ui';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';

export interface TopBarProps {
  onOpenMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard Overview',
  '/dashboard': 'Dashboard Overview',
  '/submit': 'Submit Essay for Assessment',
  '/essays': 'Essay Manager & Submissions',
  '/jobs': 'Inference Job Telemetry',
  '/evaluation': 'Model Evaluation & QWK Metrics',
  '/dev/components': 'UI Component Library & Style Guide',
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
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
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title & Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-sm md:text-base font-bold text-white tracking-tight truncate">
            {pageTitle}
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Theme Toggle & User Menu */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Tooltip
          content={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          position="bottom"
        >
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle visual theme"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>
        </Tooltip>

        {/* User Session Info */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="hidden sm:flex flex-col items-end">
              <span id="header-user-email" className="text-xs font-semibold text-slate-200">
                {user.email}
              </span>
              <Badge id="header-role-badge" variant={roleVariant} size="sm" withDot>
                {user.role}
              </Badge>
            </div>

            <Button
              id="btn-logout"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400" />}
              className="text-slate-400 hover:text-rose-400 text-xs px-2.5"
            >
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
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
