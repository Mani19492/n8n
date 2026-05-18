import { useEffect, useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  Shield, 
  Zap, 
  ArrowUpRight,
  Database,
  Search,
  Plus,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function OperationalDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    highRisk: 0,
    totalRecords: 0
  });
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { count: totalCount } = await supabase.from('investigations').select('*', { count: 'exact', head: true });
        const { count: activeCount } = await supabase.from('investigations').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { data: recordsData } = await supabase.from('investigations').select('total_records');
        
        const totalRecs = recordsData?.reduce((acc, curr) => acc + (curr.total_records || 0), 0) || 0;

        setStats({
          total: totalCount || 0,
          active: activeCount || 0,
          highRisk: 0,
          totalRecords: totalRecs
        });

        const { data: cases } = await supabase
          .from('investigations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentCases(cases || []);
      } catch (error) {
        console.error('Dashboard Fetch Error:', error);
        toast.error("Failed to synchronize with intelligence repository.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-10 space-y-12 bg-[#020617] min-h-screen">
      <div className="flex justify-between items-end">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#00d1ff]/10 flex items-center justify-center text-[#00d1ff]">
                 <Shield size={18} />
              </div>
              <h2 className="text-[10px] font-black text-[#00d1ff] uppercase tracking-[0.3em]">Operational Terminal</h2>
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter">INTELLIGENCE FUSION CENTER</h1>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => navigate('/upload')}
             className="px-6 py-3 bg-[#00d1ff] text-black font-black uppercase text-xs rounded-xl shadow-[0_0_20px_rgba(0,209,255,0.3)] hover:shadow-[0_0_40px_rgba(0,209,255,0.5)] transition-all flex items-center gap-2"
           >
              <Plus size={16} /> New Investigation
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Investigations', value: stats.total, icon: Briefcase, color: 'text-[#00d1ff]' },
          { label: 'Active Forensics', value: stats.active, icon: Zap, color: 'text-emerald-400' },
          { label: 'Intelligence Depth', value: stats.totalRecords.toLocaleString(), icon: Database, color: 'text-purple-400' },
          { label: 'High-Risk Threats', value: stats.highRisk, icon: AlertTriangle, color: 'text-red-500' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="glass-card p-6 border-white/5 bg-white/[0.01]">
               <div className="flex justify-between items-start mb-4">
                  <Icon className={m.color} size={20} />
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Live Sync</span>
               </div>
               <p className="text-3xl font-black text-white mb-1">{isLoading ? '...' : m.value}</p>
               <p className="text-[10px] font-bold text-gray-500 uppercase">{m.label}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3">
               <Clock size={16} className="text-[#00d1ff]" />
               Real-time Intelligence Feed
            </h2>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
               <input 
                 type="text" 
                 placeholder="Search global repository..."
                 className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-[10px] focus:outline-none focus:border-[#00d1ff]/50 min-w-[250px]"
               />
            </div>
         </div>

         {isLoading ? (
           <div className="py-20 text-center opacity-30 animate-pulse">Synchronizing Intelligence Nodes...</div>
         ) : recentCases.length === 0 ? (
           <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl group cursor-pointer hover:bg-white/[0.02] transition-all" onClick={() => navigate('/upload')}>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">No Active Investigations Detected</p>
              <p className="text-[10px] text-gray-500">Initiate a new forensic upload to begin data reconstruction.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-4">
              {recentCases.map((c) => (
                <motion.div 
                  key={c.id}
                  whileHover={{ x: 6 }}
                  onClick={() => navigate(`/workspace/${c.id}`)}
                  className="group p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#00d1ff]/30 hover:bg-white/[0.03] transition-all cursor-pointer flex items-center gap-8"
                >
                   <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-[#00d1ff] transition-colors">
                      <Database size={20} />
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-4 mb-1">
                         <span className="text-[10px] font-mono text-[#00d1ff] font-bold tracking-widest">{c.case_number}</span>
                         <h3 className="text-xs font-bold text-white uppercase">{c.title}</h3>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Records: {c.total_records?.toLocaleString()}</span>
                         <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                         <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Detected: {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                   </div>
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:bg-[#00d1ff] group-hover:text-black transition-all">
                      <ArrowUpRight size={18} />
                   </div>
                </motion.div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
}
