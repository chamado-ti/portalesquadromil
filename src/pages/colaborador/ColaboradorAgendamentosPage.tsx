import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useColaboradorAppointments, Appointment } from '@/hooks/useColaboradorAppointments';
import QRCode from 'react-qr-code';
import {
  Plus, Calendar, Clock, QrCode, User, X, Loader2, CheckCircle, XCircle, AlertCircle, Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorAgendamentosPage() {
  const {
    appointments, isLoading, createAppointment, isCreating, cancelAppointment, isCancelling,
  } = useColaboradorAppointments();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    visitor_name: '', purpose: '', scheduled_date: '', scheduled_time: '',
    duration_minutes: 60, notes: '', visitor_document: '', vehicle_plate: '',
  });

  const handleCreateAppointment = async () => {
    try {
      await createAppointment({
        visitor_name: form.visitor_name,
        visitor_document: form.visitor_document || undefined,
        purpose: form.purpose || undefined,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration_minutes: form.duration_minutes,
        notes: form.notes || undefined,
        vehicle_plate: form.vehicle_plate || undefined,
      });
      setCreateDialogOpen(false);
      setForm({ visitor_name: '', purpose: '', scheduled_date: '', scheduled_time: '', duration_minutes: 60, notes: '', visitor_document: '', vehicle_plate: '' });
    } catch {}
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      await cancelAppointment(selectedAppointment.id);
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
    } catch {}
  };

  const getStatusBadge = (status: string, entry_at: string | null, exit_at: string | null) => {
    if (status === 'cancelled') return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="mr-1 h-3 w-3" />Cancelado</Badge>;
    if (exit_at) return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle className="mr-1 h-3 w-3" />Concluído</Badge>;
    if (entry_at) return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/20"><User className="mr-1 h-3 w-3" />No local</Badge>;
    return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertCircle className="mr-1 h-3 w-3" />Aguardando</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Meus Agendamentos</h2>
            <p className="text-muted-foreground">Gerencie agendamentos de visitantes</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo Agendamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>Agende a visita de um terceiro ao escritório.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Visitante *</Label>
                  <Input placeholder="Nome completo" value={form.visitor_name} onChange={(e) => setForm(prev => ({ ...prev, visitor_name: e.target.value }))} />
                </div>
                <div>
                  <Label>Motivo da Visita *</Label>
                  <Input placeholder="Ex: Reunião comercial, Entrega de materiais" value={form.purpose} onChange={(e) => setForm(prev => ({ ...prev, purpose: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={form.scheduled_date} onChange={(e) => setForm(prev => ({ ...prev, scheduled_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <Label>Horário *</Label>
                    <Input type="time" value={form.scheduled_time} onChange={(e) => setForm(prev => ({ ...prev, scheduled_time: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Duração Prevista (minutos)</Label>
                  <Input type="number" min={15} max={480} value={form.duration_minutes} onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))} />
                </div>
                <div>
                  <Label>Placa do Veículo (opcional)</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="ABC-1234" value={form.vehicle_plate} onChange={(e) => setForm(prev => ({ ...prev, vehicle_plate: e.target.value.toUpperCase() }))} className="pl-9" />
                  </div>
                </div>
                <div>
                  <Label>Documento (CPF/RG) - opcional</Label>
                  <Input placeholder="000.000.000-00" value={form.visitor_document} onChange={(e) => setForm(prev => ({ ...prev, visitor_document: e.target.value }))} />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea placeholder="Informações adicionais..." value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateAppointment} disabled={isCreating || !form.visitor_name || !form.scheduled_date || !form.scheduled_time}>
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Agendamento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">Nenhum agendamento</h3>
              <p className="text-muted-foreground">Clique em "Novo Agendamento" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{appointment.visitor_name}</CardTitle>
                        {appointment.purpose && <p className="text-sm text-muted-foreground">{appointment.purpose}</p>}
                      </div>
                    </div>
                    {getStatusBadge(appointment.status, appointment.entry_at, appointment.exit_at)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                    <div className="flex items-center gap-1"><Clock className="h-4 w-4" />{appointment.scheduled_time.slice(0, 5)} ({appointment.duration_minutes}min)</div>
                  </div>
                  {(appointment as any).vehicle_plate && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Truck className="h-4 w-4" /> {(appointment as any).vehicle_plate}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {appointment.qr_code && appointment.status === 'pending' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedAppointment(appointment); setQrDialogOpen(true); }}>
                        <QrCode className="mr-2 h-4 w-4" />Ver QR Code
                      </Button>
                    )}
                    {appointment.status === 'pending' && (
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => { setSelectedAppointment(appointment); setCancelDialogOpen(true); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {appointment.entry_at && (
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      <p>Entrada: {format(new Date(appointment.entry_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                      {appointment.exit_at && <p>Saída: {format(new Date(appointment.exit_at), "dd/MM HH:mm", { locale: ptBR })}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code de Acesso</DialogTitle>
              <DialogDescription>Apresente este código na portaria.</DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="rounded-lg bg-white p-4">
                  <QRCode value={selectedAppointment.qr_code || ''} size={200} />
                </div>
                <div className="text-center">
                  <p className="font-medium">{selectedAppointment.visitor_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedAppointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })} às {selectedAppointment.scheduled_time.slice(0, 5)}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Agendamento</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza? O QR Code será invalidado.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, manter</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelAppointment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isCancelling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cancelando...</> : 'Sim, cancelar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
