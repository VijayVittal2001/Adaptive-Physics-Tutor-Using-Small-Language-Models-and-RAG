import { apiRequest } from './api';

export const dashboardService = {
  getAdminStats: async () => await apiRequest('/admin/dashboard'),
  getStudents: async () => await apiRequest('/admin/students'),
  getStudentPerformance: async (studentId) => await apiRequest(`/admin/students/${encodeURIComponent(studentId)}/performance`),
  getStudentStats: async () => await apiRequest('/student/dashboard'),
  getBackendModules: async () => await apiRequest('/dashboard/modules')
};
