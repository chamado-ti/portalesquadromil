import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useTickets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Users,
  Ticket,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TIDashboard() {
  const { profile } = useAuth();
  const { tickets, statuses, urgencies, isLoading: isLoadingTickets } = useTickets();

  const usersQuery = useQuery({
    queryKey: ['profiles-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const todayAppointmentsQuery = useQuery({
    queryKey: ['today-appointments-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('scheduled_date', today);
      if (error) throw error;
      return data?.length || 0;
    },
  });

  const openTickets = tickets.filter(t => {
    const status = statuses.find(s => s.id === t.status_id);
    return status && status.sort_order < (statuses.length > 0 ? statuses[statuses.length - 1].sort_order : 999);
  });

  const recentTickets = tickets.slice(0, 5);

  const getStatusColor = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.color || '#6b7280';
  };

  const getStatusName = (statusId: string) => {
    return statuses.find(s => s.id === statusId)?.name || '—';
  };

  const getUrgencyName = (urgencyId: string | null) => {
    return urgencies.find(u => u.id === urgencyId)?.name || '—';
  };

  const getUrgencyColor = (urgencyId: string | null) => {
    return urgencies.find(u => u.id === urgencyId)?.color || '#6b7280';
  };

  const stats = [
    {
      label: 'Total de Usuários',
      value: usersQuery.isLoading ? '...' : String(usersQuery.data || 0),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Chamados Abertos',
      value: isLoadingTickets ? '...' : String(openTickets.length),
      icon: Ticket,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Agendamentos Hoje',
      value: todayAppointmentsQuery.isLoading ? '...' : String(todayAppointmentsQuery.data || 0),
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Total de Chamados',
      value: isLoadingTickets ? '...' : String(tickets.length),
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Administrador'}!
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de administração do Portal Esquadromil.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-institutional">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent tickets */}
        <Card className="card-institutional">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Chamados Recentes
            </CardTitle>
            <Link to="/ti/chamados">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingTickets ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Ticket className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Nenhum chamado registrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.creator?.full_name || '—'} • {ticket.creator?.sector || '—'} • {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: getStatusColor(ticket.status_id),
                          color: getStatusColor(ticket.status_id),
                        }}
                      >
                        {getStatusName(ticket.status_id)}
                      </Badge>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: getUrgencyColor(ticket.urgency_id),
                          color: getUrgencyColor(ticket.urgency_id),
                        }}
                      >
                        {getUrgencyName(ticket.urgency_id)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/ti/usuarios">
            <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Gerenciar Usuários</p>
                  <p className="text-sm text-muted-foreground">Adicionar e editar colaboradores</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/ti/chamados">
            <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-warning/10 p-3">
                  <Ticket className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Ver Chamados</p>
                  <p className="text-sm text-muted-foreground">{openTickets.length} abertos</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/ti/agendamentos">
            <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-info/10 p-3">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Agendamentos</p>
                  <p className="text-sm text-muted-foreground">Verificar visitas</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
