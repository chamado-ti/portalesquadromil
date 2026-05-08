import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useTickets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Users, Ticket, Calendar, TrendingUp, ArrowRight, AlertTriangle, CheckCircle2, Clock, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TIDashboard() {
  const { profile } = useAuth();
  const { tickets, statuses, urgencies, isLoading: isLoadingTickets } = useTickets();

  const usersQuery = useQuery({
    queryKey: ['profiles-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id', { count: 'exact' });
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const todayAppointmentsQuery = useQuery({
    queryKey: ['today-appointments-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase.from('appointments').select('id').eq('scheduled_date', today);
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const CLOSED_NAMES = ['finalizado', 'resolvido', 'concluido', 'concluído', 'fechado'];
  const isClosedStatus = (name?: string) => !!name && CLOSED_NAMES.some(n => name.toLowerCase().includes(n));
  const openTickets = tickets.filter(t => {
    const status = statuses.find(s => s.id === t.status_id);
    return status && !isClosedStatus(status.name);
  });

  const criticalTickets = openTickets.filter(t => {
    const urg = urgencies.find(u => u.id === t.urgency_id);
    return urg && urg.sort_order <= 1;
  });

  const resolvedToday = tickets.filter(t => {
    if (!t.closed_at) return false;
    const closedDate = new Date(t.closed_at).toISOString().split('T')[0];
    return closedDate === new Date().toISOString().split('T')[0];
  });

  const recentTickets = tickets.slice(0, 6);

  const stats = [
    { label: 'Usuários Ativos', value: usersQuery.isLoading ? '...' : String(usersQuery.data || 0), icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Chamados Abertos', value: isLoadingTickets ? '...' : String(openTickets.length), icon: Ticket, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    { label: 'Urgentes', value: isLoadingTickets ? '...' : String(criticalTickets.length), icon: AlertTriangle, color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
    { label: 'Agendamentos Hoje', value: todayAppointmentsQuery.isLoading ? '...' : String(todayAppointmentsQuery.data || 0), icon: Calendar, color: 'text-sky-600', bgColor: 'bg-sky-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Administrador'}!
          </h2>
          <p className="text-muted-foreground">Painel de administração — visão geral do sistema.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Two columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent tickets */}
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-5 w-5" /> Chamados Recentes
              </CardTitle>
              <Link to="/ti/chamados">
                <Button variant="ghost" size="sm">Ver todos <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Ticket className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>Nenhum chamado registrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTickets.map((ticket) => {
                    const status = statuses.find(s => s.id === ticket.status_id);
                    const urgency = urgencies.find(u => u.id === ticket.urgency_id);
                    return (
                      <Link key={ticket.id} to="/ti/chamados" className="block">
                        <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.creator?.full_name || '—'} • {ticket.creator?.sector || '—'} • {format(new Date(ticket.created_at), "dd/MM", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {status && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: status.color, color: status.color }}>
                                {status.name}
                              </Badge>
                            )}
                            {urgency && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: urgency.color, color: urgency.color }}>
                                {urgency.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="space-y-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/ti/usuarios" className="block">
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                    <div className="rounded-lg bg-primary/10 p-2"><Users className="h-4 w-4 text-primary" /></div>
                    <div><p className="text-sm font-medium">Gerenciar Usuários</p></div>
                  </div>
                </Link>
                <Link to="/ti/chamados" className="block">
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                    <div className="rounded-lg bg-amber-500/10 p-2"><Ticket className="h-4 w-4 text-amber-600" /></div>
                    <div><p className="text-sm font-medium">Kanban de Chamados</p></div>
                  </div>
                </Link>
                <Link to="/ti/relatorios" className="block">
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                    <div className="rounded-lg bg-sky-500/10 p-2"><BarChart3 className="h-4 w-4 text-sky-600" /></div>
                    <div><p className="text-sm font-medium">Relatórios</p></div>
                  </div>
                </Link>
                <Link to="/ti/agendamentos" className="block">
                  <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50">
                    <div className="rounded-lg bg-emerald-500/10 p-2"><Calendar className="h-4 w-4 text-emerald-600" /></div>
                    <div><p className="text-sm font-medium">Agendamentos</p></div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Summary mini cards */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Resolvidos Hoje</p>
                    <p className="text-2xl font-bold">{resolvedToday.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
