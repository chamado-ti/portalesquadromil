import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  visitor_name: string;
  visitor_document: string | null;
  purpose: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  qr_code: string | null;
  qr_expires_at: string | null;
  entry_at: string | null;
  exit_at: string | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  vehicle_plate?: string | null;
}

export function useColaboradorAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: ['colaborador-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user?.id,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: {
      visitor_name: string;
      visitor_document?: string;
      purpose?: string;
      scheduled_date: string;
      scheduled_time: string;
      duration_minutes: number;
      notes?: string;
      vehicle_plate?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const qrCode = crypto.randomUUID();
      const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
      const expiresAt = new Date(scheduledDateTime);
      expiresAt.setMinutes(expiresAt.getMinutes() + data.duration_minutes + 30);

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          visitor_name: data.visitor_name,
          visitor_document: data.visitor_document,
          purpose: data.purpose,
          scheduled_date: data.scheduled_date,
          scheduled_time: data.scheduled_time,
          duration_minutes: data.duration_minutes,
          notes: data.notes,
          vehicle_plate: data.vehicle_plate,
          user_id: user.id,
          qr_code: qrCode,
          qr_expires_at: expiresAt.toISOString(),
          status: 'pending',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-appointments'] });
      toast({ title: 'Agendamento criado', description: 'O agendamento foi registrado com sucesso.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar agendamento', description: error.message, variant: 'destructive' });
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-appointments'] });
      toast({ title: 'Agendamento cancelado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    },
  });

  return {
    appointments: appointmentsQuery.data ?? [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    createAppointment: createAppointmentMutation.mutateAsync,
    isCreating: createAppointmentMutation.isPending,
    cancelAppointment: cancelAppointmentMutation.mutateAsync,
    isCancelling: cancelAppointmentMutation.isPending,
    refetch: appointmentsQuery.refetch,
  };
}
