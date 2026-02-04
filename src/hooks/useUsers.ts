import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AppRole } from "@/lib/auth";

export interface User {
  id: string;
  email: string;
  full_name: string;
  sector: string | null;
  role: AppRole;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  sector: string;
  role: AppRole;
}

export interface UpdateUserData {
  user_id: string;
  full_name?: string;
  sector?: string;
  role?: AppRole;
  is_active?: boolean;
}

export interface ResetPasswordData {
  user_id: string;
  new_password: string;
}

export function useUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users (TI only - RLS handles this)
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      return data as User[];
    },
  });

  // Create user
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "create", ...data },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário criado",
        description: "O usuário foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message,
      });
    },
  });

  // Update user
  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "update", ...data },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    },
  });

  // Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", ...data },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida",
        description: "A senha do usuário foi alterada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: error.message,
      });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", user_id: userId },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido do sistema.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir usuário",
        description: error.message,
      });
    },
  });

  // Toggle active status
  const toggleActiveStatus = async (userId: string, currentStatus: boolean) => {
    await updateUserMutation.mutateAsync({
      user_id: userId,
      is_active: !currentStatus,
    });
  };

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    toggleActiveStatus,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isResetting: resetPasswordMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
}
