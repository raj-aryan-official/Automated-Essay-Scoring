import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTour } from '../context/TourContext';
import { useDebounce } from '../hooks';
import {
  HelpCircle,
  Search,
  Sparkles,
  PenTool,
  ShieldCheck,
  Layers,
  BookOpen,
  ChevronDown,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { Button, Card, CardContent } from '../components/ui';

interface FaqItem {
  id: string;
  category: 'scoring' | 'override' | 'rubric' | 'getting-started';
  question: string;
  shortAnswer: string;
  detailedAnswer: string[];
  tags: string[];
}

const FAQS: FaqItem[] = [
  {
    id: 'how-bert-scores',
    category: 'scoring',
    question: 'How does the fine-tuned BERT model evaluate and score essays?',
    shortAnswer:
      'The platform uses a transformer neural network fine-tuned on the ASAP benchmark dataset with a calibrated regression head.',
    detailedAnswer: [
      'The model converts student essay prose into rich contextualized vector embeddings that capture discourse structure, syntactic complexity, vocabulary maturity, and topical relevance.',
      'A dense regression head predicts a continuous numeric score mapped to the prompt’s specific rubric bounds (e.g. 2–12 for Prompt 1, 1–6 for Prompt 2, 0–30 for Prompt 7).',
      'Inference executes in under 3 seconds per essay, with scores calibrated against thousands of human-certified expert raters.',
    ],
    tags: ['bert', 'scoring', 'neural network', 'asap', 'ai'],
  },
  {
    id: 'qwk-metric',
    category: 'scoring',
    question: 'What is Quadratic Weighted Kappa (QWK) and why is 0.70 our target gate?',
    shortAnswer:
      'QWK is the gold-standard metric for inter-rater agreement between AI models and human certified raters, penalized quadratically for distance.',
    detailedAnswer: [
      'Standard accuracy treats near-misses (e.g. 9 vs 10 on a 12-point rubric) the same as severe errors (e.g. 3 vs 11). QWK assigns quadratic penalties, meaning small differences are penalized lightly, while large discrepancies reduce the score sharply.',
      'A QWK of 0.70 or higher is recognized by the educational measurement research community as demonstrating grading parity with certified human examiners.',
      'Our model checkpoints are strictly gated at ≥ 0.70 across all test prompts before deployment.',
    ],
    tags: ['qwk', 'kappa', 'metrics', 'benchmarks', 'accuracy'],
  },
  {
    id: 'low-confidence',
    category: 'scoring',
    question: 'What does a "Low Confidence" flag mean and how should teachers handle it?',
    shortAnswer:
      'Low confidence indicates that the essay features deviate from the typical training distribution or fall on a narrow borderline between score bands.',
    detailedAnswer: [
      'Whenever the model Certainty Metric falls below the configurable confidence threshold (default 85%), a prominent warning badge is rendered on the ScoreCard.',
      'This flags the essay for human-in-the-loop review. Teachers should read the student prose in the center reader, review the diagnostic dimensional feedback, and determine if an override is warranted.',
      'The threshold slider on the Control Rail allows you to adjust strictness between 50% (permissive) and 99% (strict).',
    ],
    tags: ['confidence', 'uncertainty', 'threshold', 'review', 'teacher'],
  },
  {
    id: 'reviewer-override',
    category: 'override',
    question: 'How does the Reviewer Override mechanism work and who can use it?',
    shortAnswer:
      'Authorized TEACHER and ADMIN users can adjust holistic scores along the verified rubric scale with mandatory pedagogical rationale capture.',
    detailedAnswer: [
      'Teachers maintain full pedagogical authority. When opening the Reviewer Override Panel in the workspace, you can slide to any valid score within the prompt rubric range.',
      'To ensure accountability and institutional auditability, the system requires selecting a standardized pedagogical reason code (e.g., Creative Stylistic Nuance, Idiomatic Expression, Exceptional Evidence Depth) and typing a brief justification.',
      'Once submitted, the active score band updates instantly, and an audit trail badge is pinned to the essay record.',
    ],
    tags: ['override', 'teacher authority', 'audit trail', 'human-in-the-loop'],
  },
  {
    id: 'three-dimensions',
    category: 'rubric',
    question: 'What are the three diagnostic dimensions and how are they synthesized?',
    shortAnswer:
      'The platform breaks down holistic performance into Grammar & Mechanics, Coherence & Organization, and Argumentation & Evidence.',
    detailedAnswer: [
      'Grammar & Mechanics evaluates punctuation, syntax, run-on sentences, subject-verb agreement, and spelling errors.',
      'Coherence & Organization evaluates transitions, paragraph sequencing, introduction/conclusion balance, and thesis continuity.',
      'Argumentation & Evidence evaluates textual evidence density, reasoning depth, counterargument handling, and persuasive efficacy.',
      'Each dimension features itemized feedback points ranked by severity (High Priority, Moderate, Proficient) and clickable links that highlight matching sentences directly in the text reader.',
    ],
    tags: ['dimensions', 'grammar', 'coherence', 'argumentation', 'radar'],
  },
  {
    id: 'try-sample',
    category: 'getting-started',
    question: 'How can a new user test the platform in one click without typing an essay?',
    shortAnswer:
      'Navigate to the Submit Essay page (/submit) and click any of the "Try Sample Essay" buttons at the top of the form.',
    detailedAnswer: [
      'The sample essay loader instantly populates the editor with an authentic multi-paragraph ASAP benchmark essay (such as Prompt 1 on Computers in Schools or Prompt 2 on Censorship).',
      'The matching rubric prompt is automatically selected, word and character counters update in real time, and the submit button becomes immediately ready for evaluation.',
      'You can also restart the interactive 4-step Product Tour at any time from this page or the user menu.',
    ],
    tags: ['sample essay', 'quick start', 'demo', 'tutorial'],
  },
  {
    id: 'file-limits',
    category: 'getting-started',
    question: 'What document formats and length constraints are supported?',
    shortAnswer:
      'The platform accepts raw text pasting, PDF (.pdf), Microsoft Word (.docx), and plain text (.txt) files up to 20 MB.',
    detailedAnswer: [
      'Uploaded documents undergo in-memory text extraction, stripping binary metadata while preserving paragraph and sentence boundaries for accurate highlighting.',
      'Essays are capped at 8,000 characters (approximately 1,200 words), sufficient for standard secondary and collegiate essay prompts.',
      'A minimum of 50 words is recommended for accurate statistical representation and dimensional feedback.',
    ],
    tags: ['pdf', 'docx', 'file upload', 'character limit'],
  },
  {
    id: 'restart-tour',
    category: 'getting-started',
    question: 'How do I restart or dismiss the Product Tour?',
    shortAnswer:
      'Click "Launch Guided Product Tour" at the top of this Help page, or click your profile avatar in the TopBar and select "Restart Product Tour".',
    detailedAnswer: [
      'The tour presents a concise 4-step walkthrough: Submit → Score → Read Feedback → Reviewer Override.',
      'You can navigate using the Next and Back buttons, or keyboard Arrow keys (Left/Right).',
      'Dismissing the tour saves your preference to localStorage so it will not pop up automatically again, but can always be re-opened whenever needed.',
    ],
    tags: ['product tour', 'onboarding', 'help', 'restart'],
  },
];

const CATEGORIES: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All FAQs', icon: BookOpen },
  { key: 'getting-started', label: 'Getting Started', icon: PenTool },
  { key: 'scoring', label: 'Scoring & BERT AI', icon: Sparkles },
  { key: 'override', label: 'Teacher Overrides', icon: ShieldCheck },
  { key: 'rubric', label: 'Rubric & Dimensions', icon: Layers },
];

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const { openTour } = useTour();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('how-bert-scores');

  // Filter FAQs by category and search query
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'all' || faq.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!debouncedQuery.trim()) return true;
      const q = debouncedQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.shortAnswer.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [debouncedQuery, selectedCategory]);

  const toggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-page-enter">
      {/* Title Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              User Guidance &amp; Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Help, Documentation &amp; FAQs
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
            Comprehensive guidance for teachers, raters, and reviewers. Learn how fine-tuned BERT models score essays, understand rubric bands and QWK metrics, and master the reviewer override workflow.
          </p>
        </div>

        {/* Action Button Strip */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => openTour(0)}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Launch Guided Product Tour
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/submit')}
            leftIcon={<PenTool className="w-4 h-4" />}
          >
            Try 1-Click Sample Essay
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/evaluation')}
            leftIcon={<Cpu className="w-4 h-4" />}
          >
            View Model Telemetry
          </Button>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Teacher Guided Tour</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Step through the 4-step sequence: Submit → Score → Read Feedback → Reviewer Override.
            </p>
            <button
              type="button"
              onClick={() => openTour(0)}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              <span>Start tour</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">1-Click Sample Essay</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Instantly populate the editor with an ASAP prompt set essay to test model inference in under 3 seconds.
            </p>
            <button
              type="button"
              onClick={() => navigate('/submit')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              <span>Load sample</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
          <CardContent className="p-5 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Reviewer Override Guide</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Understand mandatory pedagogical rationale logging, rubric scaling, and audit record permanence.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('override');
                setExpandedFaqId('reviewer-override');
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              <span>Read rules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar & Category Filter Bar */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search FAQs by keywords (e.g., 'QWK', 'confidence', 'override', 'grammar', 'sample')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => {
            const IconComp = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none border ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>Showing {filteredFaqs.length} Questions</span>
          <span>Click any question to expand details</span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching questions found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search keywords or select a different category above.
            </p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-700/80"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4.5 sm:p-5 flex items-start justify-between gap-4 text-left select-none bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                      {faq.shortAnswer}
                    </p>
                  </div>

                  <div
                    className={`p-1 rounded text-slate-400 transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-180 text-primary-600 dark:text-primary-400' : 'rotate-0'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Smooth CSS Grid Accordion Content (250ms duration token) */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                      <div className="space-y-2 leading-relaxed font-sans">
                        {faq.detailedAnswer.map((para, i) => (
                          <p key={i}>• {para}</p>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-1">
                          Tags:
                        </span>
                        {faq.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HelpPage;
