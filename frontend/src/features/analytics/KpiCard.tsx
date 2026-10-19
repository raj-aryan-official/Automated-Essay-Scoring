import React from 'react';
import { Card, CardContent } from '../../components/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
    isPositive?: boolean; // If true, up is green. If false (e.g. queue backlog), down is green.
  };
  variant?: 'primary' | 'emerald' | 'sky' | 'amber' | 'rose';
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'primary',
  className = '',
}) => {
  // Variant icon container styles
  const iconVariantStyles = {
    primary: 'bg-primary-500/10 border-primary-500/30 text-primary-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    sky: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  }[variant];

  // Trend color determination
  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'neutral') return 'text-slate-400';
    const isGood = trend.isPositive !== undefined
      ? (trend.direction === 'up' ? trend.isPositive : !trend.isPositive)
      : trend.direction === 'up';

    return isGood ? 'text-emerald-400' : 'text-rose-400';
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">
            {title}
          </span>

          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {value}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            {trend && (
              <span className={`inline-flex items-center gap-1 font-semibold ${getTrendColor()}`}>
                {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                <span>{trend.value}</span>
                {trend.label && <span className="text-slate-400 font-normal">{trend.label}</span>}
              </span>
            )}

            {subtitle && !trend && (
              <span className="text-slate-400 font-medium">{subtitle}</span>
            )}
          </div>
        </div>

        {icon && (
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${iconVariantStyles}`}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
