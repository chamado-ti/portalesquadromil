import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
  id: string; title: string; description: string | null; status: string;
  priority: string; due_date: string | null; assigned_to: string | null;
  created_by: string; sector: string | null; sort_order: number; created_at: string;
}

const COLUMNS = [
  { id: 'todo', label: 'A Fazer', color: 'border-l-muted-foreground/30' },
  { id: 'in_progress', label: 'Em Andamento', color: 'border-l-blue-500' },
  { id: 'done', label: 'Concluído', color: 'border-l-green-500' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baixa', bg: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Média', bg: 'bg-yellow-500/10 text-yellow-600' },
  { value: 'high', label: 'Alta', bg: 'bg-orange-500/10 text-orange-600' },
  { value: 'urgent', label: 'Urgente', bg: 'bg-destructive/10 text-destructive' },
];

const emptyForm = { title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', sector: '' };

export default function TITarefasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('sort_order');
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, sector');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload: any = {
        title: data.title, description: data.description || null,
        priority: data.priority, due_date: data.due_date || null,
        assigned_to: data.assigned_to || null, sector: data.sector || null,
      };
      if (data.id) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDialogOpen(false); setEditingTask(null); setForm(emptyForm);
      toast({ title: editingTask ? 'Tarefa atualizada' : 'Tarefa criada' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast({ title: 'Tarefa removida' }); },
  });

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({ title: task.title, description: task.description || '', priority: task.priority, due_date: task.due_date || '', assigned_to: task.assigned_to || '', sector: task.sector || '' });
    setDialogOpen(true);
  };

  const getUserName = (id: string | null) => users.find(u => u.id === id)?.full_name || '—';

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Tarefas</h2>
            <p className="text-muted-foreground">Kanban de tarefas da equipe</p>
          </div>
          <Button onClick={() => { setEditingTask(null); setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Nova Tarefa
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/50">
                    <h3 className="font-semibold text-sm">{col.label}</h3>
                    <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                  </div>
                  <ScrollArea className="h-[calc(100vh-18rem)]">
                    <div className="space-y-2 pr-2">
                      {colTasks.map(task => {
                        const pri = PRIORITIES.find(p => p.value === task.priority);
                        const overdue = isOverdue(task.due_date) && task.status !== 'done';
                        return (
                          <Card key={task.id}
                            className={cn(
                              'cursor-pointer border-l-4 hover:shadow-md transition-all',
                              col.color,
                              overdue && 'border-l-destructive'
                            )}
                            onClick={() => openEdit(task)}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm line-clamp-2">{task.title}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); deleteMutation.mutate(task.id); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge className={cn('text-[10px] border-0', pri?.bg)}>{pri?.label}</Badge>
                                {task.due_date && (
                                  <Badge variant="outline" className={cn('text-[10px] gap-0.5', overdue && 'border-destructive text-destructive')}>
                                    {overdue && <AlertCircle className="h-2.5 w-2.5" />}
                                    <Calendar className="h-2.5 w-2.5" />
                                    {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                                  </Badge>
                                )}
                                {task.assigned_to && <Badge variant="secondary" className="text-[10px]">{getUserName(task.assigned_to)}</Badge>}
                              </div>
                              <div className="flex gap-1 pt-1">
                                {COLUMNS.filter(c => c.id !== task.status).map(c => (
                                  <Button key={c.id} variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                                    onClick={e => { e.stopPropagation(); updateStatusMutation.mutate({ id: task.id, status: c.id }); }}>
                                    → {c.label}
                                  </Button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            </div>
            <div><Label>Responsável</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingTask?.id })} disabled={saveMutation.isPending || !form.title}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTask ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
