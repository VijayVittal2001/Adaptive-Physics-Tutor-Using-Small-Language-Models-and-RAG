import React from 'react';
import { RefreshCw } from 'lucide-react';

export const LoadingState = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white/40 backdrop-blur-sm border border-slate-100 rounded-2xl shadow-soft">
      <div className="animate-spin text-indigo-600 mb-3.5">
        <RefreshCw size={24} />
      </div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
        {message || 'Synchronizing with Offline RAG vector store...'}
      </p>
    </div>
  );
};
export default LoadingState;
