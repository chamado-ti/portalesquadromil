import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useColaboradorTickets } from '@/hooks/useColaboradorTickets';
import { useColaboradorAppointments } from '@/hooks/useColaboradorAppointments';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import {
  Bot,
  Ticket,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorDashboard() {
  const { profile } = useAuth();
  const { tickets, isLoading: isLoadingTickets } = useColaboradorTickets();
  const { appointments, isLoading: isLoadingAppointments } = useColaboradorAppointments();

  const recentTickets = tickets.slice(0, 3);
  const upcomingAppointments = appointments
    .filter(a => a.status === 'pending' || (a.status === 'in_progress' && !a.exit_at))
    .slice(0, 3);

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
      yellow: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
      orange: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
      green: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
      red: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
      purple: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
      gray: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
    };
    return colors[color] || 'bg-muted text-muted-foreground';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Colaborador'}!
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao Portal Esquadromil. Como podemos ajudar?
          </p>
        </div>

        {/* AI Assistant Card */}
        <Card className="card-institutional border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex items-center gap-6 p-6">
            <div className="rounded-full bg-primary/10 p-4">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Assistente IA
              </h3>
              <p className="text-muted-foreground">
                Tire suas dúvidas de TI ou abra um chamado automaticamente
              </p>
            </div>
            <Link to="/colaborador/assistente">
              <Button size="lg" className="gap-2">
                Iniciar conversa
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <Link to="/colaborador/chamados">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-warning/10 p-3">
                  <Plus className="h-6 w-6 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Abrir Chamado</p>
                  <p className="text-sm text-muted-foreground">
                    Solicite suporte técnico
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>

          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <Link to="/colaborador/agendamentos">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-info/10 p-3">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Novo Agendamento</p>
                  <p className="text-sm text-muted-foreground">
                    Agende visitas ao escritório
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* My tickets */}
        <Card className="card-institutional">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Meus Chamados
            </CardTitle>
            <Link to="/colaborador/chamados">
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
            ) : recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Aberto em {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {ticket.status && (
                      <Badge variant="outline" className={getStatusColor(ticket.status.color)}>
                        {ticket.status.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Ticket className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Você não tem chamados abertos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My appointments */}
        <Card className="card-institutional">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meus Agendamentos
            </CardTitle>
            <Link to="/colaborador/agendamentos">
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingAppointments ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-bold">{appointment.scheduled_time.slice(0, 5)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.visitor_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Link to="/colaborador/agendamentos">
                      <Button variant="outline" size="sm">
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Você não tem agendamentos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
