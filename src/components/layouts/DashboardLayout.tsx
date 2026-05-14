/**
 * PORTAL ESQUADROMIL - DASHBOARD LAYOUT (v2.1.0)
 * Data: 2026-05-14
 * Descrição: Layout institucional com navegação agrupada e suporte a múltiplos perfis.
 */
import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Ticket, Calendar, Bell, LogOut, Menu, ChevronLeft,
  FileText, Bot, QrCode, Settings, History, BarChart3, Trash2,
  Blocks, ListTodo, Cpu, LayoutGrid, FolderOpen, GitBranch, Plus, MessageSquare,
  ShieldCheck, Zap, Activity, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { signOut, getRoleLabel, type AppRole } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useNotifications } from '@/hooks/useNotifications';
import logoEsquadromil from '@/assets/logo-esquadromil.png';

interface NavItem {
  label: string; 
  href: string; 
  icon: React.ComponentType<{ className?: string }>; 
  roles: AppRole[];
  group?: string;
}

const navItems: NavItem[] = [
  // --- TI ADMIN GROUPED ---
  { label: 'Dashboard', href: '/ti', icon: LayoutDashboard, roles: ['ti', 'admin'], group: 'Principal' },
  { label: 'Workspace', href: '/ti/workspace', icon: LayoutGrid, roles: ['ti', 'admin'], group: 'Principal' },
  
  { label: 'Chamados', href: '/ti/chamados', icon: Ticket, roles: ['ti', 'admin'], group: 'Operações' },
  { label: 'Agendamentos', href: '/ti/agendamentos', icon: Calendar, roles: ['ti', 'admin'], group: 'Operações' },
  { label: 'Reserva Auditório', href: '/ti/reserva-auditorio', icon: Building2, roles: ['ti', 'admin'], group: 'Operações' },
  { label: 'Solicitações', href: '/ti/solicitacoes', icon: Bell, roles: ['ti', 'admin'], group: 'Operações' },
  { label: 'Grupos', href: '/ti/grupos', icon: MessageSquare, roles: ['ti', 'admin'], group: 'Operações' },

  { label: 'Agentes IA', href: '/ti/agentes', icon: Cpu, roles: ['ti', 'admin'], group: 'IA & Automação' },
  { label: 'Assistente IA', href: '/ti/assistente', icon: Bot, roles: ['ti', 'admin'], group: 'IA & Automação' },
  { label: 'Processos', href: '/ti/processos', icon: GitBranch, roles: ['ti', 'admin'], group: 'IA & Automação' },

  { label: 'Usuários', href: '/ti/usuarios', icon: Users, roles: ['ti', 'admin'], group: 'Administração' },
  { label: 'Arquivos', href: '/ti/arquivos', icon: FolderOpen, roles: ['ti', 'admin'], group: 'Administração' },
  { label: 'Relatórios', href: '/ti/relatorios', icon: BarChart3, roles: ['ti', 'admin'], group: 'Administração' },
  { label: 'Módulos', href: '/ti/modulos', icon: Blocks, roles: ['ti', 'admin'], group: 'Administração' },
  { label: 'Logs Sistema', href: '/ti/logs', icon: FileText, roles: ['ti', 'admin'], group: 'Administração' },
  { label: 'Configurações', href: '/ti/configuracoes', icon: Settings, roles: ['ti', 'admin'], group: 'Administração' },

  // --- GUARITA GROUPED ---
  { label: 'Painel Guarita', href: '/guarita', icon: LayoutDashboard, roles: ['guarita'] },
  { label: 'Novo Agendamento', href: '/guarita/agendar', icon: Plus, roles: ['guarita'] },
  { label: 'Solicitações', href: '/guarita/solicitacoes', icon: Bell, roles: ['guarita'] },
  { label: 'Leitura QR Code', href: '/guarita/qrcode', icon: QrCode, roles: ['guarita'] },

  // --- COLABORADOR GROUPED ---
  { label: 'Início', href: '/colaborador', icon: LayoutDashboard, roles: ['colaborador'] },
  { label: 'Reserva Auditório', href: '/colaborador/reserva-auditorio', icon: Building2, roles: ['colaborador'] },
  { label: 'Meus Chamados', href: '/colaborador/chamados', icon: Ticket, roles: ['colaborador'] },
  { label: 'Agendamentos', href: '/colaborador/agendamentos', icon: Calendar, roles: ['colaborador'] },
  { label: 'Assistente IA', href: '/colaborador/assistente', icon: Bot, roles: ['colaborador'] },
  { label: 'Grupos / Chat', href: '/colaborador/grupos', icon: MessageSquare, roles: ['colaborador'] },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { getSetting } = useSystemSettings();
  const { unreadCount } = useNotifications();

  const customLogo = getSetting('company_logo') as { url?: string } | undefined;
  const logoSrc = customLogo?.url || logoEsquadromil;

  const filteredNavItems = useMemo(() => 
    navItems.filter(item => role && item.roles.includes(role as AppRole)),
  [role]);
  
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    filteredNavItems.forEach(item => {
      const g = item.group || 'Geral';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [filteredNavItems]);

  const isActiveRoute = (href: string) => {
    if (href === '/ti' || href === '/guarita' || href === '/colaborador') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] text-slate-900">
      <aside className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#1e222d] text-slate-300 transition-all duration-300 shadow-2xl border-r border-white/5',
        collapsed ? 'w-20' : 'w-64'
      )}>
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/5 px-6">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <img src={logoSrc} className="h-6 w-6 object-contain invert brightness-0" alt="Logo" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-none mb-1">ESQUADROMIL</h1>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">v2.1.3 Online</p>
              </div>
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)} 
            className="text-slate-500 hover:text-white hover:bg-white/5 rounded-xl h-10 w-10"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation Area */}
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="space-y-2">
                {!collapsed && items.length > 0 && group !== 'Geral' && (
                  <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">{group}</h3>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = isActiveRoute(item.href);
                    return (
                      <TooltipProvider key={item.href} delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              to={item.href}
                              className={cn(
                                'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all relative',
                                active 
                                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                                  : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                              )}
                            >
                              <item.icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-110', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
                              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                              {active && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full shadow-[0_0_10px_white]" />
                              )}
                            </Link>
                          </TooltipTrigger>
                          {collapsed && <TooltipContent side="right" className="bg-[#1e222d] border-white/10 text-white font-bold text-xs px-4 py-2">{item.label}</TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Profile Footer */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-[#1e222d] rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{profile?.full_name || 'Usuário'}</p>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{getRoleLabel(role as AppRole)}</p>
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white rounded-lg">
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-2 rounded-2xl border-white/10 bg-[#1e222d] text-slate-300 shadow-2xl">
                  <div className="p-3 border-b border-white/5 mb-1">
                    <p className="text-xs font-bold text-white mb-0.5">{profile?.full_name}</p>
                    <p className="text-[10px] text-slate-500">{profile?.email}</p>
                  </div>
                  <Button variant="ghost" className="w-full justify-start h-10 rounded-xl text-xs hover:bg-white/5 hover:text-white gap-3" onClick={() => navigate('/ti/configuracoes')}>
                    <Settings className="h-4 w-4" /> Ajustes
                  </Button>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <Button variant="ghost" className="w-full justify-start h-10 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 gap-3" onClick={async () => { await signOut(); navigate('/'); }}>
                    <LogOut className="h-4 w-4" /> Sair do Sistema
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-lg">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-rose-400 rounded-xl" onClick={async () => { await signOut(); navigate('/'); }}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className={cn(
        'flex-1 transition-all duration-300 min-h-screen',
        collapsed ? 'pl-20' : 'pl-64'
      )}>
        <div className="p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
