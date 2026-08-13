import { apiRequest } from './api';

export const htmlService = {
  uploadHtml: async (file, chapter, topic, subtopic, module_type = 'visualization') => {
    const form = new FormData();
    form.append('file', file);
    form.append('chapter', chapter);
    form.append('topic', topic);
    if (subtopic) form.append('subtopic', subtopic);
    form.append('module_type', module_type);
    return await apiRequest('/html/upload', { method: 'POST', body: form });
  },
  
  getModules: async (chapter = 'all', module_type = '') => {
    const params = new URLSearchParams();
    if (chapter && chapter !== 'all') params.append('chapter', chapter);
    if (module_type) params.append('module_type', module_type);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/html/list${qs}`);
  }
};
