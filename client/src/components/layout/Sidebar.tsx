import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  UploadCloud, 
  LineChart, 
  Map as MapIcon, 
  Users, 
  History, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Radio,
  MessageSquare,
  Bot
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const navItems = [
    { name: 'Command Center', icon: LayoutDashboard, href: '/' },
    { name: 'Investigations', icon: Briefcase, href: '/cases' },
    { name: 'Ingestion Lab', icon: UploadCloud, href: '/upload' },
    { name: 'Graph Explorer', icon: Users, href: '/relationships' },
    { name: 'Tower Analysis', icon: Radio, href: '/tower' },
    { name: 'Geo Mapping', icon: MapIcon, href: '/map' },
    { name: 'IPDR Intelligence', icon: LineChart, href: '/ipdr' },
    { name: 'WhatsApp Forensics', icon: MessageSquare, href: '/whatsapp' },
    { name: 'Temporal Timeline', icon: History, href: '/timeline' },
    { name: 'Sentinel AI', icon: Bot, href: '/ai-assistant' },
    { name: 'System Logs', icon: ShieldAlert, href: '/audit' },
  ];

  if (!profile && location.pathname !== '/login' && location.pathname !== '/signup') {
    return null;
  }

  return (
    <aside className={cn(
      "h-screen bg-[#0a0a0a] border-r border-white/5 transition-all duration-300 flex flex-col z-20",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00d1ff] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,209,255,0.4)]">
          <ShieldAlert size={20} className="text-black" />
        </div>
        {!collapsed && (
          <span className="font-bold text-xl tracking-tight neon-text">CYBER-CDR</span>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              to={item.href}
              className={cn(
                "sidebar-link",
                location.pathname === item.href && "active",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon size={22} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full sidebar-link justify-center"
        >
          {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-3 w-full"><ChevronLeft size={20} /> <span>Collapse</span></div>}
        </button>
        
        <button 
          onClick={signOut}
          className="w-full sidebar-link mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/5"
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
