import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Trash2, Loader2, ArrowLeft, Calendar, LayoutGrid, Settings, 
  MoreHorizontal, MessageSquare, Paperclip, CheckSquare, Users, 
  Search, Filter, ChevronRight, Hash, Star, Clock, AlertCircle,
  GripVertical, UserPlus, Eye, Share2, Archive
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Board { id: string; name: string; description: string | null; color?: string; is_favorite?: boolean; }
interface Column { id: string; board_id: string; name: string; sort_order: number; color: string; }
interface Task { id: string; column_id: string; board_id: string; title: string; description: string | null; assigned_to: string | null; priority: string; due_date: string | null; sort_order: number; created_by: string; checklist?: any[]; comments_count?: number; attachments_count?: number; }

export default function TIWorkspacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [searchTask, setSearchTask] = useState("");
  const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Queries
  const { data: boards = [], isLoading: isLoadingBoards } = useQuery({
    queryKey: ['workspace-boards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kanban_boards').select('*').order('created_at');
      if (error) throw error;
      return data as Board[];
    },
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId) || boards[0];

  const { data: columns = [], isLoading: isLoadingCols } = useQuery({
    queryKey: ['workspace-columns', selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const { data, error } = await supabase.from('kanban_columns').select('*').eq('board_id', selectedBoard.id).order('sort_order');
      if (error) throw error;
      return data as Column[];
    },
    enabled: !!selectedBoard,
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['workspace-tasks', selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const { data, error } = await supabase.from('kanban_cards').select('*').eq('board_id', selectedBoard.id).order('sort_order');
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!selectedBoard,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-workspace'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, sector');
      if (error) throw error;
      return data;
    },
  });

  // Render Sidebar
  const renderSidebar = () => (
    <div className="w-64 border-r bg-muted/20 flex flex-col h-full overflow-hidden animate-slide-in-left">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Workspaces
          </h2>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => setIsBoardDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-1">
          {isLoadingBoards ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-10 shimmer rounded-xl mb-2" />)
          ) : (
            boards.map(board => (
              <button
                key={board.id}
                onClick={() => setSelectedBoardId(board.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  selectedBoard?.id === board.id 
                    ? "bg-white shadow-sm border border-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className={cn("h-2 w-2 rounded-full", board.color || "bg-primary")} />
                <span className="truncate flex-1 text-left">{board.name}</span>
                {board.is_favorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                <ChevronRight className={cn("h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity", selectedBoard?.id === board.id && "opacity-100")} />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-auto p-6 border-t bg-muted/10">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl">
          <Settings className="mr-2 h-4 w-4" /> Configurações
        </Button>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Workspace / Produtividade">
      <div className="flex h-[calc(100vh-120px)] -m-8 overflow-hidden">
        {renderSidebar()}
        
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Board Header */}
          <header className="h-20 border-b px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-lg", selectedBoard?.color || "bg-primary")}>
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{selectedBoard?.name || 'Selecione um Quadro'}</h1>
                <p className="text-xs text-muted-foreground">{selectedBoard?.description || 'Nenhuma descrição disponível'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar tarefas..." 
                  className="pl-9 h-10 w-64 bg-muted/30 border-none rounded-xl"
                  value={searchTask}
                  onChange={(e) => setSearchTask(e.target.value)}
                />
              </div>
              <Button variant="outline" className="rounded-xl border-primary/10 hover:bg-primary/5">
                <Filter className="mr-2 h-4 w-4" /> Filtros
              </Button>
              <div className="flex -space-x-2 mr-2">
                {profiles.slice(0, 3).map(p => (
                  <div key={p.id} className="h-8 w-8 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-sm">
                    {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full object-cover" /> : p.full_name?.charAt(0)}
                  </div>
                ))}
                <button className="h-8 w-8 rounded-full border-2 border-white bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button className="rounded-xl shadow-lg shadow-primary/20">
                <Share2 className="mr-2 h-4 w-4" /> Convidar
              </Button>
            </div>
          </header>

          {/* Kanban Area */}
          <ScrollArea orientation="horizontal" className="flex-1 bg-[#f9fafb]">
            <div className="p-8 flex items-start gap-6 h-full min-w-max">
              {isLoadingCols ? (
                Array(4).fill(0).map((_, i) => <div key={i} className="w-80 h-96 shimmer rounded-2xl" />)
              ) : (
                columns.map(col => (
                  <div key={col.id} className="w-80 shrink-0 flex flex-col h-full max-h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                        <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">{col.name}</h3>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold h-5 px-1.5 rounded text-[10px]">
                          {tasks.filter(t => t.column_id === col.id).length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/5 hover:text-primary">
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/5 hover:text-primary">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pb-6">
                        {tasks
                          .filter(t => t.column_id === col.id && t.title.toLowerCase().includes(searchTask.toLowerCase()))
                          .map(task => (
                            <WorkspaceCard key={task.id} task={task} profiles={profiles} onClick={() => { setSelectedTask(task); setIsTaskDialogOpen(true); }} />
                          ))}
                        
                        <Button variant="ghost" className="w-full h-10 border-2 border-dashed border-muted-foreground/10 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-xl text-xs font-bold transition-all group">
                          <Plus className="mr-2 h-3 w-3 group-hover:scale-110" /> ADICIONAR CARD
                        </Button>
                      </div>
                    </ScrollArea>
                  </div>
                ))
              )}
              
              <Button variant="ghost" className="w-80 shrink-0 h-14 bg-muted/30 border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all">
                <Plus className="h-4 w-4" /> Nova Lista
              </Button>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Task Details Modal */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white">
          {selectedTask && (
            <div className="flex flex-col h-[600px]">
              <header className="h-16 border-b px-6 flex items-center justify-between bg-[#fbfbfb]">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="rounded-xl border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {columns.find(c => c.id === selectedTask.column_id)?.name}
                  </Badge>
                  <span className="text-muted-foreground/30">•</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Clock className="h-3.5 w-3.5" /> Criado em {format(parseISO((selectedTask as any).created_at || new Date().toISOString()), 'dd MMM')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Share2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Archive className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </header>

              <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 p-8 space-y-6 overflow-y-auto">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{selectedTask.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedTask.description || 'Sem descrição.'}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" /> Checklist
                      </h3>
                      <span className="text-[10px] font-bold text-primary">60%</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group">
                        <Checkbox checked />
                        <span className="text-sm line-through text-muted-foreground flex-1">Definir arquitetura do projeto</span>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group">
                        <Checkbox />
                        <span className="text-sm text-foreground flex-1">Ajustar responsividade do Kanban</span>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Comentários
                    </h3>
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea placeholder="Escreva um comentário..." className="bg-muted/30 border-none rounded-xl text-sm resize-none" rows={2} />
                        <Button size="sm" className="rounded-lg h-8 px-4">Enviar</Button>
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="w-64 border-l bg-[#fbfbfb] p-6 space-y-8 overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsáveis</h4>
                    <div className="flex items-center gap-2">
                       <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-[10px]">
                        {profiles.find(p => p.id === selectedTask.assigned_to)?.full_name?.charAt(0) || "U"}
                      </div>
                      <span className="text-xs font-medium">{profiles.find(p => p.id === selectedTask.assigned_to)?.full_name || 'Não atribuído'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prioridade</h4>
                    <Badge className={cn(
                      "rounded-lg font-bold text-[10px] uppercase border px-2 py-0.5",
                      selectedTask.priority === 'urgent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      selectedTask.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-blue-50 text-blue-600 border-blue-100'
                    )}>
                      {selectedTask.priority}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Prazo</h4>
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {selectedTask.due_date ? format(parseISO(selectedTask.due_date), 'dd MMMM, yyyy', { locale: ptBR }) : 'Sem prazo'}
                    </div>
                  </div>

                  <div className="pt-8 space-y-2">
                    <Button variant="outline" className="w-full justify-start rounded-xl h-9 text-xs"><Paperclip className="mr-2 h-3.5 w-3.5" /> Anexar Arquivos</Button>
                    <Button variant="outline" className="w-full justify-start rounded-xl h-9 text-xs"><Clock className="mr-2 h-3.5 w-3.5" /> Histórico</Button>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function WorkspaceCard({ task, profiles, onClick }: { task: Task, profiles: any[], onClick: () => void }) {
  const assigned = profiles.find(p => p.id === task.assigned_to);
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  return (
    <Card 
      className="group cursor-pointer border-none shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white hover:ring-2 hover:ring-primary/20"
      onClick={onClick}
    >
      <div className={cn(
        "absolute top-0 left-0 bottom-0 w-1",
        task.priority === 'urgent' ? 'bg-rose-500' :
        task.priority === 'high' ? 'bg-orange-500' :
        'bg-blue-500'
      )} />
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">{task.title}</h4>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        {task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {task.due_date && (
            <Badge variant="outline" className={cn(
              "h-5 text-[9px] font-bold gap-1 px-1.5 rounded-lg border-transparent",
              isOverdue ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-muted text-muted-foreground"
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {format(parseISO(task.due_date), 'dd MMM')}
            </Badge>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <Badge variant="outline" className="h-5 text-[9px] font-bold gap-1 px-1.5 rounded-lg border-transparent bg-muted text-muted-foreground">
              <CheckSquare className="h-2.5 w-2.5" />
              {task.checklist.filter(i => i.done).length}/{task.checklist.length}
            </Badge>
          )}
          {task.comments_count ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold ml-1">
              <MessageSquare className="h-2.5 w-2.5" /> {task.comments_count}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-dashed">
          <Badge variant="outline" className={cn(
            "text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0 h-4 rounded",
            task.priority === 'urgent' ? 'text-rose-600 border-rose-200 bg-rose-50' :
            task.priority === 'high' ? 'text-orange-600 border-orange-200 bg-orange-50' :
            'text-blue-600 border-blue-200 bg-blue-50'
          )}>
            {task.priority}
          </Badge>
          
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-[9px] border border-primary/5">
              {assigned?.avatar_url ? (
                <img src={assigned.avatar_url} className="h-full w-full object-cover rounded-lg" />
              ) : (
                assigned?.full_name?.charAt(0) || "U"
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
