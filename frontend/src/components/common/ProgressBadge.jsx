import React from 'react';

export const ProgressBadge = ({ progress, size = 'md', showPercent = true }) => {
  const getBadgeColor = (p) => {
    if (p >= 80) return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
    if (p >= 50) return 'text-indigo-600 bg-indigo-50 border border-indigo-100';
    if (p >= 15) return 'text-amber-600 bg-amber-50 border border-amber-100';
    return 'text-slate-400 bg-slate-50 border border-slate-100';
  };

  const badgeClass = getBadgeColor(progress);

  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5 rounded-md font-bold',
    md: 'text-xs px-2.5 py-1 rounded-full font-bold',
    lg: 'text-sm px-3.5 py-1.5 rounded-full font-bold'
  };

  return (
    <div className="flex items-center space-x-2">
      <span className={`${sizes[size] || sizes.md} ${badgeClass}`}>
        {progress}% Completed
      </span>
    </div>
  );
};
export default ProgressBadge;
