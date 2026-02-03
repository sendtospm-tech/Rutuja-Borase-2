
import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Plus, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  X,
  ArrowRight,
  FileText,
  FolderOpen,
  Settings,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { extractDataFromDocument } from './services/geminiService';
import { fileToBase64, parseExcelHeaders, appendAndDownloadExcel } from './utils/fileHandlers';
import { ExtractedData, ProcessingStatus } from './types';

const EXTRACTION_TEMPLATES = [
  { id: 'custom', label: 'Custom Instructions', prompt: '' },
  { id: 'invoice', label: 'Invoice / Billing', prompt: 'Extract billing details: Invoice #, Date, Vendor Name, Total Amount, Tax, and Currency.' },
  { id: 'receipt', label: 'Retail Receipt', prompt: 'Extract store name, date, time, total price, and items purchased list.' },
  { id: 'business_card', label: 'Business Card', prompt: 'Extract contact name, company, email, phone number, and address.' },
  { id: 'form', label: 'Standard Form', prompt: 'Extract all key-value pairs from the form fields accurately.' },
];

export default function App() {
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docPreviews, setDocPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [allHeaders, setAllHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(EXTRACTION_TEMPLATES[0]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [extractedRows, setExtractedRows] = useState<ExtractedData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const validFiles = files.filter(f => f.type.includes('image') || f.type.includes('pdf'));
      
      if (validFiles.length === 0 && files.length > 0) {
        setError("No valid images or PDF files found in selection.");
        return;
      }

      setDocFiles(prev => [...prev, ...validFiles]);
      const newPreviews = await Promise.all(validFiles.map(async (file) => {
        const base64 = await fileToBase64(file);
        return { url: base64, type: file.type, name: file.name };
      }));
      setDocPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeDocument = (index: number) => {
    setDocFiles(prev => prev.filter((_, i) => i !== index));
    setDocPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllDocuments = () => {
    setDocFiles([]);
    setDocPreviews([]);
    setStatus('idle');
    setExtractedRows([]);
  };

  const removeExcelFile = () => {
    setExcelFile(null);
    setAllHeaders([]);
    setSelectedHeaders([]);
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setExcelFile(file);
      try {
        const foundHeaders = await parseExcelHeaders(file);
        setAllHeaders(foundHeaders);
        setSelectedHeaders(foundHeaders); // Select all by default
      } catch (err) {
        setError("Could not read excel headers. Make sure it's a valid XLSX/CSV file.");
        removeExcelFile();
      }
    }
  };

  const toggleHeader = (header: string) => {
    setSelectedHeaders(prev => 
      prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]
    );
  };

  const processData = async () => {
    if (docFiles.length === 0 || !excelFile || selectedHeaders.length === 0) {
      setError("Please upload documents, an Excel file, and select at least one column.");
      return;
    }

    setStatus('loading');
    setError(null);
    const newExtractedRows: ExtractedData[] = [];
    const instructions = selectedTemplate.id === 'custom' ? customInstructions : selectedTemplate.prompt;

    try {
      for (let i = 0; i < docFiles.length; i++) {
        const preview = docPreviews[i];
        const result = await extractDataFromDocument(preview.url, instructions, selectedHeaders);
        
        const fullRow: ExtractedData = {};
        allHeaders.forEach(h => {
          fullRow[h] = result[h] || '';
        });
        
        newExtractedRows.push(fullRow);
      }
      setExtractedRows(newExtractedRows);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || "An error occurred during processing.");
      setStatus('error');
    }
  };

  const downloadResults = () => {
    if (excelFile && extractedRows.length > 0) {
      appendAndDownloadExcel(excelFile, extractedRows);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-6xl mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <FileSpreadsheet size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-800">DataFide Pro</h1>
        </div>
        <p className="text-slate-500 text-lg">Intelligent Document-to-Excel Batch Processing</p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Uploads & Config (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Document Upload Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" />
                Input Source
              </h2>
              <div className="flex gap-2">
                {docFiles.length > 0 && (
                  <button 
                    onClick={clearAllDocuments}
                    title="Clear All"
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition border border-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => docInputRef.current?.click()}
                  title="Upload Files"
                  className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition border border-slate-200"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  title="Upload Folder"
                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition border border-indigo-100"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition
                ${docFiles.length === 0 ? 'border-slate-300 hover:border-indigo-400 py-12' : 'border-transparent p-0 bg-slate-50'}`}
              onClick={(e) => {
                if (docFiles.length === 0) docInputRef.current?.click();
              }}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={docInputRef} 
                onChange={handleDocumentChange}
              />
              <input 
                type="file" 
                multiple 
                //@ts-ignore
                webkitdirectory="" 
                directory="" 
                className="hidden" 
                ref={folderInputRef} 
                onChange={handleDocumentChange}
              />
              
              {docFiles.length === 0 ? (
                <div className="flex flex-col items-center">
                  <Upload className="text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-500 text-center font-medium">Click to upload files or a folder</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Images & PDFs supported</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 w-full max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {docPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 shadow-xs bg-white">
                      {preview.type.includes('image') ? (
                        <img src={preview.url} alt="Upload" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-1">
                          <FileText size={18} className="text-red-500" />
                          <span className="text-[8px] text-slate-500 truncate w-full text-center mt-1 px-1">{preview.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeDocument(i); }}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition z-10 hover:scale-110 active:scale-95"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {docFiles.length > 0 && (
              <p className="mt-2 text-xs text-slate-400 text-right">{docFiles.length} files selected</p>
            )}
          </section>

          {/* Excel Template Section */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-500" />
                Target Template
              </h2>
              {excelFile && (
                <button 
                  onClick={removeExcelFile}
                  title="Remove Template"
                  className="p-1 bg-red-50 text-red-500 rounded hover:bg-red-100 transition"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            
            <div 
              onClick={() => !excelFile && excelInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition mb-4
                ${excelFile ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-300 hover:border-emerald-400'}`}
            >
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                ref={excelInputRef} 
                onChange={handleExcelChange}
              />
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${excelFile ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <FileSpreadsheet size={24} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-bold text-sm truncate">
                    {excelFile ? excelFile.name : 'Select Template'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {allHeaders.length > 0 ? `${allHeaders.length} columns found` : 'Upload to detect headers'}
                  </p>
                </div>
                {excelFile && (
                  <X 
                    size={16} 
                    className="text-slate-400 hover:text-red-500 transition cursor-pointer" 
                    onClick={(e) => { e.stopPropagation(); removeExcelFile(); }}
                  />
                )}
              </div>
            </div>

            {allHeaders.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto p-1 custom-scrollbar pr-2">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select columns to fill</p>
                   <button 
                    onClick={() => setSelectedHeaders(selectedHeaders.length === allHeaders.length ? [] : allHeaders)}
                    className="text-[10px] text-indigo-600 hover:underline"
                   >
                     {selectedHeaders.length === allHeaders.length ? 'Deselect all' : 'Select all'}
                   </button>
                </div>
                {allHeaders.map((h, i) => (
                  <label key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      checked={selectedHeaders.includes(h)}
                      onChange={() => toggleHeader(h)}
                    />
                    <span className={`text-sm ${selectedHeaders.includes(h) ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{h}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Configuration Settings */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings size={20} className="text-amber-500" />
              Settings
            </h2>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Type</label>
              <div className="relative">
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none pr-10"
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const template = EXTRACTION_TEMPLATES.find(t => t.id === e.target.value);
                    if (template) setSelectedTemplate(template);
                  }}
                >
                  {EXTRACTION_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {selectedTemplate.id === 'custom' ? 'Custom Instructions' : 'Template Prompt (Refinement)'}
              </label>
              <textarea 
                className="w-full h-24 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                placeholder={selectedTemplate.id === 'custom' ? "Describe what to extract..." : "Add specific details to refine the template..."}
                value={selectedTemplate.id === 'custom' ? customInstructions : selectedTemplate.prompt}
                onChange={(e) => {
                  if (selectedTemplate.id === 'custom') setCustomInstructions(e.target.value);
                }}
                disabled={selectedTemplate.id !== 'custom'}
              />
            </div>
          </section>

          <button 
            onClick={processData}
            disabled={status === 'loading' || docFiles.length === 0 || !excelFile || selectedHeaders.length === 0}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg
              ${status === 'loading' || docFiles.length === 0 || !excelFile || selectedHeaders.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:transform active:scale-95'}`}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="animate-spin" />
                Processing {extractedRows.length} / {docFiles.length}
              </>
            ) : (
              <>
                Analyze & Populate
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Right Column: Preview & Results */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Operation Failed</p>
                <p className="text-xs">{error}</p>
              </div>
              <button onClick={() => setError(null)}><X size={16} /></button>
            </div>
          )}

          {status === 'idle' && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-24 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="bg-indigo-50 p-8 rounded-full mb-6 text-indigo-400">
                <ImageIcon size={64} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Workspace Ready</h3>
              <p className="text-slate-500 max-w-sm mb-8 text-lg">Your data-fide journey starts here. Upload documents and a target template to begin the magic.</p>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2 opacity-50">
                   <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-sm font-bold">1</div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">Upload Docs</span>
                </div>
                <div className="w-12 h-[1px] bg-slate-200 mt-5 opacity-50"></div>
                <div className="flex flex-col items-center gap-2 opacity-50">
                   <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-sm font-bold">2</div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">Load Template</span>
                </div>
                <div className="w-12 h-[1px] bg-slate-200 mt-5 opacity-50"></div>
                <div className="flex flex-col items-center gap-2 opacity-50">
                   <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-sm font-bold">3</div>
                   <span className="text-[10px] font-bold uppercase tracking-widest">Extract</span>
                </div>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="bg-white rounded-3xl p-24 border border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-100 rounded-full scale-150 blur-2xl opacity-50 animate-pulse"></div>
                <Loader2 size={80} className="text-indigo-600 animate-spin relative" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-indigo-600">AI</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Gemini is Thinking...</h3>
              <p className="text-slate-500 max-w-sm text-lg leading-relaxed">
                Reading file <strong>{extractedRows.length + 1}</strong> of <strong>{docFiles.length}</strong>. 
                Mapping visual data into your structured template.
              </p>
              <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full mt-8 overflow-hidden">
                 <div 
                  className="bg-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${((extractedRows.length) / docFiles.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {(status === 'success' || (status === 'loading' && extractedRows.length > 0)) && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                    Process Complete
                  </h2>
                  <p className="text-sm text-slate-400">{extractedRows.length} rows successfully generated</p>
                </div>
                {status === 'success' && (
                  <button 
                    onClick={downloadResults}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg hover:shadow-emerald-200 active:scale-95"
                  >
                    <Download size={20} />
                    Download Final File
                  </button>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse min-w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm sticky top-0 z-20">
                        <th className="p-4 font-bold text-slate-400 uppercase tracking-tighter text-[10px] w-12 text-center">ID</th>
                        {allHeaders.map((h, i) => (
                          <th key={i} className={`p-4 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap transition-colors
                            ${selectedHeaders.includes(h) ? 'text-indigo-600' : 'text-slate-300'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-indigo-50/20 transition group">
                          <td className="p-4 text-slate-300 font-mono text-xs text-center border-r border-slate-50">{rowIndex + 1}</td>
                          {allHeaders.map((h, colIndex) => (
                            <td key={colIndex} className={`p-4 transition-colors
                              ${selectedHeaders.includes(h) ? 'text-slate-800' : 'text-slate-400 bg-slate-50/30 italic'}`}>
                              {row[h]?.toString() || (selectedHeaders.includes(h) ? <span className="text-slate-300 font-light">N/A</span> : '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {extractedRows.length === 0 && status !== 'loading' && (
                  <div className="p-24 text-center">
                    <AlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 italic font-medium">No valid data was extracted from these files.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-24 py-12 border-t border-slate-200 w-full text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-4 gap-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <FileSpreadsheet size={20} className="text-indigo-600" />
            DataFide Pro
          </div>
          <p className="text-slate-400 text-xs">
            &copy; {new Date().getFullYear()} DataFide. Powered by Gemini 3 Flash. Built for scale.
          </p>
          <div className="flex gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition">Help</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
