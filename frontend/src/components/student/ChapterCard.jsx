import React from 'react';
import { BookOpen, PlayCircle, FileText, Award } from 'lucide-react';
import { ProgressBadge } from '../common/ProgressBadge';

export const ChapterCard = ({ chapter, onSelect }) => {
  const { title, number, description, completionRate, masteryScore, topicsCount, videosCount, testsCount } = chapter;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft hover-scale flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
              Unit {number}
            </span>
          </div>
          <ProgressBadge progress={completionRate} size="sm" />
        </div>

        <h3 className="text-base font-extrabold text-slate-800 mt-3.5 tracking-tight font-display">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
          {description}
        </p>

        {/* Resources checklist */}
        <div className="flex items-center space-x-4 mt-5 text-[11px] font-bold text-slate-500">
          <span className="flex items-center space-x-1">
            <BookOpen size={12} className="text-slate-400" />
            <span>{topicsCount} Topics</span>
          </span>
          <span className="flex items-center space-x-1">
            <PlayCircle size={12} className="text-slate-400" />
            <span>{videosCount} Videos</span>
          </span>
          <span className="flex items-center space-x-1">
            <FileText size={12} className="text-slate-400" />
            <span>{testsCount} Tests</span>
          </span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Concept Mastery</span>
          <span className="text-xs font-extrabold text-slate-700 flex items-center space-x-1 mt-0.5">
            <Award size={12} className="text-amber-500" />
            <span>{masteryScore || 0}% Grade</span>
          </span>
        </div>

        <button
          onClick={() => onSelect(chapter)}
          className="py-1.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
        >
          Study Chapter
        </button>
      </div>
    </div>
  );
};
export default ChapterCard;
