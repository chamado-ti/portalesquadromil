import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, Clock, Plus, Building2, 
  CheckCircle2, XCircle, Timer, History
} from 'lucide-react';
import { useReservations } from '@/hooks/useReservations';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  pending: { label: 'Em Análise', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Timer },
  confirmed: { label: 'Confirmada', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', class: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export default function ColaboradorReservaPage() {
  const { user } = useAuth();
  const { reservations, createReservation } = useReservations(user?.id);
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
  });

  const handleSubmit = async () => {
    if (!form.title || !form.date) return;
    await createReservation.mutate({
      ...form,
      user_id: user?.id,
      status: 'pending'
    });
    setIsDialogOpen(false);
    setForm({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
    });
  };

  return (
    <DashboardLayout title="Reserva de Auditório">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-[2rem] bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/20">
              <Building2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Espaço & Eventos</h2>
              <p className="text-slate-500 font-medium max-w-md">Gerencie suas solicitações de uso do auditório e visualize a disponibilidade.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mr-2">
                <Button 
                  variant={view === 'calendar' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('calendar')}
                  className={cn("rounded-xl h-10 px-4 font-bold text-xs gap-2 transition-all", view === 'calendar' && "bg-white text-slate-900 shadow-md hover:bg-white")}
                >
                  <CalendarIcon className="h-4 w-4" /> Calendário
                </Button>
                <Button 
                  variant={view === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setView('list')}
                  className={cn("rounded-xl h-10 px-4 font-bold text-xs gap-2 transition-all", view === 'list' && "bg-white text-slate-900 shadow-md hover:bg-white")}
                >
                  <History className="h-4 w-4" /> Minhas Reservas
                </Button>
             </div>
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 font-bold gap-3 hover:scale-[1.02] transition-transform">
                  <Plus className="h-5 w-5" /> Reservar
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-w-xl">
                <div className="bg-primary p-8 text-white relative">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Solicitar Reserva</DialogTitle>
                  </DialogHeader>
                  <p className="text-primary-foreground/80 text-sm mt-2">Preencha os detalhes do seu evento abaixo.</p>
                  <Building2 className="absolute top-8 right-8 h-12 w-12 opacity-20" />
                </div>
                <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Título do Evento</Label>
                    <Input 
                      placeholder="Ex: Treinamento Novos Colaboradores" 
                      className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Data</Label>
                      <Input 
                        type="date" 
                        className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20"
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Início</Label>
                        <Input 
                          type="time" 
                          className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20 px-2"
                          value={form.start_time}
                          onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Fim</Label>
                        <Input 
                          type="time" 
                          className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20 px-2"
                          value={form.end_time}
                          onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Observações (Opcional)</Label>
                    <Textarea 
                      placeholder="Necessário projetor, coffee break, etc..." 
                      className="rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20 min-h-[100px]"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter className="p-8 bg-slate-50 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!form.title || createReservation.isPending} 
                    className="rounded-xl px-10 h-12 shadow-xl shadow-primary/20 font-bold"
                  >
                    {createReservation.isPending ? <Timer className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
             </Dialog>
          </div>
        </div>

        {view === 'calendar' ? (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 animate-in fade-in zoom-in-95 duration-500">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="text-center p-4 rounded-2xl bg-white shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(new Date(Date.now() + i * 86400000), 'EEE', { locale: ptBR })}</p>
                  <p className="text-lg font-black text-slate-900">{format(new Date(Date.now() + i * 86400000), 'dd')}</p>
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">Livre</div>
                  <div className="h-20 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col justify-between">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">09:00 - 11:00</p>
                    <p className="text-[10px] font-bold text-emerald-800 line-clamp-2 leading-tight">Reunião Diretoria</p>
                  </div>
                  <div className="h-12 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">Livre</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
             {reservations.map((res) => {
                const status = STATUS_MAP[res.status];
                return (
                  <Card key={res.id} className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden group hover:ring-2 hover:ring-primary/10 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg", 
                            res.status === 'confirmed' ? 'bg-emerald-500' : res.status === 'cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                          )}>
                            <Building2 className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight">{res.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditório Principal</p>
                          </div>
                        </div>
                        <Badge className={cn("rounded-xl border font-bold text-[10px] uppercase gap-1.5 px-3 py-1", status.class)}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl mb-4">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Data</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                            {format(parseISO(res.date), "dd MMM, yyyy", { locale: ptBR })}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Horário</p>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {res.start_time.slice(0, 5)} - {res.end_time.slice(0, 5)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
