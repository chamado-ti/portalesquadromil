import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGuaritaAppointments } from '@/hooks/useGuaritaAppointments';
import { useGuaritaSimpleRequests } from '@/hooks/useGuaritaSimpleRequests';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Calendar as CalendarIcon, QrCode, Users, Clock, CheckCircle, LogIn, LogOut, Car, FileText, AlertTriangle, Plus, Package, Building2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaDashboard() {
  const { profile } = useAuth();
  const { todayAppointments, allAppointments, isLoading, registerEntry, registerExit } = useGuaritaAppointments();
  const { pending: pendingSimple, markReceived } = useGuaritaSimpleRequests();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const visitorsOnSite = todayAppointments.filter(a => a.entry_at && !a.exit_at).length;
  const completedToday = todayAppointments.filter(a => a.exit_at).length;
  const pendingToday = todayAppointments.filter(a => !a.entry_at).length;

  const appointmentsForDate = selectedDate
    ? allAppointments.filter(a => isSameDay(parseISO(a.scheduled_date), selectedDate))
    : [];

  const datesWithAppointments = allAppointments.map(a => parseISO(a.scheduled_date));

  const getStatusBadge = (apt: typeof todayAppointments[0]) => {
    if (apt.exit_at) {
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="mr-1 h-3 w-3" />Saiu</Badge>;
    }
    if (apt.entry_at) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><LogIn className="mr-1 h-3 w-3" />No local</Badge>;
    }
    return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20"><Clock className="mr-1 h-3 w-3" />Aguardando</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Guarita'}!
          </h2>
          <p className="text-muted-foreground">Gerencie os agendamentos e controle de acesso.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agendados Hoje</p>
                  <p className="mt-1 text-3xl font-bold">{isLoading ? '...' : todayAppointments.length}</p>
                </div>
                <div className="rounded-full bg-sky-500/10 p-3"><CalendarIcon className="h-6 w-6 text-sky-500" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No Local Agora</p>
                  <p className="mt-1 text-3xl font-bold text-amber-600">{isLoading ? '...' : visitorsOnSite}</p>
                </div>
                <div className="rounded-full bg-amber-500/10 p-3"><Users className="h-6 w-6 text-amber-500" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aguardando</p>
                  <p className="mt-1 text-3xl font-bold text-sky-600">{isLoading ? '...' : pendingToday}</p>
                </div>
                <div className="rounded-full bg-sky-500/10 p-3"><AlertTriangle className="h-6 w-6 text-sky-500" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">{isLoading ? '...' : completedToday}</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 p-3"><CheckCircle className="h-6 w-6 text-emerald-500" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 md:grid-cols-2">
          <Link to="/guarita/qrcode">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-full bg-primary/10 p-3"><QrCode className="h-6 w-6 text-primary" /></div>
                <div>
                  <p className="font-semibold">Ler QR Code</p>
                  <p className="text-sm text-muted-foreground">Validar entrada/saída de visitantes</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link to="/guarita/agendar">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/30">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-full bg-emerald-500/10 p-3"><Plus className="h-6 w-6 text-emerald-500" /></div>
                <div>
                  <p className="font-semibold">Novo Agendamento</p>
                  <p className="text-sm text-muted-foreground">Registrar visitante sem agendamento prévio</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Today's visitors - detailed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Visitantes de Hoje ({todayAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CalendarIcon className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p>Nenhum agendamento para hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                        {apt.scheduled_time?.slice(0, 5)}
                      </div>
                      <div>
                        <p className="font-medium">{apt.visitor_name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span>{apt.purpose || 'Sem motivo'}</span>
                          <span>• Resp: {apt.user?.full_name || '—'}</span>
                          {apt.user?.sector && <span>• {apt.user.sector}</span>}
                          {(apt as any).vehicle_plate && (
                            <span className="flex items-center gap-1"><Car className="h-3 w-3" />{(apt as any).vehicle_plate}</span>
                          )}
                          {apt.notes && (
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{apt.notes}</span>
                          )}
                        </div>
                        {apt.entry_at && (
                          <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                            <span>Entrada: {format(new Date(apt.entry_at), 'HH:mm')}</span>
                            {apt.exit_at && <span>Saída: {format(new Date(apt.exit_at), 'HH:mm')}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(apt)}
                      {!apt.entry_at && (
                        <Button size="sm" onClick={() => registerEntry(apt.id)}>
                          <LogIn className="mr-1 h-3 w-3" />Entrada
                        </Button>
                      )}
                      {apt.entry_at && !apt.exit_at && (
                        <Button size="sm" variant="secondary" onClick={() => registerExit(apt.id)}>
                          <LogOut className="mr-1 h-3 w-3" />Saída
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar + Selected Date */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-5 w-5" />Calendário
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

          <Card className="lg:col-span-2">
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
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : appointmentsForDate.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarIcon className="mx-auto mb-2 h-12 w-12 opacity-30" />
                  <p>Nenhum agendamento para esta data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointmentsForDate.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                          {apt.scheduled_time?.slice(0, 5)}
                        </div>
                        <div>
                          <p className="font-medium">{apt.visitor_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {apt.purpose || 'Sem motivo'} • Resp: {apt.user?.full_name || '—'}
                            {(apt as any).vehicle_plate && ` • 🚗 ${(apt as any).vehicle_plate}`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(apt)}
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
