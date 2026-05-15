import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Users, MessageSquare, Tag, UserPlus, UserMinus,
  Loader2, MoreVertical, Search, ChevronRight, Hash, ShieldCheck,
  Settings, Bell, Info, ArrowLeft, MoreHorizontal, LayoutGrid, List
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGroups, useGroupTags, useTagMembers, useGroupUnreadCounts, type Group, type GroupTag } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GroupChat } from '@/components/groups/GroupChat';

export default function TIGruposPage() {
  const { role } = useAuth();
  const { groups, isLoading: loadingGroups, createGroup, deleteGroup, isCreating } = useGroups();
  const { data: unread = {} } = useGroupUnreadCounts(groups.map(g => g.id));

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Colaboração & Grupos">
      <div className="flex h-[calc(100vh-140px)] -m-8 bg-white overflow-hidden shadow-2xl border-t">
        
        {/* Workspace Sidebar (Slack Style) */}
        <aside className={cn(
          "w-80 flex flex-col border-r bg-[#1e222d] text-slate-300 transition-all duration-300",
          selectedGroupId && "hidden md:flex"
        )}>
          {/* Workspace Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">E</div>
              <div>
                <h2 className="text-sm font-bold text-white leading-none mb-1">Esquadromil</h2>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace Ativo</p>
                </div>
              </div>
            </div>
            <Settings className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors" />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-8">
              {/* Actions Section */}
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-all group">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <span>Visão Geral</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-all group" onClick={() => setShowCreateGroup(true)}>
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>Criar Novo Canal</span>
                </button>
              </div>

              {/* Channels Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Canais da Unidade</h3>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] text-slate-400">{groups.length}</Badge>
                </div>
                
                <div className="space-y-0.5">
                  {loadingGroups ? (
                    <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-600" /></div>
                  ) : filteredGroups.map(group => {
                    const unreadCount = unread[group.id] || 0;
                    const isActive = selectedGroupId === group.id;
                    return (
                      <button 
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all relative group",
                          isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-white/5 text-slate-400"
                        )}
                      >
                        <Hash className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-600 group-hover:text-slate-400")} />
                        <span className="flex-1 text-left truncate font-medium">{group.name}</span>
                        {unreadCount > 0 && (
                          <span className="absolute -right-1 top-1/2 -translate-y-1/2 h-5 min-w-[20px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#1e222d]">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members Section (Static Placeholder) */}
              <div className="space-y-2">
                <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Mensagens Diretas</h3>
                <div className="space-y-0.5 opacity-50">
                  <div className="flex items-center gap-3 px-4 py-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Suporte TI</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-slate-600" />
                    <span>Agente de Portaria</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 bg-black/20 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">AD</div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-[#1e222d] rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">Administrador</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Super Admin</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </aside>

        {/* Main Content / Chat Area */}
        <main className="flex-1 flex flex-col bg-[#f8fafc] relative">
          {selectedGroup ? (
            <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
              {/* Header do Chat */}
              <header className="h-16 border-b bg-white/80 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedGroupId(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Hash className="h-4 w-4 text-primary" />
                      <h2 className="font-bold text-slate-900">{selectedGroup.name}</h2>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest truncate max-w-md">
                      {selectedGroup.description || "Canal de comunicação operacional"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex items-center -space-x-2 mr-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                    ))}
                    <div className="h-7 w-7 rounded-full border-2 border-white bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">+12</div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-400 hover:text-primary"><Search className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-400 hover:text-primary"><Bell className="h-4 w-4" /></Button>
                  <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-400 hover:text-primary"><Info className="h-4 w-4" /></Button>
                </div>
              </header>

              <div className="flex-1 overflow-hidden">
                <GroupChat 
                  group={selectedGroup} 
                  onBack={() => setSelectedGroupId(null)} 
                  isAdmin={role === 'ti'} 
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div className="relative mb-8">
                <div className="h-24 w-24 rounded-[30%] bg-primary/5 flex items-center justify-center text-primary">
                  <MessageSquare className="h-12 w-12 opacity-50" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white shadow-xl flex items-center justify-center text-emerald-500 border">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Hub de Colaboração</h2>
              <p className="text-slate-500 max-w-sm leading-relaxed mb-10 text-sm">
                Selecione um canal à esquerda para iniciar uma conversa em tempo real com sua equipe.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  <Hash className="h-6 w-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-sm mb-1">Canais Públicos</h3>
                  <p className="text-xs text-slate-400">Comunicação aberta por setor e unidade.</p>
                </div>
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  <Users className="h-6 w-6 text-indigo-500 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-sm mb-1">Grupos Privados</h3>
                  <p className="text-xs text-slate-400">Discussões restritas a membros convidados.</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Canal de Comunicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Nome do Canal</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="ex: infraestrutura-ti" 
                  className="pl-9 h-12 rounded-xl bg-slate-50 border-none ring-2 ring-transparent focus:ring-primary/20 transition-all"
                  value={groupForm.name}
                  onChange={e => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Descrição (Opcional)</Label>
              <Input 
                placeholder="Sobre o que é este canal?" 
                className="h-12 rounded-xl bg-slate-50 border-none ring-2 ring-transparent focus:ring-primary/20 transition-all"
                value={groupForm.description}
                onChange={e => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCreateGroup(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button 
              className="rounded-xl px-8 shadow-lg shadow-primary/20 font-bold h-11"
              disabled={!groupForm.name || isCreating}
              onClick={async () => {
                await createGroup(groupForm);
                setGroupForm({ name: '', description: '' });
                setShowCreateGroup(false);
              }}
            >
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Excluir este grupo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. Todas as mensagens, anexos, tags e histórico de conversas serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl h-12">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl h-12 bg-destructive text-white hover:bg-destructive/90" onClick={async () => { if (deleteConfirm) { await deleteGroup(deleteConfirm); setDeleteConfirm(null); } }}>
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// Sub-componentes de Diálogo (simplificados para o novo design)
function TagManageDialog({ groupId, open, onOpenChange, onManageMembers }: {
  groupId: string; open: boolean; onOpenChange: (o: boolean) => void;
  onManageMembers: (tag: GroupTag) => void;
}) {
  const { tags, createTag, deleteTag } = useGroupTags(groupId);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const colors = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader><DialogTitle className="font-bold">Gerenciar Tags de Menção</DialogTitle></DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="space-y-3 p-4 bg-muted/20 rounded-2xl border">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nova Tag (@nome)</Label>
            <div className="flex gap-2">
              <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="vendas, ti, urgente..." className="flex-1 h-10 rounded-xl" />
              <Button size="sm" className="rounded-xl h-10 shadow-institutional" disabled={!newTagName} onClick={async () => { await createTag({ name: newTagName.toLowerCase().trim(), color: newTagColor }); setNewTagName(''); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {colors.map(c => (
                <button key={c} className={cn('h-6 w-6 rounded-full border-2 transition-all hover:scale-110', newTagColor === c ? 'border-foreground shadow-md' : 'border-transparent')}
                  style={{ backgroundColor: c }} onClick={() => setNewTagColor(c)} />
              ))}
            </div>
          </div>
          
          <ScrollArea className="max-h-64 pr-3">
            <div className="space-y-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm group">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full shadow-inner" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-bold">@{tag.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onManageMembers(tag)}>
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => deleteTag(tag.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {tags.length === 0 && (
                <div className="text-center py-6">
                  <Tag className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-xs text-muted-foreground">Crie tags para automatizar chamados.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberManageDialog({ tag, open, onOpenChange }: {
  tag: GroupTag | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { members, addMember, removeMember } = useTagMembers(tag?.id || null);
  const [selectedUser, setSelectedUser] = useState('');
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-profiles-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, sector');
      if (error) throw error;
      return data;
    },
  });

  const memberIds = new Set(members.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader><DialogTitle className="font-bold">Membros da Tag @{tag?.name}</DialogTitle></DialogHeader>
        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adicionar Colaborador</Label>
            <div className="flex gap-2">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="flex-1 h-10 rounded-xl"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id} className="rounded-lg">{u.full_name} ({u.sector || 'S/S'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={!selectedUser} className="rounded-xl h-10 shadow-institutional" onClick={async () => { await addMember(selectedUser); setSelectedUser(''); }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="max-h-64 pr-3">
            <div className="space-y-2">
              {members.map(m => {
                const userInfo = allUsers.find(u => u.id === m.user_id);
                return (
                  <div key={m.id} className="flex items-center justify-between rounded-xl border bg-white p-3 shadow-sm group">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{userInfo?.full_name || 'Usuário'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{userInfo?.email}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeMember(m.user_id)}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">Nenhum membro nesta tag.</p>}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
