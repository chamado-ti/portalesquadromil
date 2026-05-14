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
  Loader2, MoreVertical, Search, ChevronRight, Hash, ShieldCheck
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
  const [showManageTags, setShowManageTags] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [selectedTagForMembers, setSelectedTagForMembers] = useState<GroupTag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (g.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border shadow-sm overflow-hidden animate-fade-in">
        
        {/* Sidebar de Grupos (WhatsApp Style) */}
        <div className={cn(
          "w-full md:w-80 flex flex-col border-r bg-muted/5",
          selectedGroupId && "hidden md:flex"
        )}>
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Conversas</h2>
              <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 bg-primary/5 text-primary" onClick={() => setShowCreateGroup(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar grupos..." 
                className="pl-9 h-10 bg-white border-none rounded-2xl shadow-sm text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
            {loadingGroups ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Carregando...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-10 px-4">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum grupo encontrado</p>
              </div>
            ) : (
              filteredGroups.map(group => {
                const count = unread[group.id] || 0;
                const isActive = selectedGroupId === group.id;
                return (
                  <div 
                    key={group.id} 
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:bg-primary/5 group relative",
                      isActive ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-lg shadow-sm",
                      isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    )}>
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm truncate pr-2">{group.name}</h3>
                        {count > 0 && (
                          <span className={cn(
                            "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                            isActive ? "bg-white text-primary" : "bg-primary text-white"
                          )}>
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-[10px] truncate mt-0.5",
                        isActive ? "text-white/70" : "text-muted-foreground"
                      )}>
                        {group.description || "Inicie uma conversa..."}
                      </p>
                    </div>
                    {!isActive && (
                      <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Janela de Chat Ativa */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {selectedGroup ? (
            <>
              <GroupChat
                group={selectedGroup}
                onBack={() => setSelectedGroupId(null)}
                isAdmin={role === 'ti'}
                onManageTags={() => setShowManageTags(true)}
              />
              <TagManageDialog
                groupId={selectedGroup.id}
                open={showManageTags}
                onOpenChange={setShowManageTags}
                onManageMembers={(tag) => { setSelectedTagForMembers(tag); setShowManageMembers(true); }}
              />
              <MemberManageDialog
                tag={selectedTagForMembers}
                open={showManageMembers}
                onOpenChange={setShowManageMembers}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 p-8 text-center">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border">
                <MessageSquare className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Portal Grupos</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Selecione uma conversa ao lado para visualizar as mensagens e interagir com a equipe em tempo real.
              </p>
              <div className="mt-8 flex gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-white px-4 py-2 rounded-full border shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Criptografia End-to-End
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-white px-4 py-2 rounded-full border shadow-sm">
                  <Hash className="h-3.5 w-3.5 text-blue-500" /> Menções Inteligentes
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modais de Gerenciamento */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle className="font-bold">Novo Grupo de Conversa</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome do Grupo</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Suporte TI, Operacional..." className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição (Opcional)</Label>
              <Input value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} placeholder="Do que se trata este grupo?" className="h-12 rounded-2xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setShowCreateGroup(false)}>Cancelar</Button>
            <Button className="rounded-2xl h-12 px-8 font-bold shadow-institutional" disabled={!groupForm.name || isCreating} onClick={async () => { await createGroup(groupForm); setShowCreateGroup(false); }}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
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
