import React from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  Slider,
  Toggle,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  Drawer,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  Tooltip,
  useToast,
  Skeleton,
  EmptyState,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ScoreWorkspaceSkeleton,
  DashboardSkeleton,
  EssayTableSkeleton,
  ModelEvaluationSkeleton,
  ErrorState,
  ContextHelp,
} from '../components/ui';
import { useTour } from '../context/TourContext';
import {
  Search,
  Sparkles,
  ArrowRight,
  FileText,
  BarChart3,
  AlertTriangle,
  Layers,
  Settings,
  HelpCircle,
  PenTool,
  ShieldCheck,
  Activity,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Info,
  ArrowUpDown,
  CheckSquare,
  Square,
  Download,
  Copy,
} from 'lucide-react';
import {
  ScoreCard,
  AnnotatedEssayReader,
  ReviewerOverridePanel,
  ScoringJobProgress,
  FailedJobView,
} from '../features/scoring';
import { DimensionRadarChart, DimensionCard } from '../features/feedback';
import {
  KpiCard,
  PerPromptQwkChart,
  ScoreBandDriftChart,
  LossCurvesChart,
  JobStatusDonutChart,
} from '../features/analytics';
import { useReducedMotion, useCountUp } from '../hooks';

export const DevComponentsPage: React.FC = () => {
  const toast = useToast();
  const { openTour } = useTour();

  const [sliderVal, setSliderVal] = React.useState<number>(85);
  const [toggleChecked, setToggleChecked] = React.useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [drawerPosition, setDrawerPosition] = React.useState<'right' | 'left' | 'bottom'>('right');
  const [buttonLoading, setButtonLoading] = React.useState<boolean>(false);
  const [demoHighlights, setDemoHighlights] = React.useState<boolean>(true);
  const [selectedSpanId, setSelectedSpanId] = React.useState<string | null>(null);
  const [showEmptySpans, setShowEmptySpans] = React.useState<boolean>(false);

  // Motion & Microinteraction demo states (Prompt 18)
  const prefersReducedMotion = useReducedMotion();
  const [demoCountScore, setDemoCountScore] = React.useState<number>(9.5);
  const animatedDemoScore = useCountUp(demoCountScore, 2.0, 300);
  const [demoAccordionExpanded, setDemoAccordionExpanded] = React.useState<boolean>(false);

  // Section 15: Async-Job UX states (Prompt 11)
  const [stepperElapsed, setStepperElapsed] = React.useState<number>(4);
  const [stepperStatus, setStepperStatus] = React.useState<string>('PROCESSING');
  const [selectedSkeletonTab, setSelectedSkeletonTab] = React.useState<
    'WORKSPACE' | 'DASHBOARD' | 'TABLE' | 'EVALUATION'
  >('WORKSPACE');

  // Section 16: Error, Empty, and Edge-Case states (Prompt 12)
  const [simulatedErrorCode, setSimulatedErrorCode] = React.useState<
    '401' | '403' | '404' | '413' | '422' | '500' | 'NETWORK'
  >('404');
  const [simulatedJobErrorKey, setSimulatedJobErrorKey] = React.useState<
    'timeout' | 'token_overflow' | 'pdf_corrupt' | 'cuda_oom'
  >('timeout');

  // Section 17: Essay Manager List & Search states (Prompt 13)
  const [demoSelectedIds, setDemoSelectedIds] = React.useState<string[]>(['demo-1']);
  const [demoSortField, setDemoSortField] = React.useState<'created_at' | 'prompt' | 'score' | 'band' | 'status'>('created_at');
  const [demoSortOrder, setDemoSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [demoStatusFilter, setDemoStatusFilter] = React.useState<string>('ALL');
  const [demoViewMode, setDemoViewMode] = React.useState<'table' | 'mobile-cards'>('table');

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Design System Component Showcase
            </h1>
            <Badge variant="primary" size="md">
              /dev/components
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Typed, accessible, token-driven component library with dark-mode contrast guarantees.
          </p>
        </div>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            1. Buttons &amp; Loading States
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Variants</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">Destructive Action</Button>
                <Button disabled>Disabled Button</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small (xs)</Button>
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Icons &amp; Async Loading
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button leftIcon={<Sparkles className="w-4 h-4" />}>
                  AI Score Analysis
                </Button>
                <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Next Dimension
                </Button>
                <Button
                  variant="primary"
                  isLoading={buttonLoading}
                  loadingText="Evaluating..."
                  onClick={() => {
                    setButtonLoading(true);
                    setTimeout(() => setButtonLoading(false), 2000);
                  }}
                >
                  Click to Test Loading
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <span>All buttons feature accessible :focus-visible rings and disabled pointer protection.</span>
            <span className="font-mono text-[11px] text-slate-500">Button.tsx</span>
          </CardFooter>
        </Card>
      </section>

      {/* 2. Badges & Score Bands */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Settings className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            2. Badges &amp; Strict Score-Band Semantics
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Strict Rubric Score Bands (Low = Red, Mid = Amber, High = Green)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="score-low" size="lg" withDot>
                  Score Band: Low (0.00 – 4.00)
                </Badge>
                <Badge variant="score-mid" size="lg" withDot>
                  Score Band: Mid (4.01 – 8.00)
                </Badge>
                <Badge variant="score-high" size="lg" withDot>
                  Score Band: High (8.01 – 12.00)
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Status Badges</p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="primary" withDot>
                  Primary
                </Badge>
                <Badge variant="success" withDot>
                  Finalized
                </Badge>
                <Badge variant="warning" withDot>
                  Under Review
                </Badge>
                <Badge variant="danger" withDot>
                  Processing Failed
                </Badge>
                <Badge variant="info" withDot>
                  Inference Queued
                </Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Form Inputs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <FileText className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            3. Form Inputs &amp; Controls
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Standard Text Input"
              placeholder="e.g. Student Name or Essay Title"
              helperText="Helper text guiding input constraints"
            />

            <Input
              label="Input with Left Icon &amp; Required"
              required
              placeholder="Search prompt sets..."
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Input
              label="Validation Error State"
              defaultValue="invalid-email"
              error="Please enter a valid academic institutional email address."
            />

            <Select
              label="Select Dropdown"
              placeholder="Select an ASAP Prompt set..."
              options={[
                { value: '1', label: 'Prompt 1: Persuasive Letter (Score 2–12)' },
                { value: '2', label: 'Prompt 2: Censorship Argument (Score 1–6)' },
                { value: '3', label: 'Prompt 3: Rough Road Ahead (Score 0–3)' },
              ]}
              helperText="Calibrates rubric boundaries for model inference"
            />

            <div className="md:col-span-2">
              <Textarea
                label="Essay Prose Textarea with Live Character Counter"
                placeholder="Type or paste essay text here..."
                rows={4}
                showCount
                maxCharacters={500}
                defaultValue="More computers should be in schools because technology prepares students for future careers and enhances classroom collaboration."
                helperText="Minimum 50 words recommended for accurate AES scoring."
              />
            </div>

            <div className="space-y-4">
              <Slider
                label="Confidence Threshold"
                min={50}
                max={100}
                step={5}
                value={sliderVal}
                onChange={setSliderVal}
                formatValue={(v) => `${v}%`}
                ticks={[
                  { value: 50, label: '50%' },
                  { value: 75, label: '75%' },
                  { value: 85, label: '85%' },
                  { value: 100, label: '100%' },
                ]}
                helperText="Highlights low-certainty sentences below threshold"
              />
            </div>

            <div className="space-y-4 flex flex-col justify-center">
              <Toggle
                checked={toggleChecked}
                onChange={setToggleChecked}
                label="Auto-Dispatch Inference"
                description="Immediately submit essay to Celery background worker queue upon upload"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Interactive Overlays: Modal, Drawer, Tooltips & Toasts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Sparkles className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            4. Overlays: Modals, Drawers, Tooltips &amp; Toasts
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => setIsModalOpen(true)}>Open Modal Dialog</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerPosition('right');
                  setIsDrawerOpen(true);
                }}
              >
                Open Right Drawer
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDrawerPosition('bottom');
                  setIsDrawerOpen(true);
                }}
              >
                Open Bottom Sheet
              </Button>

              <Tooltip content="Quadratic Weighted Kappa benchmark metric" position="top">
                <Button variant="ghost" leftIcon={<HelpCircle className="w-4 h-4 text-sky-400" />}>
                  Hover for Tooltip
                </Button>
              </Tooltip>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Toast Notifications
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success('Score Finalized', 'Human override saved to database audit log.')}
                >
                  Success Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.error('Inference Timeout', 'Celery worker exceeded 30s threshold.')}
                >
                  Error Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.warning('Low Model Confidence', 'Score certainty is 68% (threshold: 80%).')}
                >
                  Warning Toast
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('Prompt Switched', 'Rubric bounds calibrated to Prompt 3 (0–3 scale).')}
                >
                  Info Toast
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal Instance */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Confirm Teacher Score Override"
          description="Are you sure you want to commit this override? This will update the official student record."
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  toast.success('Override Committed', 'Student score updated to 10.5 / 12.0');
                }}
              >
                Confirm Override
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              You are overriding the automated BERT score of <strong className="text-amber-500 dark:text-amber-400 font-mono">9.42</strong> to <strong className="text-emerald-500 dark:text-emerald-400 font-mono">10.50</strong> with reason <span className="italic">&quot;Strong thesis cohesion overlooked by grammar penalty&quot;</span>.
            </p>
          </div>
        </Modal>

        {/* Drawer Instance */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          position={drawerPosition}
          title="Dimension Feedback Inspector"
          description="Granular evaluation across linguistic dimensions"
          footer={
            <Button size="sm" onClick={() => setIsDrawerOpen(false)}>
              Done Reviewing
            </Button>
          }
        >
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-white">Grammar &amp; Mechanics</span>
                <Badge variant="score-mid" size="sm">
                  Subscore: 3.2 / 4.0
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Minor subject-verb agreement issues detected in paragraph 2.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 dark:text-white">Coherence &amp; Structure</span>
                <Badge variant="score-high" size="sm">
                  Subscore: 3.8 / 4.0
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Strong transitional phrases connect main argumentation points seamlessly.
              </p>
            </div>
          </div>
        </Drawer>
      </section>

      {/* 5. Navigation Tabs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            5. Tabs Component
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <Tabs defaultValue="overview" variant="pills">
              <TabList ariaLabel="Demonstration Tabs">
                <TabTrigger value="overview">Overview</TabTrigger>
                <TabTrigger value="feedback">Dimension Feedback</TabTrigger>
                <TabTrigger value="telemetry">Model Telemetry</TabTrigger>
              </TabList>

              <TabContent value="overview" className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                Holistic score analysis and prompt rubric overview tab content.
              </TabContent>
              <TabContent value="feedback" className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                Detailed linguistic error breakdowns and pedagogical recommendations.
              </TabContent>
              <TabContent value="telemetry" className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                Quadratic Weighted Kappa (QWK), loss curves, and worker latency metrics.
              </TabContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* 6. Skeletons, Spinners & Empty State */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <AlertTriangle className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            6. Skeletons, Spinners &amp; Empty State
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Skeleton Loaders &amp; Spinners</CardTitle>
              <CardDescription>Visual placeholders preventing layout shift</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Spinner size="sm" variant="primary" />
                <Spinner size="md" variant="success" />
                <Spinner size="lg" variant="warning" />
                <Spinner size="xl" variant="danger" />
              </div>

              <div className="space-y-2 pt-2">
                <Skeleton height={20} className="w-3/4" />
                <Skeleton height={14} className="w-full" />
                <Skeleton height={14} className="w-5/6" />
                <div className="flex items-center gap-3 pt-2">
                  <Skeleton circle width={36} height={36} />
                  <div className="space-y-1 flex-1">
                    <Skeleton height={12} className="w-1/3" />
                    <Skeleton height={10} className="w-1/2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            icon={<FileText className="w-6 h-6" />}
            title="No Essay Submissions Yet"
            description="Get started by submitting student prose for automated rubric assessment and granular feedback."
            actionLabel="Submit First Essay"
            onAction={() => toast.info('Navigate to Submit Essay')}
            secondaryActionLabel="Load Sample Corpus"
            onSecondaryAction={() => toast.info('Loading synthetic essays')}
          />
        </div>
      </section>

      {/* 7. Data Tables */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            7. Data Table
          </h2>
        </div>

        <Table striped>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Essay ID</TableHead>
              <TableHead>Prompt</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Rubric Band</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-xs text-primary-600 dark:text-primary-400 font-semibold">
                #essay-9412
              </TableCell>
              <TableCell>Prompt 1: Persuasive Letter</TableCell>
              <TableCell className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                10.42 / 12.0
              </TableCell>
              <TableCell>
                <Badge variant="score-high" size="sm" withDot>
                  High Band
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="success" size="sm">
                  SCORED
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="xs" variant="secondary">
                  Inspect
                </Button>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-mono text-xs text-primary-600 dark:text-primary-400 font-semibold">
                #essay-9413
              </TableCell>
              <TableCell>Prompt 2: Censorship Argument</TableCell>
              <TableCell className="font-mono font-bold text-amber-600 dark:text-amber-400">
                3.20 / 6.0
              </TableCell>
              <TableCell>
                <Badge variant="score-mid" size="sm" withDot>
                  Mid Band
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="warning" size="sm">
                  UNDER REVIEW
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="xs" variant="secondary">
                  Inspect
                </Button>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-mono text-xs text-primary-600 dark:text-primary-400 font-semibold">
                #essay-9414
              </TableCell>
              <TableCell>Prompt 3: Rough Road Ahead</TableCell>
              <TableCell className="font-mono font-bold text-rose-600 dark:text-rose-400">
                0.80 / 3.0
              </TableCell>
              <TableCell>
                <Badge variant="score-low" size="sm" withDot>
                  Low Band
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="danger" size="sm">
                  LOW CONFIDENCE
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="xs" variant="secondary">
                  Inspect
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 11. ScoreCard Visualization (Prompt 7) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Sparkles className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            11. ScoreCard Visualization (Prompt 7)
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Features animated count-up, &quot;out of &#123;rubric_max&#125;&quot;, segmented rubric bands, confidence meter with plain-words tooltip, and dynamic low-confidence threshold alert.
        </p>

        <ScoreCard
          scoreData={{
            essayId: 'demo-essay-01',
            holisticScore: 9.85,
            rubricBand: 'Advanced',
            confidence: 0.94,
            rubricMin: 2.0,
            rubricMax: 12.0,
            modelVersion: '1.4.0',
            dimensions: [
              { dimension: 'grammar', score: 3.8, feedback: 'Strong syntax and punctuation.' },
              { dimension: 'coherence', score: 3.5, feedback: 'Smooth transitions between paragraphs.' },
              { dimension: 'argumentation', score: 3.9, feedback: 'Robust evidence and counterarguments.' },
            ],
          }}
          confidenceThreshold={0.80}
          isSticky={false}
        />
      </section>

      {/* 12. Dimension Feedback Panels & 3-Axis Radar (Prompt 8) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            12. Dimension Feedback Panels &amp; 3-Axis Radar (Prompt 8)
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Features 3-axis radar chart summarizing Grammar, Coherence, and Argumentation, alongside expandable dimension cards with radial gauges, one-line summaries, and severity chips.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <DimensionRadarChart
              dimensions={[
                { dimension: 'grammar', score: 9.2, feedback: 'Excellent syntax.' },
                { dimension: 'coherence', score: 8.4, feedback: 'Strong transitions.' },
                { dimension: 'argumentation', score: 10.1, feedback: 'Compelling evidence.' },
              ]}
              activeDimensions={{ grammar: true, coherence: true, argumentation: true }}
              rubricMin={2.0}
              rubricMax={12.0}
            />
          </div>

          <div className="space-y-3">
            <DimensionCard
              dimension={{
                dimension: 'grammar',
                score: 9.2,
                feedback: 'Exemplary command of sentence mechanics and accurate punctuation. Review 2 extended clauses exceeding 40 words to prevent run-on risks.',
              }}
              dimKey="grammar"
              isVisible={true}
              isExpanded={true}
              onToggleExpand={() => {}}
              rubricMin={2.0}
              rubricMax={12.0}
            />
          </div>
        </div>
      </section>

      {/* 13. Essay Text Highlighting & Span-Level Feedback (Prompt 9) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary-500 dark:text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              13. Essay Text Highlighting &amp; Span-Level Feedback (Prompt 9)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant={showEmptySpans ? 'primary' : 'secondary'}
              onClick={() => setShowEmptySpans(!showEmptySpans)}
            >
              {showEmptySpans ? 'Restore API Spans' : 'Test Graceful Degradation (0 Spans)'}
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Features inline highlighting with wavy underlines (Grammar), soft background (Coherence), and colored side markers (Argumentation). Hover for tooltips, click to inspect, master toggle, visual legend, and graceful zero-span degradation.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
          <AnnotatedEssayReader
            rawText={`Technology has irreversibly changed human communication over the past several decades. While proponents argue that handheld smartphones allow immediate connectivity worldwide, empirical evidence suggests that excessive screen time impairs interpersonal empathy.

Furthermore, society frequently overlooks the psychological toll on adolescent communities. In conclusion, striking a measured equilibrium between digital devices and face-to-face interaction remains imperative for community well-being.`}
            spans={
              showEmptySpans
                ? []
                : [
                    {
                      id: 'demo-span-grammar',
                      start: 114,
                      end: 147,
                      dimension: 'grammar',
                      feedback:
                        'Subject-verb agreement and tense consistency issue detected in clause.',
                      severity: 'high',
                      label: 'Grammar: Clause Syntax',
                    },
                    {
                      id: 'demo-span-coherence',
                      start: 247,
                      end: 258,
                      dimension: 'coherence',
                      feedback:
                        'Abrupt transition phrase. Consider using a contextual bridge rather than a formulaic transitional adverb.',
                      severity: 'moderate',
                      label: 'Coherence: Transitional Flow',
                    },
                    {
                      id: 'demo-span-argumentation',
                      start: 341,
                      end: 457,
                      dimension: 'argumentation',
                      feedback:
                        'Assertive claim lacks supporting empirical citation or qualitative case example.',
                      severity: 'moderate',
                      label: 'Argumentation: Warrant & Evidence',
                    },
                  ]
            }
            activeDimensions={{ grammar: true, coherence: true, argumentation: true }}
            showHighlights={demoHighlights}
            onToggleHighlights={setDemoHighlights}
            selectedSpanId={selectedSpanId}
            onSelectSpan={(span) => {
              setSelectedSpanId(span.id || null);
              toast.info(
                `${span.dimension.toUpperCase()} Highlight Clicked`,
                `${span.feedback} (Severity: ${span.severity || 'Normal'})`
              );
            }}
          />
        </div>
      </section>

      {/* 14. Reviewer Override Panel & Pedagogical Audit Trail (Prompt 10) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <ShieldCheck className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            14. Reviewer Override Panel &amp; Pedagogical Audit Trail (Prompt 10)
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Features side-by-side AI vs Override delta indicator, bounded rubric range stepper &amp; slider, mandatory character minimum with quick-select chips, pre-commit confirmation modal, and chronological audit trail timeline.
        </p>

        <div className="max-w-xl mx-auto">
          <ReviewerOverridePanel
            essayId="demo-essay-audit-01"
            scoreData={{
              essayId: 'demo-essay-audit-01',
              holisticScore: 8.5,
              rubricBand: 'Competent',
              confidence: 0.88,
              rubricMin: 2.0,
              rubricMax: 12.0,
              modelVersion: '1.4.0',
              dimensions: [],
              reviewerOverrideScore: 10.5,
              reviewerOverrideReason:
                'Exceptional depth of synthesis and vocabulary in paragraphs 2 and 3 justifies a score adjustment.',
              reviewerOverrideAt: new Date().toISOString(),
            }}
            onReviewSubmitted={(updated) => {
              toast.success(
                'Override Applied',
                `Finalized score: ${updated.reviewerOverrideScore} / ${updated.rubricMax || 12}`
              );
            }}
          />
        </div>
      </section>

      {/* 15. Async-Job UX, Scoring Stepper & Layout Skeletons (Prompt 11) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Activity className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            15. Async-Job UX, Scoring Stepper &amp; Layout Skeletons (Prompt 11)
          </h2>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Features 5-step async scoring stepper (Queued &rarr; Processing &rarr; Scoring &rarr; Generating feedback &rarr; Done) driven by job state, elapsed time ticker, friendly step narratives, slow-job &quot;Still working…&quot; fallback with cancel/refresh, and layout-matching skeleton screens.
        </p>

        {/* Stepper Test Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Simulate Stepper Lifecycle Transitions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="xs"
                variant={stepperElapsed === 0 && stepperStatus === 'QUEUED' ? 'primary' : 'secondary'}
                onClick={() => {
                  setStepperStatus('QUEUED');
                  setStepperElapsed(0);
                }}
              >
                1. Queued
              </Button>
              <Button
                size="xs"
                variant={stepperElapsed === 2 && stepperStatus === 'PROCESSING' ? 'primary' : 'secondary'}
                onClick={() => {
                  setStepperStatus('PROCESSING');
                  setStepperElapsed(2);
                }}
              >
                2. Processing
              </Button>
              <Button
                size="xs"
                variant={stepperElapsed === 5 && stepperStatus === 'PROCESSING' ? 'primary' : 'secondary'}
                onClick={() => {
                  setStepperStatus('PROCESSING');
                  setStepperElapsed(5);
                }}
              >
                3. Scoring
              </Button>
              <Button
                size="xs"
                variant={stepperElapsed === 8 && stepperStatus === 'PROCESSING' ? 'primary' : 'secondary'}
                onClick={() => {
                  setStepperStatus('PROCESSING');
                  setStepperElapsed(8);
                }}
              >
                4. Feedback
              </Button>
              <Button
                size="xs"
                variant={stepperStatus === 'COMPLETED' ? 'primary' : 'secondary'}
                onClick={() => {
                  setStepperStatus('COMPLETED');
                  setStepperElapsed(11);
                }}
              >
                5. Done
              </Button>
              <Button
                size="xs"
                variant={stepperElapsed >= 12 && stepperStatus === 'PROCESSING' ? 'danger' : 'outline'}
                onClick={() => {
                  setStepperStatus('PROCESSING');
                  setStepperElapsed(14);
                }}
              >
                Simulate Slow Job (&gt;10s)
              </Button>
            </div>
          </div>

          <ScoringJobProgress
            jobId="demo-scoring-job-8491"
            jobStatus={stepperStatus}
            elapsedSeconds={stepperElapsed}
            attempts={1}
            maxAttempts={3}
            onCancel={() => {
              setStepperStatus('QUEUED');
              setStepperElapsed(0);
              toast.info('Job Cancelled', 'Async scoring job stopped by user.');
            }}
            onRefresh={() => {
              toast.success('Worker Polled', 'GET /jobs/demo-scoring-job returned status: ' + stepperStatus);
            }}
          />
        </div>

        {/* Layout Skeletons Showcase */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Layout-Matching Skeleton Screens (No generic spinners)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Skeletons match exact content layouts for Score Workspace, Dashboard, Tables, and Model Telemetry.
              </p>
            </div>

            {/* Skeleton Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedSkeletonTab('WORKSPACE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  selectedSkeletonTab === 'WORKSPACE'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Score Workspace
              </button>
              <button
                type="button"
                onClick={() => setSelectedSkeletonTab('DASHBOARD')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  selectedSkeletonTab === 'DASHBOARD'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setSelectedSkeletonTab('TABLE')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  selectedSkeletonTab === 'TABLE'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setSelectedSkeletonTab('EVALUATION')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  selectedSkeletonTab === 'EVALUATION'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Model Telemetry
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            {selectedSkeletonTab === 'WORKSPACE' && <ScoreWorkspaceSkeleton />}
            {selectedSkeletonTab === 'DASHBOARD' && <DashboardSkeleton />}
            {selectedSkeletonTab === 'TABLE' && <EssayTableSkeleton />}
            {selectedSkeletonTab === 'EVALUATION' && <ModelEvaluationSkeleton />}
          </div>
        </div>
      </section>

      {/* 16. Error, Empty, and Edge-Case States (Prompt 12) */}
      <section className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            16. Error, Empty, and Edge-Case States (Prompt 12)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Friendly HTTP error states (401/403/404/413/422/500/Network) with retry, empty states with clear CTAs, global error boundaries, toast notifications, and failed async job diagnostics.
        </p>

        {/* 16.A HTTP Error State Simulator */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                A. Friendly HTTP Status Error Simulator
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Transforms technical HTTP response codes into clear, polite explanations with category icons and recovery actions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              {(['401', '403', '404', '413', '422', '500', 'NETWORK'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSimulatedErrorCode(code)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    simulatedErrorCode === code
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {code === 'NETWORK' ? 'Network' : code}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <ErrorState
              error={
                simulatedErrorCode === '401'
                  ? { response: { status: 401, data: { detail: 'JWT authentication token has expired. Please sign in again.' } } }
                  : simulatedErrorCode === '403'
                  ? { response: { status: 403, data: { detail: 'Role VIEWER lacks permission to modify or override scores.' } } }
                  : simulatedErrorCode === '404'
                  ? { response: { status: 404, data: { detail: 'Essay #9412 could not be located in database records.' } } }
                  : simulatedErrorCode === '413'
                  ? { response: { status: 413, data: { detail: 'Uploaded PDF file exceeds maximum size limit of 20MB.' } } }
                  : simulatedErrorCode === '422'
                  ? {
                      response: {
                        status: 422,
                        data: {
                          detail: [
                            { loc: ['body', 'essay_text'], msg: 'Essay text exceeds maximum length of 8,000 characters (found 8,421)' },
                            { loc: ['body', 'prompt_id'], msg: 'Prompt ID 99 is invalid. ASAP dataset prompts must be between 1 and 8.' },
                          ],
                        },
                      },
                    }
                  : simulatedErrorCode === '500'
                  ? { response: { status: 500, data: { detail: 'PyTorch CUDA runtime error: out of GPU memory during batch tokenization.' } } }
                  : { code: 'ERR_NETWORK', message: 'Network Error: Gateway unreachable at http://localhost:8000.' }
              }
              onRetry={() => toast.info('Retry Triggered', `Re-attempting API request for HTTP ${simulatedErrorCode}`)}
              onBack={() => toast.info('Back Action', 'Navigating back to previous view')}
              onHome={() => toast.info('Home Action', 'Navigating to Dashboard')}
            />
          </div>
        </div>

        {/* 16.B Failed / Processing Failed Job View */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                B. Failed Inference Job Diagnostic View
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Explains Celery worker crashes, CUDA timeouts, and token limits in plain language with immediate retry options.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              {(['timeout', 'token_overflow', 'pdf_corrupt', 'cuda_oom'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSimulatedJobErrorKey(key)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition ${
                    simulatedJobErrorKey === key
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {key.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <FailedJobView
              essayId="essay-demo-failed-job"
              status={
                simulatedJobErrorKey === 'token_overflow'
                  ? 'PROCESSING_FAILED'
                  : 'FAILED'
              }
              errorMessage={
                simulatedJobErrorKey === 'timeout'
                  ? 'Celery worker task timed out after 120 seconds while computing BERT sequence embeddings.'
                  : simulatedJobErrorKey === 'token_overflow'
                  ? 'Essay text token length exceeds BERT maximum context limit of 512 subword tokens.'
                  : simulatedJobErrorKey === 'pdf_corrupt'
                  ? 'Unable to extract text stream from uploaded PDF document (corrupt xref table).'
                  : 'CUDA OOM error during model forward pass on worker node celery@aes-worker-1.'
              }
              onRetry={() => {
                toast.success('Retry Dispatched', 'Queued retry scoring job for essay-demo-failed-job');
              }}
              onResubmit={() => {
                toast.info('Resubmit Essay', 'Navigating to submission editor to edit text');
              }}
            />
          </div>
        </div>

        {/* 16.C Empty States Showcase */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              C. Canonical Empty States Gallery
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All empty views feature an illustrative icon, clear pedagogical explanation, and a single primary CTA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<FileText className="w-8 h-8 text-primary-500 dark:text-primary-400" />}
                  title="No essays yet — submit your first"
                  description="Submit an essay to generate automated scoring, multi-dimensional feedback, and confidence telemetry."
                  action={{
                    label: "Submit your first essay",
                    onClick: () => toast.info('Action Triggered', 'Navigate to /submit'),
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<Search className="w-8 h-8 text-slate-400" />}
                  title="No matching essays found"
                  description="We couldn't find any essays matching your search query or status filter. Try adjusting your search criteria."
                  action={{
                    label: "Clear search filters",
                    onClick: () => toast.info('Action Triggered', 'Filters cleared'),
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 16.D Toast Notifications Hub */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              D. Toast Notifications Hub
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Instant feedback toasts for submission dispatch, scoring completion, reviewer overrides, and errors.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                onClick={() =>
                  toast.success(
                    'Essay Submitted Successfully',
                    'Essay #essay-8492 queued for BERT inference scoring.'
                  )
                }
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="danger"
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() =>
                  toast.error(
                    'Inference Scoring Failed',
                    'Worker timeout encountered during PyTorch forward pass. Click to retry.'
                  )
                }
              >
                Trigger Error Toast
              </Button>

              <Button
                variant="outline"
                leftIcon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
                onClick={() =>
                  toast.warning(
                    'Low Confidence Warning',
                    'Model confidence is 44.2% — recommend human educator review.'
                  )
                }
              >
                Trigger Warning Toast
              </Button>

              <Button
                variant="secondary"
                leftIcon={<Info className="w-4 h-4 text-sky-400" />}
                onClick={() =>
                  toast.info(
                    'Telemetry Refreshed',
                    'Worker queue status and prompt QWK benchmarks updated.'
                  )
                }
              >
                Trigger Info Toast
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 17. Essay Manager List and Search Showcase (Prompt 13) */}
      <section className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-500 dark:text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            17. Essay Manager List &amp; Search (Prompt 13)
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sortable, paginated essay table with color-coded status chips, rubric band badges, multi-criteria filters (status, prompt, date range, band), saved URL state, row hover actions, bulk selection with floating action dock, and responsive mobile cards.
        </p>

        {/* View mode switcher: Desktop Table vs Mobile Cards */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Layout Preview:</span>
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDemoViewMode('table')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  demoViewMode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sortable Table
              </button>
              <button
                type="button"
                onClick={() => setDemoViewMode('mobile-cards')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  demoViewMode === 'mobile-cards' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mobile Card View
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Status Filter:</span>
            <div className="flex items-center gap-1">
              {['ALL', 'SCORED', 'UNDER_REVIEW', 'FINALIZED', 'PROCESSING_FAILED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDemoStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    demoStatusFilter === st
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Showcase Box */}
        <div className="space-y-4">
          {demoViewMode === 'table' ? (
            <Table striped>
              <TableHeader>
                <TableRow hoverable={false}>
                  <TableHead className="w-10 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (demoSelectedIds.length > 0) setDemoSelectedIds([]);
                        else setDemoSelectedIds(['demo-1', 'demo-2', 'demo-3']);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {demoSelectedIds.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoSortField('prompt');
                        setDemoSortOrder(demoSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      <span>Prompt</span>
                      <ArrowUpDown className="w-3 h-3 text-primary-400" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoSortField('status');
                        setDemoSortOrder(demoSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoSortField('score');
                        setDemoSortOrder(demoSortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      <span>Score</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    </button>
                  </TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {[
                  {
                    id: 'demo-1',
                    promptTitle: 'Prompt 1: Effects of Computers on Society',
                    asapSet: 1,
                    status: 'SCORED',
                    score: '10.42 / 12.0',
                    band: 'High Band',
                    bandVariant: 'score-high' as const,
                    date: 'Oct 19, 2026',
                    time: '14:20',
                    submitter: 'teacher@aes.edu',
                  },
                  {
                    id: 'demo-2',
                    promptTitle: 'Prompt 2: Censorship in Libraries',
                    asapSet: 2,
                    status: 'UNDER_REVIEW',
                    score: '3.20 / 6.0',
                    band: 'Mid Band',
                    bandVariant: 'score-mid' as const,
                    date: 'Oct 19, 2026',
                    time: '12:15',
                    submitter: 'evaluator@school.org',
                  },
                  {
                    id: 'demo-3',
                    promptTitle: 'Prompt 1: Effects of Computers on Society',
                    asapSet: 1,
                    status: 'FINALIZED',
                    score: '11.00 / 12.0 (Override)',
                    band: 'High Band',
                    bandVariant: 'score-high' as const,
                    date: 'Oct 18, 2026',
                    time: '18:45',
                    submitter: 'dr.smith@dept.edu',
                  },
                  {
                    id: 'demo-4',
                    promptTitle: 'Prompt 3: Cyclist Analysis',
                    asapSet: 3,
                    status: 'PROCESSING_FAILED',
                    score: 'Pending',
                    band: '—',
                    bandVariant: 'outline' as const,
                    date: 'Oct 18, 2026',
                    time: '09:30',
                    submitter: 'intern@aes.local',
                  },
                ]
                  .filter((row) => demoStatusFilter === 'ALL' || row.status === demoStatusFilter)
                  .sort((a, b) => {
                    const factor = demoSortOrder === 'asc' ? 1 : -1;
                    if (demoSortField === 'prompt') return (a.asapSet - b.asapSet) * factor;
                    if (demoSortField === 'status') return a.status.localeCompare(b.status) * factor;
                    if (demoSortField === 'score') return a.score.localeCompare(b.score) * factor;
                    return a.id.localeCompare(b.id) * factor;
                  })
                  .map((row) => {
                    const isSelected = demoSelectedIds.includes(row.id);
                    return (
                      <TableRow
                        key={row.id}
                        className={`group cursor-pointer ${
                          isSelected ? 'bg-primary-950/20 border-l-2 border-primary-500' : ''
                        }`}
                      >
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setDemoSelectedIds((prev) =>
                                prev.includes(row.id)
                                  ? prev.filter((id) => id !== row.id)
                                  : [...prev, row.id]
                              );
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-primary-400">
                              P{row.asapSet}
                            </span>
                            <span className="font-semibold text-slate-200 text-xs">
                              {row.promptTitle}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'SCORED'
                                ? 'success'
                                : row.status === 'FINALIZED'
                                ? 'primary'
                                : row.status === 'UNDER_REVIEW'
                                ? 'warning'
                                : 'danger'
                            }
                            size="sm"
                            withDot
                          >
                            {row.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono font-bold text-xs text-white">
                          {row.score}
                        </TableCell>

                        <TableCell>
                          {row.band !== '—' ? (
                            <Badge variant={row.bandVariant} size="sm" withDot>
                              {row.band}
                            </Badge>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-slate-300">
                          {row.date}{' '}
                          <span className="text-slate-500 font-mono text-[10px]">{row.time}</span>
                        </TableCell>

                        <TableCell className="text-xs text-slate-400 font-mono">
                          {row.submitter}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(row.id);
                                toast.success('Copied', `#${row.id} copied to clipboard`);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Copy ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <Button size="xs" variant="secondary" rightIcon={<ArrowRight className="w-3 h-3" />}>
                              Inspect
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          ) : (
            /* Mobile Card View Demo */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: 'demo-1',
                  prompt: 'P1: Effects of Computers on Society',
                  status: 'SCORED',
                  score: '10.42 / 12.0',
                  band: 'High Band',
                  date: 'Oct 19, 2026',
                  submitter: 'teacher@aes.edu',
                },
                {
                  id: 'demo-2',
                  prompt: 'P2: Censorship in Libraries',
                  status: 'UNDER_REVIEW',
                  score: '3.20 / 6.0',
                  band: 'Mid Band',
                  date: 'Oct 19, 2026',
                  submitter: 'evaluator@school.org',
                },
              ].map((card) => (
                <Card key={card.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
                          #{card.id}
                        </span>
                      </div>
                      <Badge
                        variant={card.status === 'SCORED' ? 'success' : 'warning'}
                        size="sm"
                        withDot
                      >
                        {card.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white text-xs">{card.prompt}</div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Score
                        </span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {card.score}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Band
                        </span>
                        <Badge
                          variant={card.band === 'High Band' ? 'score-high' : 'score-mid'}
                          size="sm"
                          withDot
                        >
                          {card.band}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{card.submitter}</span>
                      <span>{card.date}</span>
                    </div>

                    <Button size="xs" variant="secondary" className="w-full" rightIcon={<ArrowRight className="w-3 h-3" />}>
                      Inspect Workspace
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Floating Bulk Action Dock Demo */}
          {demoSelectedIds.length > 0 && (
            <div className="p-3.5 bg-slate-900 text-white dark:bg-slate-900/95 border border-primary-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                  {demoSelectedIds.length}
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  {demoSelectedIds.length === 1 ? 'essay selected' : 'essays selected'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="primary"
                  leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                  onClick={() => toast.success('Batch Score', `Dispatched scoring for ${demoSelectedIds.length} essays`)}
                >
                  Batch Score
                </Button>
                <Button
                  size="xs"
                  variant="secondary"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => toast.info('Export', 'Exporting CSV file...')}
                >
                  Export CSV
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setDemoSelectedIds([])}
                  className="text-slate-400 hover:text-white"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 18: Dashboard & Charts Polish (Prompt 14) */}
      <section className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span>Section 18: Dashboard & Charts Polish (Prompt 14)</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Production-ready telemetry suite: KPI cards with directional trend arrows, per-prompt QWK bar chart with 0.70 reference line, score-band distribution drift view, loss curves with prompt selector, and job-status donut. Every chart includes responsive sizing, design token colors, and an accessible text/table alternative.
          </p>
        </div>

        {/* 18.1 Top-Row KPI Cards with Trend Arrows */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              18.1 Top-Row KPI Cards with Trend Arrows
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Variant color accents: Emerald, Primary, Sky, Amber
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Essays Scored"
              value="1,845"
              variant="emerald"
              icon={<FileText className="w-5 h-5" />}
              trend={{
                value: '+14.2%',
                direction: 'up',
                label: 'vs last month',
                isPositive: true,
              }}
            />

            <KpiCard
              title="Average QWK"
              value="0.7842"
              variant="primary"
              icon={<Sparkles className="w-5 h-5" />}
              trend={{
                value: '+0.084',
                direction: 'up',
                label: 'vs 0.70 gate',
                isPositive: true,
              }}
            />

            <KpiCard
              title="Average Confidence"
              value="86.5%"
              variant="sky"
              icon={<Activity className="w-5 h-5" />}
              trend={{
                value: '+2.1%',
                direction: 'up',
                label: 'tight calibration',
                isPositive: true,
              }}
            />

            <KpiCard
              title="Jobs in Queue"
              value="3"
              variant="amber"
              icon={<Layers className="w-5 h-5" />}
              trend={{
                value: '-3',
                direction: 'down',
                label: 'cleared backlog',
                isPositive: true,
              }}
            />
          </div>
        </div>

        {/* 18.2 Per-Prompt QWK Bar Chart with 0.70 Target Reference Line */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              18.2 Per-Prompt QWK Bar Chart (0.70 Target Reference Line + Table Alternative)
            </h3>
            <Badge variant="success" size="sm" withDot>
              All 8 Prompts Passed
            </Badge>
          </div>

          <PerPromptQwkChart
            prompts={[
              { prompt_id: 1, genre: 'persuasive', rubric_min: 2, rubric_max: 12, qwk: 0.8124, target_qwk: 0.70, passed: true, n_test_samples: 356 },
              { prompt_id: 2, genre: 'persuasive', rubric_min: 1, rubric_max: 6, qwk: 0.7651, target_qwk: 0.70, passed: true, n_test_samples: 360 },
              { prompt_id: 3, genre: 'source-dependent', rubric_min: 0, rubric_max: 3, qwk: 0.7428, target_qwk: 0.70, passed: true, n_test_samples: 345 },
              { prompt_id: 4, genre: 'source-dependent', rubric_min: 0, rubric_max: 3, qwk: 0.7812, target_qwk: 0.70, passed: true, n_test_samples: 354 },
              { prompt_id: 5, genre: 'source-dependent', rubric_min: 0, rubric_max: 4, qwk: 0.8256, target_qwk: 0.70, passed: true, n_test_samples: 361 },
              { prompt_id: 6, genre: 'source-dependent', rubric_min: 0, rubric_max: 4, qwk: 0.7934, target_qwk: 0.70, passed: true, n_test_samples: 360 },
              { prompt_id: 7, genre: 'narrative', rubric_min: 0, rubric_max: 30, qwk: 0.7345, target_qwk: 0.70, passed: true, n_test_samples: 314 },
              { prompt_id: 8, genre: 'narrative', rubric_min: 0, rubric_max: 60, qwk: 0.7189, target_qwk: 0.70, passed: true, n_test_samples: 145 },
            ]}
            targetQwk={0.70}
          />
        </div>

        {/* 18.3 Score-Band Distribution Drift View vs ASAP Baseline & Job-Status Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              18.3 Score-Band Distribution vs. ASAP Baseline (Drift View)
            </h3>
            <ScoreBandDriftChart selectedPrompt="all" />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              18.4 Job-Status Donut (Async Worker Queue Breakdown)
            </h3>
            <JobStatusDonutChart
              counts={{
                queued: 8,
                processing: 3,
                completed: 1845,
                failed: 4,
                total: 1860,
              }}
              onRefresh={() => toast.success('Queue metrics refreshed')}
            />
          </div>
        </div>

        {/* 18.5 Loss Curves with Prompt Selector (P1 to P8) */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            18.5 Loss Curves with Prompt Selector & Checkpoint Tracker
          </h3>
          <LossCurvesChart initialPromptId={1} />
        </div>
      </section>

      {/* Section 19: Microinteractions and Purposeful Motion (Prompt 18) */}
      <section className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span>Section 19: Microinteractions & Purposeful Motion (Prompt 18)</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Purposeful motion design tokens: 150–300 ms durations, cubic ease-out acceleration curves, non-blocking click targets, and 100% disabled under <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">prefers-reduced-motion</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reduced Motion:</span>
            <Badge
              variant={prefersReducedMotion ? 'warning' : 'default'}
              className={
                prefersReducedMotion
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30'
                  : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
              }
            >
              {prefersReducedMotion ? 'Active (Animations Zeroed)' : 'Standard (150–300ms Active)'}
            </Badge>
          </div>
        </div>

        {/* 19.1 Motion Token Palette Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">150 ms (Fast)</span>
              <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">--motion-duration-fast</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Button press feedback, toggle switches, tooltips</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">200 ms (Normal)</span>
              <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">--motion-duration-normal</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Page enter transitions, modal scaling, toast slide-in</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">250 ms (Moderate)</span>
              <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">--motion-duration-moderate</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Slide-over drawer panels, accordion expand/collapse</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">300 ms (Slow)</span>
              <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">--motion-duration-slow</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Score numeric count-up, SVG and Recharts draw-in</p>
            </CardContent>
          </Card>
        </div>

        {/* 19.2 Interactive Motion Demonstrators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Demo 1: Score Count-Up */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-base flex items-center justify-between">
                <span>1. Score Count-Up (300ms Ease-Out)</span>
                <span className="text-xs font-mono text-primary-600 dark:text-primary-400">useCountUp()</span>
              </CardTitle>
              <CardDescription>
                Simulates real-time holistic essay score resolution with non-blocking cubic ease-out interpolation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Interpolated Output</span>
                  <span className="text-4xl font-black font-mono text-slate-900 dark:text-white">
                    {animatedDemoScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">/ 12.0 pts</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDemoCountScore(Math.round((Math.random() * 8 + 4) * 10) / 10)}
                  >
                    Randomize Score
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo 2: Tactile Button Press Feedback */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-base flex items-center justify-between">
                <span>2. Tactile Button Press (150ms)</span>
                <span className="text-xs font-mono text-primary-600 dark:text-primary-400">active:scale-[0.98]</span>
              </CardTitle>
              <CardDescription>
                Zero-delay tactile micro-compression gives instant sensory acknowledgment on click/tap.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Press</Button>
                <Button variant="secondary">Secondary Press</Button>
                <Button variant="outline">Outline Press</Button>
                <Button variant="danger">Danger Press</Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo 3: Accordion Expand & Collapse */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-base flex items-center justify-between">
                <span>3. Accordion Expand (250ms CSS Grid)</span>
                <span className="text-xs font-mono text-primary-600 dark:text-primary-400">grid-rows-[0fr&rarr;1fr]</span>
              </CardTitle>
              <CardDescription>
                Smooth height interpolation without measuring DOM elements or causing layout jumps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setDemoAccordionExpanded(!demoAccordionExpanded)}
                  className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Rubric Alignment Diagnostic Details
                  </span>
                  <span className="text-xs font-mono text-primary-600 dark:text-primary-400">
                    {demoAccordionExpanded ? 'Collapse ▲' : 'Expand ▼'}
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                    demoAccordionExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-4 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <p>• Coherence and organizational thesis statement is clearly established in paragraph 1.</p>
                      <p>• Evidence density is strong with 4 citations cross-referenced to historical documents.</p>
                      <p>• Sentence variation shows high syntactic maturity across complex clauses.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo 4: Skeleton Shimmer vs Static */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <CardTitle className="text-base flex items-center justify-between">
                <span>4. Skeleton Shimmer</span>
                <span className="text-xs font-mono text-primary-600 dark:text-primary-400">.animate-shimmer</span>
              </CardTitle>
              <CardDescription>
                Continuous gradient wave indicating asynchronous background scoring without content jumps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <Skeleton width="60%" height={16} />
                <Skeleton width="90%" height={12} />
                <Skeleton width="75%" height={12} />
                <div className="flex gap-2 pt-2">
                  <Skeleton width={80} height={28} className="rounded-md" />
                  <Skeleton width={100} height={28} className="rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 19.3 Overlay Modals & Drawers and Toasts Trigger Bar */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Overlay &amp; Notification Motion Controls
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test animate-modal-in (200ms), animate-drawer-in (250ms), and animate-toast-slide-in (200ms).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDrawerPosition('right');
                setIsDrawerOpen(true);
              }}
            >
              Open Right Drawer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDrawerPosition('left');
                setIsDrawerOpen(true);
              }}
            >
              Open Left Drawer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDrawerPosition('bottom');
                setIsDrawerOpen(true);
              }}
            >
              Open Bottom Drawer
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Open Modal Dialog
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.success('Score calibrated', 'Automated rubric score computed in 240ms.')}
            >
              Trigger Slide Toast
            </Button>
          </div>
        </div>
      </section>

      {/* Section 20: Onboarding, Help & Guidance (Prompt 19) */}
      <section className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-sky-500 dark:text-sky-400" />
              <span>Section 20: Onboarding, Help &amp; Guidance (Prompt 19)</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              First-run teacher guidance suite: 4-step modal product tour, contextual &apos;?&apos; tooltips with plain-language definitions, searchable FAQ knowledge base (/help), and 1-click sample essay presets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => openTour(0)}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Launch Product Tour
            </Button>
          </div>
        </div>

        {/* 20.1 Contextual Help Tooltips Matrix */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              20.1 Contextual &apos;?&apos; Help Tooltip Components
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Hover or click any &apos;?&apos; to view plain-language definitions
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Confidence Metric</span>
                  <ContextHelp topic="confidence" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains statistical certainty distance from training distributions and when to trigger overrides.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Quadratic Weighted Kappa (QWK)</span>
                  <ContextHelp topic="qwk" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains human-machine agreement standards and the significance of the 0.70 acceptance gate.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Rubric Performance Band</span>
                  <ContextHelp topic="rubricBand" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains mapping from raw regression scores into qualitative proficiency tiers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Grammar &amp; Mechanics</span>
                  <ContextHelp topic="grammar" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains syntactic evaluation, run-ons, comma splices, and typographical conventions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Coherence &amp; Organization</span>
                  <ContextHelp topic="coherence" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains discourse structure, transitional connectivity, and thesis continuity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Argumentation &amp; Evidence</span>
                  <ContextHelp topic="argumentation" position="bottom" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Explains reasoning depth, claim elaboration, counterarguments, and citation evidence.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 20.2 Tour Step Jump Station & Help Page Link */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Product Tour Jump Station &amp; Documentation
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jump directly to any specific step of the tour or visit the dedicated Help &amp; FAQ knowledge base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => openTour(0)}>
              Step 1: Submit
            </Button>
            <Button size="sm" variant="outline" onClick={() => openTour(1)}>
              Step 2: Score
            </Button>
            <Button size="sm" variant="outline" onClick={() => openTour(2)}>
              Step 3: Feedback
            </Button>
            <Button size="sm" variant="outline" onClick={() => openTour(3)}>
              Step 4: Override
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
