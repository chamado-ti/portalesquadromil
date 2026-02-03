import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users,
  Ticket,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function TIDashboard() {
  const { profile } = useAuth();

  // Mock data - será substituído por dados reais
  const stats = [
    {
      label: 'Total de Usuários',
      value: '24',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Chamados Abertos',
      value: '12',
      icon: Ticket,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Agendamentos Hoje',
      value: '5',
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Resolvidos (Mês)',
      value: '47',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const recentTickets = [
    { id: 1, title: 'Computador não liga', status: 'Novo', urgency: 'Alta', sector: 'Financeiro' },
    { id: 2, title: 'Problema com e-mail', status: 'Em Andamento', urgency: 'Média', sector: 'RH' },
    { id: 3, title: 'Instalação de software', status: 'Aguardando', urgency: 'Baixa', sector: 'Comercial' },
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

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case 'Crítica':
        return 'status-critical';
      case 'Alta':
        return 'text-destructive';
      case 'Média':
        return 'text-warning';
      case 'Baixa':
        return 'text-success';
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        {/* Welcome message */}
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Chamados Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{ticket.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.sector}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-sm font-medium ${getUrgencyClass(ticket.urgency)}`}>
                      {ticket.urgency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Novo Usuário</p>
                <p className="text-sm text-muted-foreground">Adicionar colaborador</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-warning/10 p-3">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Chamados Críticos</p>
                <p className="text-sm text-muted-foreground">2 pendentes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-full bg-success/10 p-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Relatório Mensal</p>
                <p className="text-sm text-muted-foreground">Exportar dados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
