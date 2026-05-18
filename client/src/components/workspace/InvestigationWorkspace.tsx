import { useState, useEffect } from 'react';
import { 
  Shield, 
  Bot, 
  Loader2, 
  LayoutDashboard, 
  Database, 
  Signal, 
  MapPin, 
  Network, 
  History,
  Columns,
  Users,
  Send,
  Download,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { toast } from 'sonner';
import ForensicMap from '@/components/visualization/ForensicMap';
import GraphEngine from '@/components/visualization/GraphEngine';
import { askSentinel, destroySession } from '@/lib/sentinel';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface WorkspaceProps {
  investigationId: string;
  initialData?: any;
}

export default function OperationalWorkspace({ investigationId, initialData }: WorkspaceProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [caseData, setCaseData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCaseData({
        case_number: initialData.investigation_id || initialData.case_number,
        title: initialData.title || 'CDR Analysis',
        total_records: initialData.total_records,
        risk_score: initialData.risk_index,
      });
      setRecords(initialData.records_json || []);
      setInsights(initialData.anomalies || []);
      setIsLoading(false);
      return;
    }
    const loadSession = async () => {
      try {
        const { data: inv } = await supabase
          .from('investigations')
          .select('*')
          .eq('case_number', investigationId)
          .single();
        
        if (!inv) {
          const { data: invUuid } = await supabase.from('investigations').select('*').eq('id', investigationId).single();
          setCaseData(invUuid);
        } else {
          setCaseData(inv);
        }

        // Parse records from the unified JSON if available
        let parsedRecords = [];
        try {
          parsedRecords = inv?.records_json ? JSON.parse(inv.records_json) : [];
        } catch (e) {
          console.error('Error parsing records_json', e);
        }

        if (parsedRecords.length > 0) {
          setRecords(parsedRecords);
        } else {
          // Fallback to separate table
          const { data: recs } = await supabase
            .from('forensic_records')
            .select('*')
            .eq('investigation_id', inv?.id || investigationId)
            .limit(500);
          setRecords(recs || []);
        }

        const { data: ins } = await supabase
          .from('ai_insights')
          .select('*')
          .eq('investigation_id', inv?.id || investigationId);
        setInsights(ins || []);

        // Chat memory is now primarily stored in the investigation table itself by the new n8n workflow
        let parsedMemory = [];
        try {
          parsedMemory = inv?.chat_memory ? JSON.parse(inv.chat_memory) : [];
        } catch (e) {
          console.error('Error parsing chat_memory', e);
        }
        
        if (parsedMemory.length > 0) {
          // Map to match the expected format { role, message }
          const mappedMsgs = parsedMemory.flatMap((m: any) => [
            { role: 'user', message: m.question },
            { role: 'assistant', message: m.answer }
          ]);
          setChatMessages(mappedMsgs);
        } else {
          const { data: msgs } = await supabase
            .from('investigation_chat_messages')
            .select('*, session:investigation_chat_sessions!inner(investigation_id)')
            .eq('session.investigation_id', inv?.id || investigationId)
            .order('created_at', { ascending: true });
          setChatMessages(msgs || []);
        }

      } catch (error) {
        console.error('Workspace Load Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, [investigationId]);

  const handleAiInquiry = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', message: input };
    setChatMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsAiTyping(true);

    try {
      const responseText = await askSentinel(investigationId, input);

      const aiResponse = { 
        role: 'assistant', 
        message: responseText || "Sentinel synthesis complete."
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Sentinel AI Error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        message: "Error: Sentinel Intelligence node is currently offline. Ensure the n8n workflow is 'Active'." 
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const graphElements = useMemo(() => {
    if (!initialData?.comm_links) return undefined;
    const links = initialData.comm_links;
    const degreeMap = new Map();
    links.forEach((l: any) => {
      degreeMap.set(l.source, (degreeMap.get(l.source)||0) + l.weight);
      degreeMap.set(l.target, (degreeMap.get(l.target)||0) + l.weight);
    });
    return [
      ...new Set([...links.map((l: any)=>l.source), ...links.map((l: any)=>l.target)])
    ].map((id: any) => ({ data: { id: id, label: id, degree: degreeMap.get(id) || 1 } }))
    .concat(links.map((l: any) => ({ data: { id: `${l.source}-${l.target}`, source: l.source, target: l.target, weight: l.weight } })));
  }, [initialData]);

  const timelineData = useMemo(() => {
    if (!initialData?.timeline_json) return [];
    const buckets = new Map();
    initialData.timeline_json.forEach((r: any) => {
      const d = new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      buckets.set(d, (buckets.get(d) || 0) + 1);
    });
    return Array.from(buckets.entries()).map(([date, calls]) => ({ date, calls }));
  }, [initialData]);

  const handleCloseCase = async () => {
    await destroySession(investigationId);
    navigate('/');
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    toast.info("Initializing report generation...");
    try {
      const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook-test/forensic';
      
      const response = await axios.post(n8nWebhookUrl, {
        action: 'report',
        case_id: investigationId
      });

      if (response.data?.success && response.data?.reportHtml) {
        const blob = new window.Blob([response.data.reportHtml], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename || `report-${investigationId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Intelligence report generated successfully.");
      } else {
        throw new Error("Invalid report response.");
      }
    } catch (error) {
      console.error("Report Generation Error:", error);
      toast.error("Failed to generate intelligence report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const tabs = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Raw Records', icon: Database },
    { name: 'Tower Analysis', icon: Signal },
    { name: 'IMEI Mapping', icon: Shield },
    { name: 'Geo Intelligence', icon: MapPin },
    { name: 'Common Numbers', icon: Users },
    { name: 'Relationship Graph', icon: Network },
    { name: 'Timeline', icon: History },
    { name: 'AI Insights', icon: Bot },
  ];

  if (isLoading) return (
    <div className="h-screen bg-[#1E1E2D] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-[#B524DB] animate-spin" size={40} />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.5em]">Initializing Forensic Environment</p>
       </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-[#1E1E2D] border-t border-[#2B2B40]">
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-[#2B2B40] bg-[#151521] flex flex-col"
          >
            <div className="p-4 border-b border-[#2B2B40] bg-[#1E1E2D]">
               <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-[#00d1ff]" />
                  <span className="text-[10px] font-black text-[#00d1ff] uppercase tracking-widest">Case Profile</span>
               </div>
               <h2 className="text-sm font-bold text-white mb-1 truncate">{caseData?.title || 'Active Investigation'}</h2>
               <p className="text-[10px] font-mono text-gray-500">{caseData?.case_number || investigationId}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
               <div>
                  <h3 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">Forensic Modules</h3>
                  <div className="space-y-1">
                     {tabs.map((tab) => {
                       const Icon = tab.icon;
                       return (
                         <button
                           key={tab.name}
                           onClick={() => setActiveTab(tab.name)}
                           className={cn(
                             "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all",
                             activeTab === tab.name 
                               ? "bg-gradient-to-r from-[#B524DB]/20 to-[#00d1ff]/10 text-white font-bold border border-[#B524DB]/30 shadow-[0_0_15px_rgba(181,36,219,0.2)]" 
                               : "text-gray-400 hover:text-white hover:bg-white/5"
                           )}
                         >
                           <Icon size={14} />
                           {tab.name}
                         </button>
                       );
                     })}
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="h-12 border-b border-[#2B2B40] bg-[#151521] flex items-center justify-between px-6">
           <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-white transition-colors">
                 <Columns size={16} />
              </button>
              <div className="h-4 w-[1px] bg-white/10"></div>
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeTab} VIEW</h2>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={handleCloseCase}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors text-[10px] font-bold uppercase tracking-widest"
             >
               <X size={12} />
               Close Case
             </button>
             <button 
               onClick={handleGenerateReport}
               disabled={isGeneratingReport}
               className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#B524DB]/10 text-[#B524DB] border border-[#B524DB]/20 hover:bg-[#B524DB]/20 transition-colors text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
             >
               {isGeneratingReport ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
               {isGeneratingReport ? 'Generating...' : 'Export Report'}
             </button>
           </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-[#1E1E2D]">
           {activeTab === 'Overview' && (
             <div className="p-8 h-full overflow-y-auto space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-[#151521] p-6 rounded-2xl border border-[#2B2B40] shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#B524DB]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Total Intelligence</h4>
                      <p className="text-4xl font-black text-white">{caseData?.total_records?.toLocaleString() || records.length}</p>
                   </div>
                   <div className="bg-[#151521] p-6 rounded-2xl border border-[#2B2B40] shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Risk Index</h4>
                      <p className="text-4xl font-black text-red-500">{(caseData?.risk_score || 72)}/100</p>
                   </div>
                   <div className="bg-[#151521] p-6 rounded-2xl border border-[#2B2B40] shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d1ff]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Anomaly Detection</h4>
                      <p className="text-4xl font-black text-[#00d1ff]">{insights.length}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                   <div className="bg-[#151521] rounded-2xl border border-[#2B2B40] shadow-lg flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-[#2B2B40] flex justify-between">
                         <span className="text-[10px] font-black uppercase text-gray-400">Geo Distribution</span>
                      </div>
                      <div className="flex-1 bg-[#1E1E2D]">
                         <ForensicMap markers={records.filter(r => r && r.latitude).slice(0, 10).map(r => ({ lat: Number(r.latitude), lng: Number(r.longitude), label: r.tower_address, type: 'tower' }))} />
                      </div>
                   </div>
                   <div className="bg-[#151521] rounded-2xl border border-[#2B2B40] shadow-lg flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-[#2B2B40] flex justify-between">
                         <span className="text-[10px] font-black uppercase text-gray-400">Activity Timeline</span>
                      </div>
                      <div className="flex-1 bg-[#1E1E2D] p-4">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData}>
                               <defs>
                                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                     <stop offset="5%" stopColor="#B524DB" stopOpacity={0.4}/>
                                     <stop offset="95%" stopColor="#B524DB" stopOpacity={0}/>
                                  </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" stroke="#2B2B40" vertical={false} />
                               <XAxis dataKey="date" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip contentStyle={{ backgroundColor: '#151521', borderColor: '#2B2B40', borderRadius: '8px' }} itemStyle={{ color: '#00d1ff' }} />
                               <Area type="monotone" dataKey="calls" stroke="#B524DB" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Raw Records' && (
             <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#020617] z-20">
                         <tr className="text-[10px] uppercase font-black text-gray-600 border-b border-white/5 tracking-widest">
                            <th className="px-6 py-4">S.No</th>
                            <th className="px-6 py-4">A-Party (Caller)</th>
                            <th className="px-6 py-4">B-Party (Receiver)</th>
                            <th className="px-6 py-4">Timestamp (UTC)</th>
                         </tr>
                      </thead>
                      <tbody className="text-[11px] font-mono divide-y divide-white/[0.02]">
                         {records.map((r, i) => (
                           <tr key={r.id} className="hover:bg-[#00d1ff]/5 transition-colors group">
                              <td className="px-6 py-3 text-gray-700">{i + 1}</td>
                              <td className="px-6 py-3 text-white font-bold group-hover:text-[#00d1ff]">{r.a_party}</td>
                              <td className="px-6 py-3 text-gray-400">{r.b_party || 'N/A'}</td>
                              <td className="px-6 py-3 text-gray-500">{new Date(r.timestamp).toLocaleString()}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === 'Timeline' && (
             <div className="h-full flex flex-col bg-[#1E1E2D] p-6">
                <div className="flex-1 bg-[#151521] rounded-2xl border border-[#2B2B40] shadow-lg p-6">
                   <h3 className="text-xl font-bold mb-6 uppercase text-[#B524DB]">Temporal Activity Pattern</h3>
                   <div className="h-[calc(100%-60px)]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timelineData}>
                           <defs>
                              <linearGradient id="colorCallsTab" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#00d1ff" stopOpacity={0.5}/>
                                 <stop offset="95%" stopColor="#00d1ff" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#2B2B40" vertical={false} />
                           <XAxis dataKey="date" stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                           <Tooltip contentStyle={{ backgroundColor: '#151521', borderColor: '#2B2B40', borderRadius: '8px' }} itemStyle={{ color: '#00d1ff' }} />
                           <Area type="monotone" dataKey="calls" stroke="#00d1ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCallsTab)" />
                        </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'Relationship Graph' && (
             <div className="h-full bg-[#1E1E2D] p-6">
                <GraphEngine investigationId={investigationId} elements={graphElements} />
             </div>
           )}

           {activeTab === 'Geo Intelligence' && (
             <div className="h-full">
                <ForensicMap markers={records.filter(r => r && r.latitude).map(r => ({ lat: Number(r.latitude), lng: Number(r.longitude), label: r.tower_address, type: 'tower' }))} />
             </div>
           )}

           {activeTab === 'Tower Analysis' && (
             <div className="h-full overflow-auto p-6 text-white custom-scrollbar">
               <h3 className="text-xl font-bold mb-4 uppercase text-[#00d1ff]">Tower Analysis</h3>
               <div className="space-y-2">
                 {(initialData?.tower_analysis || []).map((t: any, i: number) => (
                   <div key={i} className="glass-card p-4 border-white/5 bg-white/[0.01]">
                     <span className="font-bold text-[#00d1ff]">{t.tower_id}</span>: {t.hits} hits — {t.city} {t.address ? `(${t.address})` : ''}
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'IMEI Mapping' && (
             <div className="h-full overflow-auto p-6 text-white custom-scrollbar">
               <h3 className="text-xl font-bold mb-4 uppercase text-[#00d1ff]">IMEI Mapping</h3>
               <div className="space-y-2">
                 {(initialData?.imei_mapping || []).map((d: any, i: number) => (
                   <div key={i} className="glass-card p-4 border-white/5 bg-white/[0.01]">
                     <span className="font-bold text-emerald-400">{d.imei}</span> → MSISDNs: {d.msisdns?.join(', ')} | IMSIs: {d.imsis?.join(', ')}
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'Common Numbers' && (
             <div className="h-full overflow-auto p-6 text-white custom-scrollbar">
               <h3 className="text-xl font-bold mb-4 uppercase text-[#00d1ff]">Common Numbers</h3>
               <div className="space-y-2">
                 {(initialData?.common_numbers || []).map((n: any, i: number) => (
                   <div key={i} className="glass-card p-4 border-white/5 bg-white/[0.01]">
                     <span className="font-bold text-[#00d1ff]">{n.number}</span>: {n.contact_count} contacts <span className="text-gray-500">({n.provider})</span>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {activeTab === 'AI Insights' && (
             <div className="h-full flex flex-col bg-[#010309]">
               <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                 {chatMessages.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center opacity-20">
                     <Bot size={64} className="mb-4" />
                     <p className="text-xs font-bold uppercase tracking-[0.3em]">Sentinel AI Operational</p>
                   </div>
                 ) : (
                   chatMessages.map((msg, i) => (
                     <div key={i} className={cn(
                       "max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed",
                       msg.role === 'user' 
                         ? "ml-auto bg-[#00d1ff]/10 border border-[#00d1ff]/20 text-white" 
                         : "bg-white/[0.03] border border-white/5 text-gray-300"
                     )}>
                       <div className="flex items-center gap-2 mb-3 opacity-50">
                         {msg.role === 'user' ? <Shield size={12} /> : <Bot size={12} />}
                         <span className="font-bold uppercase tracking-widest">{msg.role === 'user' ? 'Investigator' : 'Sentinel AI'}</span>
                       </div>
                       <div className="react-markdown-container flex flex-col gap-3">
                         <ReactMarkdown 
                           components={{
                             p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                             strong: ({node, ...props}) => <strong className="text-[#00d1ff] font-bold" {...props} />,
                             ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1" {...props} />,
                             li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                           }}
                         >
                           {msg.message}
                         </ReactMarkdown>
                       </div>
                     </div>
                   ))
                 )}
                  {isAiTyping && (
                    <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 max-w-[200px]">
                      <div className="flex items-center gap-2 opacity-50">
                        <Bot size={10} className="text-[#00d1ff]" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#00d1ff]">Sentinel is synthesizing</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className="w-1 h-1 rounded-full bg-[#00d1ff] animate-bounce"></span>
                        <span className="w-1 h-1 rounded-full bg-[#00d1ff] animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1 h-1 rounded-full bg-[#00d1ff] animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
               </div>
               <div className="p-6 border-t border-white/5 bg-black/20">
                 <div className="relative">
                   <input 
                     type="text"
                     value={input}
                     onChange={(e) => setInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAiInquiry()}
                     placeholder="Query Sentinel AI for forensic synthesis..."
                     className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-16 text-xs focus:outline-none focus:border-[#00d1ff]/50"
                   />
                   <button 
                     onClick={handleAiInquiry}
                     className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-[#00d1ff] text-black flex items-center justify-center hover:shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all"
                   >
                     <Send size={16} />
                   </button>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
