import React, { useState } from 'react';
import { EssayScoreResponse, submitReview } from '../../api';

export type UserRole = 'TEACHER' | 'STUDENT';

interface ReviewerOverridePanelProps {
  essayId: string;
  scoreData: EssayScoreResponse;
  onReviewSubmitted: (updatedScore: EssayScoreResponse) => void;
  initialRole?: UserRole;
}

export const ReviewerOverridePanel: React.FC<ReviewerOverridePanelProps> = ({
  essayId,
  scoreData,
  onReviewSubmitted,
  initialRole = 'TEACHER',
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [overrideScore, setOverrideScore] = useState<string>(
    scoreData.reviewerOverrideScore !== null && scoreData.reviewerOverrideScore !== undefined
      ? String(scoreData.reviewerOverrideScore)
      : String(scoreData.holisticScore.toFixed(1))
  );
  const [overrideReason, setOverrideReason] = useState<string>(
    scoreData.reviewerOverrideReason || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(
    !scoreData.reviewerOverrideScore && !scoreData.reviewerOverrideReason
  );

  const hasExistingOverride =
    scoreData.reviewerOverrideScore !== null &&
    scoreData.reviewerOverrideScore !== undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    const parsedScore = parseFloat(overrideScore);
    if (isNaN(parsedScore)) {
      setError('Please provide a valid numeric override score.');
      return;
    }

    if (!overrideReason.trim()) {
      setError('Reviewer override reason is required for pedagogical auditing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedScore = await submitReview(essayId, {
        reviewer_override_score: parsedScore,
        reviewer_override_reason: overrideReason.trim(),
      });

      setSuccessMessage('Reviewer override applied and essay finalized successfully!');
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
      className="bg-slate-800/90 border border-slate-700 rounded-xl p-5 shadow-lg backdrop-blur space-y-4"
    >
      {/* Header with Role Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Reviewer Override Panel
          </h3>
        </div>

        {/* Role Selector */}
        <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700/60 text-[11px]">
          <span className="text-slate-400 px-1.5 font-medium">Role:</span>
          <button
            type="button"
            id="role-selector-teacher"
            onClick={() => setRole('TEACHER')}
            className={`px-2.5 py-0.5 rounded font-semibold transition ${
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
            className={`px-2.5 py-0.5 rounded font-semibold transition ${
              role === 'STUDENT'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            STUDENT
          </button>
        </div>
      </div>

      {/* Role Restriction Banner (if STUDENT) */}
      {role !== 'TEACHER' ? (
        <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-lg text-xs text-slate-400 space-y-2">
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
        <div className="space-y-3.5">
          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded text-xs">
              {error}
            </div>
          )}

          {successMessage && (
            <div
              id="override-success-banner"
              className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded text-xs"
            >
              {successMessage}
            </div>
          )}

          {hasExistingOverride && !isEditing ? (
            /* Finalized / Existing Override View */
            <div id="override-finalized-card" className="space-y-3">
              <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Score Finalized with Teacher Override
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {scoreData.reviewerOverrideScore?.toFixed(2)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-900/40 p-2.5 rounded border border-slate-700/40">
                  &ldquo;{scoreData.reviewerOverrideReason}&rdquo;
                </p>

                {scoreData.reviewerOverrideAt && (
                  <div className="text-[10px] text-slate-400 font-mono text-right">
                    Finalized at: {new Date(scoreData.reviewerOverrideAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  id="btn-edit-override"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium underline"
                >
                  Modify Override
                </button>
              </div>
            </div>
          ) : (
            /* Teacher Override Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">

          {/* Override Score Input */}
          <div>
            <label
              htmlFor="reviewer-override-score-input"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Adjusted Score (Holistic Override)
            </label>
            <div className="relative">
              <input
                id="reviewer-override-score-input"
                type="number"
                step="0.1"
                value={overrideScore}
                onChange={(e) => setOverrideScore(e.target.value)}
                placeholder="e.g. 9.5"
                disabled={isSubmitting}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-500">
                AI Score: {scoreData.holisticScore.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Override Reason Input (Required) */}
          <div>
            <label
              htmlFor="reviewer-override-reason-input"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Pedagogical Reason / Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="reviewer-override-reason-input"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why the automated score was adjusted (required for pedagogical auditing)..."
              disabled={isSubmitting}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || !overrideReason.trim() || !overrideScore}
              className="ml-auto px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Finalizing...</span>
                </>
              ) : (
                <span>Submit Override &amp; Finalize</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )}
</div>
);
};

export default ReviewerOverridePanel;
