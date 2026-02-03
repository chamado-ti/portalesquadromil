import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, QrCode, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function GuaritaDashboard() {
  const { profile } = useAuth();

  // Mock data
  const todayAppointments = [
    {
      id: 1,
      visitor: 'João Silva',
      time: '09:00',
      purpose: 'Reunião comercial',
      status: 'pending',
      collaborator: 'Maria Santos',
    },
    {
      id: 2,
      visitor: 'Ana Costa',
      time: '10:30',
      purpose: 'Entrega de documentos',
      status: 'checked_in',
      collaborator: 'Pedro Oliveira',
    },
    {
      id: 3,
      visitor: 'Carlos Mendes',
      time: '14:00',
      purpose: 'Entrevista',
      status: 'pending',
      collaborator: 'Fernanda Lima',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="status-badge status-waiting">
            <Clock className="mr-1 h-3 w-3" />
            Aguardando
          </span>
        );
      case 'checked_in':
        return (
          <span className="status-badge status-progress">
            <CheckCircle className="mr-1 h-3 w-3" />
            No local
          </span>
        );
      case 'checked_out':
        return (
          <span className="status-badge status-done">
            <XCircle className="mr-1 h-3 w-3" />
            Saiu
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Guarita'}!
          </h2>
          <p className="text-muted-foreground">
            Gerencie os agendamentos e controle de acesso.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-institutional">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Agendamentos Hoje
                  </p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {todayAppointments.length}
                  </p>
                </div>
                <div className="rounded-full bg-info/10 p-3">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-institutional">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Visitantes no Local
                  </p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    1
                  </p>
                </div>
                <div className="rounded-full bg-success/10 p-3">
                  <Users className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-institutional cursor-pointer transition-all hover:shadow-lg">
            <CardContent className="flex h-full items-center justify-center p-6">
              <Button size="lg" className="gap-2">
                <QrCode className="h-5 w-5" />
                Ler QR Code
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's appointments */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamentos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {appointment.time}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.visitor}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.purpose} • Resp: {appointment.collaborator}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(appointment.status)}
                    {appointment.status === 'pending' && (
                      <Button size="sm" variant="outline">
                        Liberar Entrada
                      </Button>
                    )}
                    {appointment.status === 'checked_in' && (
                      <Button size="sm" variant="secondary">
                        Registrar Saída
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {todayAppointments.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>Nenhum agendamento para hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
