import { apiRequest } from './api';

export const ragService = {
  askQuestion: async (queryText, options = {}) => {
    return await apiRequest('/rag/ask', {
      method: 'POST',
      body: JSON.stringify({ question: queryText, ...options })
    });
  }
};
