import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { htmlService } from '../../services/htmlService';
import { PlayCircle, Cpu, X, Search, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

import { API_BASE } from '../../services/api';

export const InteractiveModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await htmlService.getModules('all');
        setModules(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load modules:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, []);

  const filteredModules = modules.filter(mod => {
    const q = searchQuery.toLowerCase();
    return (mod.topic && mod.topic.toLowerCase().includes(q)) || 
           (mod.chapter && mod.chapter.toLowerCase().includes(q)) ||
           (mod.subtopic && mod.subtopic.toLowerCase().includes(q));
  });

  const activeIndex = activeModule ? filteredModules.findIndex(m => m.id === activeModule.id) : -1;
  const hasNext = activeIndex >= 0 && activeIndex < filteredModules.length - 1;
  const hasPrev = activeIndex > 0;

  const handleNext = () => {
    if (hasNext) setActiveModule(filteredModules[activeIndex + 1]);
  };

  const handlePrev = () => {
    if (hasPrev) setActiveModule(filteredModules[activeIndex - 1]);
  };

  // Group modules by Chapter -> Topic
  const groupedModules = filteredModules.reduce((acc, mod) => {
    if (!acc[mod.chapter]) acc[mod.chapter] = {};
    if (!acc[mod.chapter][mod.topic]) acc[mod.chapter][mod.topic] = [];
    acc[mod.chapter][mod.topic].push(mod);
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-10 h-[85vh] flex flex-col">
      {!activeModule ? (
        <>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
            <PageHeader
              title="Interactive HTML Modules"
              subtitle="Visualize and interact with physics concepts through custom HTML simulations uploaded by your administrator."
              badge="Interactive Visuals"
            />
            <div className="relative w-full md:w-64 mt-2">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="space-y-10 flex-1 overflow-y-auto pr-2 pb-10">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : Object.keys(groupedModules).length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-soft p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Cpu size={32} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg mb-2">No Interactive Modules Found</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Your administrator hasn't uploaded any interactive HTML modules yet, or none match your search.
                </p>
              </div>
            ) : (
              Object.entries(groupedModules).map(([chapter, topics]) => (
                <div key={chapter} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <Layers className="text-indigo-600" size={20} />
                    <h2 className="text-xl font-extrabold text-slate-800 font-display">{chapter}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(topics).map(([topic, mods], index) => {
                      const headerGradients = [
                        'bg-gradient-to-br from-blue-50 to-sky-50 border-b-blue-100',
                      ];
                      const textColors = [
                        'text-blue-900',
                      ];
                      const badgeColors = [
                        'text-blue-600 bg-white/80 border border-blue-100',
                      ];
                      const buttonColors = [
                        'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white',
                      ];
                      const borderColors = [
                        'border-slate-200 hover:border-blue-300', 
                      ];
                      
                      const cGrad = headerGradients[index % headerGradients.length];
                      const tCol = textColors[index % textColors.length];
                      const bdCol = badgeColors[index % badgeColors.length];
                      const btnCol = buttonColors[index % buttonColors.length];
                      const bCol = borderColors[index % borderColors.length];

                      return (
                        <div key={topic} className={`bg-white rounded-2xl border shadow-soft overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${bCol}`}>
                          <div className={`p-5 border-b ${cGrad}`}>
                            <h3 className={`font-extrabold text-lg leading-tight ${tCol}`}>{topic}</h3>
                            <span className={`inline-block mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${bdCol} shadow-sm`}>
                              {mods.length} Module{mods.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="p-3 space-y-2">
                            {mods.map(mod => (
                              <div key={mod.id} className="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-100 shadow-sm transition-all flex items-center justify-between group">
                                <div>
                                  <span className="text-sm font-bold text-slate-800 block group-hover:text-slate-900 transition-colors">{mod.subtopic || 'Main Topic Module'}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">Added {new Date(mod.uploaded_at).toLocaleDateString()}</span>
                                </div>
                                <button 
                                  onClick={() => setActiveModule(mod)}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border border-transparent shadow-sm ${btnCol}`}
                                  title="Open Visuals"
                                >
                                  <PlayCircle size={18} className="ml-0.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                <Cpu size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 font-display leading-tight">
                  {activeModule.subtopic ? `${activeModule.topic} - ${activeModule.subtopic}` : activeModule.topic}
                </h3>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{activeModule.chapter}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-200/50 rounded-xl p-1">
                <button 
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className={`p-1.5 rounded-lg transition-colors ${hasPrev ? 'hover:bg-white hover:shadow-sm text-slate-700' : 'text-slate-400 opacity-50 cursor-not-allowed'}`}
                  title="Previous Module"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button 
                  onClick={handleNext}
                  disabled={!hasNext}
                  className={`p-1.5 rounded-lg transition-colors ${hasNext ? 'hover:bg-white hover:shadow-sm text-slate-700' : 'text-slate-400 opacity-50 cursor-not-allowed'}`}
                  title="Next Module"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <button 
                onClick={() => setActiveModule(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-sm font-bold text-sm"
              >
                <X size={18} /> Close
              </button>
            </div>
          </div>
          <div className="flex-1 w-full bg-slate-100 relative">
            <iframe 
              src={`${API_BASE}/html/${activeModule.id}/view`}
              title={activeModule.topic}
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveModules;
