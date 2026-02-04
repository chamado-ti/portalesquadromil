import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  user?: {
    full_name: string;
    email: string;
    sector: string | null;
  };
}

export function useAppointments() {
  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_date", { ascending: false })
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      // Fetch user profiles
      const userIds = new Set(appointments.map((a) => a.user_id));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, sector")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return appointments.map((apt) => ({
        ...apt,
        user: profileMap.get(apt.user_id),
      })) as Appointment[];
    },
  });

  return {
    appointments: appointmentsQuery.data ?? [],
    isLoading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error,
    refetch: appointmentsQuery.refetch,
  };
}
