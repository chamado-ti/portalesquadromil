import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AuditoriumReservation {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  cancellation_reason?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    sector: string;
  };
}

export function useReservations(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['auditorium-reservations', userId],
    queryFn: async () => {
      let query = supabase
        .from('auditorio_reservations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            sector
          )
        `)
        .order('date', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditoriumReservation[];
    },
  });

  // Audit Logs Query
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditorium-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditorio_logs')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data;
    }
  });

  // Settings Query
  const { data: settings = { max_capacity: 100, allow_weekends: false, auto_confirm: false } } = useQuery({
    queryKey: ['auditorium-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditorio_settings')
        .select('*')
        .single();
      if (error) return { max_capacity: 100, allow_weekends: false, auto_confirm: false };
      return data;
    }
  });

  const logEvent = async (action: string, details: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('auditorio_logs').insert([{
      user_id: user.id,
      action,
      details
    }]);
  };

  const createReservation = useMutation({
    mutationFn: async (newReservation: Partial<AuditoriumReservation>) => {
      const { data, error } = await supabase
        .from('auditorio_reservations')
        .insert([newReservation])
        .select()
        .single();
      
      if (error) throw error;
      await logEvent('CREATE_RESERVATION', `Reserva criada: ${newReservation.title}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditorium-reservations'] });
      toast({ title: 'Solicitação enviada!', description: 'Sua reserva está em análise.' });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro ao reservar', description: error.message });
    }
  });

  const updateReservationStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: AuditoriumReservation['status']; reason?: string }) => {
      const { data, error } = await supabase
        .from('auditorio_reservations')
        .update({ status, cancellation_reason: reason })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      await logEvent('UPDATE_STATUS', `Reserva ${id} alterada para ${status}`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auditorium-reservations'] });
      toast({ title: 'Status atualizado', description: `Reserva ${data.status === 'confirmed' ? 'confirmada' : 'cancelada'} com sucesso.` });
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Erro na atualização', description: error.message });
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const { error } = await supabase
        .from('auditorio_settings')
        .upsert([newSettings]);
      if (error) throw error;
      await logEvent('UPDATE_SETTINGS', 'Configurações do auditório atualizadas');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditorium-settings'] });
      toast({ title: 'Configurações salvas' });
    }
  });

  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auditorio_reservations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await logEvent('DELETE_RESERVATION', `Reserva ${id} excluída permanentemente`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditorium-reservations'] });
      toast({ title: 'Reserva removida', description: 'O registro foi excluído permanentemente.' });
    }
  });

  return {
    reservations,
    auditLogs,
    settings,
    isLoading,
    error,
    refetch,
    createReservation,
    updateReservationStatus,
    updateSettings,
    deleteReservation
  };
}
