import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { ChapterCard } from '../../components/student/ChapterCard';
import { pdfService } from '../../services/pdfService';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const LearnPhysics = () => {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChapters = useCallback(async () => {
    setLoading(true);
    try { setError(''); const res = await pdfService.getChapters(); setChapters(res.data || []); }
    catch (e) { setError(e.message || 'Could not load chapters from backend.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadChapters();
    const onFocus = () => loadChapters();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadChapters]);

  const handleSelectChapter = (chapter) => {
    navigate('/student/interactive', { state: { chapter } });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Uploaded Physics Knowledge Chapters" subtitle="These chapters come directly from the PDFs processed by the administrator. No mock chapters are shown here." badge="Live Curriculum" />
        <button onClick={loadChapters} className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl"><RefreshCw size={12}/>Refresh</button>
      </div>
      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}
      {loading ? <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div> : chapters.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-10 text-center"><h3 className="font-extrabold text-slate-800">No processed Physics PDF yet</h3><p className="text-xs text-slate-500 mt-2">Ask the administrator to upload a Knowledge PDF. After processing, chapters/topics will appear here automatically.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{chapters.map(chapter => <ChapterCard key={chapter.id} chapter={chapter} onSelect={handleSelectChapter} />)}</div>}
    </div>
  );
};
export default LearnPhysics;
