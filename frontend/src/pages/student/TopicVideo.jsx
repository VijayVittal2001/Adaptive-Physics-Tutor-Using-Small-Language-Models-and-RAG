import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { VideoPlayerCard } from '../../components/student/VideoPlayerCard';
import { videoService } from '../../services/videoService';
import { AlertCircle } from 'lucide-react';

export const TopicVideo = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    videoService.getVideos(topicId).then(res => {
      const found = res.data?.find(v => v.topicId === topicId) || res.data?.[0] || null;
      setCurrentVideo(found);
    }).catch((e) => setError(e.message || 'Video backend not reachable')).finally(() => setLoading(false));
  }, [topicId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Topic Video" subtitle="This page shows the real video uploaded by the administrator for the selected PDF topic." badge="Uploaded Topic Video" />
      <div className="max-w-3xl mx-auto w-full">
        {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}
        {loading ? <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div> : currentVideo ? <VideoPlayerCard video={currentVideo} onTakePractice={() => navigate('/student/practice')} /> : <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-10 text-center"><h3 className="font-extrabold text-slate-800">No video uploaded for this topic</h3><p className="text-xs text-slate-500 mt-2">Ask admin to upload a topic video from Content Management and map it to this detected topic.</p></div>}
      </div>
    </div>
  );
};
export default TopicVideo;
