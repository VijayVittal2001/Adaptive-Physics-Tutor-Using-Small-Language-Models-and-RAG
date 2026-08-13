import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useUpload } from '../../hooks/useUpload';

export const UploadBox = ({ type, title, subtitle, accept = '.pdf', onUploadSuccess }) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const { upload, isUploading, progress, error, reset } = useUpload((file) => {
    if (onUploadSuccess) onUploadSuccess(file);
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;
    try {
      await upload(selectedFile, type);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    reset();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
      {/* File input invisible trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          className="border-2 border-dashed border-indigo-100 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all"
        >
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 mb-3.5">
            <Upload size={22} />
          </div>
          <span className="text-sm font-semibold text-slate-700 block">{title || 'Choose a document'}</span>
          <span className="text-xs text-slate-400 block mt-1">{subtitle || 'PDF file sizes up to 20MB'}</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-3 truncate">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <FileText size={18} />
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>
            
            {!isUploading && progress !== 100 && (
              <button 
                onClick={handleCancel}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2.5 py-1 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <RefreshCw size={12} className="animate-spin text-indigo-600" />
                  <span>Uploading to Offline RAG...</span>
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {progress === 100 && !isUploading && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <CheckCircle size={14} />
              <span>File upload verified. Pipeline ready to extract.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {!isUploading && progress !== 100 && (
            <button
              onClick={triggerUpload}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-soft hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2"
            >
              <span>Verify & Upload PDF</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
export default UploadBox;
