/**
 * Type definitions matching the Automated Essay Scoring backend API (Section 7.2 & 8.2).
 */

export type SourceType = 'PASTE' | 'DOCUMENT';

export type EssayStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SCORED'
  | 'FEEDBACK_READY'
  | 'UNDER_REVIEW'
  | 'FINALIZED'
  | 'PROCESSING_FAILED';

export interface EssayCreatePayload {
  prompt_id: string;
  source_type?: SourceType;
  raw_text?: string;
  submitted_by?: string;
  storage_bucket?: string;
  storage_key?: string;
  file_content?: string;
  file_name?: string;
}

export interface EssayCreateResponse {
  id: string;
  status: EssayStatus | string;
  prompt_id: string;
  submitted_by: string;
  source_type: SourceType | string;
  raw_text: string;
  storage_bucket?: string | null;
  storage_key?: string | null;
  created_at: string;
  message?: string;
}

export interface EssayDetailResponse {
  id: string;
  prompt_id: string;
  submitted_by: string;
  raw_text: string;
  source_type: SourceType | string;
  storage_bucket?: string | null;
  storage_key?: string | null;
  status: EssayStatus | string;
  created_at: string;
  download_url?: string | null;
  prompt_title?: string | null;
}

export interface JobDispatchResponse {
  job_id: string;
  essay_id: string;
  status: string;
  job_type: string;
  message: string;
}

export interface JobResponse {
  id: string;
  job_id?: string;
  essay_id: string;
  job_type: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message?: string | null;
  queued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DimensionScoreDetail {
  dimension: string;
  score?: number | null;
  subScore?: number | null;
  feedback: string;
  feedbackText?: string | null;
}

export interface EssayScoreResponse {
  essayId: string;
  holisticScore: number;
  rubricBand: string;
  confidence: number;
  dimensions: DimensionScoreDetail[];
  modelVersion: string;
  reviewerOverrideScore?: number | null;
  reviewerOverrideReason?: string | null;
  reviewerOverrideAt?: string | null;
}

export interface ReviewerOverridePayload {
  reviewer_override_score: number;
  reviewer_override_reason: string;
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'ML_ENGINEER' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  email: string;
  user_id: string;
}

export interface PromptQwkResult {
  prompt_id: number;
  qwk: number;
  target_qwk: number;
  passed: boolean;
  genre: string;
  rubric_min: number;
  rubric_max: number;
  n_test_samples: number;
  sample_predictions?: Array<{
    essay_id: number;
    true_score: number;
    normalized_pred?: number;
    raw_pred?: number;
    rounded_score: number;
  }>;
}

export interface QwkSummary {
  average_qwk: number;
  target_qwk: number;
  all_passed: boolean;
  evaluated_prompts_count: number;
  passed_prompts_count: number;
  failed_prompts_count: number;
  timestamp?: string;
  prompts: PromptQwkResult[];
}

export interface LossCurvePoint {
  step: number;
  train_loss?: number;
  val_loss?: number;
  learning_rate?: number;
}

export interface JobStatusCounts {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface EvaluationDashboardData {
  qwk_summary: QwkSummary;
  loss_curves: Record<string, LossCurvePoint[]>;
  job_counts: JobStatusCounts;
}


