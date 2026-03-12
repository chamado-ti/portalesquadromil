import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Loader2, CheckCircle } from 'lucide-react';

export default function GuaritaAgendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const [form, setForm] = useState({
    visitor_name: '',
    purpose: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: new Date().toTimeString().slice(0, 5),
    duration_minutes: '60',
    vehicle_plate: '',
    notes: '',
    responsible_id: 'self',
  });

  // Fetch collaborators for selection
  const { data: collaborators = [] } = useQuery({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, sector')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = async () => {
    if (!form.visitor_name.trim()) {
      toast({ title: 'Informe o nome do visitante', variant: 'destructive' });
      return;
    }
    if (!user?.id) return;
    
    setIsCreating(true);
    try {
      const responsibleId = form.responsible_id === 'self' ? user.id : form.responsible_id;
      const qrCode = crypto.randomUUID();
      const scheduledDateTime = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
      const expiresAt = new Date(scheduledDateTime);
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(form.duration_minutes) + 30);

      const { error } = await supabase.from('appointments').insert({
        visitor_name: form.visitor_name,
        purpose: form.purpose || null,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration_minutes: parseInt(form.duration_minutes),
        vehicle_plate: form.vehicle_plate || null,
        notes: form.notes || null,
        user_id: responsibleId,
        qr_code: qrCode,
        qr_expires_at: expiresAt.toISOString(),
        status: 'pending',
      } as any);

      if (error) throw error;

      toast({ title: 'Agendamento criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
      setCreated(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setCreated(false);
        setForm({
          visitor_name: '', purpose: '',
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_time: new Date().toTimeString().slice(0, 5),
          duration_minutes: '60', vehicle_plate: '', notes: '', responsible_id: 'self',
        });
      }, 2000);
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (created) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
              <h3 className="text-xl font-semibold mb-2">Agendamento Criado!</h3>
              <p className="text-muted-foreground">O visitante foi registrado com sucesso.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Novo Agendamento</h2>
          <p className="text-muted-foreground">Registre um visitante que chegou sem agendamento prévio.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" />
              Dados do Visitante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nome do Visitante *</Label>
                <Input placeholder="Nome completo" value={form.visitor_name} onChange={e => setForm(p => ({ ...p, visitor_name: e.target.value }))} />
              </div>

              <div>
                <Label>Data</Label>
                <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} />
              </div>

              <div>
                <Label>Duração (min)</Label>
                <Select value={form.duration_minutes} onValueChange={v => setForm(p => ({ ...p, duration_minutes: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Placa do Veículo</Label>
                <Input placeholder="Opcional" value={form.vehicle_plate} onChange={e => setForm(p => ({ ...p, vehicle_plate: e.target.value.toUpperCase() }))} />
              </div>

              <div className="sm:col-span-2">
                <Label>Motivo da Visita</Label>
                <Input placeholder="Ex: Entrega, Reunião..." value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
              </div>

              <div className="sm:col-span-2">
                <Label>Responsável</Label>
                <Select value={form.responsible_id} onValueChange={v => setForm(p => ({ ...p, responsible_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Quem é o responsável?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Eu mesmo (Guarita)</SelectItem>
                    {collaborators.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} {c.sector ? `(${c.sector})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações adicionais..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleCreate} disabled={isCreating || !form.visitor_name.trim()}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Criar Agendamento'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
