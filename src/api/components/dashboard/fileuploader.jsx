import React, { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPTED_TYPES = {
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};

const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'xls'];

export default function FileUploader({ onFileSelect, isProcessing }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    setError(null);
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type ".${ext}". Please upload CSV or Excel files (.csv, .xlsx, .xls)`);
      return null;
    }
    if (file.size === 0) {
      setError('The file is empty. Please upload a file with data.');
      return null;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50MB.');
      return null;
    }
    return ext;
  };

  const handleFile = useCallback((file) => {
    const ext = validateFile(file);
    if (ext) {
      onFileSelect(file, ext);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleInputChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer
          ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/50'}
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
        whileHover={{ scale: isProcessing ? 1 : 1.01 }}
        onClick={() => !isProcessing && document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dragActive ? 'bg-primary/10' : 'bg-muted'}`}
            animate={{ y: dragActive ? -8 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Upload className={`w-8 h-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </motion.div>
          
          <div>
            <p className="text-lg font-semibold text-foreground">
              {dragActive ? 'Drop your file here' : 'Upload your data file'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag & drop or click to browse
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> CSV
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" /> XLS
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Max 50MB</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}