import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  category_id: string | null;
  urgency_id: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  attachments: string[] | null;
  status?: {
    id: string;
    name: string;
    color: string;
    sort_order: number;
  };
  category?: {
    id: string;
    name: string;
  };
  urgency?: {
    id: string;
    name: string;
    color: string;
  };
  messages?: TicketMessage[];
}

export function useColaboradorTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's tickets
  const ticketsQuery = useQuery({
    queryKey: ['colaborador-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          status:ticket_statuses(*),
          category:ticket_categories(*),
          urgency:ticket_urgencies(*)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return tickets as Ticket[];
    },
    enabled: !!user?.id,
  });

  // Fetch statuses for display
  const statusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_statuses')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch urgencies
  const urgenciesQuery = useQuery({
    queryKey: ['ticket-urgencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_urgencies')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category_id?: string;
      urgency_id?: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Get default status (first one)
      const { data: statuses } = await supabase
        .from('ticket_statuses')
        .select('id')
        .order('sort_order')
        .limit(1);

      const statusId = statuses?.[0]?.id;
      if (!statusId) throw new Error('Status não encontrado');

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          category_id: data.category_id,
          urgency_id: data.urgency_id,
          created_by: user.id,
          status_id: statusId,
        })
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
      toast({
        title: 'Chamado aberto',
        description: 'Seu chamado foi registrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao abrir chamado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages'] });
    },
  });

  // Fetch messages for a ticket
  const useTicketMessages = (ticketId: string | null) => {
    return useQuery({
      queryKey: ['ticket-messages', ticketId],
      queryFn: async () => {
        if (!ticketId) return [];

        const { data, error } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch sender profiles
        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        return data.map(m => ({
          ...m,
          sender: profileMap.get(m.sender_id),
        })) as TicketMessage[];
      },
      enabled: !!ticketId,
      refetchInterval: 5000, // Poll every 5 seconds
    });
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('colaborador-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `created_by=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    tickets: ticketsQuery.data ?? [],
    statuses: statusesQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    urgencies: urgenciesQuery.data ?? [],
    isLoading: ticketsQuery.isLoading,
    error: ticketsQuery.error,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    sendMessage: sendMessageMutation.mutateAsync,
    useTicketMessages,
    refetch: ticketsQuery.refetch,
  };
}
