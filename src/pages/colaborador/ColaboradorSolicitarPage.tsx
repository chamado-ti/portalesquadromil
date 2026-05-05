import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, Clock, Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorSolicitarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const { data: mine = [] } = useQuery({
    queryKey: ['my-simple-appts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('appointments').select('*')
        .eq('user_id', user.id).eq('appointment_type', 'simple')
        .order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const submit = async () => {
    if (!purpose.trim() || !user?.id) return;
    setSending(true);
    try {
      const now = new Date();
      const { error } = await supabase.from('appointments').insert({
        visitor_name: 'Solicitação Rápida',
        purpose: purpose.trim(),
        notes: notes || null,
        scheduled_date: now.toISOString().slice(0, 10),
        scheduled_time: now.toTimeString().slice(0, 5),
        duration_minutes: 15,
        user_id: user.id,
        status: 'pending',
        appointment_type: 'simple',
      } as any);
      if (error) throw error;

      // notify Guarita
      const { data: guards } = await supabase.from('profiles').select('id').eq('role', 'guarita' as any);
      if (guards) {
        await supabase.from('notifications').insert(guards.map(g => ({
          user_id: g.id,
          title: 'Nova solicitação na guarita',
          message: purpose.trim(),
          type: 'appointment',
          entity_type: 'appointment',
        })));
      }
      toast({ title: 'Solicitação enviada', description: 'A guarita foi notificada.' });
      setPurpose(''); setNotes('');
      qc.invalidateQueries({ queryKey: ['my-simple-appts'] });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally { setSending(false); }
  };

  return (
    <DashboardLayout>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Solicitação Rápida</CardTitle>
            <p className="text-xs text-muted-foreground">Para entregas e itens deixados na portaria. A guarita marca como recebido e você é avisado.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>O que está sendo entregue? *</Label>
              <Input placeholder="Ex: Almoço, encomenda, documento..." value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Detalhes opcionais" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={submit} disabled={sending || !purpose.trim()}>
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <><Bell className="mr-2 h-4 w-4" />Enviar para a Guarita</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Minhas solicitações</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma solicitação ainda</p>
            ) : mine.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div>
                  <p className="font-medium">{a.purpose}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM HH:mm", { locale: ptBR })}</p>
                </div>
                {a.received_at ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3 w-3" />Recebido</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3 w-3" />Aguardando</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
