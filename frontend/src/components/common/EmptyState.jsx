import React from 'react';
import { HelpCircle } from 'lucide-react';

export const EmptyState = ({ title, description, icon: Icon = HelpCircle, actionButton }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-2xl shadow-soft text-center max-w-lg mx-auto">
      <div className="p-3.5 bg-indigo-50 text-indigo-500 rounded-2xl mb-4 shadow-sm">
        <Icon size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-800 font-display">
        {title || 'No data found'}
      </h3>
      <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed max-w-sm">
        {description || 'This module has not received any local data yet. Try running an ingestion or search.'}
      </p>
      {actionButton && (
        <div className="mt-5 w-full">
          {actionButton}
        </div>
      )}
    </div>
  );
};
export default EmptyState;
