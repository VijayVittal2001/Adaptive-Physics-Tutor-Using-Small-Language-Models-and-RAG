import { apiRequest } from './api';

const toQuery = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return params.toString();
};

export const questionService = {
  getQuestions: async (filters = {}) => {
    const qs = toQuery(filters);
    return await apiRequest(`/questions${qs ? `?${qs}` : ''}`);
  },
  getAdminQuestions: async (filters = {}) => {
    const qs = toQuery(filters);
    return await apiRequest(`/admin/questions${qs ? `?${qs}` : ''}`);
  },
  createQuestion: async (payload) => {
    return await apiRequest('/admin/questions', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateQuestion: async (id, payload) => {
    return await apiRequest(`/admin/questions/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteQuestion: async (id) => {
    return await apiRequest(`/admin/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  uploadQuestionMedia: async (id, { image, solutionVideo }) => {
    const fd = new FormData();
    if (image) fd.append('image', image);
    if (solutionVideo) fd.append('solution_video', solutionVideo);
    return await apiRequest(`/admin/questions/${encodeURIComponent(id)}/media`, { method: 'POST', body: fd });
  },
  submitAnswer: async ({ questionId, studentAnswer, selectedOption, telemetryData = {} }) => {
    return await apiRequest('/student/answers/submit', {
      method: 'POST',
      body: JSON.stringify({ questionId, studentAnswer, selectedOption, telemetryData })
    });
  },
  generateTest: async (settings) => {
    return await apiRequest('/test/generate', { method: 'POST', body: JSON.stringify(settings) });
  }
};
