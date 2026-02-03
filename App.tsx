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
  Trash2,
  Sparkles,
  Info
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
  const [selectedTemplate, setSelectedTemplate] = useState(EXTRACTION_TEMPLATES[1]); // Default to Invoice
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
        setError("Please select valid image (JPG, PNG) or PDF files.");
        return;
      }

      setError(null);
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
    if (docFiles.length <= 1) setStatus('idle');
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
      setError(null);
      try {
        const foundHeaders = await parseExcelHeaders(file);
        if (foundHeaders.length === 0) {
          setError("The selected Excel file appears to be empty or missing headers.");
          removeExcelFile();
          return;
        }
        setAllHeaders(foundHeaders);
        setSelectedHeaders(foundHeaders);
      } catch (err) {
        setError("Error reading the Excel file. Please ensure it's a valid XLSX, XLS, or CSV.");
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
    if (docFiles.length === 0) {
      setError("Please upload at least one image or PDF document.");
      return;
    }
    if (!excelFile) {
      setError("Please upload a target Excel/CSV template.");
      return;
    }
    if (selectedHeaders.length === 0) {
      setError("Please select at least one column to populate.");
      return;
    }

    setStatus('loading');
    setError(null);
    const results: ExtractedData[] = [];
    const instructions = selectedTemplate.id === 'custom' ? customInstructions : selectedTemplate.prompt;

    try {
      for (let i = 0; i < docFiles.length; i++) {
        const preview = docPreviews[i];
        const result = await extractDataFromDocument(preview.url, instructions, selectedHeaders);
        
        // Map result back to all headers to ensure consistent row structure
        const fullRow: ExtractedData = {};
        allHeaders.forEach(h => {
          fullRow[h] = result[h] !== undefined ? result[h] : '';
        });
        
        results.push(fullRow);
        // Update live so user sees progress
        setExtractedRows([...results]);
      }
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during AI processing.");
      setStatus('error');
    }
  };

  const downloadResults = () => {
    if (excelFile && extractedRows.length > 0) {
      appendAndDownloadExcel(excelFile, extractedRows);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-indigo-100">
      <header className="w-full max-w-6xl mb-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-2.5 rounded-xl shadow-lg shadow-indigo-100 text-white">
            <Sparkles size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-tight">DataFide Pro</h1>
            <p className="text-slate-500 text-sm font-medium">Smart Image-to-Excel Automator</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center">
                 <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-indigo-500' : i === 2 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Workspace</span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Source Panel */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={18} className="text-indigo-500" />
                1. Input Documents
              </h2>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => docInputRef.current?.click()}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500"
                  title="Add Files"
                >
                  <Plus size={18} />
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-500"
                  title="Upload Folder"
                >
                  <FolderOpen size={18} />
                </button>
              </div>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-2xl transition-all duration-300
                ${docFiles.length === 0 
                  ? 'border-slate-200 hover:border-indigo-400 p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50' 
                  : 'border-transparent bg-slate-50 p-3'}`}
              onClick={() => docFiles.length === 0 && docInputRef.current?.click()}
            >
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={docInputRef} onChange={handleDocumentChange} />
              <input type="file" multiple {...({ webkitdirectory: "", directory: "" } as any)} className="hidden" ref={folderInputRef} onChange={handleDocumentChange} />
              
              {docFiles.length === 0 ? (
                <>
                  <Upload className="text-slate-300 mb-3" size={32} />
                  <p className="text-sm text-slate-500 font-semibold text-center">Click or drop files</p>
                  <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, PDF</p>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {docPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 bg-white">
                      {preview.type.includes('image') ? (
                        <img src={preview.url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          <FileText size={20} className="text-red-400" />
                          <span className="text-[8px] text-slate-400 truncate w-full text-center mt-1">{preview.name}</span>
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeDocument(i); }}
                        className="absolute top-1 right-1 bg-slate-900/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={(e) => { e.stopPropagation(); docInputRef.current?.click(); }}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Template Panel */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-5">
              <FileSpreadsheet size={18} className="text-emerald-500" />
              2. Target Spreadsheet
            </h2>
            
            <div 
              onClick={() => !excelFile && excelInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 cursor-pointer transition-all duration-300 mb-4
                ${excelFile ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-300 bg-slate-50/50'}`}
            >
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={excelInputRef} onChange={handleExcelChange} />
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shadow-sm ${excelFile ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-bold text-sm truncate text-slate-700">
                    {excelFile ? excelFile.name : 'Choose template...'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {allHeaders.length > 0 ? `${allHeaders.length} columns detected` : 'Excel / CSV required'}
                  </p>
                </div>
                {excelFile && (
                  <button onClick={(e) => { e.stopPropagation(); removeExcelFile(); }} className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {allHeaders.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Columns</span>
                  <button onClick={() => setSelectedHeaders(selectedHeaders.length === allHeaders.length ? [] : allHeaders)} className="text-[10px] text-indigo-500 font-bold hover:underline">
                    {selectedHeaders.length === allHeaders.length ? 'Clear' : 'Select All'}
                  </button>
                </div>
                {allHeaders.map((h, i) => (
                  <label key={i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition group border border-transparent hover:border-slate-100">
                    <input type="checkbox" className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={selectedHeaders.includes(h)} onChange={() => toggleHeader(h)} />
                    <span className={`text-xs ${selectedHeaders.includes(h) ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>{h}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Instructions Panel */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-5">
              <Settings size={18} className="text-amber-500" />
              3. AI Instructions
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-indigo-500 outline-none pr-10 text-slate-700"
                  value={selectedTemplate.id}
                  onChange={(e) => {
                    const template = EXTRACTION_TEMPLATES.find(t => t.id === e.target.value);
                    if (template) setSelectedTemplate(template);
                  }}
                >
                  {EXTRACTION_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
              </div>
              <textarea 
                className="w-full h-28 p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-slate-600 leading-relaxed font-medium"
                placeholder="Specific instructions for extraction..."
                value={selectedTemplate.id === 'custom' ? customInstructions : selectedTemplate.prompt}
                onChange={(e) => selectedTemplate.id === 'custom' && setCustomInstructions(e.target.value)}
                readOnly={selectedTemplate.id !== 'custom'}
              />
            </div>
          </section>

          <button 
            onClick={processData}
            disabled={status === 'loading' || docFiles.length === 0 || !excelFile}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-xl
              ${status === 'loading' || docFiles.length === 0 || !excelFile
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-indigo-200'}`}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                Run Extraction
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        {/* Right Column: Display Panel */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 text-rose-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="font-bold text-xs uppercase tracking-wider">Processing Error</p>
                <p className="text-xs font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="hover:bg-rose-100 p-1 rounded-lg transition"><X size={16} /></button>
            </div>
          )}

          {status === 'idle' && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="bg-indigo-50/50 p-10 rounded-full mb-8 text-indigo-500 relative">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-20"></div>
                <ImageIcon size={64} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3 leading-tight">Your data, beautifully organized</h3>
              <p className="text-slate-500 max-w-sm mb-10 text-sm font-medium leading-relaxed">
                Connect your documents to your template and let Gemini handle the busywork of data entry.
              </p>
              <div className="flex items-center gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">0{i}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(status === 'loading' || status === 'success' || status === 'error') && extractedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    {status === 'success' ? (
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    ) : (
                      <Loader2 size={24} className="text-indigo-500 animate-spin" />
                    )}
                    Results Preview
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{extractedRows.length} of {docFiles.length} files processed</p>
                </div>
                {status === 'success' && (
                  <button 
                    onClick={downloadResults}
                    className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest"
                  >
                    <Download size={18} />
                    Download File
                  </button>
                )}
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-4 font-black text-slate-400 uppercase tracking-tighter text-[9px] w-12 text-center border-r border-slate-100">#</th>
                        {allHeaders.map((h, i) => (
                          <th key={i} className={`p-4 font-black uppercase tracking-tight text-[10px] whitespace-nowrap
                            ${selectedHeaders.includes(h) ? 'text-indigo-600 bg-indigo-50/20' : 'text-slate-300'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extractedRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-indigo-50/10 transition group">
                          <td className="p-4 text-slate-300 font-mono text-[10px] text-center border-r border-slate-100">{rowIndex + 1}</td>
                          {allHeaders.map((h, colIndex) => (
                            <td key={colIndex} className={`p-4 transition-colors font-medium
                              ${selectedHeaders.includes(h) ? 'text-slate-700' : 'text-slate-300 italic opacity-40'}`}>
                              {row[h]?.toString() || (selectedHeaders.includes(h) ? <span className="text-slate-200">—</span> : '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {status === 'loading' && (
                  <div className="p-8 flex items-center justify-center bg-slate-50/30 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></div>
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gemini is writing row {extractedRows.length + 1}...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-20 py-10 border-t border-slate-100 w-full">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center px-4 gap-4">
          <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition duration-500">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="text-xs font-black tracking-widest uppercase">DataFide Engine</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-500 transition">Docs</a>
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-500 transition">Security</a>
            <a href="#" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-500 transition">Support</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}