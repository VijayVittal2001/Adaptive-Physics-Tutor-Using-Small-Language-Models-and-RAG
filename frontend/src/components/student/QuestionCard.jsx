import React from 'react';
import { HelpCircle, Award, Target, Brain } from 'lucide-react';
import { API_ORIGIN } from '../../services/api';
import { StatusPill } from '../common/StatusPill';

export const QuestionCard = ({ question, index, onAnswer }) => {
  const { text, marks, difficulty, bloomLevel, mappedTopic } = question;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft">
      {/* Header tags */}
      <div className="flex flex-wrap gap-2 items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3.5">
        <span className="flex items-center space-x-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
          <HelpCircle size={10} />
          <span>Question {index || 1}</span>
        </span>
        <span className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
          <Award size={10} />
          <span>{marks} Marks</span>
        </span>
        <span className="flex items-center space-x-1 text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
          <Brain size={10} />
          <span>{bloomLevel}</span>
        </span>
        <span className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
          {difficulty}
        </span>
      </div>

      <p className="text-xs font-semibold text-slate-800 leading-relaxed font-display">
        {text}
      </p>
      {question.imageUrl && <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-2"><img src={`${API_ORIGIN}${question.imageUrl}?t=${Date.now()}`} alt="Question diagram" className="max-h-64 rounded-lg object-contain mx-auto" /></div>}

      {onAnswer && (
        <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1">
            <Target size={12} className="text-slate-300" />
            <span>Topic: {mappedTopic}</span>
          </span>
          <button 
            onClick={() => onAnswer(question)}
            className="py-1.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
          >
            Submit Answer
          </button>
        </div>
      )}
    </div>
  );
};
export default QuestionCard;
