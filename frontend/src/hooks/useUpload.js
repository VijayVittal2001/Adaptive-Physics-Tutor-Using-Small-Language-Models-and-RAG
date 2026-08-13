import { useState } from 'react';
import { pdfService } from '../services/pdfService';

export const useUpload = (onSuccess) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const upload = async (file, type) => {
    setIsUploading(true);
    setProgress(10);
    setError(null);
    try {
      // Simulate incremental upload ticks before full service processing
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 20;
        });
      }, 150);

      const response = await pdfService.uploadFile(file, type);
      clearInterval(interval);
      setProgress(100);
      setUploadedFile(response.data);
      setIsUploading(false);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message || 'File upload failed');
      setIsUploading(false);
      throw err;
    }
  };

  const reset = () => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  };

  return { upload, isUploading, progress, error, uploadedFile, reset };
};
