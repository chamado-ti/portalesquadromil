import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, MessageSquare, Pin, Trash2, Hash, Loader2,
  Paperclip, Reply, Smile, X, User, Image as ImageIcon,
  MoreVertical, Search, Sparkles, Pencil
} from 'lucide-react';
import { useGroupMessages, uploadGroupAttachment, markGroupRead, type Group, type GroupMessage } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🚀', '✅', '❌'];

export interface GroupChatProps {
  group: Group;
  onBack: () => void;
  isAdmin?: boolean;
}

export function GroupChat({ group, onBack, isAdmin = false }: GroupChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, sendMessage, togglePin, toggleReaction, deleteMessage, isSending } =
    useGroupMessages(group.id);

  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
      setInput(''); setPendingFiles([]);
      const replyId = replyTo?.id || null;
      setReplyTo(null);
      await sendMessage({ content: msg || (urls.length ? '' : ''), attachments: urls, replyToId: replyId });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Messages List */}
      <ScrollArea className="flex-1 px-8 py-6">
        <div className="space-y-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center mb-4">
                <Hash className="h-8 w-8 text-primary opacity-30" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Início do canal #{group.name}</h3>
              <p className="text-sm text-slate-400 max-w-xs mt-1">Este é o começo histórico deste canal de comunicação.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id;
              const prevMsg = messages[idx - 1];
              const isSequence = prevMsg && prevMsg.sender_id === msg.sender_id && 
                                (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);

              if (msg.is_deleted) return null;

              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "group flex items-start gap-4 px-4 py-1.5 hover:bg-slate-50 transition-colors relative rounded-lg",
                    isSequence ? "mt-0" : "mt-6"
                  )}
                >
                  {/* Floating Actions */}
                  <div className="absolute right-4 -top-4 opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-1 bg-white border shadow-xl rounded-xl p-1">
                    {QUICK_EMOJIS.slice(0, 4).map(e => (
                      <button 
                        key={e} 
                        className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-lg transition-transform active:scale-125"
                        onClick={() => toggleReaction(msg.id, e)}
                      >
                        {e}
                      </button>
                    ))}
                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                    <button onClick={() => setReplyTo(msg)} className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary"><Reply className="h-4 w-4" /></button>
                    <button onClick={() => togglePin(msg.id)} className={cn("h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg", msg.is_pinned ? "text-amber-500" : "text-slate-500")}><Pin className="h-4 w-4" /></button>
                    {(isMine || isAdmin) && (
                      <button onClick={() => deleteMessage(msg.id)} className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 shrink-0">
                    {!isSequence && (
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm",
                        isMine ? "bg-primary text-white" : "bg-slate-100 text-slate-600 border"
                      )}>
                        {msg.sender_name?.[0] || 'U'}
                      </div>
                    )}
                    {isSequence && (
                      <div className="h-10 flex items-start justify-center opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <span className="text-[9px] font-bold text-slate-400">{format(parseISO(msg.created_at), 'HH:mm')}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {!isSequence && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 hover:underline cursor-pointer">{msg.sender_name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(msg.created_at), 'HH:mm')}</span>
                        {msg.is_pinned && <Badge variant="secondary" className="h-4 px-1.5 text-[8px] bg-amber-50 text-amber-600 border-amber-100 gap-1 uppercase font-bold"><Pin className="h-2 w-2" /> Fixado</Badge>}
                      </div>
                    )}

                    {msg.reply_to_content && (
                      <div className="mb-2 pl-3 border-l-2 border-primary/20 bg-primary/[0.02] py-1 rounded-r-lg">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-tight mb-0.5">Resposta a {msg.reply_to_sender || 'Usuário'}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 italic">{msg.reply_to_content}</p>
                      </div>
                    )}

                    <div className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {msg.attachments.map((url, i) => (
                          <div key={i} className="group/file relative max-w-[200px] rounded-2xl overflow-hidden border bg-slate-50 hover:shadow-lg transition-all cursor-pointer">
                            <img src={url} className="w-full h-auto max-h-[150px] object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/file:opacity-100 flex items-center justify-center transition-opacity">
                              <Search className="text-white h-6 w-6" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(msg.reactions as Record<string, string[]>).map(([emoji, users]) => (
                          <button 
                            key={emoji} 
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={cn(
                              "h-6 px-2 rounded-full border flex items-center gap-1.5 transition-all text-xs font-bold",
                              users.includes(user?.id || '') ? "bg-primary/10 border-primary/20 text-primary" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Context */}
      {replyTo && (
        <div className="px-8 py-3 bg-primary/5 border-t border-primary/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Reply className="h-4 w-4" /></div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Respondendo para {replyTo.sender_name}</p>
              <p className="text-xs text-slate-500 line-clamp-1 truncate max-w-lg">{replyTo.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Input area */}
      <div className="p-8 pt-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative group bg-white rounded-[24px] border-2 border-slate-100 focus-within:border-primary/30 shadow-2xl shadow-slate-200/50 transition-all overflow-hidden">
            <div className="flex items-center gap-1 p-2 border-b bg-slate-50/50">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg font-bold">B</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg italic">I</Button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Smile className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Sparkles className="h-4 w-4" /></Button>
            </div>

            <div className="flex items-end gap-2 p-3">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-12 w-12 rounded-2xl shrink-0 hover:bg-primary/5 hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              <Textarea
                ref={inputRef}
                placeholder={`Conversar em #${group.name}`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={uploading}
                className="flex-1 min-h-[48px] max-h-[300px] border-none focus-visible:ring-0 resize-none text-[15px] bg-transparent px-2 py-3"
                rows={1}
              />

              <Button 
                onClick={handleSend} 
                disabled={uploading || (!input.trim() && pendingFiles.length === 0)}
                className={cn(
                  "h-12 w-12 rounded-2xl shrink-0 shadow-lg transition-all",
                  (input.trim() || pendingFiles.length > 0) ? "bg-primary scale-105" : "bg-slate-200 text-slate-400"
                )}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[9px] text-center font-bold text-slate-400 uppercase tracking-[0.3em]">
            Enter para enviar • Shift + Enter para quebra de linha
          </p>
        </div>
      </div>
    </div>
  );
}
