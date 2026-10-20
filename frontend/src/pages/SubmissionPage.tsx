import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitEssay, dispatchScoring, EssayCreateResponse } from '../api';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  useToast,
  formatApiError,
} from '../components/ui';
import {
  PenTool,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Search,
  BookOpen,
} from 'lucide-react';

export interface PromptOption {
  id: string;
  set: number;
  title: string;
  rubric: string;
  genre: string;
}

export const ASAP_PROMPTS: PromptOption[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    set: 1,
    title: 'Prompt 1: Effects of Computers on Society',
    rubric: '2.0 – 12.0',
    genre: 'Persuasive / Expository',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    set: 2,
    title: 'Prompt 2: Censorship in Libraries',
    rubric: '1.0 – 6.0',
    genre: 'Persuasive / Argumentative',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    set: 3,
    title: 'Prompt 3: Rough Road Ahead (Cyclist Analysis)',
    rubric: '0.0 – 3.0',
    genre: 'Source-Dependent Response',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    set: 4,
    title: 'Prompt 4: Invasive Species / Winter Hibernation',
    rubric: '0.0 – 3.0',
    genre: 'Source-Dependent Response',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    set: 5,
    title: 'Prompt 5: Narciso Rodriguez Memoir (Family Heritage)',
    rubric: '0.0 – 4.0',
    genre: 'Narrative / Reflective',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    set: 6,
    title: 'Prompt 6: The Mooring Mast (Empire State Building)',
    rubric: '0.0 – 4.0',
    genre: 'Source-Dependent Response',
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    set: 7,
    title: 'Prompt 7: Patience & Overcoming Obstacles in Life',
    rubric: '0.0 – 30.0',
    genre: 'Narrative / Personal',
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    set: 8,
    title: 'Prompt 8: Laughter and Humor in Life Experience',
    rubric: '0.0 – 60.0',
    genre: 'Narrative / Expository',
  },
];

export interface SampleEssay {
  title: string;
  promptId: string;
  genre: string;
  description: string;
  text: string;
}

export const SAMPLE_ESSAYS: SampleEssay[] = [
  {
    title: 'Prompt 1: Persuasive Letter on Computers in Schools',
    promptId: '11111111-1111-1111-1111-111111111111',
    genre: 'Persuasive / Expository',
    description: 'High-performing response arguing for classroom computer labs and digital literacy.',
    text: `Dear Local School Board Members,\n\nI am writing to urge the committee to increase funding and access to computer technology across our secondary schools. In contemporary society, technological literacy is no longer a luxury but an indispensable prerequisite for academic and professional advancement. Integrating modern computers into regular coursework provides students with immediate access to research databases, collaborative platforms, and computational problem-solving tools that traditional textbooks simply cannot replicate.\n\nFirst and foremost, computers democratize access to informational resources. Rather than relying on outdated physical textbooks that quickly become obsolete, students can examine current scientific articles, historical primary source documents, and interactive geographic maps in real time. For example, during our biology laboratory last semester, digital microscope feeds enabled students to analyze live cellular specimens with a degree of precision that static diagrams could never convey. Furthermore, online scholarly archives allow pupils from varied socio-economic backgrounds to consult identical reference materials, narrowing educational disparities.\n\nAdditionally, computer proficiency directly prepares students for modern workforce demands. Today, virtually every major career path—from engineering and medicine to humanities and graphic design—demands familiarity with software workflows, collaborative spreadsheets, and digital communication tools. When schools allocate dedicated screen time for computational projects, students develop crucial analytical thinking and troubleshooting resilience. They learn to evaluate online source credibility, cross-reference conflicting claims, and present data-driven arguments persuasively.\n\nOpponents frequently argue that expanded screen time introduces classroom distractions and reduces attention spans. While these concerns are understandable, they can be readily mitigated through structured teacher supervision, classroom management software, and explicit digital citizenship curricula. Prohibiting technology out of caution only leaves graduates unprepared for the digital realities of higher education and employment.\n\nIn conclusion, investing in classroom computers is an investment in student empowerment and civic readiness. By modernizing our instructional infrastructure, our district will equip all learners with the skills and confidence necessary to navigate an increasingly interconnected world.\n\nSincerely,\nA Concerned High School Student`,
  },
  {
    title: 'Prompt 2: Censorship in Libraries & Civil Discourse',
    promptId: '22222222-2222-2222-2222-222222222222',
    genre: 'Persuasive / Argumentative',
    description: 'Balanced philosophical argument on intellectual freedom and literary censorship.',
    text: `Throughout human history, the debate over censorship has tested the boundaries between social protection and intellectual freedom. In a democratic society, libraries serve as vital repositories of diverse perspectives, challenging established orthodoxies and fostering critical inquiry. When governmental authorities or school boards attempt to suppress books on controversial subjects, they often do so under the guise of shielding vulnerable audiences; however, such actions fundamentally undermine the civic mandate of public education.\n\nTo begin with, intellectual maturity requires exposure to complex, uncomfortable realities. Literature provides a secure, empathetic environment where readers can encounter contrasting worldviews and grapple with ethical dilemmas. Banning works that depict racial injustice, economic disparity, or psychological trauma does not erase those phenomena from reality; it merely deprives students of the cognitive vocabulary needed to analyze and address them constructively. As Supreme Court precedents have continually affirmed, the freedom to read is intrinsically linked to the freedom of thought.\n\nMoreover, censorship creates a dangerous precedent regarding who holds the authority to determine acceptable discourse. When subjective standards dictate which volumes remain on library shelves, minority viewpoints and dissenting voices are invariably the first to be silenced. Rather than fostering social cohesion, censorship polarizes communities and discourages nuanced dialogue.\n\nIn conclusion, libraries must remain sanctuaries of open inquiry. Education should not be about insulating minds from challenging ideas, but rather cultivating the analytical discernment required to evaluate ideas rigorously. Protecting intellectual freedom ensures that our society remains reflective, compassionate, and resilient.`,
  },
  {
    title: 'Prompt 3: Rough Road Ahead (Cyclist Analysis)',
    promptId: '33333333-3333-3333-3333-333333333333',
    genre: 'Source-Dependent Analysis',
    description: "Text-dependent response examining Paul Fleischman's narrative techniques.",
    text: `In the excerpt "Rough Road Ahead," the author effectively employs vivid sensory imagery and chronological suspense to convey the physical and psychological challenges faced during an endurance cycling expedition. By juxtaposing the idyllic early morning departure with the grueling afternoon headwind, the narrative highlights the unpredictable nature of wilderness travel and the resilience required to overcome unforeseen obstacles.\n\nSpecifically, the author utilizes kinesthetic descriptions—such as the relentless vibration of the handlebars against fatigued palms and the rhythmic cadence of pedaling through gravel—to immerse the reader in the immediate physical strain. Furthermore, the internal monologue reveals the psychological progression from initial optimism to grim determination. This stylistic choice underscores the central theme: true endurance is defined not merely by physical strength, but by mental perseverance in the face of exhaustion.`,
  },
];

const MAX_CHARACTERS = 8000;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

export const SubmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Mode and inputs
  const [activeTab, setActiveTab] = useState<'PASTE' | 'DOCUMENT'>('PASTE');
  const [promptId, setPromptId] = useState<string>(ASAP_PROMPTS[0].id);
  const [promptSearch, setPromptSearch] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Lifecycle
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<EssayCreateResponse | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Quick 1-click sample essay loader
  const handleLoadSample = (sample: SampleEssay) => {
    setPromptId(sample.promptId);
    setRawText(sample.text);
    setActiveTab('PASTE');
    setSelectedFile(null);
    setError(null);
    toast.success(
      'Sample Essay Loaded',
      `Pre-populated "${sample.title}". Click "Submit Essay for Scoring" below to test BERT scoring.`
    );
  };

  // Text metrics
  const wordCount = useMemo(() => {
    const trimmed = rawText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [rawText]);

  const charCount = rawText.length;
  const charPercentage = Math.min(100, (charCount / MAX_CHARACTERS) * 100);
  const isNearLimit = charCount > MAX_CHARACTERS * 0.9 && charCount <= MAX_CHARACTERS;
  const isOverLimit = charCount > MAX_CHARACTERS;

  // Selected prompt details
  const selectedPrompt = useMemo(() => {
    return ASAP_PROMPTS.find((p) => p.id === promptId) || ASAP_PROMPTS[0];
  }, [promptId]);

  // Filtered prompt options for searchable selector
  const filteredPrompts = useMemo(() => {
    if (!promptSearch.trim()) return ASAP_PROMPTS;
    const q = promptSearch.toLowerCase();
    return ASAP_PROMPTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.genre.toLowerCase().includes(q) ||
        p.rubric.includes(q) ||
        `prompt ${p.set}`.includes(q)
    );
  }, [promptSearch]);

  // Validation logic
  const fileValidation = useMemo(() => {
    if (!selectedFile) return { isValid: false, error: null };
    const ext = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: `Invalid file format (${ext}). Supported formats: .pdf, .docx, .txt`,
      };
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File exceeds 20 MB size limit (selected file is ${sizeMB} MB).`,
      };
    }
    return { isValid: true, error: null };
  }, [selectedFile]);

  const textValidation = useMemo(() => {
    if (activeTab !== 'PASTE') return { isValid: true, error: null };
    if (!rawText.trim()) {
      return { isValid: false, error: null };
    }
    if (rawText.trim().length < 10) {
      return { isValid: false, error: 'Essay text must contain at least 10 characters.' };
    }
    if (charCount > MAX_CHARACTERS) {
      return {
        isValid: false,
        error: `Essay exceeds maximum limit of ${MAX_CHARACTERS.toLocaleString()} characters.`,
      };
    }
    return { isValid: true, error: null };
  }, [activeTab, rawText, charCount]);

  const isFormValid = useMemo(() => {
    if (isSubmitting) return false;
    if (activeTab === 'PASTE') {
      return textValidation.isValid && rawText.trim().length >= 10;
    }
    return fileValidation.isValid;
  }, [isSubmitting, activeTab, textValidation, fileValidation, rawText]);

  // File Handlers
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError(null);
    setSubmitResult(null);
    setDispatchStatus(null);
    setIsSubmitting(true);

    try {
      let res: EssayCreateResponse;
      if (activeTab === 'PASTE') {
        res = await submitEssay({
          prompt_id: promptId,
          source_type: 'PASTE',
          raw_text: rawText,
        });
      } else {
        if (!selectedFile) {
          throw new Error('Please choose a document file before submitting.');
        }
        const formData = new FormData();
        formData.append('prompt_id', promptId);
        formData.append('source_type', 'DOCUMENT');
        formData.append('file', selectedFile);
        if (rawText.trim()) {
          formData.append('raw_text', rawText);
        }
        res = await submitEssay(formData);
      }

      setSubmitResult(res);
      toast.success(
        'Essay Submitted Successfully',
        `Essay #${res.id.slice(0, 8)} is confirmed and ready for AI scoring.`
      );
    } catch (err: any) {
      console.error('[SubmissionPage] Error submitting essay:', err);
      const formatted = formatApiError(err);
      setError(formatted.message);
      toast.error(formatted.title, formatted.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Immediate dispatch scoring action
  const handleDispatchScore = async () => {
    if (!submitResult?.id) return;
    setIsDispatching(true);
    setDispatchStatus('Dispatching scoring job to Celery worker queue...');
    try {
      const jobRes = await dispatchScoring(submitResult.id);
      toast.info('Scoring Dispatched', `Celery worker running inference (Job #${jobRes.job_id.slice(0, 8)}).`);
      setDispatchStatus(`Scoring Job Dispatched (Job ID: ${jobRes.job_id}). Redirecting to workspace...`);
      setTimeout(() => {
        navigate(`/essays/${submitResult.id}`);
      }, 750);
    } catch (err: any) {
      console.error('[SubmissionPage] Error dispatching scoring:', err);
      const formatted = formatApiError(err);
      setDispatchStatus(`Error: ${formatted.message}`);
      toast.error(formatted.title, formatted.message);
      setIsDispatching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* Title Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <PenTool className="w-6 h-6 text-primary-500 dark:text-primary-400" />
            <span>Submit Essay for Scoring</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Submit student essays for automated BERT evaluation, rubric scoring, and dimension-level diagnostic feedback.
          </p>
        </div>

        <Badge variant="primary" size="md">
          Section 7.1 Submission API
        </Badge>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold text-rose-900 dark:text-rose-200">Submission Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Success Confirmation Card */}
      {submitResult && (
        <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-50 via-white to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 shadow-xl animate-in zoom-in-95 duration-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-emerald-800 dark:text-emerald-300 tracking-tight">
                    Essay Submitted Successfully!
                  </p>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    ID: {submitResult.id}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Status: <strong className="text-emerald-600 dark:text-emerald-400">SUBMITTED</strong>
                    </span>
                    <Badge variant="success" size="sm" withDot>
                      Ready for Scoring
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isDispatching}
                  loadingText="Dispatching..."
                  onClick={handleDispatchScore}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30"
                >
                  Score Essay Now
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/essays/${submitResult.id}`)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Details
                </Button>
              </div>
            </div>

            {dispatchStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
                <span>{dispatchStatus}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 1-Click Sample Essay Quick Start Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-50 via-indigo-50/50 to-sky-50/50 dark:from-primary-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-primary-200 dark:border-primary-800/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary-600 text-white shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                First time here? Try a sample essay in one click
              </h3>
              <Badge variant="primary" size="sm">Quick Start</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Instantly pre-populate target rubric bounds, topic selection, and benchmark essay prose to test BERT evaluation without typing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {SAMPLE_ESSAYS.map((sample, idx) => (
            <Button
              key={sample.promptId}
              type="button"
              size="sm"
              variant={idx === 0 ? 'primary' : 'outline'}
              onClick={() => handleLoadSample(sample)}
              className="text-xs font-semibold"
            >
              <span>{idx === 0 ? 'Prompt 1 (Computers)' : idx === 1 ? 'Prompt 2 (Censorship)' : 'Prompt 3 (Cyclist)'}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Prompt Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary-500 dark:text-primary-400" />
              <span>Target Rubric Prompt</span>
            </CardTitle>
            <CardDescription>
              Select the ASAP prompt set to calibrate neural model rubric bounds and dimension criteria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input for Dropdown Filtering */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search prompt sets by title, set number, or genre..."
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                className="w-full text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2.5 min-h-[44px] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
              />
            </div>

            {/* Native Select for E2E and Standard Accessibility */}
            <div>
              <select
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                className="w-full text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 font-medium"
              >
                {filteredPrompts.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 py-1 text-slate-900 dark:text-slate-100">
                    {p.title} (Rubric Scale: {p.rubric}) — {p.genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Prompt Summary Pill */}
            {selectedPrompt && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPrompt.title}
                  </span>
                  <Badge variant="outline" size="sm">
                    {selectedPrompt.genre}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Rubric Range:</span>
                  <Badge variant="primary" size="sm" className="font-mono">
                    {selectedPrompt.rubric}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Submission Mode Tabs (Paste Text vs Upload Document) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Essay Content</CardTitle>
                <CardDescription>
                  Choose between pasting essay text or uploading a student document file.
                </CardDescription>
              </div>

              {/* Two-Tab Switcher */}
              <div className="bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 rounded-xl inline-flex items-center gap-1 self-start">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('PASTE');
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] text-xs rounded-lg transition-all font-medium select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    activeTab === 'PASTE'
                      ? 'bg-primary-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>Paste Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('DOCUMENT');
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] text-xs rounded-lg transition-all font-medium select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    activeTab === 'DOCUMENT'
                      ? 'bg-primary-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeTab === 'PASTE' ? (
              <div className="space-y-3">
                {/* Textarea Header with Metrics & Limit Progress */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-xs select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Essay Body Text
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLoadSample(SAMPLE_ESSAYS[0])}
                        className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Insert Sample</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {wordCount} words
                      </span>
                      <span
                        className={`font-mono text-xs ${
                          isOverLimit
                            ? 'text-rose-600 dark:text-rose-400 font-bold'
                            : isNearLimit
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} chars
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isOverLimit
                          ? 'bg-rose-500'
                          : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-primary-500'
                      }`}
                      style={{ width: `${charPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows={12}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Type or paste student essay text here (minimum 10 characters, recommended 150–500 words)..."
                  className={`w-full bg-white dark:bg-slate-900 border rounded-xl p-4 text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono leading-relaxed transition-colors resize-y min-h-[220px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 ${
                    textValidation.error
                      ? 'border-rose-500/80 focus:ring-rose-500/30'
                      : isNearLimit
                      ? 'border-amber-500/80 focus:ring-amber-500/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-primary-500 focus:ring-primary-500/30'
                  }`}
                />

                {/* Validation messages */}
                {textValidation.error && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{textValidation.error}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Drag-and-Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center space-y-3 ${
                    isDragging
                      ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 dark:text-primary-400 shadow-sm">
                    <UploadCloud className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Click to browse or drag and drop essay file
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Supports PDF, DOCX, and TXT documents (Max file size: 20 MB)
                    </p>
                  </div>
                </div>

                {/* Selected File Card with Remove Button */}
                {selectedFile && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-primary-500 dark:text-primary-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {selectedFile.name}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                      aria-label="Remove selected document"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* File Error Message */}
                {fileValidation.error && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileValidation.error}</span>
                  </p>
                )}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                isLoading={isSubmitting}
                loadingText="Submitting..."
                leftIcon={<PenTool className="w-4 h-4" />}
                className="w-full py-2.5 text-sm font-semibold shadow-lg shadow-primary-900/20"
              >
                Submit Essay
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default SubmissionPage;
