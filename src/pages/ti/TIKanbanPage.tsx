import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, ArrowLeft, Calendar, LayoutGrid, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSectors } from '@/hooks/useSectors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Board { id: string; name: string; description: string | null; allowed_sectors: string[]; allowed_users: string[]; is_active: boolean; created_by: string; }
interface Column { id: string; board_id: string; name: string; sort_order: number; color: string; }
interface KCard { id: string; column_id: string; board_id: string; title: string; description: string | null; assigned_to: string | null; priority: string; due_date: string | null; sort_order: number; created_by: string; }

const PRIORITIES = [
  { value: 'low', label: 'Baixa', className: 'text-muted-foreground' },
  { value: 'medium', label: 'Média', className: 'text-yellow-600' },
  { value: 'high', label: 'Alta', className: 'text-orange-600' },
  { value: 'urgent', label: 'Urgente', className: 'text-destructive' },
];

export default function TIKanbanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sectors } = useSectors();
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [boardDialog, setBoardDialog] = useState(false);
  const [cardDialog, setCardDialog] = useState(false);
  const [colDialog, setColDialog] = useState(false);
  const [boardForm, setBoardForm] = useState({ name: '', description: '', allowed_sectors: [] as string[], allowed_users: [] as string[] });
  const [cardForm, setCardForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', column_id: '' });
  const [colForm, setColForm] = useState({ name: '', color: '#6366f1' });

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['kanban-boards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kanban_boards').select('*').order('created_at');
      if (error) throw error;
      return data as unknown as Board[];
    },
  });

  const { data: columns = [] } = useQuery({
    queryKey: ['kanban-columns', selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const { data, error } = await supabase.from('kanban_columns').select('*').eq('board_id', selectedBoard.id).order('sort_order');
      if (error) throw error;
      return data as unknown as Column[];
    },
    enabled: !!selectedBoard,
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['kanban-cards', selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const { data, error } = await supabase.from('kanban_cards').select('*').eq('board_id', selectedBoard.id).order('sort_order');
      if (error) throw error;
      return data as unknown as KCard[];
    },
    enabled: !!selectedBoard,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['profiles-kanban'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, sector');
      if (error) throw error;
      return data;
    },
  });

  const createBoard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('kanban_boards').insert({
        name: boardForm.name, description: boardForm.description || null,
        allowed_sectors: boardForm.allowed_sectors, allowed_users: boardForm.allowed_users,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      setBoardDialog(false); setBoardForm({ name: '', description: '', allowed_sectors: [], allowed_users: [] });
      toast({ title: 'Quadro criado' });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_boards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-boards'] });
      setSelectedBoard(null);
      toast({ title: 'Quadro removido' });
    },
  });

  const createCol = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('kanban_columns').insert({
        board_id: selectedBoard!.id, name: colForm.name, color: colForm.color,
        sort_order: columns.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-columns'] });
      setColDialog(false); setColForm({ name: '', color: '#6366f1' });
    },
  });

  const createCard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('kanban_cards').insert({
        board_id: selectedBoard!.id, column_id: cardForm.column_id, title: cardForm.title,
        description: cardForm.description || null, priority: cardForm.priority,
        due_date: cardForm.due_date || null, assigned_to: cardForm.assigned_to || null,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-cards'] });
      setCardDialog(false); setCardForm({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '', column_id: '' });
      toast({ title: 'Card criado' });
    },
  });

  const moveCard = useMutation({
    mutationFn: async ({ cardId, colId }: { cardId: string; colId: string }) => {
      const { error } = await supabase.from('kanban_cards').update({ column_id: colId } as any).eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban-cards'] }),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban-cards'] }),
  });

  const getUserName = (id: string | null) => users.find(u => u.id === id)?.full_name || '—';

  // Board listing view
  if (!selectedBoard) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quadros Kanban</h2>
              <p className="text-muted-foreground">Múltiplos quadros com controle de acesso por setor</p>
            </div>
            <Button onClick={() => setBoardDialog(true)}><Plus className="mr-2 h-4 w-4" />Novo Quadro</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : boards.length === 0 ? (
            <Card className="py-12 text-center">
              <LayoutGrid className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum quadro criado</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {boards.map(board => (
                <Card key={board.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBoard(board)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{board.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteBoard.mutate(board.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {board.description && <p className="text-sm text-muted-foreground">{board.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {board.allowed_sectors?.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                      {(!board.allowed_sectors || board.allowed_sectors.length === 0) && <Badge variant="secondary" className="text-xs">Apenas TI</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={boardDialog} onOpenChange={setBoardDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Quadro Kanban</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={boardForm.name} onChange={e => setBoardForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Descrição</Label><Textarea value={boardForm.description} onChange={e => setBoardForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div>
                <Label>Setores com acesso</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 rounded-lg border p-3">
                  {sectors.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={boardForm.allowed_sectors.includes(s.name)}
                        onCheckedChange={c => setBoardForm(p => ({ ...p, allowed_sectors: c ? [...p.allowed_sectors, s.name] : p.allowed_sectors.filter(x => x !== s.name) }))} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBoardDialog(false)}>Cancelar</Button>
              <Button onClick={() => createBoard.mutate()} disabled={!boardForm.name}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  // Board detail view
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedBoard(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Voltar
            </Button>
            <h2 className="text-xl font-bold">{selectedBoard.name}</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setColDialog(true)}><Plus className="mr-1 h-3 w-3" />Coluna</Button>
            <Button size="sm" onClick={() => { setCardForm(p => ({ ...p, column_id: columns[0]?.id || '' })); setCardDialog(true); }}>
              <Plus className="mr-1 h-3 w-3" />Card
            </Button>
          </div>
        </div>

        {columns.length === 0 ? (
          <Card className="py-12 text-center">
            <p className="text-muted-foreground">Crie colunas para começar</p>
            <Button className="mt-4" onClick={() => setColDialog(true)}><Plus className="mr-2 h-4 w-4" />Criar Coluna</Button>
          </Card>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))` }}>
            {columns.map(col => {
              const colCards = cards.filter(c => c.column_id === col.id);
              return (
                <div key={col.id} className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted">
                    <h3 className="font-semibold text-sm">{col.name}</h3>
                    <Badge variant="secondary">{colCards.length}</Badge>
                  </div>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-2 pr-2">
                      {colCards.map(card => {
                        const pri = PRIORITIES.find(p => p.value === card.priority);
                        return (
                          <Card key={card.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm line-clamp-2">{card.title}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => deleteCard.mutate(card.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              {card.description && <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline" className={cn('text-[10px]', pri?.className)}>{pri?.label}</Badge>
                                {card.due_date && <Badge variant="outline" className="text-[10px]"><Calendar className="mr-1 h-2.5 w-2.5" />{format(new Date(card.due_date), 'dd/MM', { locale: ptBR })}</Badge>}
                                {card.assigned_to && <Badge variant="secondary" className="text-[10px]">{getUserName(card.assigned_to)}</Badge>}
                              </div>
                              <div className="flex gap-1 pt-1">
                                {columns.filter(c => c.id !== col.id).map(c => (
                                  <Button key={c.id} variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                                    onClick={() => moveCard.mutate({ cardId: card.id, colId: c.id })}>
                                    → {c.name}
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

      {/* Column Dialog */}
      <Dialog open={colDialog} onOpenChange={setColDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Coluna</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={colForm.name} onChange={e => setColForm(p => ({ ...p, name: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialog(false)}>Cancelar</Button>
            <Button onClick={() => createCol.mutate()} disabled={!colForm.name}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Dialog */}
      <Dialog open={cardDialog} onOpenChange={setCardDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Card</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={cardForm.title} onChange={e => setCardForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={cardForm.description} onChange={e => setCardForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Coluna</Label>
                <Select value={cardForm.column_id} onValueChange={v => setCardForm(p => ({ ...p, column_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prioridade</Label>
                <Select value={cardForm.priority} onValueChange={v => setCardForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prazo</Label><Input type="date" value={cardForm.due_date} onChange={e => setCardForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>Responsável</Label>
                <Select value={cardForm.assigned_to} onValueChange={v => setCardForm(p => ({ ...p, assigned_to: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardDialog(false)}>Cancelar</Button>
            <Button onClick={() => createCard.mutate()} disabled={!cardForm.title || !cardForm.column_id}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
