import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, Users, Hash, Send, MessageSquare, Pin, Pencil, MoreVertical,
  Tag, UserPlus, UserMinus, Settings, Loader2, ChevronLeft,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGroups, useGroupTags, useTagMembers, useGroupMessages, type Group, type GroupTag, type GroupMessage } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function TIGruposPage() {
  const { user, role } = useAuth();
  const { groups, isLoading: loadingGroups, createGroup, deleteGroup, isCreating } = useGroups();

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [selectedTagForMembers, setSelectedTagForMembers] = useState<GroupTag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });

  // Group chat view
  if (selectedGroup) {
    return (
      <DashboardLayout>
        <GroupChatView
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          onManageTags={() => setShowManageTags(true)}
          isAdmin={role === 'ti'}
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
            {groups.map(group => (
              <Card key={group.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                onClick={() => setSelectedGroup(group)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
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
            ))}
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
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

      {/* Delete Confirm */}
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

// ============ Group Chat View ============
function GroupChatView({ group, onBack, onManageTags, isAdmin }: {
  group: Group; onBack: () => void; onManageTags: () => void; isAdmin: boolean;
}) {
  const { user } = useAuth();
  const { messages, isLoading, sendMessage, editMessage, deleteMessage, togglePin, isSending } = useGroupMessages(group.id);
  const { tags } = useGroupTags(group.id);
  const [input, setInput] = useState('');
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Messages already enriched in the hook (single source of truth)
  const enrichedMessages = messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [enrichedMessages.length]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput('');
    setShowTagSuggestions(false);
    await sendMessage({ content: msg });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    // Check for @ mention
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 || (lastAt !== -1 && !val.slice(lastAt).includes(' '))) {
      const filter = val.slice(lastAt + 1);
      setTagFilter(filter);
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const insertTag = (tagName: string) => {
    const lastAt = input.lastIndexOf('@');
    const newInput = input.slice(0, lastAt) + `@${tagName} `;
    setInput(newInput);
    setShowTagSuggestions(false);
    inputRef.current?.focus();
  };

  const canEdit = (msg: GroupMessage) => {
    if (msg.sender_id !== user?.id) return false;
    const fiveMin = 5 * 60 * 1000;
    return Date.now() - new Date(msg.created_at).getTime() < fiveMin;
  };

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()));

  const pinnedMessages = enrichedMessages.filter(m => m.is_pinned && !m.is_deleted);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card rounded-t-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{group.name}</h3>
            {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={onManageTags}>
              <Settings className="mr-1 h-3.5 w-3.5" /> Tags
            </Button>
          )}
        </div>
      </div>

      {/* Pinned messages banner */}
      {pinnedMessages.length > 0 && (
        <div className="border-b bg-warning/5 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-warning">
            <Pin className="h-3 w-3" />
            <span className="font-medium">Fixada:</span>
            <span className="truncate">{pinnedMessages[pinnedMessages.length - 1]?.content}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {enrichedMessages.map(msg => (
            <div key={msg.id} className={cn('group flex gap-3', msg.sender_id === user?.id && 'flex-row-reverse')}>
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {msg.sender_avatar
                  ? <img src={msg.sender_avatar} className="h-full w-full rounded-full object-cover" />
                  : (msg.sender_name?.charAt(0) || 'U')}
              </div>
              <div className={cn('max-w-[75%]', msg.sender_id === user?.id && 'text-right')}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">{msg.sender_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                  </span>
                  {msg.edited_at && <span className="text-[10px] text-muted-foreground italic">(editada)</span>}
                  {msg.is_pinned && <Pin className="h-3 w-3 text-warning" />}
                </div>
                <div className={cn(
                  'rounded-xl px-3 py-2 text-sm',
                  msg.is_deleted ? 'bg-muted/50 text-muted-foreground italic' :
                    msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {msg.tag_mention && msg.tag_name && !msg.is_deleted && (
                    <Badge className="mb-1 text-[10px]" style={{ backgroundColor: msg.tag_color || '#6366f1' }}>
                      @{msg.tag_name}
                    </Badge>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {/* Message actions */}
                {!msg.is_deleted && (
                  <div className="mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit(msg) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setEditingMsg({ id: msg.id, content: msg.content })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {(msg.sender_id === user?.id || isAdmin) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => togglePin({ id: msg.id, isPinned: !msg.is_pinned, expiresHours: 24 })}>
                        <Pin className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card rounded-b-xl p-3 relative">
        {/* Tag suggestions popup */}
        {showTagSuggestions && filteredTags.length > 0 && (
          <div className="absolute bottom-full mb-1 left-3 right-3 bg-popover border rounded-lg shadow-lg p-1 max-h-40 overflow-y-auto z-10">
            {filteredTags.map(tag => (
              <button key={tag.id} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded"
                onClick={() => insertTag(tag.name)}>
                <Hash className="h-3 w-3" style={{ color: tag.color }} />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            placeholder="Digite sua mensagem... Use @tag para mencionar"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="min-h-[40px] max-h-[120px] flex-1 resize-none"
            rows={1}
          />
          <Button onClick={handleSend} disabled={isSending || !input.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit message dialog */}
      {editingMsg && (
        <Dialog open={!!editingMsg} onOpenChange={o => !o && setEditingMsg(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar mensagem</DialogTitle></DialogHeader>
            <Textarea value={editingMsg.content} onChange={e => setEditingMsg(p => p ? { ...p, content: e.target.value } : null)} rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMsg(null)}>Cancelar</Button>
              <Button onClick={async () => { if (editingMsg) { await editMessage(editingMsg); setEditingMsg(null); } }}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============ Tag Management Dialog ============
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
