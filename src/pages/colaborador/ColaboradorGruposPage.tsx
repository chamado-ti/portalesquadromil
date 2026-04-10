import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Send, MessageSquare, Pin, Pencil, Trash2, Hash, ChevronLeft, Loader2, MoreVertical,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGroups, useGroupTags, useGroupMessages, type Group, type GroupMessage } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ColaboradorGruposPage() {
  const { groups, isLoading } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  if (selectedGroup) {
    return (
      <DashboardLayout>
        <ColaboradorChatView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Meus Grupos</h2>
          <p className="text-muted-foreground">Comunicação em tempo real com sua equipe</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : groups.length === 0 ? (
          <Card className="py-16 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Você ainda não faz parte de nenhum grupo</p>
            <p className="text-xs text-muted-foreground mt-1">Solicite acesso ao setor de TI</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(group => (
              <Card key={group.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
                onClick={() => setSelectedGroup(group)}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      {group.description && <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ColaboradorChatView({ group, onBack }: { group: Group; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, sendMessage, editMessage, deleteMessage, isSending } = useGroupMessages(group.id);
  const { tags } = useGroupTags(group.id);
  const [input, setInput] = useState('');
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [enrichedMessages, setEnrichedMessages] = useState<GroupMessage[]>([]);

  useEffect(() => {
    const enrich = async () => {
      if (messages.length === 0) { setEnrichedMessages([]); return; }
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const tagIds = [...new Set(messages.filter(m => m.tag_mention).map(m => m.tag_mention!))];
      const [profilesRes, tagsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds),
        tagIds.length > 0 ? supabase.from('group_tags').select('id, name, color').in('id', tagIds) : { data: [] },
      ]);
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
      const tagMap = new Map(((tagsRes.data || []) as any[]).map(t => [t.id, t]));
      setEnrichedMessages(messages.map(m => ({
        ...m,
        sender_name: profileMap.get(m.sender_id)?.full_name || 'Usuário',
        sender_avatar: profileMap.get(m.sender_id)?.avatar_url || undefined,
        tag_name: m.tag_mention ? tagMap.get(m.tag_mention)?.name : undefined,
        tag_color: m.tag_mention ? tagMap.get(m.tag_mention)?.color : undefined,
      })));
    };
    enrich();
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [enrichedMessages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput('');
    setShowTagSuggestions(false);
    await sendMessage({ content: msg });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === val.length - 1 || !val.slice(lastAt).includes(' '))) {
      setTagFilter(val.slice(lastAt + 1));
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const insertTag = (tagName: string) => {
    const lastAt = input.lastIndexOf('@');
    setInput(input.slice(0, lastAt) + `@${tagName} `);
    setShowTagSuggestions(false);
    inputRef.current?.focus();
  };

  const canEdit = (msg: GroupMessage) => {
    if (msg.sender_id !== user?.id) return false;
    return Date.now() - new Date(msg.created_at).getTime() < 5 * 60 * 1000;
  };

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{group.name}</h3>
          {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
        </div>
      </div>

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
                {!msg.is_deleted && (canEdit(msg) || msg.sender_id === user?.id) && (
                  <div className="mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit(msg) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setEditingMsg({ id: msg.id, content: msg.content })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {msg.sender_id === user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => deleteMessage(msg.id)}>
                        <Trash2 className="h-3 w-3" />
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

      <div className="border-t p-3 relative">
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
