import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { KnowledgeBaseCard } from '../../components/admin/KnowledgeBaseCard';
import { Database, ShieldCheck, Tag, Info, Cpu } from 'lucide-react';

export const KnowledgeBase = () => {
  const indexSpecs = [
    { label: 'Embedding Dimensions', val: '384 dimensions' },
    { label: 'Total Vector Embeddings', val: '420 serialized nodes' },
    { label: 'Average Retrieval Latency', val: '1.8ms (FAISS)' },
    { label: 'Metadata Database', val: 'SQLite v3.41' },
    { label: 'Storage Size', val: '12.4 MB (Quantized)' }
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Offline RAG Store Management" 
        subtitle="Manage localized vector spaces, semantic indices, FAISS serialization, and DB nodes."
        badge="FAISS Database"
      />

      <KnowledgeBaseCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vector index specifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
          <div className="flex items-center space-x-2.5 text-slate-800 mb-5">
            <Database size={16} className="text-indigo-600" />
            <h3 className="text-sm font-bold font-display">FAISS Vector Index Specs</h3>
          </div>
          
          <div className="space-y-4">
            {indexSpecs.map((spec, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-50 text-xs font-semibold text-slate-600">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{spec.label}</span>
                <span className="text-slate-800 font-extrabold">{spec.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Database processed entities table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-800">
              <Cpu size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold font-display">Vectorized Chapter Entities</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Index Version 1.0</span>
          </div>

          <div className="overflow-x-auto text-xs font-medium">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-widest">
                  <th className="pb-3 font-semibold">Chapter Entity</th>
                  <th className="pb-3 font-semibold">Indexed Vectors</th>
                  <th className="pb-3 font-semibold">Total Tokens</th>
                  <th className="pb-3 font-semibold">Storage Space</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-bold text-slate-800">Chapter 1: Electrostatics</td>
                  <td className="py-3">180 vectors</td>
                  <td className="py-3">125,000 tokens</td>
                  <td className="py-3">5.2 MB</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-bold text-slate-800">Chapter 2: Current Electricity</td>
                  <td className="py-3">140 vectors</td>
                  <td className="py-3">98,000 tokens</td>
                  <td className="py-3">4.1 MB</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-bold text-slate-800">Chapter 3: Magnetic Effects</td>
                  <td className="py-3">100 vectors</td>
                  <td className="py-3">65,000 tokens</td>
                  <td className="py-3">3.1 MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default KnowledgeBase;
