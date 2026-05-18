import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  UploadCloud, 
  X, 
  FileText, 
  Shield, 
  Zap, 
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadCDR } from '@/lib/sentinel';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    }
  });

  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      toast.error("Please select a forensic file.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const result = await uploadCDR(files[0], (msg) => {
        // update progress/toast if necessary, or just rely on the fast browser parse
        console.log(msg);
        setProgress(p => Math.min(p + 20, 90));
      });

      const caseId = result?.investigation_id || result?.case_number;

      if (caseId) {
        toast.success(`Success: Case ${caseId} initialized.`);
        // Pass the result in state so the Workspace component can read it
        setTimeout(() => navigate(`/workspace/${caseId}`, { state: result }), 800);
      } else {
        toast.success("Analysis sequence initiated successfully.");
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error: any) {
      console.error('Forensic Engine Error:', error);
      toast.error(`Forensic Engine Error: ${error.message || 'Reconstruction failed.'}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <div className="flex flex-col items-center text-center mb-12">
         <div className="w-16 h-16 rounded-2xl bg-[#00d1ff]/10 border border-[#00d1ff]/20 flex items-center justify-center text-[#00d1ff] mb-6">
            <Shield size={32} />
         </div>
         <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Forensic Ingestion Lab</h1>
         <p className="text-gray-500 mt-2">Unified Telecom Data Reconstruction Engine</p>
      </div>

      <div className="space-y-6">
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-3xl p-16 transition-all duration-500 cursor-pointer bg-white/[0.01]",
            isDragActive ? "border-[#00d1ff] bg-[#00d1ff]/5" : "border-white/10 hover:border-white/20"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <UploadCloud size={48} className={isDragActive ? "text-[#00d1ff]" : "text-gray-700"} />
            <p className="text-sm font-bold text-gray-400">Drag & Drop Forensic CDR/IPDR File</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="glass-card p-4 flex items-center justify-between border-[#00d1ff]/30 bg-[#00d1ff]/5">
             <div className="flex items-center gap-3">
                <FileText className="text-[#00d1ff]" size={20} />
                <span className="text-sm font-mono font-bold">{files[0].name}</span>
             </div>
             <button onClick={() => setFiles([])} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
        )}

        <button 
          onClick={handleStartAnalysis}
          disabled={isProcessing || files.length === 0}
          className={cn(
            "w-full py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all",
            isProcessing ? "bg-white/5 text-gray-500" : "bg-[#00d1ff] text-black shadow-[0_0_40px_rgba(0,209,255,0.4)]"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing: {progress}%
            </>
          ) : (
            <>
              <Zap size={20} fill="currentColor" />
              Initialize Forensic Analysis
              <ArrowRight size={20} />
            </>
          )}
        </button>

        <div className="flex items-center gap-2 justify-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
           <AlertCircle size={12} />
           Ensure external n8n node is active before initialization
        </div>
      </div>
    </div>
  );
}
