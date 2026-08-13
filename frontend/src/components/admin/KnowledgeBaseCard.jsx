import React from 'react';
import { Database, FileText, Cpu, CheckSquare, Server } from 'lucide-react';

export const KnowledgeBaseCard = ({ indexDetails }) => {
  const steps = [
    { label: 'PDF Stream', desc: 'Direct raw byte extraction', icon: FileText, completed: true },
    { label: 'Regex Cleaner', desc: 'Removing headers/whitespaces', icon: CheckSquare, completed: true },
    { label: 'MiniLM-L6', desc: '384d Dense Vectorizer', icon: Cpu, completed: true },
    { label: 'FAISS Index', desc: 'Quantized index serialization', icon: Database, completed: true },
    { label: 'SQLite Store', desc: 'Metadata DB references', icon: Server, completed: true }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 font-display">Offline RAG Vectors Graph</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Physical embeddings mapping pipeline</p>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          FAISS Index Synced
        </span>
      </div>

      {/* Pipeline workflow */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block z-0"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center text-center bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-xl border border-slate-100 md:border-none">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border transition-all ${
                  step.completed 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-white text-slate-400 border-slate-200'
                }`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 mt-2.5 block">{step.label}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block max-w-[120px] mx-auto leading-normal">
                  {step.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default KnowledgeBaseCard;
