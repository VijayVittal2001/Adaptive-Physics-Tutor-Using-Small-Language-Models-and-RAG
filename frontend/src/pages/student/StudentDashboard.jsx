import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { ChapterCard } from '../../components/student/ChapterCard';
import { RecommendationCard } from '../../components/student/RecommendationCard';
import { dashboardService } from '../../services/dashboardService';
import { pdfService } from '../../services/pdfService';
import { BookOpen, Award, Clock, PenTool, Sparkles, ArrowRight } from 'lucide-react';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsRes, chapterRes] = await Promise.all([
          dashboardService.getStudentStats(),
          pdfService.getChapters()
        ]);
        setStats(statsRes.data || {});
        setChapters(chapterRes.data || []);
      } catch (e) {
        setError(e.message || 'Backend not reachable. Start FastAPI backend first.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const advice = [];
  if (stats?.weakTopics?.length) {
    advice.push({
      title: `Revise ${stats.weakTopics[0].topic || 'weak topic'}`,
      description: 'Your previous submission score is low in this topic. Open the topic, watch video if uploaded, then attempt questions again.',
      type: 'practice',
      difficulty: 'Focus',
      actionLabel: 'Practice Now',
      action: () => navigate('/student/practice')
    });
  }
  if (chapters.length) {
    advice.push({
      title: 'Continue uploaded PDF chapter',
      description: `${chapters[0].title} is available from the admin-uploaded PDF. Study it from the PDF + RAG workspace.`,
      type: 'study',
      difficulty: 'Ready',
      actionLabel: 'Open Chapter',
      action: () => navigate('/student/pdf-viewer', { state: { chapter: chapters[0] } })
    });
  }
  if (!advice.length) {
    advice.push({
      title: 'No study content uploaded yet',
      description: 'Ask admin to upload and process a knowledge PDF, then add questions and videos topic-wise.',
      type: 'info',
      difficulty: 'Waiting',
      actionLabel: 'Refresh',
      action: () => window.location.reload()
    });
  }


  const journeySteps = [
    { label: 'Learn', desc: 'Read uploaded PDF' },
    { label: 'Understand', desc: 'Ask RAG doubts' },
    { label: 'Practice', desc: 'Attempt topic questions' },
    { label: 'Evaluate', desc: 'Get score + answer' },
    { label: 'Improve', desc: 'Watch related video' },
    { label: 'Succeed', desc: 'Track performance' }
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Student Study Dashboard" subtitle="Only admin-uploaded chapters, videos, questions and your own performance are shown here. No demo chapter cards are hardcoded." badge="Live Student Dashboard" />
      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Available Chapters" value={stats?.chaptersAvailable ?? chapters.length} icon={BookOpen} description="From processed PDFs" trend={`${stats?.topicsAvailable || 0} topics`} trendType="neutral" colorTheme="indigo" />
        <StatCard title="Concept Mastery" value={`${stats?.masteryScore || 0}%`} icon={Award} description="Your average score" trend={stats?.testsCompleted ? 'Based on submissions' : 'Not attempted yet'} trendType={stats?.testsCompleted ? 'positive' : 'neutral'} colorTheme="emerald" />
        <StatCard title="Study Time" value={stats?.timeSpentThisWeek || 'Tracked after submissions'} icon={Clock} description="Active learning" trend="Live after practice" trendType="neutral" colorTheme="sky" />
        <StatCard title="Questions Attempted" value={stats?.testsCompleted || 0} icon={PenTool} description="MCQ + descriptive" trend={`${stats?.questionsAvailable || 0} available`} trendType="positive" colorTheme="amber" />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
        <div className="mb-4"><h3 className="text-sm font-bold text-slate-800 font-display">Your Learning Flow</h3><p className="text-[11px] text-slate-400 font-medium">This is the actual sequence used in this project.</p></div>
        <div className="relative"><div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block z-0"></div><div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">{journeySteps.map((step, idx) => <div key={idx} className="flex flex-col items-center text-center bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-xl border border-slate-100 md:border-none"><div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm">{idx + 1}</div><span className="text-xs font-bold text-slate-800 mt-2.5 block">{step.label}</span><span className="text-[9px] text-slate-400 font-semibold mt-0.5 block max-w-[100px] leading-normal">{step.desc}</span></div>)}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center"><h3 className="text-sm font-extrabold text-slate-800 tracking-tight font-display">Core Chapter Browse</h3><Link to="/student/learn" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"><span>View all chapters</span><ArrowRight size={12} /></Link></div>
          {chapters.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-8 text-center"><h3 className="font-extrabold text-slate-800">No uploaded chapter available</h3><p className="text-xs text-slate-500 mt-2">After admin uploads and processes a PDF, chapters will automatically appear here.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{chapters.slice(0, 4).map(ch => <ChapterCard key={ch.id} chapter={ch} onSelect={() => navigate('/student/interactive', { state: { chapter: ch } })} />)}</div>}
        </div>
        <div className="space-y-6"><div className="flex items-center space-x-1.5 text-slate-800"><Sparkles size={16} className="text-indigo-600" /><h3 className="text-sm font-extrabold font-display">Study Advice</h3></div><div className="space-y-4">{advice.map((rec, i) => <RecommendationCard key={i} recommendation={rec} onAction={rec.action} />)}</div></div>
      </div>
    </div>
  );
};
export default StudentDashboard;
