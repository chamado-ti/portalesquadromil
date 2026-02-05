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
}

export function useColaboradorAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's appointments
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

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: {
      visitor_name: string;
      visitor_document?: string;
      purpose?: string;
      scheduled_date: string;
      scheduled_time: string;
      duration_minutes: number;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Generate QR code
      const qrCode = crypto.randomUUID();
      
      // Set expiration (scheduled date + time + duration)
      const scheduledDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
      const expiresAt = new Date(scheduledDateTime);
      expiresAt.setMinutes(expiresAt.getMinutes() + data.duration_minutes + 30); // 30 min grace period

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          ...data,
          user_id: user.id,
          qr_code: qrCode,
          qr_expires_at: expiresAt.toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-appointments'] });
      toast({
        title: 'Agendamento criado',
        description: 'O agendamento foi registrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel appointment mutation
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
      toast({
        title: 'Agendamento cancelado',
        description: 'O agendamento foi cancelado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cancelar agendamento',
        description: error.message,
        variant: 'destructive',
      });
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
