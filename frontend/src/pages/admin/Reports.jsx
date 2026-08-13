import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { FileText, Cpu, ShieldAlert, FileDown, CheckCircle } from 'lucide-react';

export const Reports = () => {
  const logs = [
    { time: '17:42:15', event: 'FAISS Index Reload', detail: 'Euclidean index directories verified (420 vectors serialized).', type: 'system' },
    { time: '17:35:04', event: 'Anti-cheat lock violation', detail: 'Keystroke pasting prevented for Student VK on Ohm\'s Law Practice.', type: 'security' },
    { time: '17:15:32', event: 'SLM descriptive grading completed', detail: 'Phi-3 scored 4/5 marks for topic: Coulomb\'s Law.', type: 'inference' },
    { time: '16:55:00', event: 'Manim Video Compiling', detail: 'Topic video render completed for Coulomb\'s law vectors.', type: 'system' },
    { time: '16:12:18', event: 'PDF chunking process', detail: 'Split 12th Physics NCERT into 420 semantic text nodes.', type: 'system' }
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="System Logs & Reports" 
        subtitle="Export local database metrics, verify API latency distributions, and review security captures."
        badge="System Logs"
        actionButton={
          <button 
            onClick={() => alert("Downloading PDF log report...")}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center space-x-2"
          >
            <FileDown size={14} />
            <span>Download PDF Report</span>
          </button>
        }
      />

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Active Server Event Streams</h3>
            <p className="text-[11px] text-slate-400 font-medium">Real-time local database indexing logs</p>
          </div>
        </div>

        <div className="space-y-3 font-mono text-[10px] text-slate-600">
          {logs.map((log, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-100/50 rounded-xl flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-slate-400 font-bold shrink-0">{log.time}</span>
                <div>
                  <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded text-[8px] tracking-wide inline-block mb-1 ${
                    log.type === 'security' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                    log.type === 'inference' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  }`}>
                    {log.type}
                  </span>
                  <span className="font-bold text-slate-800 block">{log.event}</span>
                  <p className="text-slate-500 font-semibold mt-0.5 leading-relaxed">{log.detail}</p>
                </div>
              </div>
              
              <span className="text-emerald-600 font-extrabold flex items-center space-x-1 shrink-0 text-[9px] uppercase">
                <CheckCircle size={10} />
                <span>Verified</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Reports;
