import React from 'react';

export const PageHeader = ({ title, subtitle, badge, actionButton }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-8 pb-5 border-b border-slate-100">
      <div>
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight font-display">
            {title}
          </h1>
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actionButton && (
        <div className="flex items-center">
          {actionButton}
        </div>
      )}
    </div>
  );
};
export default PageHeader;
