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
import {
  Bot, Plus, Pencil, Trash2, Users, Database, Shield, Loader2, Key,
  Sparkles, Link2, Wrench, Brain, Headphones, BarChart3, FileText, Settings,
  ShieldCheck, Globe, Zap, Heart, BookOpen, MessageSquare
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSectors } from '@/hooks/useSectors';

interface Agent {
  id: string; name: string; description: string | null; system_prompt: string;
  model: string; memory_enabled: boolean; db_access_level: string; db_tables: string[];
  is_active: boolean; created_at: string; api_key: string | null; api_provider: string;
  icon: string | null;
}

interface AgentAccess { id: string; agent_id: string; access_type: string; target_value: string; }
interface AgentSkill { id: string; name: string; description: string | null; parameters: any; agent_id: string | null; is_shared: boolean; }
interface AgentModule { id: string; agent_id: string; module_key: string; is_active: boolean; }

const AGENT_ICONS: { value: string; label: string; icon: any }[] = [
  { value: 'bot', label: 'Bot', icon: Bot },
  { value: 'brain', label: 'Cérebro', icon: Brain },
  { value: 'headphones', label: 'Suporte', icon: Headphones },
  { value: 'bar-chart', label: 'Analytics', icon: BarChart3 },
  { value: 'file-text', label: 'Documentos', icon: FileText },
  { value: 'settings', label: 'Config', icon: Settings },
  { value: 'shield', label: 'Segurança', icon: ShieldCheck },
  { value: 'globe', label: 'Web', icon: Globe },
  { value: 'zap', label: 'Automação', icon: Zap },
  { value: 'heart', label: 'RH', icon: Heart },
  { value: 'book', label: 'Base', icon: BookOpen },
  { value: 'message', label: 'Chat', icon: MessageSquare },
  { value: 'sparkles', label: 'IA', icon: Sparkles },
  { value: 'wrench', label: 'Ferramentas', icon: Wrench },
];

const SYSTEM_MODULES = [
  { key: 'tickets', label: 'Chamados', description: 'Criar, consultar e gerenciar chamados' },
  { key: 'appointments', label: 'Agendamentos', description: 'Acessar e gerenciar agendamentos' },
  { key: 'tasks', label: 'Tarefas', description: 'Criar e gerenciar tarefas do Kanban' },
  { key: 'processes', label: 'Processos', description: 'Interagir com fluxos de processos' },
  { key: 'reports', label: 'Relatórios', description: 'Gerar e consultar relatórios' },
  { key: 'knowledge_base', label: 'Base de Conhecimento', description: 'Acessar artigos e documentos' },
  { key: 'users', label: 'Usuários', description: 'Consultar perfis e informações' },
  { key: 'audit', label: 'Auditoria', description: 'Acessar logs e registros' },
];

const AVAILABLE_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'lovable' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'lovable' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', provider: 'lovable' },
  { value: 'openai/gpt-5', label: 'GPT-5', provider: 'lovable' },
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)', provider: 'openai' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (OpenAI)', provider: 'openai' },
];

const DB_TABLES = [
  'tickets', 'ticket_messages', 'ticket_statuses', 'ticket_urgencies', 'ticket_categories',
  'appointments', 'profiles', 'sectors', 'notifications', 'audit_logs',
  'ai_knowledge_base', 'tasks', 'task_comments', 'processes', 'risk_assessments',
];

const emptyForm = {
  name: '', description: '', system_prompt: '', model: 'google/gemini-2.5-flash',
  memory_enabled: true, db_access_level: 'none' as string, db_tables: [] as string[],
  is_active: true, api_key: '', api_provider: 'lovable', icon: 'bot',
};

const emptySkillForm = { name: '', description: '', parameters: '' };

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
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillForm, setSkillForm] = useState(emptySkillForm);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_agents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Agent[];
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

  const { data: allSkills = [] } = useQuery({
    queryKey: ['ai-agent-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_agent_skills').select('*');
      if (error) throw error;
      return data as AgentSkill[];
    },
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['ai-agent-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_agent_modules').select('*');
      if (error) throw error;
      return data as AgentModule[];
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
      const provider = data.api_key ? 'openai' : 'lovable';
      const payload: any = {
        name: data.name, description: data.description, system_prompt: data.system_prompt,
        model: data.model, memory_enabled: data.memory_enabled, db_access_level: data.db_access_level,
        db_tables: data.db_tables, is_active: data.is_active,
        api_key: data.api_key || null, api_provider: provider, icon: data.icon,
      };
      if (data.id) {
        const { error } = await supabase.from('ai_agents').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ai_agents').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      setDialogOpen(false); setEditingAgent(null); setForm(emptyForm);
      toast({ title: editingAgent ? 'Agente atualizado' : 'Agente criado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_agents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-agents'] }); toast({ title: 'Agente removido' }); },
  });

  const accessMutation = useMutation({
    mutationFn: async ({ agentId, type, value }: { agentId: string; type: string; value: string }) => {
      const exists = allAccess.find(a => a.agent_id === agentId && a.access_type === type && a.target_value === value);
      if (exists) {
        await supabase.from('ai_agent_access').delete().eq('id', exists.id);
      } else {
        await supabase.from('ai_agent_access').insert({ agent_id: agentId, access_type: type, target_value: value });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-agent-access'] }),
  });

  const saveSkill = useMutation({
    mutationFn: async () => {
      if (!selectedAgent) return;
      let params = {};
      try { params = skillForm.parameters ? JSON.parse(skillForm.parameters) : {}; } catch {}
      const { error } = await supabase.from('ai_agent_skills').insert({
        name: skillForm.name, description: skillForm.description || null,
        parameters: params, agent_id: selectedAgent.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agent-skills'] });
      setSkillDialogOpen(false); setSkillForm(emptySkillForm);
      toast({ title: 'Habilidade criada' });
    },
  });

  const deleteSkill = useMutation({
    mutationFn: async (id: string) => { await supabase.from('ai_agent_skills').delete().eq('id', id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-agent-skills'] }),
  });

  const toggleModule = useMutation({
    mutationFn: async ({ agentId, moduleKey }: { agentId: string; moduleKey: string }) => {
      const existing = allModules.find(m => m.agent_id === agentId && m.module_key === moduleKey);
      if (existing) {
        await supabase.from('ai_agent_modules').delete().eq('id', existing.id);
      } else {
        await supabase.from('ai_agent_modules').insert({ agent_id: agentId, module_key: moduleKey } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-agent-modules'] }),
  });

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      name: agent.name, description: agent.description || '', system_prompt: agent.system_prompt,
      model: agent.model, memory_enabled: agent.memory_enabled, db_access_level: agent.db_access_level,
      db_tables: agent.db_tables || [], is_active: agent.is_active,
      api_key: agent.api_key || '', api_provider: agent.api_provider || 'lovable',
      icon: agent.icon || 'bot',
    });
    setDialogOpen(true);
  };

  const hasAccess = (agentId: string, type: string, value: string) =>
    allAccess.some(a => a.agent_id === agentId && a.access_type === type && a.target_value === value);

  const hasModule = (agentId: string, moduleKey: string) =>
    allModules.some(m => m.agent_id === agentId && m.module_key === moduleKey);

  const getAgentIcon = (iconName: string | null) => {
    const found = AGENT_ICONS.find(i => i.value === iconName);
    return found ? found.icon : Bot;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Agentes IA</h2>
            <p className="text-muted-foreground">Crie assistentes com API, prompt, habilidades e módulos conectados</p>
          </div>
          <Button onClick={() => { setEditingAgent(null); setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Novo Agente
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : agents.length === 0 ? (
          <Card className="py-12 text-center">
            <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum agente criado</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => {
              const access = allAccess.filter(a => a.agent_id === agent.id);
              const skills = allSkills.filter(s => s.agent_id === agent.id);
              const modules = allModules.filter(m => m.agent_id === agent.id);
              const AgentIcon = getAgentIcon(agent.icon);
              return (
                <Card key={agent.id} className="group hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary/10 p-2.5">
                          <AgentIcon className="h-5 w-5 text-primary" />
                        </div>
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
                      <Badge variant="outline" className="text-xs">
                        {AVAILABLE_MODELS.find(m => m.value === agent.model)?.label || agent.model}
                      </Badge>
                      {agent.api_key && <Badge variant="outline" className="text-xs text-amber-600"><Key className="mr-1 h-3 w-3" />API própria</Badge>}
                      {!agent.api_key && <Badge variant="outline" className="text-xs text-green-600">Lovable AI</Badge>}
                      {agent.memory_enabled && <Badge variant="outline" className="text-xs">Memória</Badge>}
                      {agent.db_access_level !== 'none' && (
                        <Badge variant="outline" className="text-xs"><Database className="mr-1 h-3 w-3" />
                          {agent.db_access_level === 'full' ? 'BD Completo' : `${agent.db_tables?.length || 0} tabelas`}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{access.length} acessos</span>
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />{skills.length} habilidades</span>
                      <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{modules.length} módulos</span>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(agent)}>
                        <Pencil className="mr-1 h-3 w-3" />Editar
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setSelectedAgent(agent); setAccessDialogOpen(true); }}>
                        <Shield className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setSelectedAgent(agent); setSkillDialogOpen(true); }}>
                        <Wrench className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setSelectedAgent(agent); setModulesDialogOpen(true); }}>
                        <Link2 className="h-3.5 w-3.5" />
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
              <TabsTrigger value="api" className="flex-1">API & Modelo</TabsTrigger>
              <TabsTrigger value="prompt" className="flex-1">Prompt</TabsTrigger>
              <TabsTrigger value="database" className="flex-1">Banco de Dados</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 mt-4">
              <div><Label>Nome do Agente</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Assistente de RH" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Breve descrição" /></div>
              <div>
                <Label>Ícone</Label>
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {AGENT_ICONS.map(ic => {
                    const Icon = ic.icon;
                    return (
                      <button key={ic.value}
                        className={cn('flex flex-col items-center gap-1 rounded-lg border p-2 text-xs hover:bg-accent transition-colors',
                          form.icon === ic.value && 'border-primary bg-primary/5')}
                        onClick={() => setForm(p => ({ ...p, icon: ic.value }))}>
                        <Icon className="h-5 w-5" />
                        <span className="text-[9px] text-muted-foreground">{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Memória Persistente</Label><p className="text-xs text-muted-foreground">Lembra conversas anteriores</p></div>
                <Switch checked={form.memory_enabled} onCheckedChange={v => setForm(p => ({ ...p, memory_enabled: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div><Label>Ativo</Label><p className="text-xs text-muted-foreground">Disponível para uso</p></div>
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              </div>
            </TabsContent>
            <TabsContent value="api" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /><Label className="text-base font-semibold">Chave de API exclusiva</Label></div>
                <p className="text-sm text-muted-foreground">Deixe vazio para usar a IA integrada (Lovable AI). Insira uma chave OpenAI para identidade própria.</p>
                <Input value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))} placeholder="sk-proj-..." type="password" />
              </div>
              <div><Label>Modelo</Label>
                <Select value={form.model} onValueChange={v => setForm(p => ({ ...p, model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header-lovable" disabled className="font-bold text-xs">— Lovable AI (sem chave) —</SelectItem>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'lovable').map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    <SelectItem value="header-openai" disabled className="font-bold text-xs">— OpenAI (requer chave) —</SelectItem>
                    {AVAILABLE_MODELS.filter(m => m.provider === 'openai').map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div><Label>Prompt do Sistema</Label>
                <Textarea value={form.system_prompt} onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))} rows={12} placeholder="Você é um assistente especializado em..." />
              </div>
            </TabsContent>
            <TabsContent value="database" className="space-y-4 mt-4">
              <div><Label>Nível de Acesso ao Banco</Label>
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
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingAgent?.id })} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAgent ? 'Salvar' : 'Criar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Control Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Controle de Acesso — {selectedAgent?.name}</DialogTitle></DialogHeader>
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
                          <p className="text-xs text-muted-foreground">{u.email}</p>
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

      {/* Skills Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Habilidades — {selectedAgent?.name}</DialogTitle></DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="space-y-2">
                {allSkills.filter(s => s.agent_id === selectedAgent.id).map(skill => (
                  <div key={skill.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{skill.name}</p>
                      {skill.description && <p className="text-xs text-muted-foreground">{skill.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSkill.mutate(skill.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {allSkills.filter(s => s.agent_id === selectedAgent.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma habilidade</p>
                )}
              </div>
              <div className="border-t pt-4 space-y-3">
                <Label className="font-semibold">Nova Habilidade</Label>
                <Input value={skillForm.name} onChange={e => setSkillForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da habilidade" />
                <Input value={skillForm.description} onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
                <Textarea value={skillForm.parameters} onChange={e => setSkillForm(p => ({ ...p, parameters: e.target.value }))} placeholder='Parâmetros JSON (opcional)' rows={3} />
                <Button size="sm" onClick={() => saveSkill.mutate()} disabled={!skillForm.name || saveSkill.isPending}>
                  <Plus className="mr-1 h-3 w-3" />Adicionar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modules Dialog */}
      <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Módulos Conectados — {selectedAgent?.name}</DialogTitle></DialogHeader>
          {selectedAgent && (
            <div className="space-y-2">
              {SYSTEM_MODULES.map(mod => (
                <label key={mod.key} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50">
                  <Checkbox checked={hasModule(selectedAgent.id, mod.key)}
                    onCheckedChange={() => toggleModule.mutate({ agentId: selectedAgent.id, moduleKey: mod.key })} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{mod.label}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
