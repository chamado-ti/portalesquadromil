import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface TicketUrgency {
  id: string;
  name: string;
  color: string;
  response_time_minutes: number;
  sort_order: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: { full_name: string; email: string };
}

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string | null;
  status_id: string;
  urgency_id: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  attachments: string[] | null;
  creator?: { full_name: string; email: string; sector: string | null };
  assignee?: { full_name: string; email: string };
  status?: TicketStatus;
  urgency?: TicketUrgency;
  category?: TicketCategory;
  messages?: TicketMessage[];
}

export function useTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const statusesQuery = useQuery({
    queryKey: ["ticket-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_statuses").select("*").order("sort_order");
      if (error) throw error;
      return data as TicketStatus[];
    },
  });

  const urgenciesQuery = useQuery({
    queryKey: ["ticket-urgencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_urgencies").select("*").order("sort_order");
      if (error) throw error;
      return data as TicketUrgency[];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["ticket-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ticket_categories").select("*").order("name");
      if (error) throw error;
      return data as TicketCategory[];
    },
  });

  const ticketsQuery = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets").select("*").order("created_at", { ascending: false });
      if (ticketsError) throw ticketsError;

      const userIds = new Set<string>();
      tickets.forEach(t => { userIds.add(t.created_by); if (t.assigned_to) userIds.add(t.assigned_to); });

      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, sector").in("id", Array.from(userIds));
      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const { data: messages } = await supabase.from("ticket_messages").select("*").in("ticket_id", tickets.map(t => t.id)).order("created_at");
      const msgSenderIds = new Set<string>();
      (messages || []).forEach(m => msgSenderIds.add(m.sender_id));
      const { data: msgProfiles } = await supabase.from("profiles").select("id, full_name, email").in("id", Array.from(msgSenderIds));
      const msgProfileMap = new Map(msgProfiles?.map(p => [p.id, p]));

      const messagesByTicket = (messages || []).reduce((acc, msg) => {
        if (!acc[msg.ticket_id]) acc[msg.ticket_id] = [];
        acc[msg.ticket_id].push({ ...msg, sender: msgProfileMap.get(msg.sender_id) });
        return acc;
      }, {} as Record<string, TicketMessage[]>);

      return tickets.map(ticket => ({
        ...ticket,
        creator: profileMap.get(ticket.created_by),
        assignee: ticket.assigned_to ? profileMap.get(ticket.assigned_to) : undefined,
        messages: messagesByTicket[ticket.id] || [],
      })) as Ticket[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('ti-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, statusId }: { ticketId: string; statusId: string }) => {
      const { error } = await supabase.from("tickets").update({ status_id: statusId }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); },
    onError: () => { toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o status." }); },
  });

  const addMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, sender_id: user.id, message });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); toast({ title: "Mensagem enviada" }); },
    onError: () => { toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar a mensagem." }); },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      // Delete messages first
      await supabase.from("ticket_messages").delete().eq("ticket_id", ticketId);
      const { error } = await supabase.from("tickets").delete().eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Chamado excluído" });
    },
    onError: () => { toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o chamado." }); },
  });

  return {
    tickets: ticketsQuery.data ?? [],
    statuses: statusesQuery.data ?? [],
    urgencies: urgenciesQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading: ticketsQuery.isLoading || statusesQuery.isLoading || urgenciesQuery.isLoading,
    error: ticketsQuery.error || statusesQuery.error || urgenciesQuery.error,
    refetch: () => { ticketsQuery.refetch(); statusesQuery.refetch(); urgenciesQuery.refetch(); },
    updateTicketStatus: (ticketId: string, statusId: string) => updateStatusMutation.mutateAsync({ ticketId, statusId }),
    addMessage: (ticketId: string, message: string) => addMessageMutation.mutateAsync({ ticketId, message }),
    deleteTicket: (ticketId: string) => deleteTicketMutation.mutateAsync(ticketId),
    isUpdating: updateStatusMutation.isPending,
    isSendingMessage: addMessageMutation.isPending,
  };
}