import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export function useAuditLogs() {
  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Fetch user profiles
      const userIds = new Set(
        logs.map((l) => l.user_id).filter(Boolean) as string[]
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      return logs.map((log) => ({
        ...log,
        user: log.user_id ? profileMap.get(log.user_id) : undefined,
      })) as AuditLog[];
    },
  });

  return {
    logs: logsQuery.data ?? [],
    isLoading: logsQuery.isLoading,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
  };
}
