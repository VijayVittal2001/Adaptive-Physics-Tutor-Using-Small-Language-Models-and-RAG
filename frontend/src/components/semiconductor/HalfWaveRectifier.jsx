import React from 'react';
import imagePath from '../../assets/semiconductor/half-wave-rectifier.png';

export const HalfWaveRectifier = () => {
  return (
    <div className="bg-white rounded-3xl shadow-soft border border-slate-100 p-6 sm:p-10 transition-all hover:shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
          ⚡
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-display tracking-tight">
          Half-Wave Rectifier
        </h2>
      </div>
      
      <p className="text-slate-600 mb-8 leading-relaxed text-sm sm:text-base font-medium">
        A half-wave rectifier is a type of rectifier that only allows one half-cycle of an AC voltage waveform to pass, blocking the other half-cycle. It is commonly constructed using a single diode in series with the load resistor, serving as the simplest method to convert alternating current (AC) to direct current (DC).
      </p>
      
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 p-6 rounded-2xl border border-slate-100 mb-10 flex justify-center items-center shadow-inner">
        <img 
          src={imagePath} 
          alt="Half-Wave Rectifier Circuit and Waveforms" 
          className="max-w-full h-auto rounded-xl shadow-md mix-blend-multiply"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 hover:bg-indigo-100/50 transition-colors">
          <h3 className="font-extrabold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs">1</span>
            Working Principle
          </h3>
          <ul className="space-y-3 text-sm text-indigo-800 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span><strong>Positive Half-Cycle:</strong> The diode is forward-biased and conducts current, allowing voltage to drop across the load.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span><strong>Negative Half-Cycle:</strong> The diode is reverse-biased and blocks current, acting as an open switch with zero output voltage.</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 hover:bg-sky-100/50 transition-colors">
          <h3 className="font-extrabold text-sky-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-sky-200 text-sky-700 flex items-center justify-center text-xs">2</span>
            Key Characteristics
          </h3>
          <ul className="space-y-3 text-sm text-sky-800 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5">•</span>
              <span><strong>Efficiency:</strong> Maximum efficiency is relatively low, theoretical max is ~40.6%.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5">•</span>
              <span><strong>Output:</strong> Produces a pulsating DC output which typically requires a smoothing capacitor filter for practical use.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-500 mt-0.5">•</span>
              <span><strong>Simplicity:</strong> Highly simple and low cost, utilizing only one diode.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
