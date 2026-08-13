import { apiRequest } from './api';

export const videoService = {
  getVideos: async (topicId = null, chapterId = null) => {
    const params = new URLSearchParams();
    if (topicId) params.set('topic_id', topicId);
    if (chapterId) params.set('chapter_id', chapterId);
    return await apiRequest(`/videos${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getAdminVideos: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.topicId) params.set('topic_id', filters.topicId);
    if (filters.chapterId) params.set('chapter_id', filters.chapterId);
    return await apiRequest(`/admin/videos${params.toString() ? `?${params.toString()}` : ''}`);
  },
  uploadVideo: async ({ file, topicId, chapterId, title, description }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('topic_id', topicId);
    if (chapterId) form.append('chapter_id', chapterId);
    if (title) form.append('title', title);
    if (description) form.append('description', description);
    return await apiRequest('/admin/videos/upload', { method: 'POST', body: form });
  },
  addYoutubeVideo: async ({ topicId, chapterId, title, description, youtubeUrl }) => {
    return await apiRequest('/admin/videos', {
      method: 'POST',
      body: JSON.stringify({ topicId, chapterId, title, description, videoType: 'youtube', youtubeUrl })
    });
  },
  deleteVideo: async (id) => await apiRequest(`/admin/videos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  generateVideo: async (topicId, onProgress) => {
    if (onProgress) onProgress({ stage: 'Saving script preview', progress: 70 });
    const res = await apiRequest('/video/generate-topic-video', { method: 'POST', body: JSON.stringify({ topicId }) });
    if (onProgress) onProgress({ stage: 'Finished', progress: 100 });
    return res;
  }
};
