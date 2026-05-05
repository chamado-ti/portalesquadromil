import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CheckCircle, Clock, Package, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaSolicitacoesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['guarita-simple-requests'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('appointments').select('*')
        .eq('appointment_type', 'simple').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      // enrich with profiles
      const ids = [...new Set((data || []).map((a: any) => a.user_id))];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, sector').in('id', ids as string[]);
      const map = new Map((profs || []).map(p => [p.id, p]));
      return (data || []).map((a: any) => ({ ...a, requester: map.get(a.user_id) }));
    },
  });

  useEffect(() => {
    const ch = supabase.channel('guarita-simple-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        qc.invalidateQueries({ queryKey: ['guarita-simple-requests'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const markReceived = async (a: any) => {
    const { error } = await (supabase as any).from('appointments')
      .update({ received_at: new Date().toISOString(), status: 'completed' }).eq('id', a.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('notifications').insert({
      user_id: a.user_id,
      title: 'Sua solicitação foi recebida',
      message: `${a.purpose} já está disponível na guarita.`,
      type: 'appointment',
      entity_type: 'appointment',
      entity_id: a.id,
    });
    toast({ title: 'Marcado como recebido' });
  };

  const pending = items.filter((i: any) => !i.received_at);
  const received = items.filter((i: any) => i.received_at);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Solicitações Rápidas — Aguardando ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
              pending.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente</p> :
              pending.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border bg-amber-50 p-3">
                  <div>
                    <p className="font-medium">{a.purpose}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <UserIcon className="h-3 w-3" />{a.requester?.full_name} · {a.requester?.sector || '—'} · <Clock className="h-3 w-3" />{format(new Date(a.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                    {a.notes && <p className="text-xs italic mt-1">{a.notes}</p>}
                  </div>
                  <Button size="sm" onClick={() => markReceived(a)}><CheckCircle className="mr-1 h-4 w-4" />Marcar Recebido</Button>
                </div>
              ))
            }
          </CardContent>
        </Card>

        {received.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Recebidas recentemente</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {received.slice(0, 10).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-xs text-muted-foreground border-b py-1.5">
                  <span>{a.purpose} — {a.requester?.full_name}</span>
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3 w-3" />{format(new Date(a.received_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
