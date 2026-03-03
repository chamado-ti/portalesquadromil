import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export interface GuaritaAppointment {
  id: string;
  visitor_name: string;
  visitor_document: string | null;
  purpose: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  qr_code: string | null;
  entry_at: string | null;
  exit_at: string | null;
  notes: string | null;
  user?: {
    full_name: string;
    sector: string | null;
  };
}

export function useGuaritaAppointments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Fetch today's appointments
  const todayAppointmentsQuery = useQuery({
    queryKey: ['guarita-today-appointments'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('scheduled_date', today)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(appointments.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, sector')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return appointments.map(apt => ({
        ...apt,
        user: profileMap.get(apt.user_id),
      })) as GuaritaAppointment[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch access history (completed appointments)
  const historyQuery = useQuery({
    queryKey: ['guarita-history'],
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['completed', 'cancelled'])
        .order('exit_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user profiles
      const userIds = [...new Set(appointments.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, sector')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      return appointments.map(apt => ({
        ...apt,
        user: profileMap.get(apt.user_id),
      })) as GuaritaAppointment[];
    },
  });

  // Validate QR code
  const validateQRCode = async (qrCode: string, action?: 'entry' | 'exit') => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('validate-qrcode', {
        body: { qr_code: qrCode, action },
      });

      if (error) throw error;

      setValidationResult(data);

      if (data.valid) {
        toast({
          title: data.message,
          description: `Visitante: ${data.appointment.visitor_name}`,
        });
        queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
      } else {
        toast({
          title: 'QR Code inválido',
          description: data.error,
          variant: 'destructive',
        });
      }

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro na validação',
        description: error.message,
        variant: 'destructive',
      });
      return { valid: false, error: error.message };
    } finally {
      setIsValidating(false);
    }
  };

  // Register entry directly
  const registerEntry = async (appointmentId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({ 
          entry_at: now,
          status: 'in_progress'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Entrada registrada',
        description: 'O visitante foi liberado.',
      });

      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar entrada',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Register exit directly
  const registerExit = async (appointmentId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({ 
          exit_at: now,
          status: 'completed'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Saída registrada',
        description: 'A visita foi encerrada.',
      });

      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar saída',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('guarita-appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
          queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    todayAppointments: todayAppointmentsQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: todayAppointmentsQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    validateQRCode,
    validationResult,
    isValidating,
    registerEntry,
    registerExit,
    refetch: todayAppointmentsQuery.refetch,
    refetchHistory: historyQuery.refetch,
  };
}
