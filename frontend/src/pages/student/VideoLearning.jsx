import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { VideoPlayerCard } from '../../components/student/VideoPlayerCard';
import { videoService } from '../../services/videoService';
import { pdfService } from '../../services/pdfService';
import { AlertCircle, SlidersHorizontal, Layers, PlayCircle } from 'lucide-react';

export const VideoLearning = () => {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [chapterId, setChapterId] = useState('all');
  const [topicId, setTopicId] = useState('all');
  
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChapters = async () => {
    try { const res = await pdfService.getChapters(); setChapters(res.data || []); } catch { setChapters([]); }
  };
  
  const loadTopics = async (ch = 'all') => {
    try { const res = await pdfService.getTopics(ch || 'all'); setTopics(res.data || []); } catch { setTopics([]); }
  };

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await videoService.getVideos(topicId !== 'all' ? topicId : null, chapterId !== 'all' ? chapterId : null);
      setVideos(res.data || []);
    } catch (e) {
      setVideos([]);
      setError(e.message || 'Could not load videos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadChapters(); loadTopics('all'); }, []);
  useEffect(() => { loadTopics(chapterId); setTopicId('all'); }, [chapterId]);
  useEffect(() => { fetchVideos(); }, [chapterId, topicId]);

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Video Learning" 
        subtitle="Watch topic-wise videos to master physics concepts." 
        badge="Video Library" 
      />
      
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center">
          <AlertCircle size={15}/>{error}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3">
          <SlidersHorizontal size={16} className="text-indigo-600"/>
          <h3 className="text-xs font-extrabold uppercase tracking-wider">Select Chapter & Topic</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Chapter</span>
            <select 
              value={chapterId} 
              onChange={e => setChapterId(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"
            >
              <option value="all">All Chapters</option>
              {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Topic</span>
            <select 
              value={topicId} 
              onChange={e => setTopicId(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none"
            >
              <option value="all">All Topics</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400">Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-12 text-center">
          <Layers className="mx-auto text-slate-300 mb-3"/>
          <h3 className="font-extrabold text-slate-800">No videos available</h3>
          <p className="text-xs text-slate-500 mt-2">Try selecting a different topic or ask admin to upload videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {videos.map(v => (
             <VideoPlayerCard key={v.id} video={v} onTakePractice={() => navigate('/student/practice')} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoLearning;
