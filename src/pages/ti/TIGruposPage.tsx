import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, Users, MessageSquare, Tag, UserPlus, UserMinus,
  Loader2, MoreVertical,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGroups, useGroupTags, useTagMembers, useGroupUnreadCounts, type Group, type GroupTag } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GroupChat } from '@/components/groups/GroupChat';

export default function TIGruposPage() {
  const { role } = useAuth();
  const { groups, isLoading: loadingGroups, createGroup, deleteGroup, isCreating } = useGroups();
  const { data: unread = {} } = useGroupUnreadCounts(groups.map(g => g.id));

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [selectedTagForMembers, setSelectedTagForMembers] = useState<GroupTag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  if (selectedGroup) {
    return (
      <DashboardLayout>
        <GroupChat
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Grupos & Tags</h2>
            <p className="text-muted-foreground">Comunicação em tempo real com criação automática de chamados</p>
          </div>
          <Button onClick={() => { setGroupForm({ name: '', description: '' }); setShowCreateGroup(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo Grupo
          </Button>
        </div>

        {loadingGroups ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <Card className="py-16 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum grupo criado</p>
            <p className="text-xs text-muted-foreground mt-1">Crie um grupo e adicione tags para começar</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => {
              const count = unread[group.id] || 0;
              return (
                <Card key={group.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                  onClick={() => setSelectedGroup(group)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          {count > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{group.name}</h3>
                          {group.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedGroup(group); setShowManageTags(true); }}>
                            <Tag className="mr-2 h-4 w-4" /> Gerenciar Tags
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteConfirm(group.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {format(new Date(group.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Grupo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome do Grupo</Label><Input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Suporte TI" /></div>
            <div><Label>Descrição</Label><Input value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} placeholder="Opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateGroup(false)}>Cancelar</Button>
            <Button disabled={!groupForm.name || isCreating} onClick={async () => { await createGroup(groupForm); setShowCreateGroup(false); }}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={o => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription>Todas as mensagens, tags e membros serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteConfirm) { await deleteGroup(deleteConfirm); setDeleteConfirm(null); } }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}


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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Gerenciar Tags</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nome da tag" className="flex-1" />
            <div className="flex gap-1">
              {colors.slice(0, 4).map(c => (
                <button key={c} className={cn('h-8 w-8 rounded-full border-2', newTagColor === c ? 'border-foreground' : 'border-transparent')}
                  style={{ backgroundColor: c }} onClick={() => setNewTagColor(c)} />
              ))}
            </div>
            <Button size="sm" disabled={!newTagName} onClick={async () => { await createTag({ name: newTagName, color: newTagColor }); setNewTagName(''); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium">@{tag.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onManageMembers(tag)}>
                    <Users className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTag(tag.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {tags.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nenhuma tag criada</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Member Management Dialog ============
function MemberManageDialog({ tag, open, onOpenChange }: {
  tag: GroupTag | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { members, addMember, removeMember } = useTagMembers(tag?.id || null);
  const [selectedUser, setSelectedUser] = useState('');

  // Fetch all users
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-profiles'],
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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Membros da tag @{tag?.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
              <SelectContent>
                {availableUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.sector || 'Sem setor'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!selectedUser} onClick={async () => { await addMember(selectedUser); setSelectedUser(''); }}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {members.map(m => {
              const userInfo = allUsers.find(u => u.id === m.user_id);
              return (
                <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{userInfo?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{userInfo?.email}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMember(m.user_id)}>
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
            {members.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nenhum membro</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
