import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = 'ti' | 'guarita' | 'colaborador' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  sector: string | null;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(translateAuthError(error.message));
  }

  // Update last access
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ last_access: new Date().toISOString() })
      .eq('id', data.user.id);
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(translateAuthError(error.message));
  }
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data as UserProfile;
}

export async function checkUserActive(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return profile?.is_active ?? false;
}

export function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos',
    'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
    'User not found': 'Usuário não encontrado',
    'Invalid email or password': 'E-mail ou senha incorretos',
    'Too many requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'Network request failed': 'Erro de conexão. Verifique sua internet.',
  };

  return errorMap[message] || 'Ocorreu um erro. Tente novamente.';
}

export function getRoleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    ti: 'TI',
    admin: 'Administrador',
    guarita: 'Guarita',
    colaborador: 'Colaborador',
  };
  return labels[role] || role;
}

export function getRoleColor(role: AppRole): string {
  const colors: Record<AppRole, string> = {
    ti: 'bg-primary text-primary-foreground',
    admin: 'bg-indigo-600 text-white',
    guarita: 'bg-warning text-warning-foreground',
    colaborador: 'bg-info text-info-foreground',
  };
  return colors[role] || 'bg-muted text-muted-foreground';
}
