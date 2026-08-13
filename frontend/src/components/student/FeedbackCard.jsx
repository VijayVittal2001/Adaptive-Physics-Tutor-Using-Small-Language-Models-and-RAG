import React from 'react';
import { Award, CheckCircle, AlertTriangle, PlayCircle, BookOpen, Star } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';

export const FeedbackCard = ({ feedback, onWatchVideo, onPracticeTest }) => {
  const { 
    score, 
    maxMarks, 
    percentage, 
    keywordScore, 
    semanticScore, 
    formulaScore, 
    ruleScore, 
    slmScore, 
    feedback: textFeedback, 
    keywordsMatched = [], 
    formulasMatched = [], 
    weakAreas = [],
    recommendedVideo
  } = feedback || {};

  const scores = [
    { label: 'Keyword Match', val: keywordScore, color: 'bg-indigo-600' },
    { label: 'Semantic Similarity', val: semanticScore, color: 'bg-sky-500' },
    { label: 'Mathematical Formula', val: formulaScore, color: 'bg-emerald-500' },
    { label: 'Numerical / Rule Check', val: ruleScore, color: 'bg-amber-500' }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-6">
      {/* Top score banner */}
      <div className="flex items-center justify-between bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Descriptive Evaluation Report</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1.5 font-display flex items-baseline space-x-1">
            <span>{score}</span>
            <span className="text-sm font-semibold text-slate-400">/ {maxMarks} Marks</span>
          </h2>
        </div>
        
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Concept Rating</span>
          <span className="inline-flex items-center space-x-1 mt-1 text-xs font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <Star size={10} fill="#10b981" />
            <span>{percentage >= 80 ? 'Mastery' : percentage >= 50 ? 'Developing' : 'Review Required'}</span>
          </span>
        </div>
      </div>

      {/* Grid checklist metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scores.map((s, idx) => (
          <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              <span>{s.label}</span>
              <span>{s.val}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className={`${s.color} h-full rounded-full`} style={{ width: `${s.val}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Conceptual Critique */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">SLM Conceptual Critique</h4>
        <div className="mt-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-semibold leading-relaxed text-slate-600 italic">
          "{textFeedback}"
        </div>
      </div>

      {/* Extracted matches checklists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Keywords Matched</span>
          <div className="flex flex-wrap gap-1.5">
            {keywordsMatched.length > 0 ? (
              keywordsMatched.map((k, i) => (
                <span key={i} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/60 uppercase">
                  {k}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 font-bold block">No keywords detected</span>
            )}
          </div>
        </div>
        
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Formulas Verified</span>
          <div className="flex flex-wrap gap-1.5">
            {formulasMatched.length > 0 ? (
              formulasMatched.map((f, i) => (
                <span key={i} className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/60">
                  {f}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 font-bold block">No formulas detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Suggested next actions */}
      {weakAreas.length > 0 && (
        <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2">
          <div className="flex items-center space-x-1.5 text-rose-700 font-extrabold text-xs">
            <AlertTriangle size={14} />
            <span>Remedial Incomplete Concepts</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            The local Phi-3 assessment engine identified missing conceptual pillars. We recommend:
          </p>
          <ul className="space-y-1 text-[11px] text-rose-600 font-bold uppercase tracking-wider list-inside">
            {weakAreas.map((area, idx) => (
              <li key={idx} className="flex items-center space-x-1.5">
                <span className="h-1 w-1 bg-rose-500 rounded-full"></span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendedVideo && (
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <PlayCircle size={18} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Remedial Lecture</span>
              <span className="text-xs font-bold text-slate-700 block mt-0.5">{recommendedVideo.title}</span>
            </div>
          </div>
          
          <button
            onClick={() => onWatchVideo(recommendedVideo.id)}
            className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Watch Video Animation
          </button>
        </div>
      )}
    </div>
  );
};
export default FeedbackCard;
