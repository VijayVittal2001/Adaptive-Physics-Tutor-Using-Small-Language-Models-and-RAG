import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Award, ShieldCheck, ArrowRight, Brain, Cpu, Tag, FileCheck } from 'lucide-react';

export const HybridEvaluationEngine = () => {
  const steps = [
    { label: 'Student Submission', desc: 'Capture keystrokes, paste warnings, and descriptive text.', icon: Brain },
    { label: 'RAG Retrieval', desc: 'Fetch key model answers and context rubrics from database.', icon: Cpu },
    { label: 'Keyword Vectorizer', desc: 'Verify presence of mandatory physics vocabulary terms.', icon: Tag },
    { label: 'Regex Math Check', desc: 'Validate formulas, constants, and calculated floats.', icon: FileCheck },
    { label: 'SLM Critique', desc: 'Phi-3 models run descriptive feedback and grade logic.', icon: Award }
  ];

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Hybrid Evaluation Engine Architecture" 
        subtitle="Manage the scoring framework that assesses descriptive student physics answers."
        badge="AI Evaluator"
      />

      {/* Workflow pipeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Evaluation Flowchart</h3>
            <p className="text-[11px] text-slate-400 font-medium">Steps applied on answer texts to compute multi-metric scores</p>
          </div>
          <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
            <ShieldCheck size={12} />
            <span>Proctor Check Online</span>
          </span>
        </div>

        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 hidden lg:block z-0"></div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center bg-slate-50 lg:bg-transparent p-4 lg:p-0 rounded-xl border border-slate-100 lg:border-none">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm transition-transform hover:scale-105">
                    <Icon size={18} />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-3 block">{step.label}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 max-w-[140px] leading-relaxed mx-auto">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metric weight specifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 font-display">Scoring Weights Configuration</h3>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Sentence BERT Similarity</span>
                <span className="text-indigo-600">30% Weight</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Physics Vocabulary Overlap</span>
                <span className="text-indigo-600">30% Weight</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Equation & Vector Regex Filter</span>
                <span className="text-indigo-600">20% Weight</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Quantized SLM Conceptual Critique</span>
                <span className="text-indigo-600">20% Weight</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Proctor telemetry details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 font-display font-display">Anti-Cheat Proctor Telemetry Details</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            The descriptive answer textarea captures student interactions to ensure integrity under unsupervised offline exam environments.
          </p>

          <div className="space-y-2 text-xs font-semibold text-slate-600">
            <div className="flex items-center space-x-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <span><strong>Typing Hesitation:</strong> Flag entries if typing intervals surpass 1.5 seconds.</span>
            </div>
            <div className="flex items-center space-x-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <span><strong>Clipboard Block:</strong> Intercept paste events and trigger warning counts.</span>
            </div>
            <div className="flex items-center space-x-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
              <span><strong>Voice telemetry:</strong> Local speech conversion verified.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HybridEvaluationEngine;
