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
} from '../components/ui';
import {
  Search,
  Sparkles,
  ArrowRight,
  FileText,
  AlertTriangle,
  Layers,
  Settings,
  HelpCircle,
  PenTool,
  ShieldCheck,
} from 'lucide-react';
import { ScoreCard, AnnotatedEssayReader, ReviewerOverridePanel } from '../features/scoring';
import { DimensionRadarChart, DimensionCard } from '../features/feedback';

export const DevComponentsPage: React.FC = () => {
  const toast = useToast();

  // Interactive component states
  const [sliderVal, setSliderVal] = React.useState<number>(85);
  const [toggleChecked, setToggleChecked] = React.useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);
  const [drawerPosition, setDrawerPosition] = React.useState<'right' | 'left' | 'bottom'>('right');
  const [buttonLoading, setButtonLoading] = React.useState<boolean>(false);
  const [demoHighlights, setDemoHighlights] = React.useState<boolean>(true);
  const [selectedSpanId, setSelectedSpanId] = React.useState<string | null>(null);
  const [showEmptySpans, setShowEmptySpans] = React.useState<boolean>(false);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Design System Component Showcase
            </h1>
            <Badge variant="primary" size="md">
              /dev/components
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Typed, accessible, token-driven component library with dark-mode contrast guarantees.
          </p>
        </div>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            1. Buttons &amp; Loading States
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3">Variants</p>
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
              <p className="text-xs font-semibold text-slate-400 mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small (xs)</Button>
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Settings className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            2. Badges &amp; Strict Score-Band Semantics
          </h2>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3">
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
              <p className="text-xs font-semibold text-slate-400 mb-3">Status Badges</p>
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <FileText className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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
              <p className="text-xs font-semibold text-slate-400 mb-3">
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
            <p className="text-xs text-slate-300">
              You are overriding the automated BERT score of <strong className="text-amber-400 font-mono">9.42</strong> to <strong className="text-emerald-400 font-mono">10.50</strong> with reason <span className="italic">"Strong thesis cohesion overlooked by grammar penalty"</span>.
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
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white">Grammar &amp; Mechanics</span>
                <Badge variant="score-mid" size="sm">
                  Subscore: 3.2 / 4.0
                </Badge>
              </div>
              <p className="text-slate-400 text-[11px]">
                Minor subject-verb agreement issues detected in paragraph 2.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white">Coherence &amp; Structure</span>
                <Badge variant="score-high" size="sm">
                  Subscore: 3.8 / 4.0
                </Badge>
              </div>
              <p className="text-slate-400 text-[11px]">
                Strong transitional phrases connect main argumentation points seamlessly.
              </p>
            </div>
          </div>
        </Drawer>
      </section>

      {/* 5. Navigation Tabs */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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

              <TabContent value="overview" className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                Holistic score analysis and prompt rubric overview tab content.
              </TabContent>
              <TabContent value="feedback" className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                Detailed linguistic error breakdowns and pedagogical recommendations.
              </TabContent>
              <TabContent value="telemetry" className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-300">
                Quadratic Weighted Kappa (QWK), loss curves, and worker latency metrics.
              </TabContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* 6. Skeletons, Spinners & Empty State */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <AlertTriangle className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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
              <TableCell className="font-mono text-xs text-primary-400 font-semibold">
                #essay-9412
              </TableCell>
              <TableCell>Prompt 1: Persuasive Letter</TableCell>
              <TableCell className="font-mono font-bold text-emerald-400">
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
              <TableCell className="font-mono text-xs text-primary-400 font-semibold">
                #essay-9413
              </TableCell>
              <TableCell>Prompt 2: Censorship Argument</TableCell>
              <TableCell className="font-mono font-bold text-amber-400">
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
              <TableCell className="font-mono text-xs text-primary-400 font-semibold">
                #essay-9414
              </TableCell>
              <TableCell>Prompt 3: Rough Road Ahead</TableCell>
              <TableCell className="font-mono font-bold text-rose-400">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Sparkles className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            11. ScoreCard Visualization (Prompt 7)
          </h2>
        </div>

        <p className="text-xs text-slate-400">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <Layers className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            12. Dimension Feedback Panels &amp; 3-Axis Radar (Prompt 8)
          </h2>
        </div>

        <p className="text-xs text-slate-400">
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
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
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

        <p className="text-xs text-slate-400">
          Features inline highlighting with wavy underlines (Grammar), soft background (Coherence), and colored side markers (Argumentation). Hover for tooltips, click to inspect, master toggle, visual legend, and graceful zero-span degradation.
        </p>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
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
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            14. Reviewer Override Panel &amp; Pedagogical Audit Trail (Prompt 10)
          </h2>
        </div>

        <p className="text-xs text-slate-400">
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
    </div>
  );
};
