import axios from 'axios';
import {
  EssayCreatePayload,
  EssayCreateResponse,
  EssayDetailResponse,
  EssayListResponse,
  EssayScoreResponse,
  JobDispatchResponse,
  JobResponse,
  Prompt,
  ReviewerOverridePayload,
  LoginPayload,
  AuthResponse,
  UserProfile,
  EvaluationDashboardData,
  JobStatusCounts,
  DashboardSummary,
} from './types';

// Export all types from index for convenient importing
export * from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// WHY: Configures Axios HTTP client with base URL pointing to reverse proxy or FastAPI backend (/api/v1)
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// WHY: Request interceptor automatically attaches the stored JWT Bearer token to all outgoing API requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aes_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized received, auto-logout and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('aes_token');
      localStorage.removeItem('aes_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Submit an essay (pasted text or uploaded document).
 * POST /api/v1/essays
 */
export const submitEssay = async (
  data: EssayCreatePayload | FormData
): Promise<EssayCreateResponse> => {
  const isFormData = data instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  const response = await apiClient.post<EssayCreateResponse>('/essays', data, config);
  return response.data;
};

/**
 * Retrieve the seeded ASAP prompts with rubric bounds.
 * GET /api/v1/prompts
 */
export const getPrompts = async (): Promise<Prompt[]> => {
  const response = await apiClient.get<Prompt[]>('/prompts');
  return response.data;
};

/**
 * Retrieve a page of essays with optional search, filters and pagination.
 * GET /api/v1/essays
 */
export const getEssays = async (params?: {
  page?: number;
  page_size?: number;
  q?: string;
  status?: string;
  prompt_id?: string;
}): Promise<EssayListResponse> => {
  const response = await apiClient.get<EssayListResponse>('/essays', { params });
  return response.data;
};

/**
 * Retrieve essay details by UUID.
 * GET /api/v1/essays/{id}
 */
export const getEssay = async (id: string): Promise<EssayDetailResponse> => {
  const response = await apiClient.get<EssayDetailResponse>(`/essays/${id}`);
  return response.data;
};

/**
 * Dispatch an asynchronous scoring job for an essay.
 * POST /api/v1/essays/{id}/score
 */
export const dispatchScoring = async (essayId: string): Promise<JobDispatchResponse> => {
  const response = await apiClient.post<JobDispatchResponse>(`/essays/${essayId}/score`);
  return response.data;
};

/**
 * Retrieve execution status of a background scoring job.
 * GET /api/v1/jobs/{job_id}
 */
export const getJobStatus = async (jobId: string): Promise<JobResponse> => {
  const response = await apiClient.get<JobResponse>(`/jobs/${jobId}`);
  return response.data;
};

/**
 * Retrieve the most recent scoring job for an essay (used to resume polling).
 * GET /api/v1/essays/{id}/jobs/latest
 */
export const getLatestEssayJob = async (essayId: string): Promise<JobResponse> => {
  const response = await apiClient.get<JobResponse>(`/essays/${essayId}/jobs/latest`);
  return response.data;
};

/**
 * Retrieve the holistic score, rubric band, confidence, and dimension-level feedback.
 * GET /api/v1/essays/{id}/score
 */
export const getEssayScore = async (essayId: string): Promise<EssayScoreResponse> => {
  const response = await apiClient.get<EssayScoreResponse>(`/essays/${essayId}/score`);
  return response.data;
};

/**
 * Submit human reviewer score override and justification.
 * POST /api/v1/essays/{id}/review
 */
export const submitReview = async (
  essayId: string,
  payload: ReviewerOverridePayload
): Promise<EssayScoreResponse> => {
  const response = await apiClient.post<EssayScoreResponse>(`/essays/${essayId}/review`, payload);
  return response.data;
};

/**
 * Authenticate with email and password to retrieve a JWT access token.
 * POST /api/v1/auth/login
 */
export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  return response.data;
};

/**
 * Retrieve current authenticated user profile.
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/auth/me');
  return response.data;
};

/**
 * Retrieve complete Model Evaluation Dashboard data.
 * GET /api/v1/analytics/evaluation
 */
export const getEvaluationDashboard = async (): Promise<EvaluationDashboardData> => {
  const response = await apiClient.get<EvaluationDashboardData>('/analytics/evaluation');
  return response.data;
};

/**
 * Retrieve live essay and score KPIs for the dashboard.
 * GET /api/v1/analytics/summary
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>('/analytics/summary');
  return response.data;
};

/**
 * Poll live job queue status counts.
 * GET /api/v1/analytics/jobs
 */
export const getJobStatusCounts = async (): Promise<JobStatusCounts> => {
  const response = await apiClient.get<JobStatusCounts>('/analytics/jobs');
  return response.data;
};


