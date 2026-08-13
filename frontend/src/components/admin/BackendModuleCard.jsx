import React from 'react';
import { StatusPill } from '../common/StatusPill';

export const BackendModuleCard = ({ module }) => {
  const { name, type, status, version, latency, utilization, description } = module;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/60">
            {type}
          </span>
          <h3 className="text-sm font-bold text-slate-800 mt-2 font-display">{name}</h3>
          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{version}</span>
        </div>
        <StatusPill status={status} />
      </div>

      <p className="text-xs text-slate-500 mt-3.5 leading-relaxed font-medium">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-4 mt-5 pt-3.5 border-t border-slate-100">
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Inference / Delay</span>
          <span className="text-xs font-bold text-slate-700 block mt-0.5">{latency}</span>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">CPU Allocation</span>
          <span className="text-xs font-bold text-slate-700 block mt-0.5">{utilization}</span>
        </div>
      </div>
    </div>
  );
};
export default BackendModuleCard;
