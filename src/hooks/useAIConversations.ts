import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  ticketSuggestion?: {
    titulo: string;
    descricao: string;
    categoria: string;
  };
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  messages: AIMessage[];
  created_at: string;
  updated_at: string;
}

export function useAIConversations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ['ai-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(conv => ({
        ...conv,
        messages: (conv.messages as unknown as AIMessage[]) || [],
      })) as AIConversation[];
    },
    enabled: !!user?.id,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (title: string = 'Nova Conversa') => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title,
          messages: [],
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, messages: [] } as AIConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, messages, title }: { id: string; messages?: AIMessage[]; title?: string }) => {
      const updateData: Record<string, unknown> = {};
      if (messages !== undefined) updateData.messages = messages;
      if (title !== undefined) updateData.title = title;

      const { error } = await supabase
        .from('ai_conversations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida do histórico.',
      });
    },
  });

  return {
    conversations: conversationsQuery.data ?? [],
    isLoading: conversationsQuery.isLoading,
    createConversation: createConversationMutation.mutateAsync,
    updateConversation: updateConversationMutation.mutateAsync,
    deleteConversation: deleteConversationMutation.mutateAsync,
    isCreating: createConversationMutation.isPending,
    refetch: conversationsQuery.refetch,
  };
}
