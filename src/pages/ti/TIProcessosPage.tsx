import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Loader2, GitBranch, ArrowRight, AlertTriangle, ClipboardCheck, ChevronRight, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Process { id: string; name: string; description: string | null; status: string; version: number; steps: any[]; created_by: string; created_at: string; }
interface Risk { id: string; process_id: string | null; title: string; description: string | null; risk_level: string; category: string | null; status: string; mitigation: string | null; ai_analysis: any; created_by: string; created_at: string; }
interface Audit { id: string; process_id: string | null; title: string; checklist: any[]; evidence_urls: string[]; status: string; notes: string | null; auditor_id: string | null; report_url: string | null; created_at: string; }

const RISK_COLORS: Record<string, string> = { low: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-destructive/10 text-destructive' };

export default function TIProcessosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('processes');
  const [processDialog, setProcessDialog] = useState(false);
  const [riskDialog, setRiskDialog] = useState(false);
  const [auditDialog, setAuditDialog] = useState(false);
  const [processForm, setProcessForm] = useState({ name: '', description: '', steps: '' });
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

  const { data: risks = [], isLoading: loadingR } = useQuery({
    queryKey: ['risk-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('risk_assessments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Risk[];
    },
  });

  const { data: audits = [], isLoading: loadingA } = useQuery({
    queryKey: ['audit-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_items').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Audit[];
    },
  });

  const createProcess = useMutation({
    mutationFn: async () => {
      let steps: any[] = [];
      try { steps = processForm.steps ? JSON.parse(processForm.steps) : []; } catch { steps = processForm.steps.split('\n').filter(Boolean).map((s, i) => ({ order: i + 1, name: s.trim(), responsible: '' })); }
      const { error } = await supabase.from('processes').insert({
        name: processForm.name, description: processForm.description || null,
        steps: steps as any, created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['processes'] }); setProcessDialog(false); setProcessForm({ name: '', description: '', steps: '' }); toast({ title: 'Processo criado' }); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['risk-assessments'] }); setRiskDialog(false); setRiskForm({ title: '', description: '', risk_level: 'medium', category: '', mitigation: '', process_id: '' }); toast({ title: 'Risco registrado' }); },
  });

  const createAudit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('audit_items').insert({
        title: auditForm.title, notes: auditForm.notes || null,
        process_id: auditForm.process_id || null, auditor_id: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['audit-items'] }); setAuditDialog(false); setAuditForm({ title: '', notes: '', process_id: '' }); toast({ title: 'Auditoria criada' }); },
  });

  const deleteProcess = useMutation({ mutationFn: async (id: string) => { await supabase.from('processes').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['processes'] }) });
  const deleteRisk = useMutation({ mutationFn: async (id: string) => { await supabase.from('risk_assessments').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['risk-assessments'] }) });
  const deleteAudit = useMutation({ mutationFn: async (id: string) => { await supabase.from('audit_items').delete().eq('id', id); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit-items'] }) });

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

          {/* Processes */}
          <TabsContent value="processes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setProcessDialog(true)}><Plus className="mr-2 h-4 w-4" />Novo Processo</Button>
            </div>
            {loadingP ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : processes.length === 0 ? (
              <Card className="py-12 text-center"><GitBranch className="mx-auto mb-4 h-10 w-10 text-muted-foreground" /><p className="text-muted-foreground">Nenhum processo</p></Card>
            ) : (
              <div className="space-y-3">
                {processes.map(p => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GitBranch className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{p.name}</p>
                            {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{p.version}</Badge>
                          <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status === 'active' ? 'Ativo' : p.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProcess.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {Array.isArray(p.steps) && p.steps.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {(p.steps as any[]).map((step: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">{step.name || `Etapa ${i + 1}`}</Badge>
                              {i < (p.steps as any[]).length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Risks */}
          <TabsContent value="risks" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setRiskDialog(true)}><Plus className="mr-2 h-4 w-4" />Novo Risco</Button>
            </div>
            {/* Risk summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['low', 'medium', 'high', 'critical'].map(level => (
                <Card key={level}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{risks.filter(r => r.risk_level === level).length}</p>
                    <Badge className={cn('mt-1', RISK_COLORS[level])}>{level === 'low' ? 'Baixo' : level === 'medium' ? 'Médio' : level === 'high' ? 'Alto' : 'Crítico'}</Badge>
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
                        <Badge className={cn(RISK_COLORS[r.risk_level])}>{r.risk_level}</Badge>
                        {r.category && <Badge variant="outline">{r.category}</Badge>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRisk.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audits */}
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
            <div><Label>Etapas (uma por linha)</Label><Textarea value={processForm.steps} onChange={e => setProcessForm(p => ({ ...p, steps: e.target.value }))} rows={5} placeholder="Recebimento&#10;Análise&#10;Aprovação&#10;Execução" /></div>
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
                <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={riskForm.risk_level} onChange={e => setRiskForm(p => ({ ...p, risk_level: e.target.value }))}>
                  <option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option><option value="critical">Crítico</option>
                </select>
              </div>
              <div><Label>Categoria</Label><Input value={riskForm.category} onChange={e => setRiskForm(p => ({ ...p, category: e.target.value }))} placeholder="Ex: Operacional" /></div>
            </div>
            <div><Label>Mitigação</Label><Textarea value={riskForm.mitigation} onChange={e => setRiskForm(p => ({ ...p, mitigation: e.target.value }))} rows={2} /></div>
            {processes.length > 0 && (
              <div><Label>Processo relacionado</Label>
                <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={riskForm.process_id} onChange={e => setRiskForm(p => ({ ...p, process_id: e.target.value }))}>
                  <option value="">Nenhum</option>{processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
                <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={auditForm.process_id} onChange={e => setAuditForm(p => ({ ...p, process_id: e.target.value }))}>
                  <option value="">Nenhum</option>{processes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
