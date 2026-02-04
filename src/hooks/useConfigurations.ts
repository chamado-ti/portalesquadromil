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

export function useConfigurations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch statuses
  const statusesQuery = useQuery({
    queryKey: ["config-statuses"],
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
    queryKey: ["config-urgencies"],
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
    queryKey: ["config-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as TicketCategory[];
    },
  });

  // Create category
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null }) => {
      const { error } = await supabase.from("ticket_categories").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-categories"] });
      toast({
        title: "Categoria criada",
        description: "A categoria foi adicionada com sucesso.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar a categoria.",
      });
    },
  });

  // Update category
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      description: string | null;
    }) => {
      const { error } = await supabase
        .from("ticket_categories")
        .update({ name: data.name, description: data.description })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-categories"] });
      toast({
        title: "Categoria atualizada",
        description: "As alterações foram salvas.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a categoria.",
      });
    },
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ticket_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi removida.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a categoria.",
      });
    },
  });

  return {
    statuses: statusesQuery.data ?? [],
    urgencies: urgenciesQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading:
      statusesQuery.isLoading ||
      urgenciesQuery.isLoading ||
      categoriesQuery.isLoading,
    error: statusesQuery.error || urgenciesQuery.error || categoriesQuery.error,
    refetch: () => {
      statusesQuery.refetch();
      urgenciesQuery.refetch();
      categoriesQuery.refetch();
    },
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
  };
}
