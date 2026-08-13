import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { StudentLayout } from '../layouts/StudentLayout';

// Auth Page
import { Login } from '../pages/auth/Login';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { ContentManagement } from '../pages/admin/ContentManagement';
import { KnowledgeBase } from '../pages/admin/KnowledgeBase';
import { QuestionPaperManagement } from '../pages/admin/QuestionPaperManagement';
import { RAGEngineMonitor } from '../pages/admin/RAGEngineMonitor';
import { HybridEvaluationEngine } from '../pages/admin/HybridEvaluationEngine';
import { VideoGenerationPipeline } from '../pages/admin/VideoGenerationPipeline';
import { StudentAnalytics } from '../pages/admin/StudentAnalytics';
import { Reports } from '../pages/admin/Reports';
import { SystemSettings } from '../pages/admin/SystemSettings';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { LearnPhysics } from '../pages/student/LearnPhysics';
import { PdfKnowledgeViewer } from '../pages/student/PdfKnowledgeViewer';
import { VideoLearning } from '../pages/student/VideoLearning';
import { TopicVideo } from '../pages/student/TopicVideo';
import { PracticeTest } from '../pages/student/PracticeTest';
import { AnswerEvaluation } from '../pages/student/AnswerEvaluation';
import { ProgressAnalytics } from '../pages/student/ProgressAnalytics';
import { Recommendations } from '../pages/student/Recommendations';
import SemiconductorPage from '../pages/SemiconductorPage';
import { InteractiveModules } from '../pages/student/InteractiveModules';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Layout & Page */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Administrator Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="content" element={<ContentManagement />} />
        <Route path="knowledge-base" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="question-paper" element={<QuestionPaperManagement />} />
        <Route path="rag-monitor" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="evaluation" element={<Navigate to="/admin/question-paper" replace />} />
        <Route path="video-pipeline" element={<VideoGenerationPipeline />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Student Protected Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="learn" element={<LearnPhysics />} />
        <Route path="pdf-viewer" element={<PdfKnowledgeViewer />} />
        <Route path="videos" element={<VideoLearning />} />
        <Route path="interactive" element={<InteractiveModules />} />
        <Route path="video/:topicId" element={<TopicVideo />} />
        <Route path="practice" element={<PracticeTest />} />
        <Route path="evaluation/:questionId" element={<AnswerEvaluation />} />
        <Route path="analytics" element={<ProgressAnalytics />} />
        <Route path="recommendations" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="semiconductor" element={<SemiconductorPage />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
export default AppRoutes;
