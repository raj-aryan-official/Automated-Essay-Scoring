import axios from 'axios';
import {
  EssayCreatePayload,
  EssayCreateResponse,
  EssayDetailResponse,
  EssayScoreResponse,
  JobDispatchResponse,
  JobResponse,
} from './types';

// Export all types from index for convenient importing
export * from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Request & Response logging interceptors for debugging and verification
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[HTTP Response] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`[HTTP Response Error] ${error.response?.status || 'Network Error'} ${error.config?.url}:`, error.response?.data || error.message);
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
  console.log('[API Call] submitEssay executing...');
  const isFormData = data instanceof FormData;
  const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  const response = await apiClient.post<EssayCreateResponse>('/essays', data, config);
  console.log('[API Call] submitEssay success:', response.data);
  return response.data;
};

/**
 * Retrieve essay details by UUID.
 * GET /api/v1/essays/{id}
 */
export const getEssay = async (id: string): Promise<EssayDetailResponse> => {
  console.log(`[API Call] getEssay executing for id: ${id}...`);
  const response = await apiClient.get<EssayDetailResponse>(`/essays/${id}`);
  console.log('[API Call] getEssay success:', response.data);
  return response.data;
};

/**
 * Dispatch an asynchronous scoring job for an essay.
 * POST /api/v1/essays/{id}/score
 */
export const dispatchScoring = async (essayId: string): Promise<JobDispatchResponse> => {
  console.log(`[API Call] dispatchScoring executing for essayId: ${essayId}...`);
  const response = await apiClient.post<JobDispatchResponse>(`/essays/${essayId}/score`);
  console.log('[API Call] dispatchScoring success:', response.data);
  return response.data;
};

/**
 * Retrieve execution status of a background scoring job.
 * GET /api/v1/jobs/{job_id}
 */
export const getJobStatus = async (jobId: string): Promise<JobResponse> => {
  console.log(`[API Call] getJobStatus executing for jobId: ${jobId}...`);
  const response = await apiClient.get<JobResponse>(`/jobs/${jobId}`);
  console.log('[API Call] getJobStatus success:', response.data);
  return response.data;
};

/**
 * Retrieve the holistic score, rubric band, confidence, and dimension-level feedback.
 * GET /api/v1/essays/{id}/score
 */
export const getEssayScore = async (essayId: string): Promise<EssayScoreResponse> => {
  console.log(`[API Call] getEssayScore executing for essayId: ${essayId}...`);
  const response = await apiClient.get<EssayScoreResponse>(`/essays/${essayId}/score`);
  console.log('[API Call] getEssayScore success:', response.data);
  return response.data;
};
