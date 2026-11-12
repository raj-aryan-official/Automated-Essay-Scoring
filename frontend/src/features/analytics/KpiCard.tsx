import React from 'react';
import { Card, CardContent } from '../../components/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
    isPositive?: boolean; // If true, up is green. If false (e.g. queue backlog), down is green.
  };
  className?: string;
}

const KpiCardComponent: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  className = '',
}) => {
  // Trend color determination
  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'neutral') return 'text-slate-500 dark:text-slate-400';
    const isGood = trend.isPositive !== undefined
      ? (trend.direction === 'up' ? trend.isPositive : !trend.isPositive)
      : trend.direction === 'up';

    return isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <CardContent className="p-5">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
            {title}
          </span>

          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {value}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            {trend && (
              <span className={`inline-flex items-center gap-1 font-semibold ${getTrendColor()}`}>
                {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                <span>{trend.value}</span>
                {trend.label && <span className="text-slate-500 dark:text-slate-400 font-normal">{trend.label}</span>}
              </span>
            )}

            {subtitle && !trend && (
              <span className="text-slate-500 dark:text-slate-400 font-medium">{subtitle}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const KpiCard = React.memo(KpiCardComponent);
export default KpiCard;
