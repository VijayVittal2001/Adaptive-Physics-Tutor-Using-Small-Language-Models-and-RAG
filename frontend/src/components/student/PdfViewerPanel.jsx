import React from 'react';
import { FileText, ChevronLeft, ChevronRight, ShieldAlert, ExternalLink, BookOpen } from 'lucide-react';
import { API_ORIGIN } from '../../services/api';

export const PdfViewerPanel = ({ title, pageNumber, totalPages = 1, onPageChange, pdfUrl, pageText = '', selectedTopic }) => {
  const absolutePdfUrl = pdfUrl ? (pdfUrl.startsWith('http') ? pdfUrl : `${API_ORIGIN}${pdfUrl}`) : '';
  const src = absolutePdfUrl ? `${absolutePdfUrl}#page=${pageNumber}&toolbar=1&navpanes=0&view=FitH` : '';
  const safeTotal = Math.max(totalPages || 1, pageNumber || 1);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full w-full">
      <div className="bg-[#F5F7FA] px-5 py-3 border-b-2 border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3 truncate">
          <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm"><FileText size={16} strokeWidth={2.5}/></div>
          <div className="truncate">
            <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest block leading-none">Uploaded PDF Source</span>
            <span className="text-sm font-bold text-slate-900 truncate block mt-1">{title || 'No PDF selected'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button disabled={pageNumber <= 1} onClick={() => onPageChange(pageNumber - 1)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"><ChevronLeft size={18} strokeWidth={2.5} /></button>
          <span className="text-xs font-black text-slate-700 px-2">Page {pageNumber} <span className="text-slate-400 font-bold mx-1">/</span> {safeTotal}</span>
          <button disabled={pageNumber >= safeTotal} onClick={() => onPageChange(pageNumber + 1)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"><ChevronRight size={18} strokeWidth={2.5} /></button>
        </div>
      </div>

      <div className="flex-1 bg-[#F5F7FA] relative overflow-hidden flex flex-col">
        {src ? (
          <iframe key={src} title="Uploaded Physics PDF" src={src} className="w-full h-full bg-[#F5F7FA] flex-1" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#F5F7FA]">
            <FileText className="text-slate-300" size={56} strokeWidth={2}/>
            <h3 className="mt-4 text-base font-black text-slate-800">No uploaded PDF selected</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Process a Knowledge PDF from admin panel first.</p>
          </div>
        )}
      </div>

      <div className="bg-[#F5F7FA] border-t-2 border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-bold"><ShieldAlert size={14} className="text-emerald-500"/><span>Read-only exam mode PDF viewer</span></div>
        {absolutePdfUrl && <a href={`${absolutePdfUrl}#page=${pageNumber}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 bg-white border-2 border-slate-200 px-3 py-1.5 rounded-full hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:shadow-none"><ExternalLink size={14} strokeWidth={2.5}/>Open PDF</a>}
      </div>
    </div>
  );
};
export default PdfViewerPanel;
