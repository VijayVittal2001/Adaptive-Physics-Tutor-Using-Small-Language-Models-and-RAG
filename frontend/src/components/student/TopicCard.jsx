import React from 'react';
import { PlayCircle, Search, HelpCircle, ArrowRight } from 'lucide-react';

export const TopicCard = ({ topic, onWatchVideo, onReadPdf, onTakeTest }) => {
  const { title, description, pageStart, pageEnd, videoGenerated, videoDuration, questionsCount } = topic;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-bold text-slate-800 font-display">{title}</h4>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">NCERT Pages {pageStart}-{pageEnd}</span>
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mt-2.5 leading-relaxed font-medium">
        {description}
      </p>

      <div className="flex flex-wrap gap-2 mt-4 pt-3.5 border-t border-slate-50">
        {videoGenerated && onWatchVideo && (
          <button 
            onClick={onWatchVideo}
            className="flex items-center space-x-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100/60 transition-colors"
          >
            <PlayCircle size={12} />
            <span>Watch Animation ({videoDuration})</span>
          </button>
        )}
        
        {onReadPdf && (
          <button 
            onClick={onReadPdf}
            className="flex items-center space-x-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg border border-sky-100/60 transition-colors"
          >
            <Search size={12} />
            <span>Study in PDF</span>
          </button>
        )}

        {onTakeTest && (
          <button 
            onClick={onTakeTest}
            className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100/60 transition-colors ml-auto"
          >
            <span>Practice test</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
export default TopicCard;
