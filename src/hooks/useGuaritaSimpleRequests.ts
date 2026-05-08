import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playNotificationBeep } from '@/lib/notificationSound';

export interface SimpleRequest {
  id: string;
  user_id: string;
  purpose: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  received_at: string | null;
  appointment_type: string | null;
  requester?: { full_name: string; sector: string | null; avatar_url: string | null };
}

export function useGuaritaSimpleRequests() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['guarita-simple-requests'],
    queryFn: async (): Promise<SimpleRequest[]> => {
      const { data, error } = await (supabase as any)
        .from('appointments').select('*')
        .eq('appointment_type', 'simple')
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      const ids = [...new Set((data || []).map((a: any) => a.user_id))] as string[];
      let map = new Map<string, any>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles').select('id, full_name, sector, avatar_url').in('id', ids);
        map = new Map((profs || []).map(p => [p.id, p]));
      }
      return (data || []).map((a: any) => ({ ...a, requester: map.get(a.user_id) }));
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const ch = supabase.channel('guarita-simple-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'appointments',
        filter: 'appointment_type=eq.simple',
      }, (payload: any) => {
        qc.invalidateQueries({ queryKey: ['guarita-simple-requests'] });
        toast({
          title: '🔔 Nova solicitação rápida',
          description: payload.new?.purpose || 'Solicitação na guarita',
        });
        playNotificationBeep();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'appointments',
        filter: 'appointment_type=eq.simple',
      }, () => qc.invalidateQueries({ queryKey: ['guarita-simple-requests'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, toast]);

  const markReceived = async (a: SimpleRequest) => {
    const { error } = await (supabase as any).from('appointments')
      .update({ received_at: new Date().toISOString(), status: 'completed' }).eq('id', a.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('notifications').insert({
      user_id: a.user_id,
      title: '✅ Sua solicitação foi recebida',
      message: `${a.purpose} já está disponível na guarita.`,
      type: 'appointment',
      entity_type: 'appointment',
      entity_id: a.id,
    });
    toast({ title: 'Marcado como recebido' });
  };

  const deleteRequest = async (a: SimpleRequest) => {
    const { error } = await supabase.from('appointments').delete().eq('id', a.id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    qc.invalidateQueries({ queryKey: ['guarita-simple-requests'] });
    toast({ title: 'Solicitação excluída' });
  };

  const items = query.data ?? [];
  return {
    items,
    pending: items.filter(i => !i.received_at),
    received: items.filter(i => i.received_at),
    isLoading: query.isLoading,
    markReceived,
    deleteRequest,
  };
}
