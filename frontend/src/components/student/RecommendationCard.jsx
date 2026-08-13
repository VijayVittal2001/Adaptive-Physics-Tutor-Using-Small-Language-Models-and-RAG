import React from 'react';
import { PlayCircle, Award, Compass, ArrowRight } from 'lucide-react';

export const RecommendationCard = ({ recommendation, onAction }) => {
  const { title, description, type, difficulty, actionLabel } = recommendation;

  const icons = {
    video: PlayCircle,
    practice: Award,
    revision: Compass
  };

  const Icon = icons[type] || Compass;

  const getStyle = (t) => {
    switch (t) {
      case 'video': return 'bg-indigo-50 text-indigo-600 border border-indigo-100';
      case 'practice': return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      default: return 'bg-sky-50 text-sky-600 border border-sky-100';
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft hover-scale">
      <div className="flex justify-between items-start">
        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${getStyle(type)}`}>
          {type}
        </span>
        {difficulty && (
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {difficulty} Priority
          </span>
        )}
      </div>

      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight mt-3 font-display">
        {title}
      </h4>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
        {description}
      </p>

      <button
        onClick={onAction}
        className="mt-5 w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-100 hover:border-indigo-500 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
      >
        <span>{actionLabel || 'Get Started'}</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
};
export default RecommendationCard;
