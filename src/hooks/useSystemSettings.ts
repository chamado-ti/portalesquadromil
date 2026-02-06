import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export function useSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      return data as SystemSetting[];
    },
  });

  const getSetting = (key: string) => {
    const settings = settingsQuery.data || [];
    return settings.find(s => s.key === key)?.value;
  };

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', key)
        .single();

      const jsonValue = value as unknown as import('@/integrations/supabase/types').Json;

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: jsonValue })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert([{ key, value: jsonValue }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Configuração salva',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    },
  });

  return {
    settings: settingsQuery.data ?? [],
    isLoading: settingsQuery.isLoading,
    getSetting,
    updateSetting: updateSettingMutation.mutateAsync,
    isUpdating: updateSettingMutation.isPending,
    refetch: settingsQuery.refetch,
  };
}
