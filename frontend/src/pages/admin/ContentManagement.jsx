import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { UploadBox } from '../../components/common/UploadBox';
import { StatusPill } from '../../components/common/StatusPill';
import { pdfService } from '../../services/pdfService';
import { videoService } from '../../services/videoService';
import { htmlService } from '../../services/htmlService';
import { diagramService } from '../../services/diagramService';
import { FileText, Cpu, RefreshCw, AlertCircle, Video, UploadCloud, CheckCircle, Trash2, PenTool, LayoutTemplate } from 'lucide-react';

export const ContentManagement = () => {
  const [files, setFiles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [processLogs, setProcessLogs] = useState([]);
  const [error, setError] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoTopicId, setVideoTopicId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoSuccess, setVideoSuccess] = useState('');

  // Interactive HTML Upload State
  const [htmlFile, setHtmlFile] = useState(null);
  const [htmlChapterId, setHtmlChapterId] = useState('');
  const [htmlTopicId, setHtmlTopicId] = useState('');
  const [htmlSubtopicId, setHtmlSubtopicId] = useState('');
  const [htmlSubtopics, setHtmlSubtopics] = useState([]);
  const [htmlUploading, setHtmlUploading] = useState(false);

  // Simulator HTML Upload State
  const [simFile, setSimFile] = useState(null);
  const [simChapterId, setSimChapterId] = useState('');
  const [simTopicId, setSimTopicId] = useState('');
  const [simUploading, setSimUploading] = useState(false);

  // Diagram Practice Task State
  const [diagramFile, setDiagramFile] = useState(null);
  const [diagramChapterId, setDiagramChapterId] = useState('');
  const [diagramTopicId, setDiagramTopicId] = useState('');
  const [diagramTaskDescription, setDiagramTaskDescription] = useState('');
  const [diagramUploading, setDiagramUploading] = useState(false);

  useEffect(() => {
    if (htmlTopicId) {
      pdfService.getSubtopics(htmlTopicId).then(res => setHtmlSubtopics(res.data || [])).catch(() => setHtmlSubtopics([]));
    } else {
      setHtmlSubtopics([]);
    }
  }, [htmlTopicId]);

  const handleHtmlUpload = async () => {
    if (!htmlFile || !htmlChapterId || !htmlTopicId) {
      setError('Select a chapter, topic, and HTML file.');
      return;
    }
    setHtmlUploading(true);
    setVideoSuccess('');
    setError('');
    try {
      const chapterName = files.find(f => f.id === htmlChapterId)?.name || htmlChapterId;
      const topicName = topics.find(t => t.id === htmlTopicId)?.title || htmlTopicId;
      const subtopicName = htmlSubtopics.find(s => s.id === htmlSubtopicId)?.title || '';
      
      await htmlService.uploadHtml(htmlFile, chapterName, topicName, subtopicName);
      setVideoSuccess(`Interactive module mapped successfully!`);
      setHtmlFile(null);
      setHtmlTopicId('');
      setHtmlSubtopicId('');
    } catch (e) {
      setError('HTML upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setHtmlUploading(false);
    }
  };

  const handleSimUpload = async () => {
    if (!simFile || !simChapterId || !simTopicId) {
      setError('Select a chapter, topic, and HTML file for simulator.');
      return;
    }
    setSimUploading(true);
    setVideoSuccess('');
    setError('');
    try {
      const chapterName = files.find(f => f.id === simChapterId)?.name || simChapterId;
      const topicName = topics.find(t => t.id === simTopicId)?.title || simTopicId;
      
      await htmlService.uploadHtml(simFile, chapterName, topicName, '', 'simulator');
      setVideoSuccess(`Simulator module mapped successfully!`);
      setSimFile(null);
      setSimTopicId('');
    } catch (e) {
      setError('Simulator upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSimUploading(false);
    }
  };

  const handleDiagramUpload = async () => {
    if (!diagramChapterId || !diagramTopicId || !diagramTaskDescription) {
      setError('Select a chapter, topic, and enter task description for diagram practice.');
      return;
    }
    setDiagramUploading(true);
    setVideoSuccess('');
    setError('');
    try {
      const chapterName = files.find(f => f.id === diagramChapterId)?.name || diagramChapterId;
      const topicName = topics.find(t => t.id === diagramTopicId)?.title || diagramTopicId;
      
      await diagramService.uploadTask(chapterName, topicName, diagramTaskDescription, diagramFile);
      setVideoSuccess(`Diagram practice task created successfully!`);
      setDiagramFile(null);
      setDiagramTopicId('');
      setDiagramTaskDescription('');
    } catch (e) {
      setError('Diagram task upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setDiagramUploading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      setError('');
      const res = await pdfService.getFiles();
      setFiles(res.data || []);
    } catch (e) {
      setError(e.message || 'Could not load files. Start backend first.');
    } finally { setLoading(false); }
  };

  const fetchTopics = async () => {
    try {
      const res = await pdfService.getTopics('all');
      setTopics(res.data || []);
      if (!videoTopicId && res.data?.[0]?.id) setVideoTopicId(res.data[0].id);
    } catch {
      setTopics([]);
    }
  };

  useEffect(() => { fetchFiles(); fetchTopics(); }, []);

  const handleProcessFile = async (fileId) => {
    setProcessingId(fileId);
    setProcessLogs([]);
    try {
      await pdfService.processFile(fileId, (updatedFile) => {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updatedFile } : f));
        setProcessLogs(prev => [...prev, `${updatedFile.message || updatedFile.status} (${updatedFile.progress || 0}%)`]);
      });
      await fetchFiles();
      await fetchTopics();
    } catch (err) {
      setError('Processing failed: ' + err.message);
      await fetchFiles();
    } finally { setProcessingId(null); }
  };

  const handleUploadSuccess = async (newFile) => {
    setFiles(prev => [newFile, ...prev]);
    setProcessLogs([`Upload completed: ${newFile.name}`, 'Automatic real-time ingestion started by administrator panel...']);
    await handleProcessFile(newFile.id);
  };

  const handleDeleteFile = async (fileId, fileType) => {
    if (fileType !== 'Question Paper PDF') return;
    if (!confirm('Are you sure you want to delete this Question Bank and all its extracted questions?')) return;
    try {
      await pdfService.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setProcessLogs(prev => [...prev, 'Question Bank deleted successfully.']);
      await fetchTopics();
    } catch (err) {
      setError('Delete failed: ' + err.message);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !videoTopicId) {
      setError('Select both a topic and a video file.');
      return;
    }
    setVideoUploading(true);
    setVideoSuccess('');
    setError('');
    try {
      const res = await videoService.uploadVideo({ file: videoFile, topicId: videoTopicId, title: videoTitle });
      setVideoSuccess(`Video mapped successfully: ${res.data?.title || videoFile.name}`);
      setVideoFile(null);
      setVideoTitle('');
      await fetchTopics();
    } catch (e) {
      setError('Video upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setVideoUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Content Management & Real-Time Ingestion" subtitle="Upload PDFs and topic videos once from administrator panel. Student screens read only the processed local backend data." badge="Production Ingestion" />

      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}
      {videoSuccess && <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><CheckCircle size={15}/>{videoSuccess}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <UploadBox type="Knowledge PDF" title="Upload NCERT Knowledge PDF" subtitle="Textbook chapters or study notes" onUploadSuccess={handleUploadSuccess} />
          <UploadBox type="Question Paper PDF" title="Upload Question Paper PDF" subtitle="Practice mock tests, board formats or question banks" onUploadSuccess={handleUploadSuccess} />
          <UploadBox type="Knowledge PDF" title="Upload Formula Sheet PDF" subtitle="Quick reference formulas for the workspace" onUploadSuccess={handleUploadSuccess} />

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-2 text-slate-800"><Video size={16} className="text-indigo-600"/><h3 className="text-sm font-bold font-display">Upload Topic Video</h3></div>
            <p className="text-[11px] text-slate-400 font-medium">First process a Knowledge PDF. Then select its detected topic and upload MP4/WebM/MOV. Student will see it under that topic.</p>
            <select value={videoTopicId} onChange={(e) => setVideoTopicId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
              <option value="">Select detected topic</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title} · p.{t.pageStart}</option>)}
            </select>
            <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Optional video title" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400" />
            <label className="border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-slate-50/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
              <UploadCloud size={22} className="text-indigo-600 mb-2"/>
              <span className="text-xs font-bold text-slate-700">{videoFile ? videoFile.name : 'Choose topic video'}</span>
              <span className="text-[10px] text-slate-400 mt-1">mp4, webm, mov, m4v, avi, mkv</span>
              <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v,.avi,.mkv" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            </label>
            <button disabled={videoUploading || !videoFile || !videoTopicId} onClick={handleVideoUpload} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {videoUploading && <RefreshCw size={12} className="animate-spin"/>}<span>{videoUploading ? 'Uploading video...' : 'Upload & Map Video to Topic'}</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 mt-6">
            <div className="flex items-center gap-2 text-slate-800"><Cpu size={16} className="text-indigo-600"/><h3 className="text-sm font-bold font-display">Upload Interactive HTML Module</h3></div>
            <p className="text-[11px] text-slate-400 font-medium">Upload custom interactive HTML files mapped to specific chapters, topics, and subtopics.</p>
            
            <select value={htmlChapterId} onChange={(e) => { setHtmlChapterId(e.target.value); setHtmlTopicId(''); setHtmlSubtopicId(''); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
              <option value="">Select Chapter (PDF)</option>
              {files.filter(f => f.type === 'Knowledge PDF').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            
            <select value={htmlTopicId} onChange={(e) => { setHtmlTopicId(e.target.value); setHtmlSubtopicId(''); }} disabled={!htmlChapterId} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50">
              <option value="">Select Topic</option>
              {topics.filter(t => t.uploadId === htmlChapterId || !t.uploadId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>

            {htmlSubtopics.length > 0 && (
              <select value={htmlSubtopicId} onChange={(e) => setHtmlSubtopicId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
                <option value="">Optional: Select Subtopic</option>
                {htmlSubtopics.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
            
            <label className="border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-slate-50/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
              <UploadCloud size={22} className="text-indigo-600 mb-2"/>
              <span className="text-xs font-bold text-slate-700">{htmlFile ? htmlFile.name : 'Choose HTML file'}</span>
              <span className="text-[10px] text-slate-400 mt-1">.html</span>
              <input type="file" accept=".html,text/html" className="hidden" onChange={(e) => setHtmlFile(e.target.files?.[0] || null)} />
            </label>
            
            <button disabled={htmlUploading || !htmlFile || !htmlChapterId || !htmlTopicId} onClick={handleHtmlUpload} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {htmlUploading && <RefreshCw size={12} className="animate-spin"/>}<span>{htmlUploading ? 'Uploading HTML...' : 'Upload HTML Module'}</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 mt-6">
            <div className="flex items-center gap-2 text-slate-800"><LayoutTemplate size={16} className="text-indigo-600"/><h3 className="text-sm font-bold font-display">Upload Simulator HTML</h3></div>
            <p className="text-[11px] text-slate-400 font-medium">Upload custom interactive simulator files mapped to specific topics.</p>
            
            <select value={simChapterId} onChange={(e) => { setSimChapterId(e.target.value); setSimTopicId(''); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
              <option value="">Select Chapter (PDF)</option>
              {files.filter(f => f.type === 'Knowledge PDF').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            
            <select value={simTopicId} onChange={(e) => setSimTopicId(e.target.value)} disabled={!simChapterId} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50">
              <option value="">Select Topic</option>
              {topics.filter(t => t.uploadId === simChapterId || !t.uploadId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            
            <label className="border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-slate-50/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
              <UploadCloud size={22} className="text-indigo-600 mb-2"/>
              <span className="text-xs font-bold text-slate-700">{simFile ? simFile.name : 'Choose Simulator HTML file'}</span>
              <span className="text-[10px] text-slate-400 mt-1">.html</span>
              <input type="file" accept=".html,text/html" className="hidden" onChange={(e) => setSimFile(e.target.files?.[0] || null)} />
            </label>
            
            <button disabled={simUploading || !simFile || !simChapterId || !simTopicId} onClick={handleSimUpload} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {simUploading && <RefreshCw size={12} className="animate-spin"/>}<span>{simUploading ? 'Uploading Simulator...' : 'Upload Simulator'}</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4 mt-6">
            <div className="flex items-center gap-2 text-slate-800"><PenTool size={16} className="text-indigo-600"/><h3 className="text-sm font-bold font-display">Create Diagram Practice Task</h3></div>
            <p className="text-[11px] text-slate-400 font-medium">Add a task description and optional reference image for Air Diagram Practice.</p>
            
            <select value={diagramChapterId} onChange={(e) => { setDiagramChapterId(e.target.value); setDiagramTopicId(''); }} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400">
              <option value="">Select Chapter (PDF)</option>
              {files.filter(f => f.type === 'Knowledge PDF').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            
            <select value={diagramTopicId} onChange={(e) => setDiagramTopicId(e.target.value)} disabled={!diagramChapterId} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50">
              <option value="">Select Topic</option>
              {topics.filter(t => t.uploadId === diagramChapterId || !t.uploadId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>

            <textarea value={diagramTaskDescription} onChange={(e) => setDiagramTaskDescription(e.target.value)} placeholder="Task Description (e.g. Draw a P-N junction diode under forward bias)" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400 min-h-[80px]" />
            
            <label className="border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-slate-50/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all">
              <UploadCloud size={22} className="text-indigo-600 mb-2"/>
              <span className="text-xs font-bold text-slate-700">{diagramFile ? diagramFile.name : 'Optional Reference Image'}</span>
              <span className="text-[10px] text-slate-400 mt-1">.jpg, .png</span>
              <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => setDiagramFile(e.target.files?.[0] || null)} />
            </label>
            
            <button disabled={diagramUploading || !diagramChapterId || !diagramTopicId || !diagramTaskDescription} onClick={handleDiagramUpload} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {diagramUploading && <RefreshCw size={12} className="animate-spin"/>}<span>{diagramUploading ? 'Uploading Task...' : 'Create Diagram Task'}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-sm font-bold text-slate-800 font-display">Uploaded PDF Databases</h3><p className="text-[11px] text-slate-400 font-medium">Real backend synchronization status</p></div>
              <button onClick={() => { fetchFiles(); fetchTopics(); }} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">Refresh</button>
            </div>
            {loading ? <div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div> : files.length === 0 ? <div className="text-center py-10"><p className="text-slate-400 text-xs font-semibold uppercase">No documents uploaded yet</p></div> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-xs border-collapse"><thead><tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider"><th className="pb-3 font-semibold">Document Details</th><th className="pb-3 font-semibold">Classification</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Sync</th><th className="pb-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-slate-50 font-medium">
                {files.map(file => <tr key={file.id} className="hover:bg-slate-50/50 transition-colors"><td className="py-4 flex items-center space-x-3 max-w-[230px] truncate"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><FileText size={16}/></div><div className="truncate"><span className="text-slate-800 font-bold block truncate">{file.name}</span><span className="text-[10px] text-slate-400 block mt-0.5">{file.size} | {file.pagesCount || 0} pages | {file.chunksCount || file.questionsCount || 0} indexed</span></div></td><td className="py-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${file.type === 'Knowledge PDF' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{file.type}</span></td><td className="py-4"><StatusPill status={file.status}/></td><td className="py-4"><div className="flex items-center space-x-2"><div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200"><div className="bg-indigo-600 h-full rounded-full" style={{ width: `${file.progress || 0}%` }}></div></div><span className="text-[10px] text-slate-500 font-bold">{file.progress || 0}%</span></div></td><td className="py-4 text-right flex items-center justify-end gap-2">{file.status !== 'Ready' && file.status !== 'Failed' ? <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600"><RefreshCw size={10} className="animate-spin"/>Syncing</span> : file.status === 'Failed' ? <button onClick={() => handleProcessFile(file.id)} className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold">Retry</button> : <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Vector Sync Ok</span>}{file.type === 'Question Paper PDF' && <button onClick={() => handleDeleteFile(file.id, file.type)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Delete Question Bank"><Trash2 size={14}/></button>}</td></tr>)}
              </tbody></table></div>
            )}
          </div>

          {topics.length > 0 && <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft"><h3 className="text-sm font-bold text-slate-800 font-display mb-3">Detected Topic Map</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">{topics.map(t => <div key={t.id} className="border border-slate-100 rounded-xl p-3 text-xs"><div className="font-bold text-slate-700 line-clamp-2">{t.title}</div><div className="text-[10px] text-slate-400 mt-1">Page {t.pageStart} · {t.description}</div><div className="text-[10px] mt-1 font-bold text-indigo-600">Videos: {t.videosCount || 0}</div></div>)}</div></div>}

          {processLogs.length > 0 && <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-slate-300 font-mono text-[10px] space-y-2.5 shadow-premium"><div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase tracking-wider mb-2"><Cpu size={12}/><span>Live Local RAG Ingestion Pipeline</span></div>{processLogs.map((log, i)=><div key={i} className="flex items-start space-x-1.5"><span className="text-slate-500 font-extrabold shrink-0">&gt;&gt;</span><span className="leading-relaxed font-semibold">{log}</span></div>)}{processingId && <div className="flex items-center space-x-1.5 text-indigo-400 font-bold animate-pulse"><span className="text-slate-500 font-extrabold shrink-0">&gt;&gt;</span><span>Processing real PDF and synchronizing student workspace...</span></div>}</div>}
        </div>
      </div>
    </div>
  );
};
export default ContentManagement;
