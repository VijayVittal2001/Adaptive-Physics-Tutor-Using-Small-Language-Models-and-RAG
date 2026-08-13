import React from 'react';
import { FileText, Cpu, Eye, Volume2, Film, Layers, PlayCircle, Loader } from 'lucide-react';

export const VideoPipelineCard = ({ activeStep, isGenerating }) => {
  const steps = [
    { label: 'Topic Notes', icon: FileText },
    { label: 'SLM Scripting', icon: Cpu },
    { label: 'Scene Splitting', icon: Layers },
    { label: 'TTS Voice Synthesis', icon: Volume2 },
    { label: 'Manim Render', icon: Eye },
    { label: 'MoviePy Composite', icon: Film },
    { label: 'Final MP4 Output', icon: PlayCircle }
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 font-display">Physics Manim Video Engine Pipeline</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Offline LaTeX equations to 3D video layout compiler</p>
        </div>
        {isGenerating && (
          <span className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            <Loader size={12} className="animate-spin" />
            <span>Compiling Manim Scenes...</span>
          </span>
        )}
      </div>

      <div className="flex flex-col space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = isGenerating && activeStep === idx;
          const isCompleted = isGenerating && idx < activeStep;
          
          return (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isActive 
                  ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10' 
                  : isCompleted 
                  ? 'bg-emerald-50/50 border-emerald-100' 
                  : 'bg-white border-slate-100/80'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className={`p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : isCompleted 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-50 text-slate-400'
                }`}>
                  <Icon size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{step.label}</span>
                  <span className="text-[10px] text-slate-400 font-semibold block -mt-0.5">Stage {idx + 1} of 7</span>
                </div>
              </div>
              
              <div>
                {isActive ? (
                  <span className="text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 animate-pulse">
                    Executing
                  </span>
                ) : isCompleted ? (
                  <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Done
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold uppercase bg-slate-100 text-slate-400 px-2 py-0.5 rounded border border-slate-200">
                    Queued
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default VideoPipelineCard;
