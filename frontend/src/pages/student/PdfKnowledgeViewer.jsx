import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { PdfViewerPanel } from '../../components/student/PdfViewerPanel';
import { RAGChatBox } from '../../components/student/RAGChatBox';
import { AirDiagramCanvas } from '../../components/student/AirDiagramCanvas';
import { pdfService } from '../../services/pdfService';
import { htmlService } from '../../services/htmlService';
import { diagramService } from '../../services/diagramService';
import { API_BASE } from '../../services/api';
import { BookOpen, PlayCircle, AlertCircle, RefreshCw, Cpu, Video, PenTool, FileText, X, LayoutTemplate, Hand, CheckCircle } from 'lucide-react';

export const PdfKnowledgeViewer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [chapter, setChapter] = useState(location.state?.chapter || null);
  const [pageNumber, setPageNumber] = useState(location.state?.chapter?.pageStart || 1);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [pageText, setPageText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const init = async () => {
    setLoading(true);
    try {
      setError('');
      let ch = chapter;
      if (!ch) {
        const chapters = await pdfService.getChapters();
        ch = chapters.data?.[0] || null;
        setChapter(ch);
      }
      if (ch) {
        const res = await pdfService.getTopics(ch.id, ch.uploadId);
        const loadedTopics = res.data || [];
        setTopics(loadedTopics);
        const first = loadedTopics[0] || null;
        setSelectedTopic(first);
        setPageNumber(first?.pageStart || ch.pageStart || 1);
      }
    } catch (e) { setError(e.message || 'Could not load PDF workspace.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { init(); }, []);

  useEffect(() => {
    const loadPageText = async () => {
      if (!chapter?.uploadId || !pageNumber) return;
      try {
        const res = await pdfService.getPageText(chapter.uploadId, pageNumber);
        setPageText(res.data?.text || '');
      } catch {
        setPageText('');
      }
    };
    loadPageText();
  }, [chapter?.uploadId, pageNumber]);

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    setPageNumber(topic.pageStart || 1);
  };

  const activeVideoTopic = selectedTopic || topics[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Live PDF Textbook + RAG Workspace" subtitle="This screen uses only the admin-uploaded PDF. Topics come from numbered PDF headings and every chunk is stored in the local embedding index." badge="Real Knowledge Viewer" />
        <button onClick={init} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white border-2 border-slate-200 px-4 py-2 rounded-full hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:shadow-none"><RefreshCw size={14} strokeWidth={2.5} />Refresh</button>
      </div>
      
      {error && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-3 text-xs font-bold flex gap-2 items-center"><AlertCircle size={15}/>{error}</div>}
      
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div></div>
      ) : !chapter ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center"><h3 className="font-extrabold text-slate-900 text-lg">No knowledge PDF available</h3><p className="text-sm text-slate-500 mt-2 font-medium">Administrator must upload and process a Knowledge PDF.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[90vh] min-h-[700px] overflow-y-auto">
            <div className="flex items-center space-x-2.5 text-slate-900 border-b-2 border-slate-100 pb-4 mb-4 flex-shrink-0"><BookOpen size={18} className="text-emerald-500" strokeWidth={2.5} /><h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Topics</h3></div>
            <div className="space-y-3 flex-1">{topics.length === 0 ? <p className="text-xs text-slate-500 font-semibold">No numbered topics found in this PDF.</p> : topics.map(topic => (
              <button key={topic.id} onClick={() => handleTopicClick(topic)} className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border-2 ${selectedTopic?.id === topic.id ? 'bg-white border-emerald-500 shadow-md transform -translate-y-1' : 'bg-[#F5F7FA] border-transparent hover:border-emerald-300 hover:shadow-sm hover:-translate-y-0.5 text-slate-700'}`}>
                <div className="flex justify-between items-start gap-2">
                  <span className={`line-clamp-2 max-w-[85%] text-sm ${selectedTopic?.id === topic.id ? 'font-black text-slate-900' : 'font-bold'}`}>{topic.title}</span>
                  <span className={`text-[10px] font-black shrink-0 ${selectedTopic?.id === topic.id ? 'text-emerald-600' : 'text-slate-400'}`}>P. {topic.pageStart || 1}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1.5 leading-relaxed">{topic.description}</div>
              </button>
            ))}</div>
          </div>
          
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-sm h-[90vh] min-h-[700px] flex flex-col overflow-hidden relative">
            <PdfViewerPanel 
              title={chapter.uploadName} 
              pdfUrl={chapter.pdfViewUrl} 
              pageNumber={pageNumber} 
              totalPages={chapter.totalPages || chapter.pageEnd || 1} 
              onPageChange={setPageNumber} 
              pageText={pageText} 
              selectedTopic={selectedTopic}
            />
          </div>
          
          <div className="lg:col-span-3 h-[90vh] min-h-[700px]">
            <RAGChatBox 
              key={selectedTopic?.id || chapter.id} 
              defaultTopic={selectedTopic?.title || chapter.title} 
              chapterId={chapter.id} 
              topicId={selectedTopic?.id} 
              onWatchVideo={activeVideoTopic?.videosCount > 0 ? () => navigate(`/student/video/${activeVideoTopic.id}`) : null} 
              onPracticeTest={null} 
              onVisualize={null}
              onSimulator={null}
              onDiagram={null}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default PdfKnowledgeViewer;
