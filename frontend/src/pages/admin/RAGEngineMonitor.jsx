import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Database, Search, Sparkles, LayoutGrid, CheckSquare } from 'lucide-react';

export const RAGEngineMonitor = () => {
  const retrievalPipeline = [
    { label: 'Query Encoder', desc: 'Converts typed query string to 384d dense vector.', model: 'all-MiniLM-L6-v2 (quantized)' },
    { label: 'FAISS Index Search', desc: 'Scans the serialized FAISS flat vector directory.', model: 'L2 Euclidean Metric' },
    { label: 'Reranker System', desc: 'Rescores local contexts to prioritize formula-dense lines.', model: 'Regex Overlap Filter' },
    { label: 'Response Synthesizer', desc: 'Quantized GGUF runs token inference offline.', model: 'Phi-3-Mini (3.8B)' }
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="RAG Engine Monitor" 
        subtitle="Review top-k similarity metrics, retrieval latency charts, query decoding nodes and SLM prompt builders."
        badge="Retrieval Metrics"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RAG pipeline execution sequence */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
            <h3 className="text-sm font-bold text-slate-800 font-display mb-5">RAG Query Ingestion Execution Tree</h3>
            
            <div className="space-y-6 relative">
              <div className="absolute top-0 bottom-0 left-5 w-0.5 bg-slate-100 z-0"></div>
              {retrievalPipeline.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {idx + 1}
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{step.label}</span>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5 leading-relaxed">{step.desc}</span>
                    </div>
                    
                    <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase shrink-0 leading-none">
                      {step.model}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time search configuration sliders */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-5">
            <div className="flex items-center space-x-2 text-slate-800">
              <Search size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold font-display">Vector Search Sliders</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Retrieve Top-k Contexts</span>
                  <span className="text-indigo-600">K = 3 chunks</span>
                </div>
                <input type="range" min="1" max="10" defaultValue="3" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Minimum Similarity Score</span>
                  <span className="text-indigo-600">0.65 threshold</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" defaultValue="0.65" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Phi-3 Token Generation Limit</span>
                  <span className="text-indigo-600">256 tokens</span>
                </div>
                <input type="range" min="64" max="1024" step="64" defaultValue="256" className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-2 text-emerald-700 text-xs font-bold leading-normal">
              <CheckSquare size={14} className="shrink-0" />
              <span>Pipeline running on 100% Offline mode safely.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RAGEngineMonitor;
