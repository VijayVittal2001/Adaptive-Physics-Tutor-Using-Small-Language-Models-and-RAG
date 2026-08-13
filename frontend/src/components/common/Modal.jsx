import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm" 
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal body */}
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-premium sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-slate-100">
          <div className="bg-white px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 font-display">
              {title}
            </h3>
            <button 
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="px-6 py-5 bg-white">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Modal;
