import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Blocks, Bot, Ticket, Calendar, BarChart3, ListTodo } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ai_agents: Bot, tickets: Ticket, appointments: Calendar, reports: BarChart3, tasks: ListTodo,
};

export default function TIModulosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['module-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('module_settings').select('*').order('module_name');
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('module_settings').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
      toast({ title: 'Módulo atualizado' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Blocks className="h-6 w-6" />Módulos do Sistema</h2>
          <p className="text-muted-foreground">Ative ou desative funcionalidades para toda a plataforma</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map(mod => {
              const Icon = MODULE_ICONS[mod.module_key] || Blocks;
              return (
                <Card key={mod.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
                        <div>
                          <CardTitle className="text-base">{mod.module_name}</CardTitle>
                          <CardDescription>{mod.description || ''}</CardDescription>
                        </div>
                      </div>
                      <Switch checked={mod.is_active} onCheckedChange={v => toggleMutation.mutate({ id: mod.id, is_active: v })} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {(mod.allowed_roles as string[] || []).map(r => (
                        <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
