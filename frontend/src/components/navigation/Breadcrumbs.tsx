import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent: boolean;
}

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  essays: 'Essay Manager',
  submit: 'Submit Essay',
  jobs: 'Inference Jobs',
  evaluation: 'Model Evaluation',
  dev: 'Developer',
  components: 'UI Components',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'dashboard')) {
    return (
      <nav aria-label="Breadcrumb" className="hidden sm:flex items-center text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <Home className="w-3.5 h-3.5 text-primary-400" />
          <span>Dashboard</span>
        </span>
      </nav>
    );
  }

  const items: BreadcrumbItem[] = [];
  let accumulatedPath = '';

  items.push({
    label: 'Home',
    path: '/',
    isCurrent: false,
  });

  pathnames.forEach((part, index) => {
    accumulatedPath += `/${part}`;
    const isLast = index === pathnames.length - 1;

    let label = ROUTE_NAME_MAP[part];
    if (!label) {
      // Check if it's a UUID or id
      if (part.length > 8) {
        label = `#${part.substring(0, 8)}...`;
      } else {
        label = part.charAt(0).toUpperCase() + part.slice(1);
      }
    }

    items.push({
      label,
      path: accumulatedPath,
      isCurrent: isLast,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs">
      <ol className="flex items-center space-x-1.5">
        {items.map((item, idx) => (
          <li key={item.path} className="flex items-center space-x-1.5">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}
            {item.isCurrent ? (
              <span
                aria-current="page"
                className="font-medium text-slate-200 select-none"
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-slate-400 hover:text-primary-400 transition-colors flex items-center gap-1"
              >
                {idx === 0 && <Home className="w-3 h-3" />}
                <span>{item.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
