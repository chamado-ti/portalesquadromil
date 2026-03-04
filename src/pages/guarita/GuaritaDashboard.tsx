import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGuaritaAppointments } from '@/hooks/useGuaritaAppointments';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calendar as CalendarIcon, QrCode, Users, Clock, CheckCircle, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaDashboard() {
  const { profile } = useAuth();
  const { todayAppointments, allAppointments, isLoading } = useGuaritaAppointments();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const visitorsOnSite = todayAppointments.filter(a => a.entry_at && !a.exit_at).length;

  const appointmentsForDate = selectedDate
    ? allAppointments.filter(a => isSameDay(parseISO(a.scheduled_date), selectedDate))
    : [];

  // Dates that have appointments (for calendar highlighting)
  const datesWithAppointments = allAppointments.map(a => parseISO(a.scheduled_date));

  const getStatusBadge = (apt: typeof todayAppointments[0]) => {
    if (apt.exit_at) {
      return (
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Saiu
        </Badge>
      );
    }
    if (apt.entry_at) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
          <LogIn className="mr-1 h-3 w-3" />
          No local
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-info/10 text-info border-info/20">
        <Clock className="mr-1 h-3 w-3" />
        Aguardando
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
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
                  <p className="text-sm font-medium text-muted-foreground">Agendamentos Hoje</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {isLoading ? '...' : todayAppointments.length}
                  </p>
                </div>
                <div className="rounded-full bg-info/10 p-3">
                  <CalendarIcon className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-institutional">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Visitantes no Local</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">
                    {isLoading ? '...' : visitorsOnSite}
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
              <Link to="/guarita/qrcode">
                <Button size="lg" className="gap-2">
                  <QrCode className="h-5 w-5" />
                  Ler QR Code
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Calendar + Selected Date appointments */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="card-institutional lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-5 w-5" />
                Calendário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                modifiers={{ hasAppointment: datesWithAppointments }}
                modifiersClassNames={{ hasAppointment: 'bg-primary/20 font-bold' }}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card className="card-institutional lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate
                  ? `Agendamentos - ${format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}`
                  : 'Selecione uma data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : appointmentsForDate.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarIcon className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>Nenhum agendamento para esta data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointmentsForDate.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                          {apt.scheduled_time?.slice(0, 5)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{apt.visitor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {apt.purpose || 'Sem motivo'} • Resp: {apt.user?.full_name || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(apt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
