import { useState, useRef, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, GitBranch, AlertTriangle, ClipboardCheck, Play, Pause, Maximize2, Minimize2, ZoomIn, ZoomOut, ArrowRight, Zap, Brain, GitMerge, Clock, MousePointer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Process {
  id: string; name: string; description: string | null; status: string;
  version: number; steps: any[]; created_by: string; created_at: string;
}
interface Risk {
  id: string; process_id: string | null; title: string; description: string | null;
  risk_level: string; category: string | null; status: string; mitigation: string | null;
  ai_analysis: any; created_by: string; created_at: string;
}
interface Audit {
  id: string; process_id: string | null; title: string; checklist: any[];
  evidence_urls: string[]; status: string; notes: string | null;
  auditor_id: string | null; report_url: string | null; created_at: string;
}

interface FlowNode {
  id: string; type: 'trigger' | 'action' | 'condition' | 'ai';
  label: string; description: string; x: number; y: number;
  config: Record<string, any>;
}

interface FlowConnection {
  id: string; from: string; to: string; label?: string;
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const NODE_TYPES = [
  { type: 'trigger' as const, label: 'Gatilho', icon: Zap, color: 'bg-green-500', items: ['Início Manual', 'Evento do Sistema', 'Agendado', 'Ação de Usuário'] },
  { type: 'action' as const, label: 'Ação', icon: Play, color: 'bg-blue-500', items: ['Executar Tarefa', 'Atualizar Dados', 'Enviar Notificação', 'Criar Chamado'] },
  { type: 'condition' as const, label: 'Condição', icon: GitMerge, color: 'bg-amber-500', items: ['If/Else', 'Switch', 'Filtro'] },
  { type: 'ai' as const, label: 'IA', icon: Brain, color: 'bg-purple-500', items: ['Executar Agente', 'Análise de Risco', 'Classificação', 'Sugestão'] },
];

// Visual Flow Editor Component
function FlowEditor({ nodes, connections, onChange, onConnectionsChange }: {
  nodes: FlowNode[];
  connections: FlowConnection[];
  onChange: (nodes: FlowNode[]) => void;
  onConnectionsChange: (conns: FlowConnection[]) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addNodeMenu, setAddNodeMenu] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (dragging) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
      onChange(nodes.map(n => n.id === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDragging(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({ x: mouseX - node.x, y: mouseY - node.y });
    setDragging(nodeId);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (connecting && connecting !== nodeId) {
      onConnectionsChange([...connections, {
        id: crypto.randomUUID(),
        from: connecting,
        to: nodeId,
      }]);
      setConnecting(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAddNodeMenu({
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    });
  };

  const addNode = (type: FlowNode['type'], label: string) => {
    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type, label,
      description: '',
      x: addNodeMenu?.x || 200,
      y: addNodeMenu?.y || 200,
      config: {},
    };
    onChange([...nodes, newNode]);
    setAddNodeMenu(null);
  };

  const deleteNode = (id: string) => {
    onChange(nodes.filter(n => n.id !== id));
    onConnectionsChange(connections.filter(c => c.from !== id && c.to !== id));
  };

  const getNodeColor = (type: FlowNode['type']) => {
    const t = NODE_TYPES.find(n => n.type === type);
    return t?.color || 'bg-muted';
  };

  const getNodeIcon = (type: FlowNode['type']) => {
    const t = NODE_TYPES.find(n => n.type === type);
    if (!t) return Zap;
    return t.icon;
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background'
    : 'relative h-[500px] rounded-xl border overflow-hidden';

  return (
    <div className={containerClass}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        {NODE_TYPES.map(nt => (
          <Button key={nt.type} variant="outline" size="sm" className="gap-1.5 bg-card/90 backdrop-blur-sm shadow-sm"
            onClick={() => {
              const newNode: FlowNode = {
                id: crypto.randomUUID(), type: nt.type,
                label: nt.items[0], description: '', x: 100 + nodes.length * 50, y: 100 + nodes.length * 30, config: {},
              };
              onChange([...nodes, newNode]);
            }}>
            <nt.icon className="h-3.5 w-3.5" />{nt.label}
          </Button>
        ))}
      </div>

      {/* Zoom & Fullscreen Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs font-mono bg-card/90 backdrop-blur-sm rounded border">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-card/90 backdrop-blur-sm" onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="canvas-bg absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ background: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onContextMenu={handleContextMenu}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {/* SVG Connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '5000px', height: '5000px', overflow: 'visible' }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" opacity="0.6" />
              </marker>
            </defs>
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              const x1 = fromNode.x + 120;
              const y1 = fromNode.y + 30;
              const x2 = toNode.x;
              const y2 = toNode.y + 30;
              const mx = (x1 + x2) / 2;
              return (
                <g key={conn.id}>
                  <path
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.4"
                    markerEnd="url(#arrowhead)"
                    className="transition-all"
                  />
                  {/* Animated dot */}
                  <circle r="3" fill="hsl(var(--primary))" opacity="0.7">
                    <animateMotion dur="3s" repeatCount="indefinite" path={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} />
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const Icon = getNodeIcon(node.type);
            return (
              <div
                key={node.id}
                className={cn(
                  'absolute select-none rounded-xl border-2 bg-card shadow-lg transition-shadow hover:shadow-xl',
                  connecting === node.id ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                  dragging === node.id ? 'shadow-2xl scale-105' : ''
                )}
                style={{ left: node.x, top: node.y, width: 240 }}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                onClick={e => handleNodeClick(e, node.id)}
              >
                <div className="flex items-center gap-2 p-3 border-b">
                  <div className={cn('flex items-center justify-center rounded-lg p-1.5', getNodeColor(node.type))}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{node.label}</span>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id); }}>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); deleteNode(node.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-muted-foreground">{node.description || 'Clique direito para configurar'}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {NODE_TYPES.find(t => t.type === node.type)?.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Context Menu for adding nodes */}
      {addNodeMenu && (
        <div className="absolute z-30 bg-card border rounded-xl shadow-xl p-2 w-56"
          style={{ left: addNodeMenu.x * zoom + pan.x, top: addNodeMenu.y * zoom + pan.y }}>
          {NODE_TYPES.map(nt => (
            <div key={nt.type}>
              <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-1">{nt.label}</p>
              {nt.items.map(item => (
                <button key={item} className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2"
                  onClick={() => addNode(nt.type, item)}>
                  <nt.icon className="h-3.5 w-3.5" />{item}
                </button>
              ))}
            </div>
          ))}
          <button className="w-full text-left text-xs px-2 py-1 text-muted-foreground mt-1" onClick={() => setAddNodeMenu(null)}>Fechar</button>
        </div>
      )}

      {/* Instructions overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center text-muted-foreground">
            <MousePointer className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Adicione nós usando os botões acima</p>
            <p className="text-xs mt-1">Arraste para posicionar • Clique ➡ para conectar • Clique direito para menu</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TIProcessosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('processes');
  const [processDialog, setProcessDialog] = useState(false);
  const [riskDialog, setRiskDialog] = useState(false);
  const [auditDialog, setAuditDialog] = useState(false);
  const [editorOpen, setEditorOpen] = useState<Process | null>(null);
  const [editorNodes, setEditorNodes] = useState<FlowNode[]>([]);
  const [editorConnections, setEditorConnections] = useState<FlowConnection[]>([]);
  const [processForm, setProcessForm] = useState({ name: '', description: '' });
  const [riskForm, setRiskForm] = useState({ title: '', description: '', risk_level: 'medium', category: '', mitigation: '', process_id: '' });
  const [auditForm, setAuditForm] = useState({ title: '', notes: '', process_id: '' });

  const { data: processes = [], isLoading: loadingP } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('processes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Process[];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risk-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('risk_assessments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Risk[];
    },
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audit-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Audit[];
    },
  });

  const createProcess = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('processes').insert({
        name: processForm.name, description: processForm.description || null,
        steps: [] as any, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      setProcessDialog(false); setProcessForm({ name: '', description: '' });
      toast({ title: 'Processo criado' });
    },
  });

  const saveProcessFlow = useMutation({
    mutationFn: async () => {
      if (!editorOpen) return;
      const steps = { nodes: editorNodes, connections: editorConnections };
      const { error } = await supabase.from('processes').update({ steps: steps as any }).eq('id', editorOpen.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast({ title: 'Fluxo salvo' });
    },
  });

  const toggleProcessStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('processes').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }),
  });

  const createRisk = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('risk_assessments').insert({
        title: riskForm.title, description: riskForm.description || null,
        risk_level: riskForm.risk_level, category: riskForm.category || null,
        mitigation: riskForm.mitigation || null,
        process_id: riskForm.process_id || null, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-assessments'] });
      setRiskDialog(false); setRiskForm({ title: '', description: '', risk_level: 'medium', category: '', mitigation: '', process_id: '' });
      toast({ title: 'Risco registrado' });
    },
  });

  const createAudit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('audit_items').insert({
        title: auditForm.title, notes: auditForm.notes || null,
        process_id: auditForm.process_id || null, auditor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-items'] });
      setAuditDialog(false); setAuditForm({ title: '', notes: '', process_id: '' });
      toast({ title: 'Auditoria criada' });
    },
  });

  const deleteProcess = useMutation({ mutationFn: async (id: string) => { await supabase.from('processes').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }) });
  const deleteRisk = useMutation({ mutationFn: async (id: string) => { await supabase.from('risk_assessments').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['risk-assessments'] }) });
  const deleteAudit = useMutation({ mutationFn: async (id: string) => { await supabase.from('audit_items').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit-items'] }) });

  const openEditor = (process: Process) => {
    const steps = process.steps as any;
    if (steps?.nodes) {
      setEditorNodes(steps.nodes);
      setEditorConnections(steps.connections || []);
    } else {
      // Convert legacy steps to nodes
      const legacy = Array.isArray(steps) ? steps : [];
      setEditorNodes(legacy.map((s: any, i: number) => ({
        id: crypto.randomUUID(),
        type: 'action' as const,
        label: s.name || `Etapa ${i + 1}`,
        description: s.responsible || '',
        x: 100 + i * 280,
        y: 150,
        config: {},
      })));
      setEditorConnections([]);
    }
    setEditorOpen(process);
  };

  // Editor view
  if (editorOpen) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditorOpen(null)}>← Voltar</Button>
              <div>
                <h2 className="text-xl font-bold">{editorOpen.name}</h2>
                <p className="text-sm text-muted-foreground">{editorNodes.length} nós • {editorConnections.length} conexões</p>
              </div>
            </div>
            <Button onClick={() => saveProcessFlow.mutate()} disabled={saveProcessFlow.isPending}>
              {saveProcessFlow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Fluxo
            </Button>
          </div>
          <FlowEditor
            nodes={editorNodes}
            connections={editorConnections}
            onChange={setEditorNodes}
            onConnectionsChange={setEditorConnections}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Processos, Riscos & Auditoria</h2>
          <p className="text-muted-foreground">Gestão completa de processos operacionais</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="processes"><GitBranch className="mr-1 h-4 w-4" />Processos</TabsTrigger>
            <TabsTrigger value="risks"><AlertTriangle className="mr-1 h-4 w-4" />Riscos</TabsTrigger>
            <TabsTrigger value="audits"><ClipboardCheck className="mr-1 h-4 w-4" />Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="processes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setProcessDialog(true)}><Plus className="mr-2 h-4 w-4" />Novo Processo</Button>
            </div>
            {loadingP ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : processes.length === 0 ? (
              <Card className="py-12 text-center"><GitBranch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Nenhum processo</p></Card>
            ) : (
              <div className="space-y-3">
                {processes.map(p => {
                  const steps = p.steps as any;
                  const nodeCount = steps?.nodes?.length || (Array.isArray(steps) ? steps.length : 0);
                  return (
                    <Card key={p.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => openEditor(p)}>
                            <div className="rounded-lg bg-primary/10 p-2">
                              <GitBranch className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                              <p className="text-xs text-muted-foreground mt-0.5">{nodeCount} etapas • v{p.version}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditor(p)}>
                              <Play className="h-3 w-3" />Editor
                            </Button>
                            <Switch checked={p.status === 'active'}
                              onCheckedChange={v => toggleProcessStatus.mutate({ id: p.id, status: v ? 'active' : 'inactive' })} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProcess.mutate(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setRiskDialog(true)}><Plus className="mr-2 h-4 w-4" />Novo Risco</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['low', 'medium', 'high', 'critical'].map(level => (
                <Card key={level} className="border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{risks.filter(r => r.risk_level === level).length}</p>
                    <Badge className={cn('mt-1 border', RISK_COLORS[level])}>{level === 'low' ? 'Baixo' : level === 'medium' ? 'Médio' : level === 'high' ? 'Alto' : 'Crítico'}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            {risks.length === 0 ? (
              <Card className="py-8 text-center"><AlertTriangle className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Nenhum risco registrado</p></Card>
            ) : (
              <div className="space-y-3">
                {risks.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-medium">{r.title}</p>
                          {r.description && <p className="text-sm text-muted-foreground line-clamp-1">{r.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('border', RISK_COLORS[r.risk_level])}>{r.risk_level}</Badge>
                        {r.category && <Badge variant="outline">{r.category}</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRisk.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audits" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setAuditDialog(true)}><Plus className="mr-2 h-4 w-4" />Nova Auditoria</Button>
            </div>
            {audits.length === 0 ? (
              <Card className="py-8 text-center"><ClipboardCheck className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Nenhuma auditoria</p></Card>
            ) : (
              <div className="space-y-3">
                {audits.map(a => (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          {a.notes && <p className="text-sm text-muted-foreground line-clamp-1">{a.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>{a.status === 'completed' ? 'Concluída' : a.status === 'in_progress' ? 'Em andamento' : 'Pendente'}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAudit.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Process Dialog */}
      <Dialog open={processDialog} onOpenChange={setProcessDialog}>
        <DialogContent><DialogHeader><DialogTitle>Novo Processo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={processForm.name} onChange={e => setProcessForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={processForm.description} onChange={e => setProcessForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <p className="text-xs text-muted-foreground">Após criar, use o Editor Visual para desenhar o fluxo do processo.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(false)}>Cancelar</Button>
            <Button onClick={() => createProcess.mutate()} disabled={!processForm.name}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Dialog */}
      <Dialog open={riskDialog} onOpenChange={setRiskDialog}>
        <DialogContent><DialogHeader><DialogTitle>Registrar Risco</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={riskForm.title} onChange={e => setRiskForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={riskForm.description} onChange={e => setRiskForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nível</Label>
                <Select value={riskForm.risk_level} onValueChange={v => setRiskForm(p => ({ ...p, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem><SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem><SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Categoria</Label><Input value={riskForm.category} onChange={e => setRiskForm(p => ({ ...p, category: e.target.value }))} placeholder="Ex: Operacional" /></div>
            </div>
            <div><Label>Mitigação</Label><Textarea value={riskForm.mitigation} onChange={e => setRiskForm(p => ({ ...p, mitigation: e.target.value }))} rows={2} /></div>
            {processes.length > 0 && (
              <div><Label>Processo relacionado</Label>
                <Select value={riskForm.process_id} onValueChange={v => setRiskForm(p => ({ ...p, process_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskDialog(false)}>Cancelar</Button>
            <Button onClick={() => createRisk.mutate()} disabled={!riskForm.title}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Dialog */}
      <Dialog open={auditDialog} onOpenChange={setAuditDialog}>
        <DialogContent><DialogHeader><DialogTitle>Nova Auditoria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={auditForm.title} onChange={e => setAuditForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={auditForm.notes} onChange={e => setAuditForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
            {processes.length > 0 && (
              <div><Label>Processo</Label>
                <Select value={auditForm.process_id} onValueChange={v => setAuditForm(p => ({ ...p, process_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialog(false)}>Cancelar</Button>
            <Button onClick={() => createAudit.mutate()} disabled={!auditForm.title}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
