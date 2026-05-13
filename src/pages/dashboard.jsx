import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auditData, cleanData, parseCSV, parseExcel, parseJSON, toCSV, generateSampleData } from '@/lib/datacleaningengine';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, FileJson, Eye, EyeOff, RefreshCw, AlertTriangle, Info, Sparkles, Users, TrendingUp, Package } from 'lucide-react';

const Dashboard = () => {
  /** @type {React.RefObject<HTMLInputElement>} */
  const fileInputRef = useRef(null);
  /** @type {[File | null, React.Dispatch<React.SetStateAction<File | null>>]} */
  const [selectedFile, setSelectedFile] = useState(/** @type {File | null} */(null));
  const [isProcessing, setIsProcessing] = useState(false);
  /** @type {[any, React.Dispatch<React.SetStateAction<any>>]} */
  const [summary, setSummary] = useState(/** @type {any} */(null));
  /** @type {[any, React.Dispatch<React.SetStateAction<any>>]} */
  const [audit, setAudit] = useState(/** @type {any} */(null));
  /** @type {[any[] | null, React.Dispatch<React.SetStateAction<any[] | null>>]} */
  const [cleanedRows, setCleanedRows] = useState(/** @type {any[] | null} */(null));
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(/** @type {any[] | null} */(null));
  const [fileStats, setFileStats] = useState(/** @type {any} */(null));

  // File size limits (in bytes)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const RECOMMENDED_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Helper functions
  /**
   * @param {number} bytes
   * @returns {string}
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * @param {string} fileName
   * @returns {JSX.Element}
   */
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return <FileText className="w-8 h-8 text-green-600" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-8 h-8 text-blue-600" />;
      case 'json':
        return <FileJson className="w-8 h-8 text-yellow-600" />;
      default:
        return <FileText className="w-8 h-8 text-gray-600" />;
    }
  };

  /**
   * @param {File} file
   * @returns {{valid: boolean, error: string}}
   */
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}` };
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = ['csv', 'xlsx', 'xls', 'json'];
    if (!extension || !allowedTypes.includes(extension)) {
      return { valid: false, error: `Unsupported file type. Please upload: ${allowedTypes.join(', ')}` };
    }

    return { valid: true, error: '' };
  };

  const generateSampleFile = () => {
    const sampleData = generateSampleData(100);
    const csv = toCSV(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * @param {string} type
   */
  const handleGenerateSampleData = (type) => {
    /** @type {Record<string, number>} */
    const rowCounts = {
      'customer': 500,
      'sales': 1000,
      'inventory': 300
    };
    const rowCount = rowCounts[type] || 100;
    const sampleData = generateSampleData(rowCount);

    // Create a fake file object for processing
    const csv = toCSV(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fakeFile = new File([blob], `sample-${type}-data.csv`, { type: 'text/csv' });

    // Process the sample data as if it was uploaded
    handleFileChange({ target: { files: [fakeFile] } });
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = useCallback((/** @type {React.DragEvent<HTMLDivElement>} */ e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((/** @type {React.DragEvent<HTMLDivElement>} */ e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((/** @type {React.DragEvent<HTMLDivElement>} */ e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const syntheticEvent = {
        target: { files: [file] }
      };
      handleFileChange(syntheticEvent);
    }
  }, []);

  const handleFileChange = (/** @type {React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }} */ event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      return;
    }

    setSelectedFile(file);
    setSummary(null);
    setAudit(null);
    setCleanedRows(null);
    setPreviewData(null);
    setFileStats(null);
    setErrorMessage('');
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStep('Reading file...');

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const reader = new FileReader();

    reader.onload = () => {
      try {
        setProcessingProgress(20);
        setProcessingStep('Parsing data...');
        let rows = [];

        if (extension === 'csv') {
          const text = reader.result;
          if (typeof text !== 'string') {
            throw new Error('Unable to read CSV content.');
          }
          rows = parseCSV(text);
        } else if (extension === 'json') {
          const text = reader.result;
          if (typeof text !== 'string') {
            throw new Error('Unable to read JSON content.');
          }
          rows = parseJSON(text);
        } else if (extension === 'xlsx' || extension === 'xls') {
          const buffer = reader.result;
          if (!(buffer instanceof ArrayBuffer)) {
            throw new Error('Unable to read Excel content.');
          }
          rows = parseExcel(buffer);
        } else {
          throw new Error('Unsupported file type. Please upload CSV, Excel, or JSON.');
        }

        setProcessingProgress(40);
        setProcessingStep('Analyzing data structure...');
        if (!rows || rows.length === 0) {
          throw new Error('Could not parse any rows from the uploaded file.');
        }

        // Generate file statistics
        const stats = {
          rowCount: rows.length,
          columnCount: rows[0] ? Object.keys(rows[0]).length : 0,
          fileSize: formatFileSize(file.size),
          fileType: extension.toUpperCase(),
          columns: rows[0] ? Object.keys(rows[0]) : []
        };
        setFileStats(stats);

        // Generate preview data (first 5 rows)
        setPreviewData(rows.slice(0, 5));

        setProcessingProgress(60);
        setProcessingStep('Auditing data quality...');
        const auditResult = auditData(rows);

        setProcessingProgress(80);
        setProcessingStep('Cleaning data...');
        const result = cleanData(rows, auditResult);

        setAudit(auditResult);
        setSummary(result.summary);
        setCleanedRows(result.cleanedRows);
        setProcessingProgress(100);
        setProcessingStep('Complete!');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMessage(message || 'File processing failed.');
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingStep('');
        }, 1000);
      }
    };

    reader.onerror = () => {
      setErrorMessage('File reading failed. Please try a different file.');
      setIsProcessing(false);
      setProcessingStep('');
    };

    if (extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDownload = () => {
    if (!cleanedRows || cleanedRows.length === 0) return;

    const csv = toCSV(cleanedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = selectedFile?.name?.replace(/\.[^/.]+$/, '') || 'cleaned-data';
    link.href = url;
    link.setAttribute('download', `${baseName}-cleaned.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            DataClean Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional data cleaning and validation tool. Upload your files and get instant quality improvements.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Upload Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="xl:col-span-2 space-y-6"
          >
            {/* File Upload Card */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Upload className="w-7 h-7 text-blue-600 mr-3" />
                  <h3 className="text-2xl font-semibold text-gray-900">Upload Data</h3>
                </div>
                <motion.button
                  onClick={generateSampleFile}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sample Data
                </motion.button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Supported formats: CSV, Excel (.xlsx/.xls), JSON</p>
                    <p>Maximum file size: {formatFileSize(MAX_FILE_SIZE)} • Recommended: {formatFileSize(RECOMMENDED_FILE_SIZE)}</p>
                  </div>
                </div>
              </div>

              <motion.div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.json"
                  className="hidden"
                />

                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="space-y-6"
                    >
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
                      <div className="space-y-3">
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <motion.div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${processingProgress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <p className="text-lg font-medium text-gray-900">{processingStep}</p>
                        <p className="text-sm text-gray-600">{processingProgress}% complete</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="space-y-6"
                    >
                      <FileText className="w-20 h-20 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-2xl font-medium text-gray-900 mb-2">
                          {isDragOver ? 'Drop your file here' : 'Drag & drop your file here'}
                        </p>
                        <p className="text-gray-600 mb-6">or click the button below</p>
                        <motion.button
                          onClick={handleChooseFile}
                          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
                          whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Upload className="w-6 h-6 mr-3" />
                          Choose File
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Sample Data Generator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100"
              >
                <div className="flex items-center mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Try Sample Data</h3>
                </div>
                <p className="text-gray-600 mb-4">Generate sample datasets to test the cleaning engine</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.button
                    onClick={() => handleGenerateSampleData('customer')}
                    className="p-4 border-2 border-dashed border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium text-gray-900">Customer Data</div>
                    <div className="text-sm text-gray-600">500 rows, 8 columns</div>
                  </motion.button>
                  <motion.button
                    onClick={() => handleGenerateSampleData('sales')}
                    className="p-4 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-medium text-gray-900">Sales Data</div>
                    <div className="text-sm text-gray-600">1000 rows, 12 columns</div>
                  </motion.button>
                  <motion.button
                    onClick={() => handleGenerateSampleData('inventory')}
                    className="p-4 border-2 border-dashed border-green-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Package className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="font-medium text-gray-900">Inventory Data</div>
                    <div className="text-sm text-gray-600">300 rows, 6 columns</div>
                  </motion.button>
                </div>
              </motion.div>

              {/* File Status */}
              <AnimatePresence>
                {selectedFile && !isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-6 bg-green-50 border border-green-200 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getFileIcon(selectedFile.name)}
                        <div className="ml-4">
                          <p className="text-green-800 font-semibold">{selectedFile.name}</p>
                          <p className="text-green-600 text-sm">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </motion.div>
                )}

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-6 bg-red-50 border border-red-200 rounded-xl"
                  >
                    <div className="flex items-start">
                      <AlertTriangle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-800 font-semibold mb-1">Upload Failed</p>
                        <p className="text-red-700">{errorMessage}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Data Preview Card */}
            <AnimatePresence>
              {previewData && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <Eye className="w-6 h-6 text-blue-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">Data Preview</h3>
                    </div>
                    <motion.button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-x-auto"
                      >
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(previewData[0] || {}).map((key) => (
                                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.map((row, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {String(value).length > 50 ? `${String(value).substring(0, 50)}...` : String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          Showing first 5 rows of {fileStats?.rowCount || 0} total rows
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Card */}
            {/* Results Card */}
            <AnimatePresence>
              {summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100"
                >
                  <div className="flex items-center mb-6">
                    <CheckCircle className="w-7 h-7 text-green-600 mr-3" />
                    <h3 className="text-2xl font-semibold text-gray-900">Cleaning Results</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <motion.div
                      className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl font-bold text-blue-600">{summary.rows_before}</div>
                      <div className="text-sm text-blue-800">Rows Before</div>
                    </motion.div>
                    <motion.div
                      className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl font-bold text-green-600">{summary.rows_after}</div>
                      <div className="text-sm text-green-800">Rows After</div>
                    </motion.div>
                    <motion.div
                      className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl font-bold text-red-600">{summary.duplicates_removed}</div>
                      <div className="text-sm text-red-800">Duplicates Removed</div>
                    </motion.div>
                    <motion.div
                      className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl font-bold text-purple-600">{summary.quality_score}%</div>
                      <div className="text-sm text-purple-800">Quality Score</div>
                    </motion.div>
                  </div>

                  {fileStats && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">File Statistics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-gray-600">Rows:</span> <span className="font-medium">{fileStats.rowCount}</span></div>
                        <div><span className="text-gray-600">Columns:</span> <span className="font-medium">{fileStats.columnCount}</span></div>
                        <div><span className="text-gray-600">Size:</span> <span className="font-medium">{fileStats.fileSize}</span></div>
                        <div><span className="text-gray-600">Type:</span> <span className="font-medium">{fileStats.fileType}</span></div>
                      </div>
                    </div>
                  )}

                  {cleanedRows && cleanedRows.length > 0 && (
                    <motion.button
                      onClick={handleDownload}
                      className="w-full inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-lg rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg"
                      whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-6 h-6 mr-3" />
                      Download Cleaned File
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cleaning Jobs</h3>
            <p className="text-gray-600 mb-4">View and manage your data cleaning jobs</p>
            <div className="text-3xl font-bold text-green-600">3 Active</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quality Score</h3>
            <p className="text-gray-600 mb-4">Average data quality score</p>
            <div className="text-3xl font-bold text-blue-600">92%</div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white p-8 rounded-xl shadow-lg border border-gray-100"
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'Customer database cleaned', time: '2 hours ago', color: 'green' },
            { action: 'Product inventory validated', time: '1 day ago', color: 'blue' },
            { action: 'Email deduplication completed', time: '2 days ago', color: 'purple' }
          ].map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              whileHover={{ scale: 1.01 }}
            >
              <span className="font-medium text-gray-900">{activity.action}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${activity.color === 'green' ? 'bg-green-100 text-green-800' : activity.color === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                {activity.time}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;