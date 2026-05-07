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

  const ticketsQuery = useQuery({
    queryKey: ['colaborador-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`*, status:ticket_statuses(*), category:ticket_categories(*), urgency:ticket_urgencies(*)`)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Attach last message info for "aguardando resposta" indicator
      const ids = (tickets || []).map(t => t.id);
      if (ids.length > 0) {
        const { data: msgs } = await supabase
          .from('ticket_messages')
          .select('ticket_id, sender_id, created_at, message')
          .in('ticket_id', ids)
          .order('created_at', { ascending: false });
        const lastByTicket = new Map<string, any>();
        (msgs || []).forEach(m => { if (!lastByTicket.has(m.ticket_id)) lastByTicket.set(m.ticket_id, m); });
        (tickets as any).forEach((t: any) => {
          const last = lastByTicket.get(t.id);
          t.last_message = last || null;
          t.awaiting_user = last && last.sender_id !== user.id;
        });
      }
      return tickets as Ticket[];
    },
    enabled: !!user?.id,
  });

  const statusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ticket_statuses').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ticket_categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const urgenciesQuery = useQuery({
    queryKey: ['ticket-urgencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ticket_urgencies').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      category_id?: string;
      urgency_id?: string;
      attachments?: string[];
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

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
          attachments: data.attachments,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add system message
      await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: '📋 Chamado aberto. O time de TI foi notificado e irá resolver sua solicitação em breve.',
      });

      // Notify TI users
      const { data: tiProfiles } = await supabase.from('profiles').select('id').eq('role', 'ti' as any);
      if (tiProfiles) {
        for (const ti of tiProfiles) {
          await supabase.from('notifications').insert({
            user_id: ti.id,
            title: 'Novo chamado aberto',
            message: `${data.title}`,
            type: 'ticket',
            entity_type: 'ticket',
            entity_id: ticket.id,
          });
        }
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Chamado aberto com sucesso!',
        description: 'O time de TI foi notificado e irá resolver sua solicitação.',
      });
    },
    onError: (error) => {
      toast({ title: 'Erro ao abrir chamado', description: error.message, variant: 'destructive' });
    },
  });

  // Update ticket status (for "resolved by collaborator")
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, statusId }: { ticketId: string; statusId: string }) => {
      const { error } = await supabase.from('tickets').update({ status_id: statusId }).eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({ title: 'Status atualizado' });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
      });
      if (error) throw error;

      // Notify TI of new message
      const { data: tiProfiles } = await supabase.from('profiles').select('id').eq('role', 'ti' as any);
      if (tiProfiles) {
        for (const ti of tiProfiles) {
          await supabase.from('notifications').insert({
            user_id: ti.id,
            title: 'Nova mensagem em chamado',
            message: message.slice(0, 100),
            type: 'message',
            entity_type: 'ticket',
            entity_id: ticketId,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages'] });
    },
  });

  const useTicketMessages = (ticketId: string | null) => {
    const query = useQuery({
      queryKey: ['ticket-messages', ticketId],
      queryFn: async () => {
        if (!ticketId) return [];
        const { data, error } = await supabase
          .from('ticket_messages')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        if (error) throw error;

        const senderIds = [...new Set(data.map(m => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));
        return data.map(m => ({ ...m, sender: profileMap.get(m.sender_id) })) as TicketMessage[];
      },
      enabled: !!ticketId,
    });

    // Realtime subscription for messages
    useEffect(() => {
      if (!ticketId) return;
      const channel = supabase
        .channel(`ticket-messages-${ticketId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }, [ticketId]);

    return query;
  };

  // Subscribe to realtime ticket updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`colaborador-rt-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `created_by=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ticket_messages',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['colaborador-tickets'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    updateTicketStatus: updateStatusMutation.mutateAsync,
    useTicketMessages,
    refetch: ticketsQuery.refetch,
  };
}
