import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { pdfService } from '../../services/pdfService';
import { videoService } from '../../services/videoService';
import { Link2, PlaySquare, RefreshCw, Save, Trash2, UploadCloud, Video } from 'lucide-react';
import { API_ORIGIN } from '../../services/api';

export const VideoGenerationPipeline = () => {
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mode, setMode] = useState('upload');
  const [chapterId, setChapterId] = useState('all');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const loadChapters = async () => {
    try { const res = await pdfService.getChapters(); setChapters(res.data || []); } catch { setChapters([]); }
  };
  const loadTopics = async (ch = 'all') => {
    try {
      const res = await pdfService.getTopics(ch || 'all');
      const data = res.data || [];
      setTopics(data);
      if (data.length && !topicId) {
        setTopicId(data[0].id);
        setChapterId(data[0].chapterId || ch);
      }
    } catch { setTopics([]); }
  };
  const loadVideos = async () => {
    try { const res = await videoService.getAdminVideos({ chapterId: chapterId === 'all' ? undefined : chapterId, topicId: topicId || undefined }); setVideos(res.data || []); } catch (e) { setMessage(e.message || 'Could not load videos'); }
  };

  useEffect(() => { loadChapters(); loadTopics('all'); }, []);
  useEffect(() => { loadVideos(); }, [topicId]);

  const changeChapter = async (value) => {
    setChapterId(value);
    setTopicId('');
    await loadTopics(value);
  };

  const saveVideo = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage('');
    try {
      if (!topicId) throw new Error('Select topic first. Process a PDF if topics are empty.');
      if (mode === 'upload') {
        if (!file) throw new Error('Choose a video file');
        await videoService.uploadVideo({ file, topicId, chapterId, title, description });
      } else {
        await videoService.addYoutubeVideo({ topicId, chapterId, title, description, youtubeUrl });
      }
      setMessage('Video saved and mapped to selected topic.');
      setTitle(''); setDescription(''); setYoutubeUrl(''); setFile(null);
      await loadVideos();
    } catch (err) {
      setMessage(err.message || 'Video save failed');
    } finally { setSaving(false); }
  };

  const removeVideo = async (id) => {
    if (!confirm('Delete this video mapping?')) return;
    try { await videoService.deleteVideo(id); setVideos(videos.filter(v => v.id !== id)); setMessage('Video deleted.'); }
    catch (e) { setMessage(e.message || 'Delete failed'); }
  };

  const playableUrl = (v) => {
    const url = v.embedUrl || v.url;
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Topic Video Management" subtitle="Upload your own video or paste a YouTube link. The selected topic will show this video inside the student application." badge="Admin Video Upload" />
      {message && <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl px-5 py-3 text-xs font-bold">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={saveVideo} className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4"><Video size={18} className="text-indigo-600"/><h3 className="font-extrabold text-sm text-slate-800">Add Topic Video</h3></div>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Chapter</span><select value={chapterId} onChange={e => changeChapter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="all">All Chapters</option>{chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.title}</option>)}</select></label>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Topic</span><select required value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none"><option value="">Select topic</option>{topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100"><button type="button" onClick={() => setMode('upload')} className={`rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 ${mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><UploadCloud size={13}/>Upload</button><button type="button" onClick={() => setMode('youtube')} className={`rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 ${mode === 'youtube' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Link2 size={13}/>YouTube</button></div>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Video Title</span><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Enter your video title" /></label>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Description optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" /></label>
          {mode === 'upload' ? <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">Video File</span><input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold outline-none" /></label> : <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-slate-400">YouTube URL</span><input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm outline-none" placeholder="https://www.youtube.com/watch?v=..." /></label>}
          <button disabled={saving || !topicId} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center justify-center gap-2"><Save size={14}/>{saving ? 'Saving...' : 'Save Topic Video'}</button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-soft p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4"><div className="flex items-center gap-2"><PlaySquare size={18} className="text-indigo-600"/><h3 className="font-extrabold text-sm text-slate-800">Videos mapped to selected topic</h3></div><button onClick={loadVideos} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><RefreshCw size={12}/>Refresh</button></div>
          {videos.length === 0 ? <div className="py-16 text-center text-xs font-bold text-slate-400">No video added yet for this topic. Add your own upload or YouTube link.</div> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">{videos.map(v => <div key={v.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/40"><div className="aspect-video bg-slate-950 relative">{v.videoType === 'youtube' ? <iframe title={v.title} src={playableUrl(v)} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video controls className="absolute inset-0 w-full h-full object-contain bg-black"><source src={playableUrl(v)} type={v.mimeType || 'video/mp4'} /></video>}</div><div className="p-4 space-y-2"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-800">{v.title}</h4><p className="text-[11px] text-slate-500 mt-1">{v.description || v.summary}</p></div><button onClick={() => removeVideo(v.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button></div><span className="inline-flex text-[10px] uppercase font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">{v.videoType}</span></div></div>)}</div>}
        </div>
      </div>
    </div>
  );
};
export default VideoGenerationPipeline;
