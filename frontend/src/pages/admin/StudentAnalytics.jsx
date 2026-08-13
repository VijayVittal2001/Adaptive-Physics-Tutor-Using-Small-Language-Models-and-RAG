import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { dashboardService } from '../../services/dashboardService';
import { BarChart3, Eye, GraduationCap, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const StudentAnalytics = () => {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getStudents();
      setStudents(res.data || []);
      if ((res.data || []).length) loadDetail(res.data[0].id);
    } catch (e) {
      setMessage(e.message || 'Could not load students');
    } finally { setLoading(false); }
  };

  const loadDetail = async (id) => {
    try { const res = await dashboardService.getStudentPerformance(id); setSelected(res.data); }
    catch (e) { setMessage(e.message || 'Could not load student performance'); }
  };

  useEffect(() => { loadStudents(); }, []);

  const topicData = (selected?.performance?.topicWiseScore || []).map(x => ({ name: x.topic?.length > 16 ? `${x.topic.slice(0,16)}...` : x.topic, score: x.score }));
  const bloomData = (selected?.performance?.bloomLevelPerformance || []).map(x => ({ name: x.level, score: x.score }));

  return (
    <div className="space-y-8">
      <PageHeader title="Class Performance Dashboard" subtitle="Admin can view all registered students and drill down into each student's topic-wise, Bloom-wise and marks-wise performance." badge="Admin Analytics" />
      {message && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold">{message}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-4"><div className="flex items-center gap-2 border-b border-slate-50 pb-3"><Users size={17} className="text-indigo-600"/><h3 className="text-sm font-extrabold text-slate-800">Registered Students</h3></div>{loading ? <div className="py-8 text-center text-xs font-bold text-slate-400">Loading...</div> : students.length === 0 ? <div className="py-8 text-center text-xs font-bold text-slate-400">No students registered yet.</div> : <div className="space-y-3 max-h-[520px] overflow-y-auto">{students.map(s => <button key={s.id} onClick={() => loadDetail(s.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.student?.id === s.id ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100 hover:bg-white'}`}><div className="flex items-center justify-between gap-3"><div><b className="text-sm text-slate-800 block">{s.name}</b><span className="text-[11px] text-slate-500">{s.email}</span></div><Eye size={14} className="text-indigo-600"/></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px]"><span className="bg-white rounded-lg px-2 py-1 font-bold text-slate-600">Attempted: {s.totalAttempted}</span><span className="bg-white rounded-lg px-2 py-1 font-bold text-slate-600">Avg: {s.averageScore}%</span></div></button>)}</div>}</div>
        <div className="lg:col-span-2 space-y-6">{selected ? <><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5"><GraduationCap className="text-indigo-600 mb-2"/><span className="text-xs font-bold text-slate-400 uppercase">Student</span><b className="block text-xl text-slate-800">{selected.student.name}</b><span className="text-xs text-slate-500">{selected.student.email}</span></div><div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5"><BarChart3 className="text-emerald-600 mb-2"/><span className="text-xs font-bold text-slate-400 uppercase">Average Score</span><b className="block text-3xl text-slate-800">{selected.performance.averagePercentage}%</b></div><div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-5"><Users className="text-sky-600 mb-2"/><span className="text-xs font-bold text-slate-400 uppercase">Attempts</span><b className="block text-3xl text-slate-800">{selected.performance.totalQuestionsAttempted}</b></div></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[320px]"><h3 className="text-sm font-bold text-slate-800 mb-4">Topic-wise Score</h3>{topicData.length ? <ResponsiveContainer width="100%" height="240"><BarChart data={topicData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" fontSize={10}/><YAxis domain={[0,100]} fontSize={10}/><Tooltip/><Bar dataKey="score" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer> : <div className="h-52 flex items-center justify-center text-xs font-bold text-slate-400">No topic score yet</div>}</div><div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft h-[320px]"><h3 className="text-sm font-bold text-slate-800 mb-4">Bloom-level Score</h3>{bloomData.length ? <ResponsiveContainer width="100%" height="240"><BarChart data={bloomData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" fontSize={10}/><YAxis domain={[0,100]} fontSize={10}/><Tooltip/><Bar dataKey="score" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer> : <div className="h-52 flex items-center justify-center text-xs font-bold text-slate-400">No Bloom score yet</div>}</div></div><div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6"><h3 className="text-sm font-bold text-slate-800 mb-4">Recent Submissions</h3>{selected.performance.recentSubmissions?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-slate-400 uppercase border-b border-slate-100"><th className="pb-3">Question</th><th className="pb-3">Topic</th><th className="pb-3">Marks</th><th className="pb-3">% </th></tr></thead><tbody className="divide-y divide-slate-50">{selected.performance.recentSubmissions.map((r,i) => <tr key={i}><td className="py-3 max-w-sm font-semibold text-slate-700">{r.question}</td><td className="py-3">{r.topic}</td><td className="py-3 font-bold">{r.marksObtained}/{r.maxMarks}</td><td className="py-3 font-bold text-indigo-600">{r.percentage}%</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-400 font-semibold">No submissions yet.</p>}</div></> : <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-12 text-center text-xs font-bold text-slate-400">Select a student to view dashboard.</div>}</div>
      </div>
    </div>
  );
};
export default StudentAnalytics;
