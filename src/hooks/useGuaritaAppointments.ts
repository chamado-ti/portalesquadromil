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

async function fetchAppointmentsWithProfiles(query: any) {
  const { data: appointments, error } = await query;
  if (error) throw error;
  if (!appointments || appointments.length === 0) return [];

  const userIds = [...new Set(appointments.map((a: any) => a.user_id))] as string[];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, sector')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]));

  return appointments.map((apt: any) => ({
    ...apt,
    user: profileMap.get(apt.user_id),
  })) as GuaritaAppointment[];
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
      return fetchAppointmentsWithProfiles(
        supabase
          .from('appointments')
          .select('*')
          .eq('scheduled_date', today)
          .in('status', ['pending', 'in_progress'])
          .order('scheduled_time', { ascending: true })
      );
    },
    refetchInterval: 30000,
  });

  // Fetch ALL appointments for calendar
  const allAppointmentsQuery = useQuery({
    queryKey: ['guarita-all-appointments'],
    queryFn: async () => {
      return fetchAppointmentsWithProfiles(
        supabase
          .from('appointments')
          .select('*')
          .order('scheduled_date', { ascending: false })
          .limit(500)
      );
    },
  });

  // Fetch access history
  const historyQuery = useQuery({
    queryKey: ['guarita-history'],
    queryFn: async () => {
      return fetchAppointmentsWithProfiles(
        supabase
          .from('appointments')
          .select('*')
          .in('status', ['completed', 'cancelled'])
          .order('exit_at', { ascending: false })
          .limit(100)
      );
    },
  });

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
        toast({ title: data.message, description: `Visitante: ${data.appointment.visitor_name}` });
        queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
      } else {
        toast({ title: 'QR Code inválido', description: data.error, variant: 'destructive' });
      }
      return data;
    } catch (error: any) {
      toast({ title: 'Erro na validação', description: error.message, variant: 'destructive' });
      return { valid: false, error: error.message };
    } finally {
      setIsValidating(false);
    }
  };

  const registerEntry = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ entry_at: new Date().toISOString(), status: 'in_progress' })
        .eq('id', appointmentId);
      if (error) throw error;
      toast({ title: 'Entrada registrada', description: 'O visitante foi liberado.' });
      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
    } catch (error: any) {
      toast({ title: 'Erro ao registrar entrada', description: error.message, variant: 'destructive' });
    }
  };

  const registerExit = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ exit_at: new Date().toISOString(), status: 'completed' })
        .eq('id', appointmentId);
      if (error) throw error;
      toast({ title: 'Saída registrada', description: 'A visita foi encerrada.' });
      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
    } catch (error: any) {
      toast({ title: 'Erro ao registrar saída', description: error.message, variant: 'destructive' });
    }
  };

  const updateAppointmentNotes = async (appointmentId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ notes })
        .eq('id', appointmentId);
      if (error) throw error;
      toast({ title: 'Comentário salvo' });
      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const adjustTime = async (appointmentId: string, field: 'entry_at' | 'exit_at', value: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ [field]: value })
        .eq('id', appointmentId);
      if (error) throw error;
      toast({ title: 'Horário ajustado' });
      queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
    } catch (error: any) {
      toast({ title: 'Erro ao ajustar', description: error.message, variant: 'destructive' });
    }
  };

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('guarita-appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['guarita-today-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['guarita-all-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['guarita-history'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    todayAppointments: todayAppointmentsQuery.data ?? [],
    allAppointments: allAppointmentsQuery.data ?? [],
    history: historyQuery.data ?? [],
    isLoading: todayAppointmentsQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    validateQRCode,
    validationResult,
    isValidating,
    registerEntry,
    registerExit,
    updateAppointmentNotes,
    adjustTime,
    refetch: todayAppointmentsQuery.refetch,
    refetchHistory: historyQuery.refetch,
  };
}
