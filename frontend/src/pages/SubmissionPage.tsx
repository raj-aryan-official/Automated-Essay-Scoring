import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dispatchScoring, getPrompts, submitEssay, Prompt } from '../api';
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Loader2,
  PenTool,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Textarea,
  formatApiError,
  useToast,
} from '../components/ui';

const MAX_ESSAY_CHARACTERS = 8000;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.txt', '.pdf', '.docx', '.md'];
const ACCEPTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

type Step = 'prompt' | 'content' | 'review';

const STEPS: Step[] = ['prompt', 'content', 'review'];
const STEP_LABELS: Record<Step, string> = {
  prompt: 'Select Rubric',
  content: 'Essay Content',
  review: 'Review & Submit',
};
const STEP_TITLES: Record<Step, string> = {
  prompt: 'Choose a Rubric Prompt',
  content: 'Enter Your Essay',
  review: 'Review Before Submitting',
};
const STEP_DESCRIPTIONS: Record<Step, string> = {
  prompt: 'Select the ASAP benchmark prompt that matches the essay genre and scoring scale.',
  content: 'Paste the essay text or upload a TXT, MD, DOCX or text-based PDF file.',
  review: 'Confirm the prompt and content before dispatching automated scoring.',
};

const isAcceptedFile = (file: File): boolean => {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
};

export const SubmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<Step>('prompt');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [promptId, setPromptId] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    setIsLoadingPrompts(true);
    setPromptsError(null);
    try {
      const data = await getPrompts();
      setPrompts(data);
    } catch (err) {
      setPromptsError(formatApiError(err).message);
    } finally {
      setIsLoadingPrompts(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === promptId) ?? null,
    [prompts, promptId]
  );

  const isFileMode = selectedFile !== null;
  const hasContent = isFileMode ? true : content.trim().length > 0;

  const nextStep = () => {
    setError(null);
    if (step === 'prompt') {
      if (!promptId) {
        setError('Please select a rubric prompt.');
        return;
      }
      setStep('content');
      return;
    }
    if (step === 'content') {
      if (!isFileMode && !content.trim()) {
        setError('Please enter the essay text or upload a document.');
        return;
      }
      setStep('review');
    }
  };

  const prevStep = () => {
    setError(null);
    if (step === 'content') setStep('prompt');
    if (step === 'review') setStep('content');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError('Unsupported file type. Upload a TXT, MD, DOCX or text-based PDF.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('File size must be 20 MB or smaller.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    setContent('');
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = isFileMode
        ? await submitEssay(
            (() => {
              const form = new FormData();
              form.append('prompt_id', promptId);
              form.append('file', selectedFile as File);
              return form;
            })()
          )
        : await submitEssay({ prompt_id: promptId, raw_text: content });

      try {
        await dispatchScoring(response.id);
        toast.success('Essay submitted', 'Scoring has been queued for this essay.');
      } catch (dispatchError) {
        toast.error(
          'Essay saved, but scoring was not queued',
          formatApiError(dispatchError).message
        );
      }
      navigate(`/essays/${response.id}`);
    } catch (err) {
      setError(formatApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentIndex = STEPS.indexOf(step);
  const canContinue = step === 'prompt' ? Boolean(promptId) : hasContent;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-canvas px-4 pt-6">
      <div className="max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <PenTool className="w-5 h-5 text-ink-500" />
          <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">Submit Essay</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-heading leading-tight mb-2">{STEP_TITLES[step]}</h1>
        <p className="text-lg text-muted leading-relaxed">{STEP_DESCRIPTIONS[step]}</p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <li key={s} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-[color:var(--border-base)]" aria-hidden />}
                <span
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border
                    ${isDone ? 'bg-ink-500 border-ink-500 text-white' : ''}
                    ${isCurrent ? 'bg-surface border-ink-500 text-ink-500' : ''}
                    ${!isDone && !isCurrent ? 'border-faint text-tertiary' : ''}`}
                >
                  {i + 1}
                </span>
                <span className={`text-xs ${isCurrent ? 'font-semibold text-heading' : 'text-tertiary'}`}>
                  {STEP_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {step === 'prompt' && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              {isLoadingPrompts ? (
                <div className="flex items-center gap-2 text-sm text-muted py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading prompts…
                </div>
              ) : promptsError ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-error-border bg-error-bg text-error-text text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{promptsError}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadPrompts}>
                    Retry
                  </Button>
                </div>
              ) : prompts.length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">
                  No prompts are available. An administrator must seed the prompt catalogue first.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted">Select one of the available ASAP benchmark prompts.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {prompts.map((prompt) => {
                      const isSelected = promptId === prompt.id;
                      return (
                        <button
                          key={prompt.id}
                          type="button"
                          onClick={() => setPromptId(prompt.id)}
                          className={`flex flex-col gap-1.5 p-4 rounded-lg border text-left transition-colors
                            ${isSelected ? 'border-ink-500 bg-ink-50' : 'border-base bg-surface hover:bg-surface-level'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-tertiary">P{prompt.asap_set_id}</span>
                            <span className="text-xs font-medium text-muted">
                              {prompt.rubric_min} – {prompt.rubric_max}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-heading">{prompt.title}</span>
                          <span className="text-xs text-tertiary">{prompt.genre}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
            <div className="p-5 border-t border-base flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={nextStep}
                disabled={!promptId || isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Content
              </Button>
            </div>
          </Card>
        )}

        {step === 'content' && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <Textarea
                  id="essay-content"
                  label="Essay Text"
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Paste the essay text here…"
                  showCount
                  maxCharacters={MAX_ESSAY_CHARACTERS}
                  disabled={isFileMode}
                  error={error ?? undefined}
                  className="h-64"
                />

                <div className="rounded-lg border border-base p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="sr-only"
                      accept={ACCEPTED_EXTENSIONS.join(',')}
                    />
                    <span className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-faint group-hover:border-base">
                      <UploadCloud className="w-4 h-4 text-tertiary" />
                      <span className="text-xs font-medium text-muted">Upload a document instead</span>
                    </span>
                    <span className="text-[11px] text-tertiary">TXT, MD, DOCX, text-based PDF · max 20 MB</span>
                  </label>

                  {selectedFile && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-base bg-surface-level">
                      <FileText className="w-4 h-4 text-tertiary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-heading truncate">{selectedFile.name}</div>
                        <div className="text-[10px] text-tertiary">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · text extracted server-side
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-1 text-tertiary hover:text-danger-600"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-error-border bg-error-bg text-error-text text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
            <div className="p-5 border-t border-base flex justify-between">
              <Button variant="outline" size="sm" onClick={prevStep}>
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={nextStep}
                disabled={!canContinue}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Review
              </Button>
            </div>
          </Card>
        )}

        {step === 'review' && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-tertiary uppercase tracking-wider">Rubric Prompt</dt>
                  <dd className="mt-1 text-body">
                    <span className="font-mono text-tertiary mr-2">P{selectedPrompt?.asap_set_id ?? '—'}</span>
                    {selectedPrompt?.title ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-tertiary uppercase tracking-wider">Rubric Scale</dt>
                  <dd className="mt-1 text-body font-mono">
                    {selectedPrompt ? `${selectedPrompt.rubric_min} – ${selectedPrompt.rubric_max}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-tertiary uppercase tracking-wider">Source</dt>
                  <dd className="mt-1 text-body">{isFileMode ? 'Document upload' : 'Pasted text'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-tertiary uppercase tracking-wider">Length</dt>
                  <dd className="mt-1 text-body">
                    {isFileMode
                      ? selectedFile?.name
                      : `${content.trim().split(/\s+/).filter(Boolean).length} words · ${content.length} characters`}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">
                  {isFileMode ? 'Document' : 'Content Preview'}
                </p>
                <div className="rounded-lg border border-base p-4 bg-surface h-48 overflow-y-auto text-sm text-body leading-relaxed font-serif whitespace-pre-wrap">
                  {isFileMode ? selectedFile?.name : content}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-error-border bg-error-bg text-error-text text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
            <div className="p-5 border-t border-base flex justify-between">
              <Button variant="outline" size="sm" onClick={prevStep} disabled={isSubmitting}>
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                loadingText="Submitting…"
                leftIcon={<PenTool className="w-4 h-4" />}
              >
                Submit for Scoring
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
};

export default SubmissionPage;
