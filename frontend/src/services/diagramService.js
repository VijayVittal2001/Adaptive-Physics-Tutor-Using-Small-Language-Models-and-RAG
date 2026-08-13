import { apiRequest } from './api';

export const diagramService = {
  uploadTask: async (chapter, topic, taskDescription, file) => {
    const form = new FormData();
    form.append('chapter', chapter);
    form.append('topic', topic);
    form.append('task_description', taskDescription);
    if (file) {
      form.append('file', file);
    }
    return await apiRequest('/diagrams/tasks/upload', { method: 'POST', body: form });
  },

  getTasks: async (chapter = 'all') => {
    const qs = chapter && chapter !== 'all' ? `?chapter=${encodeURIComponent(chapter)}` : '';
    return await apiRequest(`/diagrams/tasks${qs}`);
  },

  submitDiagram: async (topicId, taskId, imageBase64) => {
    return await apiRequest('/diagrams/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId, task_id: taskId, image_base64: imageBase64 }),
    });
  }
};
