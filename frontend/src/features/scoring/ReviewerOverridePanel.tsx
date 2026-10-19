import React, { useState, useMemo } from 'react';
import { EssayScoreResponse, submitReview } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Slider } from '../../components/ui';
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Bot,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';

export type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN' | 'ML_ENGINEER' | 'VIEWER';

export interface AuditTrailItem {
  id: string;
  type: 'AI_INFERENCE' | 'TEACHER_OVERRIDE';
  who: string;
  role?: string;
  when: string;
  score: number;
  oldScore?: number;
  rubricBand?: string;
  reason?: string;
  delta?: number;
}

export interface ReviewerOverridePanelProps {
  essayId: string;
  scoreData: EssayScoreResponse;
  onReviewSubmitted: (updatedScore: EssayScoreResponse) => void;
  initialRole?: UserRole;
  className?: string;
}

const QUICK_REASONS = [
  'Argument stronger than detected',
  'Grammar over-penalized',
  'Nuanced thesis unrecognized',
  'Coherence flow under-scored',
  'Contextual evidence exemplary',
  'Prompt constraints misunderstood',
];

const MIN_REASON_CHARS = 15;

// WHY: Human-in-the-loop Reviewer Override Panel with side-by-side delta, rubric bounds slider/stepper, mandatory rationale with character minimum & chips, confirmation modal, and audit trail timeline.
export const ReviewerOverridePanel: React.FC<ReviewerOverridePanelProps> = ({
  essayId,
  scoreData,
  onReviewSubmitted,
  initialRole = 'TEACHER',
  className = '',
}) => {
  const { user } = useAuth();

  // Role simulation state (for previewing student experience & E2E compatibility)
  const [role, setRole] = useState<UserRole>(initialRole);

  const rubricMin = scoreData.rubricMin ?? 2.0;
  const rubricMax = scoreData.rubricMax ?? 12.0;

  // Initial override score
  const initialOverrideVal = useMemo<number>(() => {
    if (scoreData.reviewerOverrideScore !== null && scoreData.reviewerOverrideScore !== undefined) {
      return Number(scoreData.reviewerOverrideScore);
    }
    return Number(scoreData.holisticScore.toFixed(1));
  }, [scoreData.reviewerOverrideScore, scoreData.holisticScore]);

  const [overrideScoreNum, setOverrideScoreNum] = useState<number>(initialOverrideVal);
  const [overrideReason, setOverrideReason] = useState<string>(
    scoreData.reviewerOverrideReason || ''
  );

  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(
    !scoreData.reviewerOverrideScore && !scoreData.reviewerOverrideReason
  );

  // Score difference delta
  const delta = useMemo(() => {
    return +(overrideScoreNum - scoreData.holisticScore).toFixed(2);
  }, [overrideScoreNum, scoreData.holisticScore]);

  const deltaFormatted = useMemo(() => {
    if (delta > 0) return `+${delta.toFixed(2)}`;
    if (delta < 0) return `${delta.toFixed(2)}`;
    return '±0.00';
  }, [delta]);

  const hasExistingOverride =
    scoreData.reviewerOverrideScore !== null &&
    scoreData.reviewerOverrideScore !== undefined;

  // Character minimum validation
  const reasonCharCount = overrideReason.trim().length;
  const isReasonValid = reasonCharCount >= MIN_REASON_CHARS;

  // Stepper handlers
  const handleDecrement = () => {
    setOverrideScoreNum((prev) => Math.max(rubricMin, +(prev - 0.5).toFixed(1)));
  };

  const handleIncrement = () => {
    setOverrideScoreNum((prev) => Math.min(rubricMax, +(prev + 0.5).toFixed(1)));
  };

  // Quick-select chip handler
  const handleSelectChip = (chip: string) => {
    setOverrideReason((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.includes(chip)) return trimmed;
      return `${trimmed}; ${chip}`;
    });
    setError(null);
  };

  // Validation before opening modal
  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(overrideScoreNum) || overrideScoreNum < rubricMin || overrideScoreNum > rubricMax) {
      setError(`Override score must be between ${rubricMin} and ${rubricMax} (rubric range).`);
      return;
    }

    if (!isReasonValid) {
      setError(`A minimum of ${MIN_REASON_CHARS} characters is required for pedagogical auditing.`);
      return;
    }

    setIsConfirmOpen(true);
  };

  // Final submit execution (triggered from Confirm Modal or direct submit)
  const executeSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    try {
      setIsSubmitting(true);
      const updatedScore = await submitReview(essayId, {
        reviewer_override_score: overrideScoreNum,
        reviewer_override_reason: overrideReason.trim(),
      });

      setSuccessMessage('Reviewer override applied and essay finalized successfully!');
      setIsConfirmOpen(false);
      setIsEditing(false);
      onReviewSubmitted(updatedScore);
    } catch (err: any) {
      console.error('[ReviewerOverridePanel] Failed to submit review:', err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to submit reviewer override.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="reviewer-override-panel"
      className={`bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur space-y-4 ${className}`}
    >
      {/* ===================================================================
          HEADER: Title, Audit Badge, and Role Simulation Selector
          =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Reviewer Override Panel
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Rubric Range: {rubricMin.toFixed(1)} – {rubricMax.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Role Switcher (Maintained for testing and role previews) */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[11px]">
          <span className="text-slate-500 px-1 font-medium text-[10px]">Role:</span>
          <button
            type="button"
            id="role-selector-teacher"
            onClick={() => setRole('TEACHER')}
            className={`px-2 py-0.5 rounded font-semibold text-[10px] transition ${
              role === 'TEACHER'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TEACHER
          </button>
          <button
            type="button"
            id="role-selector-student"
            onClick={() => setRole('STUDENT')}
            className={`px-2 py-0.5 rounded font-semibold text-[10px] transition ${
              role === 'STUDENT'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            STUDENT
          </button>
        </div>
      </div>

      {/* ===================================================================
          ROLE RESTRICTION BANNER (When simulated as STUDENT)
          =================================================================== */}
      {role !== 'TEACHER' ? (
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-2">
          <p>
            You are viewing this workspace in <span className="font-semibold text-slate-300">STUDENT</span> mode. Manual score overrides and rubric adjustments require the <span className="font-semibold text-purple-400">TEACHER</span> role.
          </p>
          <button
            type="button"
            onClick={() => setRole('TEACHER')}
            className="text-purple-400 hover:text-purple-300 font-semibold underline"
          >
            Switch to TEACHER role to submit override &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div
              id="override-success-banner"
              className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ===================================================================
              AUDIT TRAIL TIMELINE (When override is finalized and not editing)
              =================================================================== */}
          {hasExistingOverride && !isEditing ? (
            <div id="override-finalized-card" className="space-y-4">
              <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Audit Trail Timeline
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold">
                    FINALIZED
                  </span>
                </div>

                {/* Timeline Events */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                  {/* Event 1: Automated Model Inference */}
                  <div className="relative text-xs space-y-1">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-primary-500 flex items-center justify-center">
                      <Bot className="w-2.5 h-2.5 text-primary-400" />
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-semibold text-slate-300">Automated AI Assessment</span>
                      <span className="text-[10px] font-mono">
                        v{scoreData.modelVersion || '1.4.0'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Initial Holistic Score:{' '}
                      <span className="text-white font-bold">
                        {scoreData.holisticScore.toFixed(2)}
                      </span>{' '}
                      / {rubricMax.toFixed(1)} ({scoreData.rubricBand})
                    </div>
                  </div>

                  {/* Event 2: Human Educator Override */}
                  <div className="relative text-xs space-y-1.5">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center">
                      <UserCheck className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">
                        {user?.email || 'Teacher (Reviewer)'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {scoreData.reviewerOverrideAt
                          ? new Date(scoreData.reviewerOverrideAt).toLocaleString()
                          : 'Recorded'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
                      <span className="text-slate-400">Transition:</span>
                      <span className="line-through text-slate-500 font-mono">
                        {scoreData.holisticScore.toFixed(2)}
                      </span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="text-white font-mono font-bold text-sm">
                        {scoreData.reviewerOverrideScore?.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                        {deltaFormatted}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      &ldquo;{scoreData.reviewerOverrideReason}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button: Modify Override */}
              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-edit-override"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-purple-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modify Override</span>
                </button>
              </div>
            </div>
          ) : (
            /* ===================================================================
                TEACHER OVERRIDE FORM: Side-by-side, Stepper/Slider, Chips, Modal
                =================================================================== */
            <form onSubmit={handleOpenConfirmModal} className="space-y-4">
              {/* 1. SIDE-BY-SIDE SCORE & DELTA COMPARISON */}
              <div className="grid grid-cols-11 items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                {/* AI Score */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    AI Holistic Score
                  </div>
                  <div className="text-lg font-black font-mono text-slate-200">
                    {scoreData.holisticScore.toFixed(2)}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      / {rubricMax.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {scoreData.rubricBand}
                  </span>
                </div>

                {/* Delta Pill */}
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <div
                    className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-md border text-[10px] font-mono font-bold transition-colors ${
                      delta > 0
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : delta < 0
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Score difference between human override and AI baseline"
                  >
                    {delta > 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : delta < 0 ? (
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                    ) : (
                      <span className="text-[10px] leading-none">±</span>
                    )}
                    <span className="text-[9px] mt-0.5 leading-none">{deltaFormatted}</span>
                  </div>
                </div>

                {/* Override Score */}
                <div className="col-span-5 text-center p-2 rounded-lg bg-purple-950/20 border border-purple-500/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-0.5">
                    Adjusted Override
                  </div>
                  <div className="text-lg font-black font-mono text-purple-200">
                    {overrideScoreNum.toFixed(2)}
                    <span className="text-xs font-normal text-purple-400/60 ml-1">
                      / {rubricMax.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Human Calibrated
                  </span>
                </div>
              </div>

              {/* 2. STEPPER & SLIDER BOUNDED BY RUBRIC RANGE */}
              <div className="space-y-2 p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="reviewer-override-score-input"
                    className="font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <span>Override Score</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({rubricMin} – {rubricMax})
                    </span>
                  </label>

                  {/* Stepper Buttons & Numeric Input */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={isSubmitting || overrideScoreNum <= rubricMin}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      title="Decrease by 0.5"
                      aria-label="Decrease score"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      id="reviewer-override-score-input"
                      type="number"
                      step="0.1"
                      min={rubricMin}
                      max={rubricMax}
                      value={overrideScoreNum}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setOverrideScoreNum(
                            Math.max(rubricMin, Math.min(rubricMax, +(val).toFixed(2)))
                          );
                        }
                      }}
                      disabled={isSubmitting}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center font-mono text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />

                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={isSubmitting || overrideScoreNum >= rubricMax}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                      title="Increase by 0.5"
                      aria-label="Increase score"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Slider */}
                <Slider
                  min={rubricMin}
                  max={rubricMax}
                  step={0.1}
                  value={overrideScoreNum}
                  onChange={(val) => setOverrideScoreNum(+val.toFixed(2))}
                  formatValue={(v) => `${v.toFixed(1)} / ${rubricMax}`}
                  disabled={isSubmitting}
                />
              </div>

              {/* 3. MANDATORY REASON FIELD WITH CHARACTER MINIMUM & QUICK CHIPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor="reviewer-override-reason-input"
                    className="font-bold text-slate-300 flex items-center gap-1"
                  >
                    <span>Pedagogical Reason</span>
                    <span className="text-rose-400">*</span>
                  </label>

                  {/* Character Counter */}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                      isReasonValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {reasonCharCount} / {MIN_REASON_CHARS} chars min
                  </span>
                </div>

                <textarea
                  id="reviewer-override-reason-input"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => {
                    setOverrideReason(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Explain why the automated score was adjusted (required for pedagogical auditing)..."
                  disabled={isSubmitting}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition leading-relaxed"
                />

                {/* Quick-Select Reason Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Quick-select rationale:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REASONS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSelectChip(chip)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. ACTIONS: CANCEL / SUBMIT (Opens Confirmation Modal) */}
              <div className="flex items-center justify-between pt-1">
                {hasExistingOverride && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-slate-400 hover:text-slate-300 transition"
                  >
                    Cancel
                  </button>
                )}

                <button
                  id="btn-submit-override"
                  type="submit"
                  disabled={isSubmitting || !isReasonValid}
                  className="ml-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Review &amp; Submit Override</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ===================================================================
          5. CONFIRMATION MODAL BEFORE SUBMIT (Prompt 10)
          =================================================================== */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Score Override & Finalization"
        description="Verify pedagogical score adjustments before committing to the institutional audit trail."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition"
            >
              Back to Edit
            </button>
            <button
              id="btn-confirm-override"
              type="button"
              onClick={executeSubmit}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Finalizing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm &amp; Finalize Override</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div id="confirm-override-modal" className="space-y-4 text-xs">
          {/* Comparison Summary Card */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold">Target Essay:</span>
              <span className="font-mono text-purple-300 font-bold">
                #essay-{essayId.slice(0, 8)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Original AI</span>
                <span className="font-mono text-sm font-bold text-slate-300">
                  {scoreData.holisticScore.toFixed(2)}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">Adjustment</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    delta > 0
                      ? 'text-emerald-400'
                      : delta < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {deltaFormatted}
                </span>
              </div>

              <div className="p-2 rounded bg-purple-950/40 border border-purple-500/30">
                <span className="text-[10px] text-purple-300 block mb-0.5">New Score</span>
                <span className="font-mono text-sm font-bold text-purple-200">
                  {overrideScoreNum.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Reason Quote */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Audit Rationale:
            </span>
            <p className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 italic leading-relaxed">
              &ldquo;{overrideReason}&rdquo;
            </p>
          </div>

          {/* Audit Notice */}
          <div className="p-2.5 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 flex items-start gap-2 text-[11px] leading-relaxed">
            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary-400" />
            <span>
              Submitting this override transitions the essay status to{' '}
              <strong className="text-white">FINALIZED</strong> and creates an immutable audit trail entry logged with your reviewer account.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewerOverridePanel;
