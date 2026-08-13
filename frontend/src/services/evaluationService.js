import { apiRequest } from './api';

export const evaluationService = {
  evaluateAnswer: async (questionId, studentAnswer, telemetryData = {}) => {
    return await apiRequest('/evaluate/answer', {
      method: 'POST',
      body: JSON.stringify({ questionId, studentAnswer, telemetryData })
    });
  }
};
