import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../api';
import { Tooltip, Badge } from '../ui';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  Cpu,
  BarChart3,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
  badgeText?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    allowedRoles: ['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN'],
  },
  {
    label: 'Submit Essay',
    path: '/submit',
    icon: <PenTool className="w-4 h-4 shrink-0" />,
    allowedRoles: ['TEACHER', 'ADMIN'],
  },
  {
    label: 'Essay Manager',
    path: '/essays',
    icon: <FileText className="w-4 h-4 shrink-0" />,
    allowedRoles: ['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN'],
  },
  {
    label: 'Inference Jobs',
    path: '/jobs',
    icon: <Cpu className="w-4 h-4 shrink-0" />,
    allowedRoles: ['ML_ENGINEER', 'TEACHER', 'ADMIN'],
  },
  {
    label: 'Model Evaluation',
    path: '/evaluation',
    icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    allowedRoles: ['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN'],
  },
  {
    label: 'UI Library',
    path: '/dev/components',
    icon: <Sparkles className="w-4 h-4 shrink-0" />,
    allowedRoles: ['VIEWER', 'TEACHER', 'ML_ENGINEER', 'ADMIN'],
    badgeText: 'Dev',
    badgeVariant: 'primary',
  },
];

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onItemClick,
  isMobileDrawer = false,
}) => {
  const { user, hasRole } = useAuth();

  // Filter items based on active user role
  const visibleItems = NAV_ITEMS.filter((item) => hasRole(item.allowedRoles));

  return (
    <aside
      className={`h-full flex flex-col justify-between bg-slate-900 border-r border-slate-800 transition-all duration-300 select-none ${
        isMobileDrawer
          ? 'w-full'
          : isCollapsed
          ? 'w-[72px]'
          : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0 font-bold text-sm">
              AES
            </div>
            {(!isCollapsed || isMobileDrawer) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black text-white tracking-tight truncate">
                  Essay Scoring
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
                  BERT + QWK v1.2
                </span>
              </div>
            )}
          </div>

          {!isMobileDrawer && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          aria-label="Main Navigation"
          className="p-3 space-y-1.5 overflow-y-auto"
        >
          {visibleItems.map((item) => {
            const linkContent = (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-150 group font-medium ${
                    isActive
                      ? 'bg-primary-600 text-white font-semibold shadow-md shadow-primary-600/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-800'
                  } ${isCollapsed && !isMobileDrawer ? 'justify-center px-0' : ''}`
                }
              >
                <span className="shrink-0">{item.icon}</span>

                {(!isCollapsed || isMobileDrawer) && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badgeText && (
                      <Badge
                        variant={item.badgeVariant || 'primary'}
                        size="sm"
                        className="ml-auto"
                      >
                        {item.badgeText}
                      </Badge>
                    )}
                  </div>
                )}
              </NavLink>
            );

            if (isCollapsed && !isMobileDrawer) {
              return (
                <Tooltip key={item.path} content={item.label} position="right">
                  {linkContent}
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </div>

      {/* Footer Role Indicator & Status */}
      <div className="p-3 border-t border-slate-800/80">
        {(!isCollapsed || isMobileDrawer) ? (
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Active Session
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate">
                {user?.email || 'Guest'}
              </span>
            </div>
            {user?.role && (
              <Badge
                variant={
                  user.role === 'ADMIN'
                    ? 'danger'
                    : user.role === 'TEACHER'
                    ? 'primary'
                    : user.role === 'ML_ENGINEER'
                    ? 'info'
                    : 'default'
                }
                size="sm"
              >
                {user.role}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <Tooltip content={`Role: ${user?.role || 'Guest'}`} position="right">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-primary-400">
                {user?.role ? user.role.charAt(0) : 'U'}
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </aside>
  );
};
