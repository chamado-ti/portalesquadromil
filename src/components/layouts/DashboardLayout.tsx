import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Calendar,
  Bell,
  LogOut,
  Menu,
  ChevronLeft,
  FileText,
  Bot,
  QrCode,
  Settings,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { signOut, getRoleLabel, getRoleColor, type AppRole } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import logoEsquadromil from '@/assets/logo-esquadromil.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  // TI routes
  { label: 'Dashboard', href: '/ti', icon: LayoutDashboard, roles: ['ti'] },
  { label: 'Usuários', href: '/ti/usuarios', icon: Users, roles: ['ti'] },
  { label: 'Chamados', href: '/ti/chamados', icon: Ticket, roles: ['ti'] },
  { label: 'Agendamentos', href: '/ti/agendamentos', icon: Calendar, roles: ['ti'] },
  { label: 'Logs', href: '/ti/logs', icon: FileText, roles: ['ti'] },
  { label: 'Configurações', href: '/ti/configuracoes', icon: Settings, roles: ['ti'] },

  // Guarita routes
  { label: 'Agendamentos', href: '/guarita', icon: Calendar, roles: ['guarita'] },
  { label: 'Leitura QR Code', href: '/guarita/qrcode', icon: QrCode, roles: ['guarita'] },
  { label: 'Histórico', href: '/guarita/historico', icon: History, roles: ['guarita'] },

  // Colaborador routes
  { label: 'Início', href: '/colaborador', icon: LayoutDashboard, roles: ['colaborador'] },
  { label: 'Assistente IA', href: '/colaborador/assistente', icon: Bot, roles: ['colaborador'] },
  { label: 'Meus Chamados', href: '/colaborador/chamados', icon: Ticket, roles: ['colaborador'] },
  { label: 'Agendamentos', href: '/colaborador/agendamentos', icon: Calendar, roles: ['colaborador'] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, role } = useAuth();
  const { getSetting } = useSystemSettings();

  const customLogo = getSetting('company_logo') as { url?: string } | undefined;
  const logoSrc = customLogo?.url || logoEsquadromil;

  const filteredNavItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Até logo!',
        description: 'Você saiu do sistema.',
      });
      navigate('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Tente novamente.',
      });
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/ti' || href === '/guarita' || href === '/colaborador') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen w-full bg-secondary">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logoSrc}
                alt="Esquadromil"
                className="h-8 w-8 object-contain"
              />
              <span className="font-semibold text-sidebar-foreground">
                Portal
              </span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" className="mx-auto">
              <img
                src={logoSrc}
                alt="Esquadromil"
                className="h-8 w-8 object-contain"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "hidden")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {collapsed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredNavItems.map((item) => {
              const isActive = isActiveRoute(item.href);
              const NavIcon = item.icon;

              const navLink = (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <NavIcon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <li>{navLink}</li>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <li key={item.href}>{navLink}</li>;
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent font-semibold text-sidebar-accent-foreground">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {profile?.full_name || 'Usuário'}
                  </p>
                  {role && (
                    <Badge
                      variant="outline"
                      className={cn('mt-1 text-xs', getRoleColor(role))}
                    >
                      {getRoleLabel(role)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  className="w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold text-foreground">
            {filteredNavItems.find((item) => isActiveRoute(item.href))?.label ||
              'Portal'}
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
