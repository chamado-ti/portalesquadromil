import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Ticket, Calendar, Bell, LogOut, Menu, ChevronLeft,
  FileText, Bot, QrCode, Settings, History, BarChart3, Trash2,
  Blocks, ListTodo, Cpu, LayoutGrid, FolderOpen, GitBranch, Plus, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { signOut, getRoleLabel, getRoleColor, type AppRole } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useNotifications } from '@/hooks/useNotifications';
import logoEsquadromil from '@/assets/logo-esquadromil.png';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { prefetchRoute } from '@/lib/routePrefetch';

interface NavItem {
  label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/ti', icon: LayoutDashboard, roles: ['ti'] },
  { label: 'Usuários', href: '/ti/usuarios', icon: Users, roles: ['ti'] },
  { label: 'Chamados', href: '/ti/chamados', icon: Ticket, roles: ['ti'] },
  { label: 'Agendamentos', href: '/ti/agendamentos', icon: Calendar, roles: ['ti'] },
  { label: 'Tarefas', href: '/ti/tarefas', icon: ListTodo, roles: ['ti'] },
  { label: 'Kanban', href: '/ti/kanban', icon: LayoutGrid, roles: ['ti'] },
  { label: 'Agentes IA', href: '/ti/agentes', icon: Cpu, roles: ['ti'] },
  { label: 'Arquivos', href: '/ti/arquivos', icon: FolderOpen, roles: ['ti'] },
  { label: 'Processos', href: '/ti/processos', icon: GitBranch, roles: ['ti'] },
  { label: 'Grupos', href: '/ti/grupos', icon: MessageSquare, roles: ['ti'] },
  { label: 'Módulos', href: '/ti/modulos', icon: Blocks, roles: ['ti'] },
  { label: 'Logs', href: '/ti/logs', icon: FileText, roles: ['ti'] },
  { label: 'Relatórios', href: '/ti/relatorios', icon: BarChart3, roles: ['ti'] },
  { label: 'Assistente IA', href: '/ti/assistente', icon: Bot, roles: ['ti'] },
  { label: 'Configurações', href: '/ti/configuracoes', icon: Settings, roles: ['ti'] },

  { label: 'Painel', href: '/guarita', icon: LayoutDashboard, roles: ['guarita'] },
  { label: 'Novo Agendamento', href: '/guarita/agendar', icon: Plus, roles: ['guarita'] },
  { label: 'Solicitações', href: '/guarita/solicitacoes', icon: Bell, roles: ['guarita'] },
  { label: 'Leitura QR Code', href: '/guarita/qrcode', icon: QrCode, roles: ['guarita'] },
  { label: 'Meus Chamados', href: '/guarita/chamados', icon: Ticket, roles: ['guarita'] },
  { label: 'Histórico', href: '/guarita/historico', icon: History, roles: ['guarita'] },

  { label: 'Início', href: '/colaborador', icon: LayoutDashboard, roles: ['colaborador'] },
  { label: 'Assistente IA', href: '/colaborador/assistente', icon: Bot, roles: ['colaborador'] },
  { label: 'Meus Agentes', href: '/colaborador/agentes', icon: Cpu, roles: ['colaborador'] },
  { label: 'Meus Chamados', href: '/colaborador/chamados', icon: Ticket, roles: ['colaborador'] },
  { label: 'Agendamentos', href: '/colaborador/agendamentos', icon: Calendar, roles: ['colaborador'] },
  { label: 'Solicitar à Guarita', href: '/colaborador/solicitar', icon: Plus, roles: ['colaborador'] },
  { label: 'Grupos', href: '/colaborador/grupos', icon: MessageSquare, roles: ['colaborador'] },
];

interface DashboardLayoutProps { children: React.ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const { getSetting } = useSystemSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const customLogo = getSetting('company_logo') as { url?: string } | undefined;
  const logoSrc = customLogo?.url || logoEsquadromil;

  const filteredNavItems = navItems.filter(item => role && item.roles.includes(role));

  const handleSignOut = async () => {
    try { await signOut(); toast({ title: 'Até logo!' }); navigate('/'); } catch { toast({ variant: 'destructive', title: 'Erro ao sair' }); }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/ti' || href === '/guarita' || href === '/colaborador') return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <Ticket className="h-4 w-4 text-primary" />;
      case 'message': return <FileText className="h-4 w-4 text-primary" />;
      case 'appointment': return <Calendar className="h-4 w-4 text-primary" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-secondary">
      <aside className={cn('fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-200', collapsed ? 'w-16' : 'w-60')}>
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <img src={logoSrc} alt="Logo" className="h-7 w-7 object-contain" />
              <span className="font-semibold text-sm text-sidebar-foreground">Portal</span>
            </Link>
          )}
          {collapsed && <Link to="/" className="mx-auto"><img src={logoSrc} alt="Logo" className="h-7 w-7 object-contain" /></Link>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}
            className={cn("text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7", collapsed && "hidden")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {collapsed && (
          <div className="flex justify-center py-1">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 py-2">
          <ul className="space-y-0.5 px-2">
            {filteredNavItems.map(item => {
              const isActive = isActiveRoute(item.href);
              const NavIcon = item.icon;
              const link = (
                <Link key={item.href} to={item.href}
                  onMouseEnter={() => prefetchRoute(item.href)}
                  onFocus={() => prefetchRoute(item.href)}
                  onTouchStart={() => prefetchRoute(item.href)}
                  className={cn('flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                  <NavIcon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              );
              if (collapsed) return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild><li>{link}</li></TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                </Tooltip>
              );
              return <li key={item.href}>{link}</li>;
            })}
          </ul>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-sidebar-accent font-semibold text-sidebar-accent-foreground text-xs">
                  {(profile as any)?.avatar_url ? <img src={(profile as any).avatar_url} className="h-full w-full object-cover" /> : profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">{profile?.full_name || 'Usuário'}</p>
                  {role && <Badge variant="outline" className={cn('mt-0.5 text-[10px]', getRoleColor(role))}>{getRoleLabel(role)}</Badge>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent h-8 text-xs">
                <LogOut className="mr-2 h-3.5 w-3.5" />Sair
              </Button>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="w-full text-sidebar-foreground/80 h-8 w-8">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      <main className={cn('flex-1 transition-all duration-200', collapsed ? 'ml-16' : 'ml-60')}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
          <h1 className="text-sm font-semibold text-foreground">
            {filteredNavItems.find(item => isActiveRoute(item.href))?.label || 'Portal'}
          </h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <h3 className="text-sm font-semibold">Notificações</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markAllAsRead()}>Marcar todas</Button>
                )}
              </div>
              <ScrollArea className="max-h-72">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-2 h-6 w-6 opacity-30" /><p>Nenhuma</p></div>
                ) : (
                  <div className="divide-y">
                    {notifications.slice(0, 15).map(n => (
                      <div key={n.id} className={cn('flex items-start gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer', !n.read && 'bg-primary/5')}
                        onClick={() => { if (!n.read) markAsRead(n.id); }}>
                        <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs', !n.read && 'font-medium')}>{n.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{n.message}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
