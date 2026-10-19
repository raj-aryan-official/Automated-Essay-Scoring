import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Button,
  Badge,
  Skeleton,
  EmptyState,
} from '../components/ui';
import { Search, FileText, ArrowRight, RefreshCw, PenTool } from 'lucide-react';

interface EssayRecord {
  id: string;
  prompt_id: string;
  source_type: string;
  status: string;
  created_at: string;
}

export const EssayManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const [essays, setEssays] = useState<EssayRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchEssays = async () => {
    setIsLoading(true);
    try {
      const url = statusFilter !== 'ALL' ? `/essays?status=${statusFilter}` : '/essays';
      const res = await apiClient.get<EssayRecord[]>(url);
      setEssays(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch essays:', err);
      setEssays([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEssays();
  }, [statusFilter]);

  const filteredEssays = essays.filter((essay) => {
    const matchesSearch =
      essay.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      essay.prompt_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      essay.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const STATUS_PILLS = ['ALL', 'SUBMITTED', 'SCORED', 'UNDER_REVIEW', 'FINALIZED'];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Essay Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse submitted student prose, inspect BERT holistic evaluations, and audit status progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchEssays}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PenTool className="w-3.5 h-3.5" />}
            onClick={() => navigate('/submit')}
          >
            Submit Essay
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_PILLS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search by ID or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
          />
        </div>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="p-8 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <Skeleton height={24} className="w-1/4" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      ) : filteredEssays.length > 0 ? (
        <Table striped>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Essay ID</TableHead>
              <TableHead>Prompt Set</TableHead>
              <TableHead>Source Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEssays.map((essay) => (
              <TableRow
                key={essay.id}
                onClick={() => navigate(`/essays/${essay.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="font-mono text-xs font-semibold text-primary-400">
                  #{essay.id.substring(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-300">
                  Prompt {essay.prompt_id.substring(0, 8)}...
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  <Badge variant="outline" size="sm">
                    {essay.source_type}
                  </Badge>
                </TableCell>
                <TableCell>
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
                    withDot
                  >
                    {essay.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-400">
                  {new Date(essay.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="xs"
                    variant="secondary"
                    rightIcon={<ArrowRight className="w-3 h-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/essays/${essay.id}`);
                    }}
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No Matching Essays Found"
          description={
            searchQuery
              ? `No essay records match "${searchQuery}". Try adjusting your filters.`
              : 'There are no submitted essays in this category yet.'
          }
          actionLabel="Submit an Essay"
          onAction={() => navigate('/submit')}
        />
      )}
    </div>
  );
};
