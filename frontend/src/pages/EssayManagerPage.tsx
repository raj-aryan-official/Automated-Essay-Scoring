import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dispatchScoring, getEssays, getPrompts, EssayListItem, Prompt } from '../api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  EssayTableSkeleton,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatApiError,
  useToast,
} from '../components/ui';
import {
  ArrowRight,
  Calendar,
  Download,
  FileText,
  ListChecks,
  Loader2,
  PenTool,
  Play,
  RefreshCw,
  Search,
  Square,
  CheckSquare,
  User,
  X,
} from 'lucide-react';

const PAGE_SIZES = [10, 25, 50];

const STATUS_OPTIONS = [
  'ALL',
  'SUBMITTED',
  'QUEUED',
  'PROCESSING',
  'SCORED',
  'UNDER_REVIEW',
  'FINALIZED',
  'PROCESSING_FAILED',
];

const statusBadge = (status: string) => {
  switch (status) {
    case 'SCORED':
      return <Badge variant="success" size="sm" withDot>SCORED</Badge>;
    case 'FINALIZED':
      return <Badge variant="primary" size="sm" withDot>FINALIZED</Badge>;
    case 'UNDER_REVIEW':
      return <Badge variant="warning" size="sm" withDot>UNDER REVIEW</Badge>;
    case 'PROCESSING':
      return <Badge variant="info" size="sm" withDot>PROCESSING</Badge>;
    case 'QUEUED':
      return <Badge variant="warning" size="sm" withDot>QUEUED</Badge>;
    case 'PROCESSING_FAILED':
      return <Badge variant="danger" size="sm" withDot>FAILED</Badge>;
    default:
      return <Badge variant="default" size="sm" withDot>{status.replace('_', ' ')}</Badge>;
  }
};

const bandBadge = (band?: string | null) => {
  if (!band) return <span className="text-tertiary font-mono text-xs">—</span>;
  const upper = band.toUpperCase();
  if (upper.includes('HIGH')) return <Badge variant="score-high" size="sm">High</Badge>;
  if (upper.includes('MID')) return <Badge variant="score-mid" size="sm">Mid</Badge>;
  if (upper.includes('LOW')) return <Badge variant="score-low" size="sm">Low</Badge>;
  return <Badge variant="outline" size="sm">{band}</Badge>;
};

export const EssayManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canScore = user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const canSubmit = canScore;

  const searchQuery = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const promptFilter = searchParams.get('prompt') ?? 'ALL';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const pageSize = PAGE_SIZES.includes(parseInt(searchParams.get('pageSize') ?? '10', 10))
    ? parseInt(searchParams.get('pageSize') ?? '10', 10)
    : 10;

  const [essays, setEssays] = useState<EssayListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchScoring, setIsBatchScoring] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'ALL') next.delete(key);
        else next.set(key, value);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      updateParams({ q: debouncedSearch || null, page: '1' });
    }
  }, [debouncedSearch, searchQuery, updateParams]);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    getPrompts()
      .then(setPrompts)
      .catch(() => setPrompts([]));
  }, []);

  const fetchEssays = useCallback(
    async (announce = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEssays({
          page: currentPage,
          page_size: pageSize,
          q: searchQuery || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          prompt_id: promptFilter !== 'ALL' ? promptFilter : undefined,
        });
        setEssays(data.items);
        setTotal(data.total);
        if (announce) {
          toast.success('Essay list refreshed', `Loaded ${data.items.length} of ${data.total} essays.`);
        }
      } catch (err) {
        setError(err);
        setEssays([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, pageSize, searchQuery, statusFilter, promptFilter, toast]
  );

  useEffect(() => {
    fetchEssays(false);
  }, [fetchEssays]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, pageSize, searchQuery, statusFilter, promptFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  const isAllSelected = essays.length > 0 && essays.every((e) => selectedIds.includes(e.id));
  const isSomeSelected = essays.some((e) => selectedIds.includes(e.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : essays.map((e) => e.id));
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canDispatch = (essay: EssayListItem) =>
    essay.status === 'SUBMITTED' || essay.status === 'PROCESSING_FAILED';

  const handleQuickScore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dispatchScoring(id);
      toast.success('Scoring queued', `Job dispatched for essay #${id.slice(0, 8)}.`);
      fetchEssays(false);
    } catch (err) {
      const fmt = formatApiError(err);
      toast.error(fmt.title, fmt.message);
    }
  };

  const handleBatchScore = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchScoring(true);
    let succeeded = 0;
    const failures: string[] = [];
    for (const id of selectedIds) {
      try {
        await dispatchScoring(id);
        succeeded += 1;
      } catch (err) {
        failures.push(`#${id.slice(0, 8)}: ${formatApiError(err).message}`);
      }
    }
    setIsBatchScoring(false);
    if (succeeded > 0) {
      toast.success(
        'Batch scoring dispatched',
        `${succeeded} job(s) queued${failures.length ? `, ${failures.length} skipped` : ''}.`
      );
      setSelectedIds([]);
      fetchEssays(false);
    } else {
      toast.error('Batch scoring failed', failures[0] ?? 'No essays could be scored.');
    }
  };

  const handleExportData = (format: 'csv' | 'json') => {
    const target = selectedIds.length > 0 ? essays.filter((e) => selectedIds.includes(e.id)) : essays;
    if (target.length === 0) {
      toast.info('Nothing to export', 'Load at least one essay first.');
      return;
    }

    const filename = `aes-essays-${new Date().toISOString().slice(0, 10)}`;
    let blob: Blob;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json' });
    } else {
      const headers = ['Essay ID', 'Prompt', 'Status', 'Score', 'Rubric Band', 'Submitter', 'Submitted'];
      const rows = target.map((e) => [
        e.id,
        e.prompt_title ?? `Prompt ${e.asap_set_id ?? e.prompt_id}`,
        e.status,
        e.reviewer_override_score ?? e.holistic_score ?? 'Pending',
        e.rubric_band ?? '',
        e.submitter_email ?? '',
        new Date(e.created_at).toISOString(),
      ]);
      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${target.length} essay(s)`, `${format.toUpperCase()} file downloaded.`);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count += 1;
    if (statusFilter !== 'ALL') count += 1;
    if (promptFilter !== 'ALL') count += 1;
    return count;
  }, [searchQuery, statusFilter, promptFilter]);

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const pageNumbers = useMemo(() => {
    const pages: Array<number | 'ellipsis'> = [];
    for (let p = 1; p <= totalPages; p += 1) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pages.push(p);
      else if (pages[pages.length - 1] !== 'ellipsis') pages.push('ellipsis');
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6 pb-28">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-base pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-semibold text-heading tracking-tight">Essay Manager</h1>
            <Badge variant="outline" size="sm" className="font-mono">{total}</Badge>
          </div>
          <p className="text-sm text-muted mt-1">
            Browse submissions, filter by status or prompt, and open an essay's score workspace.
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
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => handleExportData('csv')}>
            Export
          </Button>
          {canSubmit && (
            <Button variant="primary" size="sm" leftIcon={<PenTool className="w-3.5 h-3.5" />} onClick={() => navigate('/submit')}>
              Submit Essay
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-3 rounded-xl border border-base bg-surface-level p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Input
              id="essay-search-input"
              placeholder="Search by ID, prompt, submitter, status or text…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-tertiary" />}
              rightIcon={
                searchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateParams({ q: null, page: '1' });
                    }}
                    className="text-tertiary hover:text-heading"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateParams({ status, page: '1' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border
                  ${statusFilter === status
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-muted border-base hover:text-heading'}`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-faint pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider">Prompt</span>
            <select
              value={promptFilter}
              onChange={(e) => updateParams({ prompt: e.target.value, page: '1' })}
              className="bg-surface border border-base rounded-lg px-2.5 py-2 text-xs text-body focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All prompts</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  P{prompt.asap_set_id}: {prompt.title}
                </option>
              ))}
            </select>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-muted hover:text-danger-600 underline underline-offset-2"
            >
              Reset {activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <EssayTableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => fetchEssays(true)} onHome={() => navigate('/dashboard')} />
      ) : total === 0 && activeFiltersCount > 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8 text-tertiary" />}
          title="No matching essays"
          description="No essays match the current search and filters."
          action={{ label: 'Clear filters', onClick: resetFilters }}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-tertiary" />}
          title="No essays yet"
          description={
            canSubmit
              ? 'Submit an essay to see automated scores and feedback here.'
              : 'Essays will appear here once a teacher submits them.'
          }
          action={canSubmit ? { label: 'Submit an essay', onClick: () => navigate('/submit') } : undefined}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table striped>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead className="w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-tertiary hover:text-heading"
                      aria-label={isAllSelected ? 'Deselect all' : 'Select all on page'}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : isSomeSelected ? <CheckSquare className="w-4 h-4 text-primary opacity-60" /> : <Square className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead>Essay</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {essays.map((essay) => {
                  const isSelected = selectedIds.includes(essay.id);
                  return (
                    <TableRow
                      key={essay.id}
                      onClick={() => navigate(`/essays/${essay.id}`)}
                      className={`cursor-pointer ${isSelected ? 'bg-primary-50/60' : ''}`}
                    >
                      <TableCell className="text-center" onClick={(e) => toggleSelectOne(essay.id, e)}>
                        <button type="button" className="text-tertiary hover:text-heading" aria-label="Select essay">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-heading">#{essay.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col min-w-0 max-w-xs">
                          <span className="text-xs font-semibold text-heading truncate">
                            {essay.prompt_title ?? `Prompt ${essay.prompt_id.slice(0, 8)}`}
                          </span>
                          <span className="text-[11px] text-muted font-mono">
                            {essay.asap_set_id ? `P${essay.asap_set_id}` : '—'}
                            {essay.rubric_min != null && essay.rubric_max != null
                              ? ` · ${essay.rubric_min}–${essay.rubric_max}`
                              : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(essay.status)}</TableCell>
                      <TableCell>
                        {essay.reviewer_override_score != null ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-heading">{essay.reviewer_override_score.toFixed(2)}</span>
                            <span className="text-[10px] text-muted font-mono">Automated: {essay.holistic_score?.toFixed(2) ?? '—'}</span>
                          </div>
                        ) : essay.holistic_score != null ? (
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-heading">{essay.holistic_score.toFixed(2)}</span>
                            {essay.confidence != null && (
                              <span className="text-[10px] text-muted font-mono">{(essay.confidence * 100).toFixed(0)}% conf</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-tertiary font-mono">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-body">
                        {new Date(essay.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-xs text-body truncate max-w-[160px]">
                        {essay.submitter_email ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canScore && canDispatch(essay) && (
                            <Button
                              size="xs"
                              variant="primary"
                              leftIcon={<Play className="w-3 h-3" />}
                              onClick={(e) => handleQuickScore(essay.id, e)}
                            >
                              Score
                            </Button>
                          )}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="block md:hidden space-y-3.5">
            {essays.map((essay) => {
              const isSelected = selectedIds.includes(essay.id);
              return (
                <Card
                  key={essay.id}
                  onClick={() => navigate(`/essays/${essay.id}`)}
                  className={`cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-faint pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectOne(essay.id, e)}
                          aria-label="Select essay"
                          className="text-tertiary hover:text-heading min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                        </button>
                        <span className="font-mono text-xs font-semibold text-primary">#{essay.id.slice(0, 8)}</span>
                      </div>
                      {statusBadge(essay.status)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-surface-level border border-base text-[10px] font-mono font-bold text-muted">
                          P{essay.asap_set_id ?? '?'}
                        </span>
                        <h3 className="text-xs font-bold text-heading leading-tight truncate">
                          {essay.prompt_title ?? `Prompt ${essay.prompt_id.slice(0, 8)}`}
                        </h3>
                      </div>
                      {essay.rubric_min != null && essay.rubric_max != null && (
                        <p className="text-[11px] text-muted font-mono">Rubric scale: {essay.rubric_min}–{essay.rubric_max}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-level border border-faint">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-tertiary tracking-wider">Holistic score</span>
                        <div className="font-mono font-black text-base text-heading">
                          {essay.reviewer_override_score != null
                            ? essay.reviewer_override_score.toFixed(2)
                            : essay.holistic_score != null
                            ? essay.holistic_score.toFixed(2)
                            : <span className="text-xs text-tertiary">Pending</span>}
                        </div>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <span className="text-[10px] uppercase font-bold text-tertiary tracking-wider block">Band</span>
                        {bandBadge(essay.rubric_band)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{essay.submitter_email ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(essay.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-faint">
                      {canScore && canDispatch(essay) && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Play className="w-3.5 h-3.5" />}
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
                        Inspect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-base text-xs text-muted">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Showing <strong className="text-heading">{startIndex}</strong>–<strong className="text-heading">{endIndex}</strong> of{' '}
                <strong className="text-heading">{total}</strong>
              </span>
              <span className="text-tertiary">•</span>
              <label className="flex items-center gap-1.5">
                <span>Per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => updateParams({ pageSize: e.target.value, page: '1' })}
                  className="bg-surface border border-base rounded px-1.5 py-0.5 text-xs text-body"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ page: String(currentPage - 1) })}
              >
                Previous
              </Button>
              {pageNumbers.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1 text-tertiary">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateParams({ page: String(p) })}
                    className={`min-w-[36px] h-9 flex items-center justify-center rounded-lg text-xs font-semibold border
                      ${currentPage === p ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-base hover:text-heading'}`}
                  >
                    {p}
                  </button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => updateParams({ page: String(currentPage + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selectedIds.length > 0 && canScore && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface border border-primary rounded-xl px-5 py-3 shadow-lg flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-heading">
              {selectedIds.length === 1 ? 'essay selected' : 'essays selected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="primary"
              leftIcon={
                isBatchScoring ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ListChecks className="w-3.5 h-3.5" />
                )
              }
              disabled={isBatchScoring}
              onClick={handleBatchScore}
            >
              {isBatchScoring ? 'Scoring…' : 'Batch Score'}
            </Button>
            <Button size="xs" variant="secondary" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => handleExportData('csv')}>
              Export
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EssayManagerPage;
