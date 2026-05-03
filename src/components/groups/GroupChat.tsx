import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Send, MessageSquare, Pin, Pencil, Trash2, Hash, ChevronLeft, Loader2,
  Paperclip, Reply, Smile, X, Settings, CornerUpLeft,
} from 'lucide-react';
import { useGroupMessages, useGroupTags, uploadGroupAttachment, markGroupRead, type Group, type GroupMessage } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { AttachmentPreview, AttachmentPreviewDialog, getAttachmentKind } from '@/components/AttachmentPreview';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🚀', '✅', '❌'];

export interface GroupChatProps {
  group: Group;
  onBack: () => void;
  isAdmin?: boolean;
  onManageTags?: () => void;
}

export function GroupChat({ group, onBack, isAdmin = false, onManageTags }: GroupChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, sendMessage, editMessage, deleteMessage, togglePin, toggleReaction, isSending } =
    useGroupMessages(group.id);
  const { tags } = useGroupTags(group.id);

  const [input, setInput] = useState('');
  const [editingMsg, setEditingMsg] = useState<{ id: string; content: string } | null>(null);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read on mount + on new message
  useEffect(() => {
    if (user?.id) markGroupRead(group.id, user.id);
  }, [group.id, user?.id, messages.length]);

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || isSending || uploading) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of pendingFiles) {
        try { urls.push(await uploadGroupAttachment(group.id, f)); }
        catch (e: any) { toast({ variant: 'destructive', title: 'Falha no upload', description: e.message }); }
      }
      const msg = input;
      setInput(''); setPendingFiles([]); setShowTagSuggestions(false);
      const replyId = replyTo?.id || null;
      setReplyTo(null);
      await sendMessage({ content: msg || (urls.length ? '[Anexo]' : ''), attachments: urls, replyToId: replyId });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { setReplyTo(null); setShowTagSuggestions(false); }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && !val.slice(lastAt).includes(' ')) {
      setTagFilter(val.slice(lastAt + 1)); setShowTagSuggestions(true);
    } else setShowTagSuggestions(false);
  };

  const insertTag = (tagName: string) => {
    const lastAt = input.lastIndexOf('@');
    setInput(input.slice(0, lastAt) + `@${tagName} `);
    setShowTagSuggestions(false);
    inputRef.current?.focus();
  };

  const canEdit = (msg: GroupMessage) =>
    msg.sender_id === user?.id && Date.now() - new Date(msg.created_at).getTime() < 5 * 60 * 1000;

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()));
  const pinnedMessages = messages.filter(m => m.is_pinned && !m.is_deleted);

  // Group messages by day for date separators
  const messagesByDay = messages.reduce<Array<{ label: string; items: GroupMessage[] }>>((acc, m) => {
    const d = new Date(m.created_at);
    const label = isToday(d) ? 'Hoje' : isYesterday(d) ? 'Ontem' : format(d, "dd 'de' MMMM", { locale: ptBR });
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(m);
    else acc.push({ label, items: [m] });
    return acc;
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
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
        {isAdmin && onManageTags && (
          <Button variant="ghost" size="sm" onClick={onManageTags}>
            <Settings className="mr-1 h-3.5 w-3.5" /> Tags
          </Button>
        )}
      </div>

      {/* Pinned banner */}
      {pinnedMessages.length > 0 && (
        <div className="border-b bg-warning/5 px-4 py-2 flex items-center gap-2 text-xs text-warning">
          <Pin className="h-3 w-3" />
          <span className="font-medium">Fixada:</span>
          <span className="truncate flex-1">{pinnedMessages[pinnedMessages.length - 1]?.content}</span>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesByDay.map((day, di) => (
            <div key={di} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{day.label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {day.items.map(msg => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.sender_id === user?.id}
                  isAdmin={isAdmin}
                  canEdit={canEdit(msg)}
                  onReply={() => setReplyTo(msg)}
                  onEdit={() => setEditingMsg({ id: msg.id, content: msg.content })}
                  onDelete={() => deleteMessage(msg.id)}
                  onTogglePin={() => togglePin({ id: msg.id, isPinned: !msg.is_pinned, expiresHours: 24 })}
                  onReact={(emoji) => toggleReaction({ id: msg.id, emoji })}
                  onPreview={setPreviewUrl}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="border-t bg-card relative">
        {/* Reply-to bar */}
        {replyTo && (
          <div className="flex items-start gap-2 border-b bg-muted/40 px-3 py-2">
            <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-primary">Respondendo a {replyTo.sender_name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{replyTo.content}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b px-3 py-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs">
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button onClick={() => setPendingFiles(p => p.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3 hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tag suggestions */}
        {showTagSuggestions && filteredTags.length > 0 && (
          <div className="absolute bottom-full mb-1 left-3 right-3 z-10 max-h-40 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
            {filteredTags.map(tag => (
              <button key={tag.id} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                onClick={() => insertTag(tag.name)}>
                <Hash className="h-3 w-3" style={{ color: tag.color }} />
                <span>{tag.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">@menção cria chamado</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPendingFiles(p => [...p, ...files].slice(0, 5));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}
            disabled={isSending || uploading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={inputRef}
            placeholder="Digite sua mensagem... Use @tag para mencionar"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || uploading}
            className="min-h-[40px] max-h-[120px] flex-1 resize-none"
            rows={1}
          />
          <Button onClick={handleSend} disabled={isSending || uploading || (!input.trim() && pendingFiles.length === 0)}
            className="shrink-0">
            {(isSending || uploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

      <AttachmentPreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}

// ============ Single message row ============
function MessageRow({
  msg, isOwn, isAdmin, canEdit, currentUserId,
  onReply, onEdit, onDelete, onTogglePin, onReact, onPreview,
}: {
  msg: GroupMessage; isOwn: boolean; isAdmin: boolean; canEdit: boolean; currentUserId?: string;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onTogglePin: () => void;
  onReact: (emoji: string) => void; onPreview: (url: string) => void;
}) {
  const reactions = msg.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

  return (
    <div className={cn('group flex gap-3', isOwn && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold overflow-hidden',
        isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {msg.sender_avatar
          ? <img src={msg.sender_avatar} className="h-full w-full object-cover" alt="" />
          : (msg.sender_name?.charAt(0) || 'U')}
      </div>
      <div className={cn('max-w-[75%] min-w-0', isOwn && 'items-end flex flex-col')}>
        <div className={cn('flex items-center gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-medium">{msg.sender_name}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
          </span>
          {msg.edited_at && <span className="text-[10px] text-muted-foreground italic">(editada)</span>}
          {msg.is_pinned && <Pin className="h-3 w-3 text-warning" />}
        </div>

        {/* Reply preview */}
        {msg.reply_preview && (
          <div className={cn(
            'mb-1 rounded-lg border-l-2 border-primary/50 bg-muted/40 px-2 py-1 text-xs max-w-full',
            isOwn && 'self-end'
          )}>
            <p className="font-medium text-primary text-[10px]">↪ {msg.reply_preview.sender_name}</p>
            <p className="text-muted-foreground line-clamp-2">{msg.reply_preview.content}</p>
          </div>
        )}

        <div className={cn(
          'rounded-xl px-3 py-2 text-sm break-words',
          msg.is_deleted ? 'bg-muted/50 text-muted-foreground italic' :
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {msg.tag_mention && msg.tag_name && !msg.is_deleted && (
            <Badge className="mb-1 text-[10px]" style={{ backgroundColor: msg.tag_color || '#6366f1' }}>
              @{msg.tag_name}
            </Badge>
          )}
          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
          {msg.attachments?.length > 0 && !msg.is_deleted && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.attachments.map((url, i) => {
                const kind = getAttachmentKind(url);
                if (kind === 'image') {
                  return (
                    <img key={i} src={url} alt="" onClick={() => onPreview(url)}
                      className="h-32 w-32 cursor-pointer rounded-md object-cover hover:opacity-90" />
                  );
                }
                return (
                  <button key={i} onClick={() => onPreview(url)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1 text-xs',
                      isOwn ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30'
                            : 'bg-background hover:bg-accent'
                    )}>
                    <Paperclip className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{decodeURIComponent(url.split('/').pop() || 'anexo')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div className={cn('mt-1 flex flex-wrap gap-1', isOwn && 'justify-end')}>
            {reactionEntries.map(([emoji, users]) => {
              const mine = currentUserId && users.includes(currentUserId);
              return (
                <button key={emoji} onClick={() => onReact(emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
                    mine ? 'border-primary/60 bg-primary/10' : 'border-border bg-background hover:bg-accent'
                  )}>
                  <span>{emoji}</span><span className="text-muted-foreground">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {!msg.is_deleted && (
          <div className={cn(
            'mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwn && 'flex-row-reverse'
          )}>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onReply} title="Responder">
              <Reply className="h-3 w-3" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Reagir">
                  <Smile className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" align={isOwn ? 'end' : 'start'}>
                <div className="flex gap-0.5">
                  {QUICK_EMOJIS.map(e => (
                    <button key={e} onClick={() => onReact(e)}
                      className="rounded p-1 text-base hover:bg-accent">{e}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {canEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} title="Editar">
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {(isOwn || isAdmin) && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete} title="Excluir">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTogglePin} title="Fixar">
                <Pin className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
