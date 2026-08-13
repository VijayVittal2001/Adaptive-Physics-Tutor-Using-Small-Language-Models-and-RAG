import React from 'react';
import { StatusPill } from '../common/StatusPill';
import { ArrowRight, Cpu, Eye, FileText, CheckCircle2 } from 'lucide-react';

export const PipelineCard = ({ stepName, status, duration, active, description, index }) => {
  const getIcon = (i) => {
    switch(i) {
      case 0: return FileText;
      case 1: return Eye;
      case 2: return Cpu;
      default: return CheckCircle2;
    }
  };

  const Icon = getIcon(index);

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      active 
        ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' 
        : 'bg-white border-slate-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            active ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'
          }`}>
            <Icon size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 tracking-tight">{stepName}</h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{duration || '120ms Ingestion'}</p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>
      <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        {description}
      </p>
    </div>
  );
};
export default PipelineCard;
