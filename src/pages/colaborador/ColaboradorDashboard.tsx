import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  Bot,
  Ticket,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';

export default function ColaboradorDashboard() {
  const { profile } = useAuth();

  // Mock data
  const myTickets = [
    { id: 1, title: 'Mouse com defeito', status: 'Em Andamento', createdAt: '02/02/2026' },
    { id: 2, title: 'Acesso ao sistema', status: 'Novo', createdAt: '01/02/2026' },
  ];

  const myAppointments = [
    { id: 1, visitor: 'Cliente ABC', date: '05/02/2026', time: '10:00' },
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Novo':
        return 'status-new';
      case 'Em Andamento':
        return 'status-progress';
      case 'Aguardando':
        return 'status-waiting';
      case 'Finalizado':
        return 'status-done';
      default:
        return '';
    }
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
            {myTickets.length > 0 ? (
              <div className="space-y-3">
                {myTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium text-foreground">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Aberto em {ticket.createdAt}
                      </p>
                    </div>
                    <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
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
            {myAppointments.length > 0 ? (
              <div className="space-y-3">
                {myAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-bold">{appointment.time}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.visitor}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.date}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver QR Code
                    </Button>
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
