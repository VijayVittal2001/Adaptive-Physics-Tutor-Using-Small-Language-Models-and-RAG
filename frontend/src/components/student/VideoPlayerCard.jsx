import React from 'react';
import { Play, Sparkles, Award, ClipboardList, Video } from 'lucide-react';
import { API_ORIGIN } from '../../services/api';

export const VideoPlayerCard = ({ video, onTakePractice }) => {
  const { title, duration, summary, importantPoints, sourceType, url, videoType, embedUrl } = video || {};
  const rawUrl = embedUrl || url || '';
  const absoluteUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${API_ORIGIN}${rawUrl}`) : '';
  const isYouTube = videoType === 'youtube' || sourceType === 'YouTube' || (absoluteUrl && absoluteUrl.includes('youtube.com/embed'));
  const isUploadedVideo = (sourceType === 'Uploaded' || videoType === 'upload') && absoluteUrl && !isYouTube;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
      <div className="aspect-video bg-slate-900 flex flex-col justify-between p-5 relative select-none">
        {isYouTube ? (
          <iframe
            title={title || 'YouTube topic video'}
            src={absoluteUrl}
            className="absolute inset-0 w-full h-full bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isUploadedVideo ? (
          <video key={absoluteUrl} controls className="absolute inset-0 w-full h-full object-contain bg-black" preload="metadata">
            <source src={absoluteUrl} type={video?.mimeType || 'video/mp4'} />
            Your browser cannot play this uploaded video.
          </video>
        ) : (
          <>
            <div className="flex items-center justify-between text-white relative z-10">
              <span className="flex items-center space-x-1 text-[9px] font-extrabold uppercase bg-indigo-600/90 backdrop-blur-sm border border-indigo-500/20 px-2 py-0.5 rounded-full">
                <Sparkles size={8} className="animate-pulse" />
                <span>AI Script Preview</span>
              </span>
              <span className="text-[10px] font-semibold bg-slate-800/80 backdrop-blur-sm px-2 py-0.5 rounded">{duration || '4:15'}</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] group">
              <div className="w-14 h-14 bg-white/95 text-indigo-600 rounded-full flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-110">
                <Play size={20} fill="#4f46e5" className="ml-1" />
              </div>
            </div>
            <div className="relative z-10">
              <h4 className="text-sm font-extrabold text-white truncate max-w-[85%]">{title || 'Physics Concept Video'}</h4>
              <span className="text-[9px] text-slate-300 font-semibold block mt-0.5">Generated script / upload real MP4 from admin panel</span>
            </div>
          </>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Video size={14} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{isYouTube ? 'YouTube Topic Video' : isUploadedVideo ? 'Uploaded Topic Video' : 'Concept Explanation'}</h3>
          </div>
          <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">
            {summary || 'This video explains the selected PDF topic in simple board-exam language.'}
          </p>
          {duration && <p className="text-[10px] text-slate-400 mt-1 font-bold">{duration}</p>}
        </div>

        <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Topic Learning Focus</span>
          <span className="text-xs font-mono font-bold text-slate-700 block mt-1.5 bg-white border border-slate-100 p-2.5 rounded-xl">
            Watch → read PDF page → ask RAG doubt → practice board question
          </span>
        </div>

        {importantPoints && importantPoints.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 text-slate-800 mb-3">
              <ClipboardList size={14} className="text-indigo-600" />
              <span className="text-xs font-bold font-display">Important Board Exam Points</span>
            </div>
            <ul className="space-y-2">
              {importantPoints.map((point, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-500 font-medium leading-normal">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {onTakePractice && (
          <button 
            onClick={onTakePractice}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2"
          >
            <Award size={14} />
            <span>Practice Board Question from this topic</span>
          </button>
        )}
      </div>
    </div>
  );
};
export default VideoPlayerCard;
