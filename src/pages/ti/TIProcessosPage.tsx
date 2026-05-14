import { useState, useRef, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Trash2, Loader2, GitBranch, Play, ZoomIn, ZoomOut, Maximize2, 
  Zap, Brain, GitMerge, Clock, MousePointer, Save, 
  ArrowLeft, Layers, History, Activity, CheckCircle2, ArrowRight, FileText, XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Types
interface Process { id: string; name: string; description: string | null; status: string; version: number; steps: any; created_by: string; created_at: string; }
interface FlowNode { id: string; type: 'trigger' | 'action' | 'condition' | 'ai' | 'document' | 'end'; label: string; description: string; x: number; y: number; config: Record<string, any>; }
interface FlowConnection { id: string; from: string; to: string; label?: string; }

const NODE_TYPES = [
  { type: 'trigger' as const, label: 'Gatilho', icon: Zap, color: 'from-emerald-500 to-teal-600', items: ['Início Manual', 'Evento do Sistema', 'Webhook'] },
  { type: 'action' as const, label: 'Ação', icon: Play, color: 'from-blue-500 to-indigo-600', items: ['Executar Tarefa', 'Notificar', 'Atualizar Status'] },
  { type: 'condition' as const, label: 'Decisão', icon: GitMerge, color: 'from-amber-500 to-orange-600', items: ['If/Else', 'Switch Case'] },
  { type: 'ai' as const, label: 'IA Agente', icon: Brain, color: 'from-purple-500 to-fuchsia-600', items: ['Análise Preditiva', 'Classificar'] },
  { type: 'document' as const, label: 'Documento', icon: FileText, color: 'from-sky-500 to-blue-600', items: ['Gerar PDF', 'Assinatura'] },
  { type: 'end' as const, label: 'Fim', icon: XCircle, color: 'from-rose-500 to-red-600', items: ['Concluir', 'Falha'] },
];

export default function TIProcessosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState<Process | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [connections, setConnections] = useState<FlowConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const { data: processes = [], isLoading: loadingP } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Process[];
    },
  });

  const saveProcess = useMutation({
    mutationFn: async () => {
      if (!editorOpen) return;
      const { error } = await supabase.from('processes').update({
        steps: { nodes, connections } as any,
        version: editorOpen.version + 1
      }).eq('id', editorOpen.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast({ title: 'Fluxo salvo!', description: 'Versão atualizada.' });
    },
  });

  const openEditor = (p: Process) => {
    const steps = p.steps as any;
    setNodes(steps?.nodes || []);
    setConnections(steps?.connections || []);
    setEditorOpen(p);
  };

  const addNode = (type: FlowNode['type'], label: string) => {
    const newNode: FlowNode = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label,
      description: `Configuração para ${label}`,
      x: 200 - pan.x,
      y: 200 - pan.y,
      config: {}
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (editorOpen) {
    return (
      <DashboardLayout title={`Mapeamento: ${editorOpen.name}`}>
        <div className="flex h-[calc(100vh-120px)] -m-8 overflow-hidden bg-[#f0f2f5] select-none">
          
          {/* Library */}
          <aside className="w-80 border-r bg-white flex flex-col shadow-xl z-20">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Biblioteca</h3>
                <p className="text-[10px] text-slate-400 font-medium">Arraste para o canvas</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setEditorOpen(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {NODE_TYPES.map(group => (
                  <div key={group.type} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <group.icon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {group.items.map(item => (
                        <div 
                          key={item}
                          onClick={() => addNode(group.type, item)}
                          className="group p-3 rounded-xl border bg-slate-50 hover:bg-white hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110", group.color)}>
                            <group.icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-6 bg-slate-50 border-t space-y-3">
              <Button className="w-full h-11 rounded-xl shadow-lg shadow-primary/20 font-bold gap-2" onClick={() => saveProcess.mutate()} disabled={saveProcess.isPending}>
                {saveProcess.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Processo
              </Button>
            </div>
          </aside>

          {/* Canvas */}
          <main className="flex-1 relative overflow-hidden bg-[#f0f2f5]">
            {/* Grid */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{ 
                backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', 
                backgroundSize: '24px 24px',
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
              }} 
            />

            <div className="absolute top-6 left-6 flex items-center gap-2 z-10 bg-white/80 backdrop-blur p-1.5 rounded-2xl shadow-xl border">
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-[10px] font-bold w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
            </div>

            <div className="absolute inset-0" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0' }}>
              {nodes.map(node => {
                const nodeType = NODE_TYPES.find(t => t.type === node.type);
                const isSelected = selectedNodeId === node.id;
                return (
                  <div 
                    key={node.id}
                    className={cn(
                      "absolute w-56 p-4 rounded-2xl bg-white shadow-xl transition-all border-2",
                      isSelected ? "ring-4 ring-primary/20 border-primary scale-105 z-50" : "border-transparent"
                    )}
                    style={{ left: node.x, top: node.y }}
                    onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white", nodeType?.color)}>
                        {nodeType && <nodeType.icon className="h-4 w-4" />}
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase">{node.type}</Badge>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 mb-1">{node.label}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{node.description}</p>
                    <div className="mt-4 pt-3 border-t flex justify-end">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500" onClick={(e) => {
                        e.stopPropagation();
                        setNodes(nodes.filter(n => n.id !== node.id));
                        if (selectedNodeId === node.id) setSelectedNodeId(null);
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* Properties */}
          <aside className="w-80 border-l bg-white flex flex-col shadow-xl z-20">
            <div className="p-6 border-b bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Propriedades</h3>
            </div>

            <ScrollArea className="flex-1 p-6">
              {selectedNode ? (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Título</Label>
                    <Input 
                      value={selectedNode.label} 
                      onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n))}
                      className="h-10 rounded-xl bg-slate-50 border-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Descrição</Label>
                    <Textarea 
                      value={selectedNode.description} 
                      onChange={e => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, description: e.target.value } : n))}
                      className="rounded-xl bg-slate-50 border-none min-h-[80px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                  <MousePointer className="h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-500">Nenhum bloco selecionado</p>
                </div>
              )}
            </ScrollArea>
          </aside>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Processos & BPMN">
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Processos Ativos', val: processes.length, icon: GitBranch, color: 'bg-primary' },
            { label: 'Taxa de Sucesso', val: '98.4%', icon: CheckCircle2, color: 'bg-emerald-500' },
            { label: 'Tempo Médio', val: '1.2h', icon: Clock, color: 'bg-amber-500' },
            { label: 'Automação IA', val: '62%', icon: Brain, color: 'bg-purple-500' },
          ].map((stat, i) => (
            <Card key={i} className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden group">
              <CardContent className="p-8 flex items-center gap-6">
                <div className={cn("h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-2xl", stat.color)}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900">{stat.val}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Repositório de Fluxos</h2>
          <Button className="rounded-2xl h-12 px-8 font-bold gap-2">
            <Plus className="h-4 w-4" /> Novo Mapeamento
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingP ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-64 shimmer rounded-[2.5rem]" />)
          ) : processes.map(process => (
            <Card key={process.id} className="rounded-[2.5rem] border-none shadow-xl hover:shadow-2xl transition-all bg-white group">
              <div className="h-32 bg-slate-100 flex items-center justify-center relative">
                <GitBranch className="h-12 w-12 text-slate-200" />
                <Badge className="absolute top-4 right-4 bg-white text-primary border-none text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">v{process.version}</Badge>
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{process.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-6">{process.description || 'Sem descrição.'}</p>
                <div className="flex items-center justify-between">
                  <Badge className={cn("rounded-full", process.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')}>{process.status}</Badge>
                  <Button onClick={() => openEditor(process)} variant="ghost" className="rounded-xl font-bold text-xs gap-2">
                    Abrir <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
