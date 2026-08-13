import React from 'react';

export const StatusPill = ({ status }) => {
  const getStatusStyle = (s) => {
    switch (s ? s.toLowerCase() : '') {
      case 'online':
      case 'ready':
      case 'succeed':
      case 'completed':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'processing':
      case 'extracting':
      case 'chunking':
      case 'embedding':
      case 'indexing':
        return 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse';
      case 'pending':
      case 'idle':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      case 'warning':
      case 'cheating captured':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'offline':
      case 'error':
      case 'failed':
        return 'bg-rose-50 text-rose-600 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusStyle(status)}`}>
      {status || 'Unknown'}
    </span>
  );
};
export default StatusPill;
