import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo } from 'react';
import { logAudit } from '@/lib/auditLog';

// ============= Types =============
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
  reply_to_id?: string | null;
  reactions?: Record<string, string[]>; // emoji -> user_ids
  created_at: string;
  // Enriched
  sender_name?: string;
  sender_avatar?: string | null;
  tag_name?: string;
  tag_color?: string;
  reply_preview?: { sender_name: string; content: string } | null;
}

// ============ Groups ============
export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups').select('*').eq('is_active', true)
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
        .select().single();
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
      await logAudit('group.delete', 'group', id);
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

// ============ Tags ============
export function useGroupTags(groupId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['group-tags', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_tags').select('*').eq('group_id', groupId).order('name');
      if (error) throw error;
      return data as GroupTag[];
    },
    enabled: !!groupId,
  });

  // Realtime updates for tags
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-tags-${groupId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_tags', filter: `group_id=eq.${groupId}` },
        () => queryClient.invalidateQueries({ queryKey: ['group-tags', groupId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, queryClient]);

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      if (!groupId) throw new Error('Grupo não selecionado');
      const { data, error } = await supabase
        .from('group_tags')
        .insert({ group_id: groupId, name, color: color || '#6366f1' })
        .select().single();
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

// ============ Tag Members ============
export function useTagMembers(tagId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const membersQuery = useQuery({
    queryKey: ['tag-members', tagId],
    queryFn: async () => {
      if (!tagId) return [];
      const { data, error } = await supabase
        .from('group_tag_members').select('*').eq('tag_id', tagId);
      if (error) throw error;
      return data as GroupTagMember[];
    },
    enabled: !!tagId,
  });

  useEffect(() => {
    if (!tagId) return;
    const channel = supabase
      .channel(`tag-members-${tagId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'group_tag_members', filter: `tag_id=eq.${tagId}` },
        () => queryClient.invalidateQueries({ queryKey: ['tag-members', tagId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tagId, queryClient]);

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!tagId) throw new Error('Tag não selecionada');
      const { error } = await supabase.from('group_tag_members').insert({ tag_id: tagId, user_id: userId });
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
        .from('group_tag_members').delete().eq('tag_id', tagId).eq('user_id', userId);
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

// ============ Unread counts per group ============
export function useGroupUnreadCounts(groupIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['group-unread', user?.id, groupIds.sort().join(',')],
    queryFn: async () => {
      if (!user?.id || groupIds.length === 0) return {} as Record<string, number>;
      const { data: reads } = await supabase
        .from('group_reads').select('group_id, last_read_at').eq('user_id', user.id);
      const readMap = new Map((reads || []).map((r: any) => [r.group_id, r.last_read_at]));
      const counts: Record<string, number> = {};
      await Promise.all(groupIds.map(async (gid) => {
        const since = readMap.get(gid) || '1970-01-01';
        const { count } = await supabase
          .from('group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', gid)
          .gt('created_at', since)
          .neq('sender_id', user.id);
        counts[gid] = count || 0;
      }));
      return counts;
    },
    enabled: !!user?.id && groupIds.length > 0,
    refetchInterval: 30000,
  });
}

export async function markGroupRead(groupId: string, userId: string) {
  await supabase.from('group_reads').upsert(
    { group_id: groupId, user_id: userId, last_read_at: new Date().toISOString() },
    { onConflict: 'group_id,user_id' }
  );
}

// ============ Messages with Realtime ============
export function useGroupMessages(groupId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('group_messages').select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as GroupMessage[];
    },
    enabled: !!groupId,
  });

  const { data: tagsMap = new Map() } = useQuery({
    queryKey: ['group-tags-map', groupId],
    queryFn: async () => {
      if (!groupId) return new Map();
      const { data } = await supabase.from('group_tags').select('id, name, color').eq('group_id', groupId);
      return new Map((data || []).map((t: any) => [t.id, t]));
    },
    enabled: !!groupId,
  });

  const { data: profilesMap = new Map() } = useQuery({
    queryKey: ['group-profiles-map', groupId, messagesQuery.data?.length],
    queryFn: async () => {
      const senderIds = [...new Set((messagesQuery.data || []).map(m => m.sender_id))];
      if (senderIds.length === 0) return new Map();
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
      return new Map((data || []).map((p: any) => [p.id, p]));
    },
    enabled: !!groupId && !!messagesQuery.data,
  });

  const enrichedMessages = useMemo<GroupMessage[]>(() => {
    const list = messagesQuery.data || [];
    const byId = new Map(list.map(m => [m.id, m]));
    return list.map(m => {
      const profile = profilesMap.get(m.sender_id);
      const tag = m.tag_mention ? tagsMap.get(m.tag_mention) : null;
      const replyTo = m.reply_to_id ? byId.get(m.reply_to_id) : null;
      const replyProfile = replyTo ? profilesMap.get(replyTo.sender_id) : null;
      return {
        ...m,
        sender_name: profile?.full_name || 'Usuário',
        sender_avatar: profile?.avatar_url || null,
        tag_name: tag?.name,
        tag_color: tag?.color,
        reply_preview: replyTo ? {
          sender_name: replyProfile?.full_name || 'Usuário',
          content: replyTo.is_deleted ? '[Mensagem excluída]' : replyTo.content,
        } : null,
      };
    });
  }, [messagesQuery.data, profilesMap, tagsMap]);

  // Realtime
  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const newMsg = payload.new as GroupMessage;
        if (!profilesMap.has(newMsg.sender_id)) {
          const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').eq('id', newMsg.sender_id).single();
          if (data) {
            queryClient.setQueryData(['group-profiles-map', groupId], (old: Map<string, any> | undefined) => {
              const m = new Map(old || []); m.set(data.id, data); return m;
            });
          }
        }
        queryClient.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) => {
          const list = old || [];
          if (list.some(m => m.id === newMsg.id)) return list;
          return [...list, newMsg];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const updated = payload.new as GroupMessage;
        queryClient.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) =>
          (old || []).map(m => m.id === updated.id ? { ...m, ...updated } : m)
        );
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        const deletedId = (payload.old as GroupMessage).id;
        queryClient.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) =>
          (old || []).filter(m => m.id !== deletedId)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, queryClient, profilesMap]);

  // Send
  const sendMessage = useMutation({
    mutationFn: async ({ content, attachments, replyToId }: { content: string; attachments?: string[]; replyToId?: string | null }) => {
      if (!groupId || !user?.id) throw new Error('Não autenticado');
      const tagMentionMatch = content.match(/@(\w+)/);
      let tagMention: string | null = null;
      if (tagMentionMatch) {
        const found = Array.from(tagsMap.values()).find((t: any) => t.name === tagMentionMatch[1]);
        if (found) tagMention = (found as any).id;
      }
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId, sender_id: user.id, content,
          tag_mention: tagMention,
          attachments: attachments || [],
          reply_to_id: replyToId || null,
        })
        .select().single();
      if (error) throw error;

      queryClient.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) => {
        const list = old || [];
        if (list.some(m => m.id === data.id)) return list;
        return [...list, data as GroupMessage];
      });

      if (tagMention) await autoCreateTicketFromTag(data.id, tagMention, content, user.id);
      return data;
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao enviar', description: e.message }),
  });

  const autoCreateTicketFromTag = async (messageId: string, tagId: string, content: string, userId: string) => {
    try {
      const { data: statuses } = await supabase
        .from('ticket_statuses').select('id').order('sort_order').limit(1);
      if (!statuses?.length) return;
      const tag: any = tagsMap.get(tagId);
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `[Grupo] @${tag?.name || 'tag'}: ${content.slice(0, 80)}`,
          description: content, created_by: userId, status_id: statuses[0].id,
        })
        .select().single();
      if (ticketError || !ticket) return;
      await supabase.from('group_tickets').insert({ message_id: messageId, tag_id: tagId, ticket_id: ticket.id });
      const { data: members } = await supabase.from('group_tag_members').select('user_id').eq('tag_id', tagId);
      if (members?.length) {
        const notifications = members.filter(m => m.user_id !== userId).map(m => ({
          user_id: m.user_id, title: `Nova menção @${tag?.name}`,
          message: content.slice(0, 100), type: 'ticket',
          entity_type: 'ticket', entity_id: ticket.id,
        }));
        if (notifications.length) await supabase.from('notifications').insert(notifications);
      }
      toast({ title: 'Chamado criado automaticamente', description: `Via @${tag?.name}` });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (err) {
      console.error('Auto-create ticket error:', err);
    }
  };

  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('group_messages')
        .update({ is_deleted: true, content: '[Mensagem excluída]' })
        .eq('id', id);
      if (error) throw error;
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned, expiresHours }: { id: string; isPinned: boolean; expiresHours?: number }) => {
      const update: any = { is_pinned: isPinned };
      update.pin_expires_at = isPinned && expiresHours
        ? new Date(Date.now() + expiresHours * 3600000).toISOString()
        : null;
      const { error } = await supabase.from('group_messages').update(update).eq('id', id);
      if (error) throw error;
    },
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ id, emoji }: { id: string; emoji: string }) => {
      if (!user?.id) return;
      const msg = (messagesQuery.data || []).find(m => m.id === id);
      const reactions: Record<string, string[]> = { ...(msg?.reactions || {}) };
      const users = reactions[emoji] || [];
      reactions[emoji] = users.includes(user.id) ? users.filter(u => u !== user.id) : [...users, user.id];
      if (reactions[emoji].length === 0) delete reactions[emoji];
      const { error } = await supabase.from('group_messages').update({ reactions }).eq('id', id);
      if (error) throw error;
    },
  });

  return {
    messages: enrichedMessages,
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutateAsync,
    editMessage: editMessage.mutateAsync,
    deleteMessage: deleteMessage.mutateAsync,
    togglePin: togglePin.mutateAsync,
    toggleReaction: toggleReaction.mutateAsync,
    isSending: sendMessage.isPending,
    refetch: messagesQuery.refetch,
  };
}

// ============ Helper: upload attachment to group bucket ============
export async function uploadGroupAttachment(groupId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${groupId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('group-attachments').upload(path, file, {
    cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('group-attachments').getPublicUrl(path);
  return data.publicUrl;
}
