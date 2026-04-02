import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Plus, Pencil, Trash2, Users, Database, Shield, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSectors } from '@/hooks/useSectors';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  memory_enabled: boolean;
  db_access_level: string;
  db_tables: string[];
  is_active: boolean;
  created_at: string;
}

interface AgentAccess {
  id: string;
  agent_id: string;
  access_type: string;
  target_value: string;
}

const AVAILABLE_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Equilibrado)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

const DB_TABLES = [
  'tickets', 'ticket_messages', 'ticket_statuses', 'ticket_urgencies', 'ticket_categories',
  'appointments', 'profiles', 'sectors', 'notifications', 'audit_logs',
  'ai_knowledge_base', 'tasks', 'task_comments',
];

const emptyForm = {
  name: '', description: '', system_prompt: '', model: 'google/gemini-2.5-flash',
  memory_enabled: true, db_access_level: 'none' as string, db_tables: [] as string[], is_active: true,
};

export default function TIAgentesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { sectors } = useSectors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_agents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
  });

  const { data: allAccess = [] } = useQuery({
    queryKey: ['ai-agent-access'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_agent_access').select('*');
      if (error) throw error;
      return data as AgentAccess[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, sector, role');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from('ai_agents').update({
          name: data.name, description: data.description, system_prompt: data.system_prompt,
          model: data.model, memory_enabled: data.memory_enabled, db_access_level: data.db_access_level,
          db_tables: data.db_tables, is_active: data.is_active,
        }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_agents').insert({
          ...data, created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      setDialogOpen(false);
      setEditingAgent(null);
      setForm(emptyForm);
      toast({ title: editingAgent ? 'Agente atualizado' : 'Agente criado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast({ title: 'Agente removido' });
    },
  });

  const accessMutation = useMutation({
    mutationFn: async ({ agentId, type, value }: { agentId: string; type: string; value: string }) => {
      const exists = allAccess.find(a => a.agent_id === agentId && a.access_type === type && a.target_value === value);
      if (exists) {
        const { error } = await supabase.from('ai_agent_access').delete().eq('id', exists.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_agent_access').insert({ agent_id: agentId, access_type: type, target_value: value });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-agent-access'] }),
  });

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name, description: agent.description || '', system_prompt: agent.system_prompt,
      model: agent.model, memory_enabled: agent.memory_enabled, db_access_level: agent.db_access_level,
      db_tables: agent.db_tables || [], is_active: agent.is_active,
    });
    setDialogOpen(true);
  };

  const openCreate = () => { setEditingAgent(null); setForm(emptyForm); setDialogOpen(true); };

  const agentAccess = (agentId: string) => allAccess.filter(a => a.agent_id === agentId);
  const hasAccess = (agentId: string, type: string, value: string) =>
    allAccess.some(a => a.agent_id === agentId && a.access_type === type && a.target_value === value);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Agentes IA</h2>
            <p className="text-muted-foreground">Crie e gerencie assistentes IA personalizados</p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Agente</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : agents.length === 0 ? (
          <Card className="py-12 text-center">
            <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum agente criado</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Criar Agente</Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => {
              const access = agentAccess(agent.id);
              return (
                <Card key={agent.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2"><Bot className="h-5 w-5 text-primary" /></div>
                        <div>
                          <CardTitle className="text-base">{agent.name}</CardTitle>
                          <CardDescription className="line-clamp-1">{agent.description || 'Sem descrição'}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>{agent.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">{AVAILABLE_MODELS.find(m => m.value === agent.model)?.label || agent.model}</Badge>
                      {agent.memory_enabled && <Badge variant="outline" className="text-xs">Memória</Badge>}
                      {agent.db_access_level !== 'none' && (
                        <Badge variant="outline" className="text-xs">
                          <Database className="mr-1 h-3 w-3" />
                          {agent.db_access_level === 'full' ? 'BD Completo' : `BD: ${agent.db_tables?.length || 0} tabelas`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{access.length} acessos configurados</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(agent)}>
                        <Pencil className="mr-1 h-3 w-3" />Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedAgent(agent); setAccessDialogOpen(true); }}>
                        <Shield className="mr-1 h-3 w-3" />Acesso
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(agent.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Editar Agente' : 'Novo Agente IA'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">Geral</TabsTrigger>
              <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
              <TabsTrigger value="database" className="flex-1">Banco de Dados</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div><Label>Nome do Agente</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Assistente de RH" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descrição do agente" /></div>
              <div><Label>Modelo</Label>
                <Select value={form.model} onValueChange={v => setForm(p => ({ ...p, model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AVAILABLE_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Memória Persistente</Label><p className="text-xs text-muted-foreground">Agente lembra de conversas anteriores</p></div>
                <Switch checked={form.memory_enabled} onCheckedChange={v => setForm(p => ({ ...p, memory_enabled: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Ativo</Label><p className="text-xs text-muted-foreground">Agente disponível para uso</p></div>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              </div>
            </TabsContent>
            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div>
                <Label>Prompt do Sistema (Personalidade)</Label>
                <Textarea value={form.system_prompt} onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))} rows={12}
                  placeholder="Você é um assistente especializado em... Sempre responda de forma..." />
                <p className="mt-1 text-xs text-muted-foreground">Define a personalidade e comportamento do agente.</p>
              </div>
            </TabsContent>
            <TabsContent value="database" className="space-y-4 mt-4">
              <div>
                <Label>Nível de Acesso ao Banco</Label>
                <Select value={form.db_access_level} onValueChange={v => setForm(p => ({ ...p, db_access_level: v, db_tables: v === 'full' ? DB_TABLES : v === 'none' ? [] : p.db_tables }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem acesso</SelectItem>
                    <SelectItem value="custom">Tabelas específicas</SelectItem>
                    <SelectItem value="full">Banco completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.db_access_level === 'custom' && (
                <div className="space-y-2">
                  <Label>Selecione as tabelas</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                    {DB_TABLES.map(table => (
                      <label key={table} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.db_tables.includes(table)}
                          onCheckedChange={checked => setForm(p => ({
                            ...p, db_tables: checked ? [...p.db_tables, table] : p.db_tables.filter(t => t !== table)
                          }))} />
                        {table}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingAgent?.id })} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingAgent ? 'Salvar' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Controle de Acesso — {selectedAgent?.name}</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <Tabs defaultValue="users">
              <TabsList className="w-full">
                <TabsTrigger value="users" className="flex-1">Usuários</TabsTrigger>
                <TabsTrigger value="sectors" className="flex-1">Setores</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer hover:bg-accent/50">
                        <Checkbox checked={hasAccess(selectedAgent.id, 'user', u.id)}
                          onCheckedChange={() => accessMutation.mutate({ agentId: selectedAgent.id, type: 'user', value: u.id })} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email} — {u.sector || 'Sem setor'}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="sectors" className="mt-4">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {sectors.map(s => (
                      <label key={s.id} className="flex items-center gap-3 rounded-lg border p-2 cursor-pointer hover:bg-accent/50">
                        <Checkbox checked={hasAccess(selectedAgent.id, 'sector', s.name)}
                          onCheckedChange={() => accessMutation.mutate({ agentId: selectedAgent.id, type: 'sector', value: s.name })} />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
