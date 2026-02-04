import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  sender?: {
    full_name: string;
    email: string;
  };
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
  creator?: {
    full_name: string;
    email: string;
    sector: string | null;
  };
  assignee?: {
    full_name: string;
    email: string;
  };
  status?: TicketStatus;
  urgency?: TicketUrgency;
  category?: TicketCategory;
  messages?: TicketMessage[];
}

export function useTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch statuses
  const statusesQuery = useQuery({
    queryKey: ["ticket-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_statuses")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as TicketStatus[];
    },
  });

  // Fetch urgencies
  const urgenciesQuery = useQuery({
    queryKey: ["ticket-urgencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_urgencies")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data as TicketUrgency[];
    },
  });

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ["ticket-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as TicketCategory[];
    },
  });

  // Fetch tickets with related data
  const ticketsQuery = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch related data
      const userIds = new Set<string>();
      tickets.forEach((t) => {
        userIds.add(t.created_by);
        if (t.assigned_to) userIds.add(t.assigned_to);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, sector")
        .in("id", Array.from(userIds));

      const profileMap = new Map(profiles?.map((p) => [p.id, p]));

      // Fetch messages for all tickets
      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*")
        .in(
          "ticket_id",
          tickets.map((t) => t.id)
        )
        .order("created_at");

      const messagesByTicket = (messages || []).reduce((acc, msg) => {
        if (!acc[msg.ticket_id]) acc[msg.ticket_id] = [];
        acc[msg.ticket_id].push({
          ...msg,
          sender: profileMap.get(msg.sender_id),
        });
        return acc;
      }, {} as Record<string, TicketMessage[]>);

      return tickets.map((ticket) => ({
        ...ticket,
        creator: profileMap.get(ticket.created_by),
        assignee: ticket.assigned_to
          ? profileMap.get(ticket.assigned_to)
          : undefined,
        messages: messagesByTicket[ticket.id] || [],
      })) as Ticket[];
    },
  });

  // Update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ticketId,
      statusId,
    }: {
      ticketId: string;
      statusId: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status_id: statusId })
        .eq("id", ticketId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status.",
      });
    },
  });

  // Add message
  const addMessageMutation = useMutation({
    mutationFn: async ({
      ticketId,
      message,
    }: {
      ticketId: string;
      message: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi adicionada ao chamado.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
      });
    },
  });

  return {
    tickets: ticketsQuery.data ?? [],
    statuses: statusesQuery.data ?? [],
    urgencies: urgenciesQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading:
      ticketsQuery.isLoading ||
      statusesQuery.isLoading ||
      urgenciesQuery.isLoading,
    error: ticketsQuery.error || statusesQuery.error || urgenciesQuery.error,
    refetch: () => {
      ticketsQuery.refetch();
      statusesQuery.refetch();
      urgenciesQuery.refetch();
    },
    updateTicketStatus: (ticketId: string, statusId: string) =>
      updateStatusMutation.mutateAsync({ ticketId, statusId }),
    addMessage: (ticketId: string, message: string) =>
      addMessageMutation.mutateAsync({ ticketId, message }),
    isUpdating: updateStatusMutation.isPending,
    isSendingMessage: addMessageMutation.isPending,
  };
}
