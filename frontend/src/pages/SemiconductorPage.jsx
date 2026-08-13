import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { HalfWaveRectifier } from '../components/semiconductor/HalfWaveRectifier';

export const SemiconductorPage = () => {
  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Semiconductors & Electronic Devices"
        subtitle="Explore the fundamental building blocks of modern electronics, focusing on p-n junctions, rectifiers, and logic gates."
        badge="Chapter 14"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          <section id="rectifiers">
            <HalfWaveRectifier />
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft sticky top-6">
            <h3 className="font-extrabold text-slate-800 font-display mb-4 text-lg">In this Chapter</h3>
            <ul className="space-y-3">
              <li>
                <a href="#rectifiers" className="flex items-center gap-3 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors p-2 rounded-lg hover:bg-indigo-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                  Half-Wave Rectifier
                </a>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-400 p-2 opacity-60">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  Full-Wave Rectifier (Coming Soon)
                </div>
              </li>
              <li>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-400 p-2 opacity-60">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  Logic Gates (Coming Soon)
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemiconductorPage;
