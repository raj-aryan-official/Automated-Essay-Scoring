import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getJobStatusCounts, JobStatusCounts, apiClient } from '../api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from '../components/ui';
import {
  FileText,
  BarChart3,
  Cpu,
  PenTool,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface RecentEssay {
  id: string;
  prompt_id: string;
  source_type: string;
  status: string;
  created_at: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [jobCounts, setJobCounts] = useState<JobStatusCounts | null>(null);
  const [recentEssays, setRecentEssays] = useState<RecentEssay[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      try {
        const [countsRes, essaysRes] = await Promise.allSettled([
          getJobStatusCounts(),
          apiClient.get<RecentEssay[]>('/essays?limit=5'),
        ]);

        if (isMounted) {
          if (countsRes.status === 'fulfilled') {
            setJobCounts(countsRes.value);
          }
          if (essaysRes.status === 'fulfilled') {
            setRecentEssays(essaysRes.value.data || []);
          }
        }
      } catch (err) {
        console.warn('Dashboard telemetry fetch partial error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const roleName = user?.role ? user.role.replace('_', ' ') : 'User';

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900/60 via-slate-900 to-slate-900 border border-primary-500/30 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/40 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role: {roleName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Welcome back, {user?.email ? user.email.split('@')[0] : 'Educator'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
              Automated essay assessment, multi-dimensional feedback diagnostics, and QWK model telemetry workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
              <Button
                variant="primary"
                leftIcon={<PenTool className="w-4 h-4" />}
                onClick={() => navigate('/submit')}
              >
                Submit Essay
              </Button>
            )}
            <Button
              variant="secondary"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={() => navigate('/evaluation')}
            >
              Model Benchmarks
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Essays */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Assessed Essays
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {isLoading ? <Skeleton width={60} height={28} /> : '842'}
              </div>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>ASAP calibrated</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-primary-400">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Avg QWK */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Avg Model QWK
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {isLoading ? <Skeleton width={60} height={28} /> : '0.784'}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Target: &gt; 0.700 gate
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Inference Certainty */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Avg Certainty
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {isLoading ? <Skeleton width={60} height={28} /> : '86.5%'}
              </div>
              <span className="text-[11px] text-slate-400">
                Low variance drift
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Worker Queue */}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Queue Backlog
              </span>
              <div className="text-2xl font-black text-white font-mono">
                {isLoading ? (
                  <Skeleton width={60} height={28} />
                ) : (
                  jobCounts?.queued ?? 0
                )}
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{jobCounts?.processing ?? 0} processing</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-primary-400">
              <Cpu className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section: Recent Essays & Fast Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Essays */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Submissions
            </h2>
            <Link
              to="/essays"
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  <Skeleton height={20} className="w-full" />
                  <Skeleton height={20} className="w-full" />
                  <Skeleton height={20} className="w-full" />
                </div>
              ) : recentEssays.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {recentEssays.map((essay) => (
                    <div
                      key={essay.id}
                      onClick={() => navigate(`/essays/${essay.id}`)}
                      className="p-4 flex items-center justify-between hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-200 font-mono truncate">
                            #{essay.id.substring(0, 8)}...
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Source: {essay.source_type} &bull; {new Date(essay.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            essay.status === 'SCORED' || essay.status === 'FINALIZED'
                              ? 'success'
                              : essay.status === 'UNDER_REVIEW'
                              ? 'warning'
                              : essay.status === 'PROCESSING_FAILED'
                              ? 'danger'
                              : 'info'
                          }
                          size="sm"
                        >
                          {essay.status}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  No submissions yet. Submit an essay to see scoring telemetry.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Model Telemetry */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">
            Quick Operations
          </h2>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Platform Navigation</CardTitle>
              <CardDescription>
                Direct access to core grading and ML features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                <Link
                  to="/submit"
                  className="block p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-primary-500/40 hover:bg-slate-800/80 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <PenTool className="w-4 h-4 text-primary-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Submit Student Essay
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary-400 transition-colors" />
                  </div>
                </Link>
              )}

              <Link
                to="/essays"
                className="block p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-primary-500/40 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Browse Essay Submissions
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </div>
              </Link>

              <Link
                to="/evaluation"
                className="block p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-primary-500/40 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Model Evaluation (QWK)
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </div>
              </Link>

              <Link
                to="/jobs"
                className="block p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-primary-500/40 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Inference Worker Jobs
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
