import React from 'react';
import { Cpu, HardDrive, Thermometer, Shield } from 'lucide-react';

export const SystemHealthCard = ({ health }) => {
  const { cpu = 32, memory = 58, storage = 42, slmTemp = 40 } = health || {};

  const metrics = [
    { label: 'SLM Model CPU Load', value: cpu, icon: Cpu, color: 'bg-indigo-600' },
    { label: 'Memory In-Use', value: memory, icon: Shield, color: 'bg-sky-500' },
    { label: 'SQLite & FAISS Store', value: storage, icon: HardDrive, color: 'bg-emerald-500' },
    { label: 'Local Host Temperature', value: slmTemp, icon: Thermometer, color: 'bg-amber-500', unit: '°C' }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      <h3 className="text-sm font-bold text-slate-800 font-display mb-5">Local Host System Telemetry</h3>
      
      <div className="space-y-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Icon size={14} className="text-slate-400" />
                  <span>{metric.label}</span>
                </span>
                <span>{metric.value}{metric.unit || '%'}</span>
              </div>
              <div className="w-full bg-slate-50 border border-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`${metric.color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${metric.value}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default SystemHealthCard;
