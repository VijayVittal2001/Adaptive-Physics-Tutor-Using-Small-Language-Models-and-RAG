import React from 'react';

export const StatCard = ({ title, value, icon: Icon, description, trend, trendType = 'neutral', colorTheme = 'indigo' }) => {
  const themes = {
    indigo: {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600'
    },
    sky: {
      bg: 'bg-sky-50/50',
      border: 'border-sky-100',
      iconBg: 'bg-sky-100',
      iconText: 'text-sky-600'
    },
    amber: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
      iconText: 'text-amber-600'
    },
    rose: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100',
      iconText: 'text-rose-600'
    }
  };

  const currentTheme = themes[colorTheme] || themes.indigo;

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-soft hover-scale ${currentTheme.bg}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-slate-500 block tracking-wide uppercase">{title}</span>
          <span className="text-2xl font-bold text-slate-800 block mt-1.5 font-display">{value}</span>
        </div>
        <div className={`p-2.5 rounded-xl ${currentTheme.iconBg} ${currentTheme.iconText}`}>
          <Icon size={20} />
        </div>
      </div>
      {(description || trend) && (
        <div className="flex items-center space-x-2 mt-3.5 pt-3 border-t border-slate-100/60">
          {trend && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              trendType === 'positive' ? 'bg-emerald-50 text-emerald-600' :
              trendType === 'negative' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
            }`}>
              {trend}
            </span>
          )}
          {description && <span className="text-xs text-slate-500 truncate">{description}</span>}
        </div>
      )}
    </div>
  );
};
export default StatCard;
