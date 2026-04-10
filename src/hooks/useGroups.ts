import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useCallback, useState } from 'react';

// Types
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupTag {
  id: string;
  group_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface GroupTagMember {
  id: string;
  tag_id: string;
  user_id: string;
  created_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  tag_mention: string | null;
  attachments: string[];
  is_deleted: boolean;
  edited_at: string | null;
  is_pinned: boolean;
  pin_expires_at: string | null;
  created_at: string;
  // Joined fields
  sender_name?: string;
  sender_avatar?: string;
  tag_name?: string;
  tag_color?: string;
}

export interface GroupTicket {
  id: string;
  message_id: string;
  tag_id: string;
  ticket_id: string;
  created_at: string;
}

// ============ Groups Hook ============
export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!user?.id,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('groups')
        .insert({ name, description: description || null, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Grupo criado com sucesso' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Grupo excluído' });
    },
  });

  return {
    groups: groupsQuery.data ?? [],
    isLoading: groupsQuery.isLoading,
    createGroup: createGroup.mutateAsync,
    deleteGroup: deleteGroup.mutateAsync,
    isCreating: createGroup.isPending,
  };
}

// ============ Group Tags Hook ============
export function useGroupTags(groupId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['group-tags', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_tags')
        .select('*')
        .eq('group_id', groupId)
        .order('name');
      if (error) throw error;
      return data as GroupTag[];
    },
    enabled: !!groupId,
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!groupId) throw new Error('Grupo não selecionado');
      const { data, error } = await supabase
        .from('group_tags')
        .insert({ group_id: groupId, name, color: color || '#6366f1' })
        .select()
        .single();
      if (error) throw error;
      return data as GroupTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-tags', groupId] });
      toast({ title: 'Tag criada' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('group_tags').delete().eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-tags', groupId] });
      toast({ title: 'Tag removida' });
    },
  });

  return {
    tags: tagsQuery.data ?? [],
    isLoading: tagsQuery.isLoading,
    createTag: createTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
  };
}

// ============ Tag Members Hook ============
export function useTagMembers(tagId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const membersQuery = useQuery({
    queryKey: ['tag-members', tagId],
    queryFn: async () => {
      if (!tagId) return [];
      const { data, error } = await supabase
        .from('group_tag_members')
        .select('*')
        .eq('tag_id', tagId);
      if (error) throw error;
      return data as GroupTagMember[];
    },
    enabled: !!tagId,
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!tagId) throw new Error('Tag não selecionada');
      const { error } = await supabase
        .from('group_tag_members')
        .insert({ tag_id: tagId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-members', tagId] });
      toast({ title: 'Membro adicionado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!tagId) throw new Error('Tag não selecionada');
      const { error } = await supabase
        .from('group_tag_members')
        .delete()
        .eq('tag_id', tagId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tag-members', tagId] });
      toast({ title: 'Membro removido' });
    },
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    addMember: addMember.mutateAsync,
    removeMember: removeMember.mutateAsync,
  };
}

// ============ Group Messages Hook with Realtime ============
export function useGroupMessages(groupId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [realtimeMessages, setRealtimeMessages] = useState<GroupMessage[]>([]);

  // Fetch initial messages
  const messagesQuery = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as GroupMessage[];
    },
    enabled: !!groupId,
  });

  // Enrich messages with sender info
  const enrichMessages = useCallback(async (msgs: GroupMessage[]) => {
    const senderIds = [...new Set(msgs.map(m => m.sender_id))];
    const tagIds = [...new Set(msgs.filter(m => m.tag_mention).map(m => m.tag_mention!))];

    const [profilesRes, tagsRes] = await Promise.all([
      senderIds.length > 0
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds)
        : { data: [] },
      tagIds.length > 0
        ? supabase.from('group_tags').select('id, name, color').in('id', tagIds)
        : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const tagMap = new Map((tagsRes.data || []).map((t: any) => [t.id, t]));

    return msgs.map(m => ({
      ...m,
      sender_name: profileMap.get(m.sender_id)?.full_name || 'Usuário',
      sender_avatar: profileMap.get(m.sender_id)?.avatar_url || null,
      tag_name: m.tag_mention ? tagMap.get(m.tag_mention)?.name : undefined,
      tag_color: m.tag_mention ? tagMap.get(m.tag_mention)?.color : undefined,
    }));
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const newMsg = payload.new as GroupMessage;
        const [enriched] = await enrichMessages([newMsg]);
        setRealtimeMessages(prev => [...prev, enriched]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const updated = payload.new as GroupMessage;
        setRealtimeMessages(prev =>
          prev.map(m => m.id === updated.id ? { ...m, ...updated } : m)
        );
        queryClient.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) =>
          (old || []).map(m => m.id === updated.id ? { ...m, ...updated } : m)
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setRealtimeMessages([]);
    };
  }, [groupId, enrichMessages, queryClient]);

  // Combine fetched + realtime messages
  const allMessages = useCallback(() => {
    const fetched = messagesQuery.data || [];
    const fetchedIds = new Set(fetched.map(m => m.id));
    const newRealtime = realtimeMessages.filter(m => !fetchedIds.has(m.id));
    return [...fetched, ...newRealtime];
  }, [messagesQuery.data, realtimeMessages]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments?: string[] }) => {
      if (!groupId || !user?.id) throw new Error('Não autenticado');

      // Detect @tag mentions
      const tagMentionMatch = content.match(/@(\w+)/);
      let tagMention: string | null = null;

      if (tagMentionMatch) {
        const { data: tagData } = await supabase
          .from('group_tags')
          .select('id')
          .eq('group_id', groupId)
          .eq('name', tagMentionMatch[1])
          .single();
        if (tagData) tagMention = tagData.id;
      }

      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content,
          tag_mention: tagMention,
          attachments: attachments || [],
        })
        .select()
        .single();

      if (error) throw error;

      // If there's a tag mention, auto-create ticket
      if (tagMention) {
        await autoCreateTicketFromTag(data.id, tagMention, content, user.id);
      }

      return data;
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao enviar', description: e.message }),
  });

  // Auto-create ticket from @tag
  const autoCreateTicketFromTag = async (messageId: string, tagId: string, content: string, userId: string) => {
    try {
      // Get the first status for new tickets
      const { data: statuses } = await supabase
        .from('ticket_statuses')
        .select('id')
        .order('sort_order')
        .limit(1);

      if (!statuses || statuses.length === 0) return;

      // Get tag info
      const { data: tag } = await supabase
        .from('group_tags')
        .select('name')
        .eq('id', tagId)
        .single();

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `[Grupo] @${tag?.name || 'tag'}: ${content.slice(0, 80)}`,
          description: content,
          created_by: userId,
          status_id: statuses[0].id,
        })
        .select()
        .single();

      if (ticketError || !ticket) return;

      // Link ticket to group
      await supabase.from('group_tickets').insert({
        message_id: messageId,
        tag_id: tagId,
        ticket_id: ticket.id,
      });

      // Notify tag members
      const { data: members } = await supabase
        .from('group_tag_members')
        .select('user_id')
        .eq('tag_id', tagId);

      if (members) {
        const notifications = members
          .filter(m => m.user_id !== userId)
          .map(m => ({
            user_id: m.user_id,
            title: `Nova menção @${tag?.name}`,
            message: content.slice(0, 100),
            type: 'ticket',
            entity_type: 'ticket',
            entity_id: ticket.id,
          }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      toast({ title: 'Chamado criado automaticamente', description: `Via @${tag?.name}` });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (err) {
      console.error('Auto-create ticket error:', err);
    }
  };

  // Edit message (within 5 min)
  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] }),
  });

  // Soft delete message
  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ is_deleted: true, content: '[Mensagem excluída]' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] }),
  });

  // Pin/unpin message
  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned, expiresHours }: { id: string; isPinned: boolean; expiresHours?: number }) => {
      const update: any = { is_pinned: isPinned };
      if (isPinned && expiresHours) {
        update.pin_expires_at = new Date(Date.now() + expiresHours * 3600000).toISOString();
      } else {
        update.pin_expires_at = null;
      }
      const { error } = await supabase.from('group_messages').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] }),
  });

  return {
    messages: allMessages(),
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutateAsync,
    editMessage: editMessage.mutateAsync,
    deleteMessage: deleteMessage.mutateAsync,
    togglePin: togglePin.mutateAsync,
    isSending: sendMessage.isPending,
    refetch: messagesQuery.refetch,
  };
}
