import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getEssays, dispatchScoring, EssayListItem } from '../api';
import { useDebounce } from '../hooks';
import { ASAP_PROMPTS } from './SubmissionPage';
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
  Card,
  CardContent,
  EssayTableSkeleton,
  EmptyState,
  ErrorState,
  useToast,
  formatApiError,
} from '../components/ui';
import {
  Search,
  FileText,
  ArrowRight,
  RefreshCw,
  PenTool,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Copy,
  Download,
  Filter,
  X,
  CheckSquare,
  Square,
  MinusSquare,
  User,
  Calendar,
} from 'lucide-react';

type SortField = 'created_at' | 'prompt' | 'score' | 'band' | 'status' | 'submitter';
type SortOrder = 'asc' | 'desc';

export const EssayManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven filter, search, sort, and pagination state
  const searchQuery = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || 'ALL';
  const promptFilter = searchParams.get('prompt') || 'ALL';
  const bandFilter = searchParams.get('band') || 'ALL';
  const dateRange = searchParams.get('date') || 'ALL';
  const sortField = (searchParams.get('sort') || 'created_at') as SortField;
  const sortOrder = (searchParams.get('order') || 'desc') as SortOrder;
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

  // Local state
  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchScoring, setIsBatchScoring] = useState<boolean>(false);

  // Helper to update search params and keep URL clean
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === null ||
          val === '' ||
          val === 'ALL' ||
          (key === 'page' && val === '1') ||
          (key === 'pageSize' && val === '10') ||
          (key === 'sort' && val === 'created_at' && (updates.order || sortOrder) === 'desc')
        ) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, sortOrder]
  );

  // Debounced search input state for buttery smooth typing
  const [searchInput, setSearchInput] = useState<string>(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 250);

  // Sync debounced search query to URL params
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateParams({ q: debouncedSearch || null, page: '1' });
    }
  }, [debouncedSearch, searchQuery, updateParams]);

  // Keep searchInput in sync if URL params change externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Fetch essays from backend
  const fetchEssays = useCallback(
    async (showSuccessToast = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEssays({ limit: 200 });
        setEssays(data || []);
        if (showSuccessToast) {
          toast.success('Essay Records Refreshed', `Loaded ${(data || []).length} essay entries.`);
        }
      } catch (err: unknown) {
        console.warn('Failed to fetch essays:', err);
        setError(err);
        setEssays([]);
        if (showSuccessToast) {
          const fmt = formatApiError(err);
          toast.error(`${fmt.title}: ${fmt.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchEssays(false);
  }, [fetchEssays]);

  // Prompt lookup map
  const promptMap = useMemo(() => {
    const map = new Map<number, (typeof ASAP_PROMPTS)[0]>();
    ASAP_PROMPTS.forEach((p) => map.set(p.set, p));
    return map;
  }, []);

  // Filter pipeline
  const filteredEssays = useMemo(() => {
    return essays.filter((essay) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const idMatch = essay.id.toLowerCase().includes(query);
        const promptTitleMatch = (essay.prompt_title || '').toLowerCase().includes(query);
        const submitterMatch = (essay.submitter_email || essay.submitted_by || '').toLowerCase().includes(query);
        const statusMatch = essay.status.toLowerCase().includes(query);
        const textMatch = (essay.raw_text || '').toLowerCase().includes(query);
        if (!idMatch && !promptTitleMatch && !submitterMatch && !statusMatch && !textMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'FAILED') {
          if (essay.status !== 'FAILED' && essay.status !== 'PROCESSING_FAILED') return false;
        } else if (essay.status !== statusFilter) {
          return false;
        }
      }

      // 3. Prompt Filter
      if (promptFilter !== 'ALL') {
        const promptSetNum = parseInt(promptFilter, 10);
        if (essay.asap_set_id !== promptSetNum) {
          // Fallback check against prompt UUID
          const promptObj = promptMap.get(promptSetNum);
          if (promptObj && essay.prompt_id !== promptObj.id) {
            return false;
          }
        }
      }

      // 4. Rubric Band Filter
      if (bandFilter !== 'ALL') {
        const bandUpper = (essay.rubric_band || '').toUpperCase();
        if (bandFilter === 'HIGH' && !bandUpper.includes('HIGH')) return false;
        if (bandFilter === 'MID' && !bandUpper.includes('MID')) return false;
        if (bandFilter === 'LOW' && !bandUpper.includes('LOW')) return false;
      }

      // 5. Date Range Filter
      if (dateRange !== 'ALL') {
        const createdAtTime = new Date(essay.created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRange === 'TODAY' && now - createdAtTime > oneDay) return false;
        if (dateRange === '7D' && now - createdAtTime > 7 * oneDay) return false;
        if (dateRange === '30D' && now - createdAtTime > 30 * oneDay) return false;
      }

      return true;
    });
  }, [essays, searchQuery, statusFilter, promptFilter, bandFilter, dateRange, promptMap]);

  // Sort pipeline
  const sortedEssays = useMemo(() => {
    return [...filteredEssays].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'prompt': {
          const aSet = a.asap_set_id ?? 0;
          const bSet = b.asap_set_id ?? 0;
          comparison = aSet - bSet;
          break;
        }
        case 'score': {
          const aScore = a.reviewer_override_score ?? a.holistic_score ?? -1;
          const bScore = b.reviewer_override_score ?? b.holistic_score ?? -1;
          comparison = aScore - bScore;
          break;
        }
        case 'band': {
          const aBand = (a.rubric_band || '').toLowerCase();
          const bBand = (b.rubric_band || '').toLowerCase();
          comparison = aBand.localeCompare(bBand);
          break;
        }
        case 'status': {
          comparison = a.status.localeCompare(b.status);
          break;
        }
        case 'submitter': {
          const aSub = (a.submitter_email || a.submitted_by || '').toLowerCase();
          const bSub = (b.submitter_email || b.submitted_by || '').toLowerCase();
          comparison = aSub.localeCompare(bSub);
          break;
        }
        case 'created_at':
        default: {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          comparison = aTime - bTime;
          break;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEssays, sortField, sortOrder]);

  // Pagination pipeline
  const totalItems = sortedEssays.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedEssays = sortedEssays.slice(startIndex, endIndex);

  // Sort header click handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc', page: '1' });
    } else {
      updateParams({ sort: field, order: 'desc', page: '1' });
    }
  };

  // Bulk selection logic
  const isAllCurrentPageSelected =
    paginatedEssays.length > 0 && paginatedEssays.every((e) => selectedIds.includes(e.id));
  const isSomeCurrentPageSelected =
    paginatedEssays.some((e) => selectedIds.includes(e.id)) && !isAllCurrentPageSelected;

  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedEssays.map((e) => e.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = paginatedEssays.map((e) => e.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Quick action: Copy ID
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('Essay ID Copied', `#${id.substring(0, 8)}... copied to clipboard.`);
  };

  // Quick action: Score individual essay
  const handleQuickScore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dispatchScoring(id);
      toast.success('Inference Dispatched', `Job dispatched for essay #${id.substring(0, 8)}`);
      fetchEssays(false);
    } catch (err: unknown) {
      const fmt = formatApiError(err);
      toast.error(`${fmt.title}: ${fmt.message}`);
    }
  };

  // Bulk action: Batch Scoring
  const handleBatchScore = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchScoring(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        await dispatchScoring(id);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBatchScoring(false);
    if (successCount > 0) {
      toast.success(
        'Batch Scoring Dispatched',
        `Dispatched scoring jobs for ${successCount} essay(s).${failCount > 0 ? ` (${failCount} failed)` : ''}`
      );
      setSelectedIds([]);
      fetchEssays(false);
    } else {
      toast.error('Batch Scoring Failed', 'Unable to dispatch scoring jobs for selected essays.');
    }
  };

  // Bulk action: Export CSV
  const handleExportData = (format: 'csv' | 'json') => {
    const targetEssays =
      selectedIds.length > 0
        ? essays.filter((e) => selectedIds.includes(e.id))
        : sortedEssays;

    if (targetEssays.length === 0) {
      toast.info('No Data to Export', 'Select at least one essay or adjust your filters.');
      return;
    }

    if (format === 'json') {
      const jsonStr = JSON.stringify(targetEssays, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aes-essays-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON Exported', `Exported ${targetEssays.length} essays as JSON.`);
    } else {
      const headers = ['Essay ID', 'Prompt', 'Status', 'Score', 'Rubric Band', 'Submitter', 'Submitted Date'];
      const rows = targetEssays.map((e) => [
        e.id,
        `Prompt ${e.asap_set_id || e.prompt_id}`,
        e.status,
        e.reviewer_override_score ?? e.holistic_score ?? 'Pending',
        e.rubric_band || 'N/A',
        e.submitter_email || e.submitted_by || 'Unknown',
        new Date(e.created_at).toISOString(),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aes-essays-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV Exported', `Exported ${targetEssays.length} essays as CSV.`);
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (promptFilter !== 'ALL') count++;
    if (bandFilter !== 'ALL') count++;
    if (dateRange !== 'ALL') count++;
    return count;
  }, [searchQuery, statusFilter, promptFilter, bandFilter, dateRange]);

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    toast.info('Filters Reset', 'All search parameters and filters cleared.');
  };

  // Render Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SCORED':
        return (
          <Badge variant="success" size="sm" withDot>
            SCORED
          </Badge>
        );
      case 'FINALIZED':
        return (
          <Badge variant="primary" size="sm" withDot>
            FINALIZED
          </Badge>
        );
      case 'UNDER_REVIEW':
        return (
          <Badge variant="warning" size="sm" withDot>
            UNDER REVIEW
          </Badge>
        );
      case 'PROCESSING':
        return (
          <Badge variant="info" size="sm" withDot>
            PROCESSING
          </Badge>
        );
      case 'QUEUED':
        return (
          <Badge variant="warning" size="sm" withDot>
            QUEUED
          </Badge>
        );
      case 'FAILED':
      case 'PROCESSING_FAILED':
        return (
          <Badge variant="danger" size="sm" withDot>
            FAILED
          </Badge>
        );
      case 'SUBMITTED':
      default:
        return (
          <Badge variant="default" size="sm" withDot>
            {status}
          </Badge>
        );
    }
  };

  // Render Rubric Band Badge
  const renderBandBadge = (band: string | null | undefined) => {
    if (!band) return <span className="text-slate-500 font-mono text-xs">—</span>;
    const upper = band.toUpperCase();
    if (upper.includes('HIGH')) {
      return (
        <Badge variant="score-high" size="sm" withDot>
          High Band
        </Badge>
      );
    }
    if (upper.includes('MID')) {
      return (
        <Badge variant="score-mid" size="sm" withDot>
          Mid Band
        </Badge>
      );
    }
    if (upper.includes('LOW')) {
      return (
        <Badge variant="score-low" size="sm" withDot>
          Low Band
        </Badge>
      );
    }
    return (
      <Badge variant="outline" size="sm">
        {band}
      </Badge>
    );
  };

  // Render Sort Header Indicator
  const renderSortHeader = (label: string, field: SortField) => {
    const isSorted = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors uppercase font-bold text-[11px] tracking-wider select-none group"
      >
        <span>{label}</span>
        {isSorted ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 animate-fade-in pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Essay Manager
            </h1>
            <Badge variant="outline" size="sm" className="font-mono">
              {filteredEssays.length} {filteredEssays.length === 1 ? 'essay' : 'essays'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse submissions, monitor rubric progression, inspect automated evaluations, and trigger batch actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => fetchEssays(true)}
          >
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => handleExportData('csv')}
          >
            Export CSV
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

      {/* Filter & Search Toolbar */}
      <div className="space-y-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        {/* Search Input & Quick Status Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Input
              id="essay-search-input"
              placeholder="Search by ID, prompt, email, status, or text..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
              rightIcon={
                searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: null, page: '1' });
                    }}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Quick Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none py-1">
            {['ALL', 'SUBMITTED', 'SCORED', 'UNDER_REVIEW', 'FINALIZED', 'FAILED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => updateParams({ status: st, page: '1' })}
                className={`px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Prompt Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Prompt:
              </span>
              <select
                value={promptFilter}
                onChange={(e) => updateParams({ prompt: e.target.value, page: '1' })}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 min-h-[44px] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All ASAP Prompts</option>
                {ASAP_PROMPTS.map((p) => (
                  <option key={p.set} value={String(p.set)}>
                    P{p.set}: {p.title.split(':')[1]?.trim() || p.title} ({p.rubric})
                  </option>
                ))}
              </select>
            </div>

            {/* Rubric Band Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Band:
              </span>
              <select
                value={bandFilter}
                onChange={(e) => updateParams({ band: e.target.value, page: '1' })}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 min-h-[44px] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All Rubric Bands</option>
                <option value="HIGH">High Band</option>
                <option value="MID">Mid Band</option>
                <option value="LOW">Low Band</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Date:
              </span>
              <select
                value={dateRange}
                onChange={(e) => updateParams({ date: e.target.value, page: '1' })}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 min-h-[44px] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Last 24 Hours</option>
                <option value="7D">Past 7 Days</option>
                <option value="30D">Past 30 Days</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Reset Action */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 px-2.5 py-1 rounded-md border border-primary-200 dark:border-primary-500/20">
                <Filter className="w-3 h-3" />
                <span>{activeFiltersCount} active {activeFiltersCount === 1 ? 'filter' : 'filters'}</span>
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors font-medium underline underline-offset-2"
              >
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Table / Skeletons / Empty / Error */}
      {isLoading ? (
        <EssayTableSkeleton />
      ) : error && essays.length === 0 ? (
        <ErrorState
          error={error}
          onRetry={() => fetchEssays(true)}
          onHome={() => navigate('/')}
          homeLabel="Dashboard"
        />
      ) : essays.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-primary-400" />}
          title="No essays yet — submit your first"
          description="Submit a student essay to evaluate automated holistic scores, rubric progression, and multi-dimensional diagnostics."
          action={{
            label: "Submit Your First Essay",
            onClick: () => navigate('/submit'),
          }}
        />
      ) : sortedEssays.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-slate-400" />}
          title="No matching essays found"
          description={
            searchQuery
              ? `No essay records match "${searchQuery}". Try adjusting your keywords or clearing active filters.`
              : 'There are currently no essays matching your selected status, prompt, band, or date filters.'
          }
          action={{
            label: "Clear All Filters",
            onClick: resetFilters,
          }}
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (hidden on small mobile screens) */}
          <div className="hidden md:block">
            <Table striped>
              <TableHeader>
                <TableRow hoverable={false}>
                  {/* Select All Checkbox */}
                  <TableHead className="w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      title={isAllCurrentPageSelected ? 'Deselect all' : 'Select all on page'}
                    >
                      {isAllCurrentPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      ) : isSomeCurrentPageSelected ? (
                        <MinusSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>

                  <TableHead>{renderSortHeader('Prompt', 'prompt')}</TableHead>
                  <TableHead>{renderSortHeader('Status', 'status')}</TableHead>
                  <TableHead>{renderSortHeader('Score', 'score')}</TableHead>
                  <TableHead>{renderSortHeader('Band', 'band')}</TableHead>
                  <TableHead>{renderSortHeader('Submitted Date', 'created_at')}</TableHead>
                  <TableHead>{renderSortHeader('Submitter', 'submitter')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedEssays.map((essay) => {
                  const isSelected = selectedIds.includes(essay.id);
                  const promptInfo =
                    (essay.asap_set_id && promptMap.get(essay.asap_set_id)) || null;

                  return (
                    <TableRow
                      key={essay.id}
                      onClick={() => navigate(`/essays/${essay.id}`)}
                      className={`cursor-pointer group ${
                        isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20 border-l-2 border-primary-500' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="text-center"
                        onClick={(e) => toggleSelectOne(essay.id, e)}
                      >
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>

                      {/* Prompt */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-primary-600 dark:text-primary-400 shrink-0">
                            P{essay.asap_set_id || '?'}
                          </span>
                          <div className="flex flex-col min-w-0 max-w-xs">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {essay.prompt_title || promptInfo?.title || `Prompt ${essay.prompt_id.substring(0, 8)}`}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              Rubric: {promptInfo?.rubric || `[${essay.rubric_min ?? 0} – ${essay.rubric_max ?? 12}]`}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status Chip */}
                      <TableCell>{renderStatusBadge(essay.status)}</TableCell>

                      {/* Score */}
                      <TableCell>
                        {essay.reviewer_override_score != null ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                              {essay.reviewer_override_score.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              (AI: {essay.holistic_score?.toFixed(2) ?? '—'})
                            </span>
                          </div>
                        ) : essay.holistic_score != null ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {essay.holistic_score.toFixed(2)}
                            </span>
                            {essay.confidence != null && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {(essay.confidence * 100).toFixed(0)}% conf
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Pending</span>
                        )}
                      </TableCell>

                      {/* Rubric Band */}
                      <TableCell>{renderBandBadge(essay.rubric_band)}</TableCell>

                      {/* Submitted Date */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-800 dark:text-slate-200">
                            {new Date(essay.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(essay.created_at).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Submitter */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {(essay.submitter_email?.[0] || 'S').toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                            {essay.submitter_email || 'student@aes.local'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Row Hover Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Copy ID */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(essay.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Copy Essay ID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Score if submitted/failed */}
                          {(essay.status === 'SUBMITTED' ||
                            essay.status === 'FAILED' ||
                            essay.status === 'PROCESSING_FAILED') && (
                            <Button
                              size="xs"
                              variant="primary"
                              leftIcon={<Sparkles className="w-3 h-3 text-amber-300" />}
                              onClick={(e) => handleQuickScore(essay.id, e)}
                              className="text-[11px] py-1 px-2"
                            >
                              Score
                            </Button>
                          )}

                          {/* Inspect Score Workspace */}
                          <Button
                            size="xs"
                            variant="secondary"
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/essays/${essay.id}`);
                            }}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Inspect
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE CARDS VIEW (visible only on small screens) */}
          <div className="block md:hidden space-y-3.5">
            {paginatedEssays.map((essay) => {
              const isSelected = selectedIds.includes(essay.id);
              const promptInfo =
                (essay.asap_set_id && promptMap.get(essay.asap_set_id)) || null;

              return (
                <Card
                  key={essay.id}
                  onClick={() => navigate(`/essays/${essay.id}`)}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-950/20' : ''
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top Header Row: Checkbox, ID, Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectOne(essay.id, e)}
                          aria-label={`Select essay ${essay.id.substring(0, 8)}`}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                          #{essay.id.substring(0, 8)}...
                        </span>
                      </div>
                      <div>{renderStatusBadge(essay.status)}</div>
                    </div>

                    {/* Prompt Title */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-primary-600 dark:text-primary-400">
                          P{essay.asap_set_id || '?'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {essay.prompt_title || promptInfo?.title || `Prompt ${essay.prompt_id.substring(0, 8)}`}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Rubric Scale: {promptInfo?.rubric || `[${essay.rubric_min ?? 0} – ${essay.rubric_max ?? 12}]`}
                      </p>
                    </div>

                    {/* Score & Rubric Band */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                          Holistic Score
                        </span>
                        <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                          {essay.reviewer_override_score != null ? (
                            <span className="text-purple-600 dark:text-purple-400">
                              {essay.reviewer_override_score.toFixed(2)}{' '}
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                                (AI: {essay.holistic_score?.toFixed(2)})
                              </span>
                            </span>
                          ) : essay.holistic_score != null ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {essay.holistic_score.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500">Pending</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                          Rubric Band
                        </span>
                        <div>{renderBandBadge(essay.rubric_band)}</div>
                      </div>
                    </div>

                    {/* Submitter & Date Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                        <User className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{essay.submitter_email || 'student@aes.local'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{new Date(essay.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons (min-h-[44px] touch target) */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                      {(essay.status === 'SUBMITTED' ||
                        essay.status === 'FAILED' ||
                        essay.status === 'PROCESSING_FAILED') && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          onClick={(e) => handleQuickScore(essay.id, e)}
                          className="flex-1 min-h-[44px]"
                        >
                          Score Now
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/essays/${essay.id}`);
                        }}
                        className="flex-1 min-h-[44px]"
                      >
                        Inspect Workspace
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{totalItems === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{totalItems}</strong> essays
              </span>

              <span className="text-slate-400 dark:text-slate-600">&bull;</span>

              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => updateParams({ pageSize: e.target.value, page: '1' })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {/* Pagination Navigation */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => updateParams({ page: String(safeCurrentPage - 1) })}
                className="min-h-[44px]"
              >
                Previous
              </Button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and current +/- 1
                    return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400 dark:text-slate-600">...</span>}
                        <button
                          type="button"
                          onClick={() => updateParams({ page: String(p) })}
                          className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition ${
                            safeCurrentPage === p
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => updateParams({ page: String(safeCurrentPage + 1) })}
                className="min-h-[44px]"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Floating Bulk Actions Bar (Docked at bottom when 1+ selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-primary-500/40 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {selectedIds.length === 1 ? 'essay selected' : 'essays selected'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="primary"
              leftIcon={<Sparkles className={`w-3.5 h-3.5 ${isBatchScoring ? 'animate-spin' : ''}`} />}
              disabled={isBatchScoring}
              onClick={handleBatchScore}
            >
              {isBatchScoring ? 'Scoring...' : 'Batch Score'}
            </Button>

            <Button
              size="xs"
              variant="secondary"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => handleExportData('csv')}
            >
              Export CSV
            </Button>

            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
