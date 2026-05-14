import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Send, MessageSquare, Pin, Pencil, Trash2, Hash, ChevronLeft, Loader2,
  Paperclip, Reply, Smile, X, Settings, CornerUpLeft, User, Image as ImageIcon,
  MoreVertical, Share2, Info, Tag, Search
} from 'lucide-react';
import { useGroupMessages, useGroupTags, uploadGroupAttachment, markGroupRead, type Group, type GroupMessage } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { AttachmentPreviewDialog, getAttachmentKind } from '@/components/AttachmentPreview';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
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
      await sendMessage({ content: msg || (urls.length ? '' : ''), attachments: urls, replyToId: replyId });
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

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagFilter.toLowerCase()));
  const pinnedMessages = messages.filter(m => m.is_pinned && !m.is_deleted);

  const messagesByDay = useMemo(() => {
    return messages.reduce<Array<{ label: string; items: GroupMessage[] }>>((acc, m) => {
      const d = parseISO(m.created_at);
      const label = isToday(d) ? 'Hoje' : isYesterday(d) ? 'Ontem' : format(d, "dd 'de' MMMM", { locale: ptBR });
      const last = acc[acc.length - 1];
      if (last && last.label === label) last.items.push(m);
      else acc.push({ label, items: [m] });
      return acc;
    }, []);
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] relative overflow-hidden">
      {/* Header Estilo WhatsApp */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-3 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden rounded-full h-8 w-8" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground leading-tight truncate">{group.name}</h3>
            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              {messages.length} mensagens • {group.description || "Toque para ver descrição"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && onManageTags && (
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={onManageTags} title="Gerenciar Tags">
              <Tag className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Pinned Banner Moderno */}
      {pinnedMessages.length > 0 && (
        <div className="absolute top-[64px] left-0 right-0 z-[5] px-4 py-2">
          <div className="bg-white/80 backdrop-blur-md border border-amber-200/50 rounded-2xl p-3 shadow-md flex items-center gap-3 animate-fade-in">
            <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
              <Pin className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-0.5">Mensagem Fixada</p>
              <p className="text-xs text-foreground font-medium truncate">
                {pinnedMessages[pinnedMessages.length - 1]?.content}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-amber-100">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 md:px-8 lg:px-12">
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          {messagesByDay.map((day, di) => (
            <div key={di} className="space-y-4">
              <div className="flex justify-center">
                <span className="bg-white/80 backdrop-blur-sm shadow-sm border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {day.label}
                </span>
              </div>
              {day.items.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.sender_id === user?.id}
                  isAdmin={isAdmin}
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
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Composer (WhatsApp Style) */}
      <div className="bg-white border-t p-3 md:px-8 lg:px-12 relative z-10 shrink-0">
        
        {/* Reply-to Moderno */}
        {replyTo && (
          <div className="mb-3 animate-fade-in">
            <div className="bg-muted/40 border-l-4 border-primary rounded-xl p-3 flex items-start gap-3 relative">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                  Respondendo a {replyTo.sender_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10" onClick={() => setReplyTo(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2 animate-fade-in">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Paperclip className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button onClick={() => setPendingFiles(p => p.filter((_, idx) => idx !== i))} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tag suggestions */}
        {showTagSuggestions && filteredTags.length > 0 && (
          <div className="absolute bottom-[100%] mb-4 left-3 right-3 md:left-8 md:right-8 lg:left-12 lg:right-12 z-[20] max-h-48 overflow-y-auto rounded-2xl border bg-white shadow-2xl p-2 animate-fade-in">
            <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b mb-1">Marcar Equipe (@cria chamado)</p>
            {filteredTags.map(tag => (
              <button key={tag.id} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-primary/5 transition-colors group"
                onClick={() => insertTag(tag.name)}>
                <div className="h-2 w-2 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: tag.color }} />
                <span className="font-bold">@{tag.name}</span>
                <span className="ml-auto text-[10px] font-medium text-muted-foreground italic">Automação TI</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setPendingFiles(p => [...p, ...files].slice(0, 5));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" onClick={() => fileInputRef.current?.click()}
            disabled={isSending || uploading}>
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 bg-muted/40 rounded-3xl border-none p-1 flex items-end">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-amber-500">
              <Smile className="h-5 w-5" />
            </Button>
            <Textarea
              ref={inputRef}
              placeholder="Digite sua mensagem... (@tag marca equipe)"
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || uploading}
              className="min-h-[40px] max-h-[150px] flex-1 resize-none bg-transparent border-none focus-visible:ring-0 shadow-none py-2.5 text-sm"
              rows={1}
            />
          </div>

          <Button 
            onClick={handleSend} 
            disabled={isSending || uploading || (!input.trim() && pendingFiles.length === 0)}
            className={cn(
              "shrink-0 h-11 w-11 rounded-full shadow-lg transition-all",
              (isSending || uploading) ? "bg-muted" : "bg-primary hover:scale-110 active:scale-95"
            )}
          >
            {(isSending || uploading) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AttachmentPreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}

// ============ Componente de Balão de Mensagem (Moderno) ============
function MessageBubble({
  msg, isOwn, isAdmin, onReply, onEdit, onDelete, onTogglePin, onReact, onPreview, currentUserId,
}: any) {
  const reactionEntries = Object.entries(msg.reactions || {}).filter(([, users]: any) => users.length > 0);

  return (
    <div className={cn('flex flex-col animate-fade-in group', isOwn ? 'items-end' : 'items-start')}>
      <div className={cn('flex gap-2 max-w-[85%] md:max-w-[70%]', isOwn && 'flex-row-reverse')}>
        
        {/* Avatar Opcional (apenas para terceiros) */}
        {!isOwn && (
          <div className="flex flex-col justify-end pb-1">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 shadow-sm border border-primary/5">
              {msg.sender_avatar ? <img src={msg.sender_avatar} className="h-full w-full object-cover" /> : msg.sender_name?.charAt(0)}
            </div>
          </div>
        )}

        <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          {/* Nome do Remetente */}
          {!isOwn && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1">
              {msg.sender_name}
            </span>
          )}

          {/* Balão de Mensagem */}
          <div className={cn(
            'relative rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words transition-all group-hover:shadow-md',
            msg.is_deleted ? 'bg-white/50 text-muted-foreground italic border' :
            isOwn ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-foreground rounded-tl-none border border-slate-200'
          )}>
            {/* Reply Info Inside Bubble */}
            {msg.reply_preview && !msg.is_deleted && (
              <div className={cn(
                'mb-2 rounded-xl border-l-4 bg-black/5 px-3 py-2 text-xs',
                isOwn ? 'border-white/50 text-white/90' : 'border-primary/50 text-muted-foreground'
              )}>
                <p className="font-bold text-[9px] uppercase tracking-widest truncate">↪ {msg.reply_preview.sender_name}</p>
                <p className="line-clamp-1">{msg.reply_preview.content}</p>
              </div>
            )}

            {/* Tag / Menção Especial */}
            {msg.tag_mention && msg.tag_name && !msg.is_deleted && (
              <div className="mb-2">
                <Badge className="text-[9px] font-bold uppercase tracking-tighter h-5 px-2" style={{ backgroundColor: msg.tag_color || '#6366f1' }}>
                  @{msg.tag_name}
                </Badge>
              </div>
            )}

            {/* Texto Principal */}
            {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

            {/* Anexos */}
            {msg.attachments?.length > 0 && !msg.is_deleted && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {msg.attachments.map((url: string, i: number) => {
                  const kind = getAttachmentKind(url);
                  if (kind === 'image') {
                    return (
                      <div key={i} className="relative rounded-xl overflow-hidden border border-black/5 shadow-inner">
                        <img src={url} alt="" onClick={() => onPreview(url)} className="h-48 w-full cursor-pointer object-cover hover:scale-105 transition-transform" />
                      </div>
                    );
                  }
                  return (
                    <button key={i} onClick={() => onPreview(url)} className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-2.5 text-[11px] font-bold transition-colors w-full',
                      isOwn ? 'bg-white/10 hover:bg-white/20' : 'bg-muted/50 hover:bg-muted'
                    )}>
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate">{decodeURIComponent(url.split('/').pop() || 'arquivo')}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hora e Status (WhatsApp Style) */}
            <div className={cn('mt-1 flex items-center justify-end gap-1', isOwn ? 'text-white/60' : 'text-muted-foreground')}>
              <span className="text-[9px] font-bold">
                {format(parseISO(msg.created_at), 'HH:mm')}
              </span>
              {isOwn && <Share2 className="h-2.5 w-2.5 opacity-50" />}
            </div>
          </div>

          {/* Reactions */}
          {reactionEntries.length > 0 && (
            <div className={cn('mt-[-10px] z-10 flex gap-1', isOwn ? 'justify-end pr-2' : 'justify-start pl-2')}>
              {reactionEntries.map(([emoji, users]: any) => {
                const mine = currentUserId && users.includes(currentUserId);
                return (
                  <button key={emoji} onClick={() => onReact(emoji)} className={cn(
                    'flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[10px] font-bold shadow-sm transition-transform hover:scale-110',
                    mine ? 'border-primary/50 text-primary' : 'border-slate-100 text-muted-foreground'
                  )}>
                    <span>{emoji}</span><span>{users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ações Rápidas (aparece no hover) */}
      {!msg.is_deleted && (
        <div className={cn(
          'mt-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
          isOwn ? 'mr-1 flex-row-reverse' : 'ml-10'
        )}>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/5" onClick={onReply} title="Responder">
            <Reply className="h-3.5 w-3.5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground" title="Reagir">
                <Smile className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1.5 rounded-2xl shadow-2xl border-none" align={isOwn ? 'end' : 'start'}>
              <div className="flex gap-1">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => onReact(e)} className="rounded-xl p-1.5 text-lg hover:bg-primary/5 transition-transform hover:scale-125">{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {(isOwn || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="rounded-xl shadow-xl">
                {onEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
                <DropdownMenuItem onClick={onTogglePin}><Pin className="mr-2 h-4 w-4" /> {msg.is_pinned ? 'Desafixar' : 'Fixar'}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
}
