import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { dashboardService } from '../../services/dashboardService';
import { Users, FileText, BookOpen, HelpCircle, PlayCircle, Database, ArrowRight, AlertCircle } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true); setError('');
      try {
        const [statsRes, studentRes] = await Promise.all([
          dashboardService.getAdminStats(),
          dashboardService.getStudents()
        ]);
        setStats(statsRes.data || {});
        setStudents(studentRes.data || []);
      } catch (e) {
        setError(e.message || 'Could not load admin dashboard. Start backend first.');
      } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-8">
      <PageHeader title="Administrative Control Center" subtitle="Only real uploaded PDFs, stored chunks, manual questions, videos, and registered students are shown. No fixed chapter demo data." badge="Live Admin Dashboard" />
      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Registered Students" value={stats?.totalStudents || 0} icon={Users} description="Accounts created" trend="Live SQLite" trendType="neutral" colorTheme="indigo" />
        <StatCard title="Uploaded PDFs" value={stats?.uploadedPdfs || 0} icon={FileText} description={`${stats?.readyPdfs || 0} ready for RAG`} trend="Processed PDFs only appear to students" trendType="positive" colorTheme="sky" />
        <StatCard title="Processed Chapters" value={stats?.processedChapters || 0} icon={BookOpen} description={`${stats?.processedTopics || 0} topics detected`} trend="From uploaded PDF headings" trendType="neutral" colorTheme="emerald" />
        <StatCard title="Question Bank" value={stats?.generatedQuestions || 0} icon={HelpCircle} description="Manual MCQ/descriptive questions" trend={`${stats?.generatedVideos || 0} videos mapped`} trendType="positive" colorTheme="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4"><div><h3 className="text-sm font-extrabold text-slate-800">Registered Students Performance</h3><p className="text-xs text-slate-500 mt-1">Admin can see all students. Students can see only their own dashboard.</p></div><Link to="/admin/analytics" className="text-xs font-bold text-indigo-600 flex items-center gap-1">Full analytics <ArrowRight size={12}/></Link></div>
          {students.length === 0 ? <div className="py-12 text-center text-xs font-bold text-slate-400">No student registered yet.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-slate-400 uppercase tracking-wider border-b border-slate-100"><th className="pb-3">Student</th><th className="pb-3">Email</th><th className="pb-3">Attempted</th><th className="pb-3">Avg Score</th><th className="pb-3">Marks</th></tr></thead><tbody className="divide-y divide-slate-50">{students.slice(0,8).map(s => <tr key={s.id} className="hover:bg-slate-50"><td className="py-3 font-extrabold text-slate-800">{s.name}</td><td className="py-3 text-slate-500">{s.email}</td><td className="py-3 font-bold">{s.totalAttempted}</td><td className="py-3 font-bold text-indigo-600">{s.averageScore}%</td><td className="py-3 font-bold">{s.totalMarksScored}</td></tr>)}</tbody></table></div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-5">
          <div className="flex items-center gap-2"><Database size={18} className="text-indigo-600"/><h3 className="text-sm font-extrabold text-slate-800">Local RAG Store Status</h3></div>
          <div className="space-y-3 text-xs"><div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase">Vector chunks</span><b>{stats?.vectorChunks || 0}</b></div><div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase">Ready PDFs</span><b>{stats?.readyPdfs || 0}</b></div><div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase">Videos</span><b>{stats?.generatedVideos || 0}</b></div><div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-400 font-bold uppercase">Class Avg</span><b>{stats?.avgStudentScore || 0}%</b></div></div>
          <div className="grid grid-cols-1 gap-3 pt-2"><Link to="/admin/content" className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between transition-all">Upload / process PDF <FileText size={15}/></Link><Link to="/admin/question-paper" className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">Add questions <HelpCircle size={15}/></Link><Link to="/admin/video-pipeline" className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">Add videos <PlayCircle size={15}/></Link></div>
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
