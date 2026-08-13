import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { ShieldCheck, Cpu, Save } from 'lucide-react';

export const SystemSettings = () => {
  const [antiCheat, setAntiCheat] = useState({ disableCopyPaste: true, disableRightClick: false, disableTextSelection: false, captureTypingMetrics: true });
  const handleToggle = (key) => setAntiCheat(prev => ({ ...prev, [key]: !prev[key] }));
  const handleSave = () => alert('Settings saved for this browser session. Backend practice page already blocks paste in descriptive answers.');

  return (
    <div className="space-y-8">
      <PageHeader title="System Configurations" subtitle="Local SLM + embedding setup for this project. Use qwen3:4b for answers and nomic-embed-text for PDF embeddings." badge="Engine Settings" actionButton={<button onClick={handleSave} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-soft transition-all flex items-center space-x-2"><Save size={14}/><span>Save Settings</span></button>} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2 space-y-5">
          <div className="flex items-center space-x-2.5 text-slate-800 border-b border-slate-50 pb-3"><ShieldCheck size={18} className="text-indigo-600"/><div><h3 className="text-sm font-bold font-display">Practice Integrity Settings</h3><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Copy-paste blocking for descriptive answers</p></div></div>
          <div className="space-y-4">
            {[
              ['disableCopyPaste', 'Disable Clipboard Copy-Paste', 'Blocks onPaste events in descriptive practice textareas'],
              ['disableRightClick', 'Disable Context Right-Click', 'Optional browser-level right-click prevention'],
              ['disableTextSelection', 'Disable Text Selection', 'Optional selection prevention in exam windows'],
              ['captureTypingMetrics', 'Capture Practice Telemetry', 'Stores paste attempts with answer submission']
            ].map(([key, title, desc]) => <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50 text-xs font-semibold text-slate-700"><div><span>{title}</span><p className="text-[10px] text-slate-400 font-medium">{desc}</p></div><input type="checkbox" checked={antiCheat[key]} onChange={() => handleToggle(key)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-200 rounded" /></div>)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-5 h-fit">
          <div className="flex items-center space-x-2.5 text-slate-800 border-b border-slate-50 pb-3"><Cpu size={18} className="text-indigo-600"/><div><h3 className="text-sm font-bold font-display">Local Engine</h3><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Ollama + SQLite</p></div></div>
          <div className="space-y-4 text-xs font-semibold text-slate-600">
            <div className="space-y-1"><span className="text-[10px] text-slate-400 uppercase tracking-wider block">SLM Inference Model</span><span className="font-mono text-slate-700 block bg-slate-50 p-2 border border-slate-100 rounded-lg">qwen3:4b via Ollama</span></div>
            <div className="space-y-1"><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Embedding Model</span><span className="font-mono text-slate-700 block bg-slate-50 p-2 border border-slate-100 rounded-lg">nomic-embed-text via Ollama</span></div>
            <div className="space-y-1"><span className="text-[10px] text-slate-400 uppercase tracking-wider block">Storage</span><span className="font-mono text-slate-700 block bg-slate-50 p-2 border border-slate-100 rounded-lg">SQLite + local vector files</span></div>
            <div className="flex items-center justify-between py-2 border-t border-slate-100"><span>Offline-First Mode</span><span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Active</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SystemSettings;
