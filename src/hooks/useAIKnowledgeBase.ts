import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAIKnowledgeBase() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const knowledgeQuery = useQuery({
    queryKey: ['ai-knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type?: string }) => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          title: data.title,
          content: data.content,
          type: data.type || 'text',
          created_by: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
      toast({
        title: 'Conhecimento adicionado',
        description: 'O item foi adicionado à base de conhecimento da IA.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar',
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; content?: string; is_active?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error } = await supabase
        .from('ai_knowledge_base')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
      toast({
        title: 'Atualizado',
        description: 'O item foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-knowledge-base'] });
      toast({
        title: 'Removido',
        description: 'O item foi removido da base de conhecimento.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: error.message,
      });
    },
  });

  return {
    items: knowledgeQuery.data ?? [],
    isLoading: knowledgeQuery.isLoading,
    error: knowledgeQuery.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: knowledgeQuery.refetch,
  };
}
