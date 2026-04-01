import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Trash2, User, Plus, MessageSquare, Paperclip, X, FileText, Image as ImageIcon, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@/hooks/useAIAssistant';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  ticketSuggestion?: { titulo: string; descricao: string; categoria: string; };
}

interface ConversationItem {
  id: string;
  title: string;
  messages: any[];
  updated_at: string | null;
}

interface ChatInterfaceProps {
  messages: ChatMsg[];
  isLoading: boolean;
  inputValue: string;
  onInputChange: (val: string) => void;
  onSend: (attachments?: FileAttachment[]) => void;
  onNewChat: () => void;
  onClear: () => void;
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (conv: ConversationItem) => void;
  onDeleteConversation: (id: string) => void;
  title: string;
  subtitle: string;
  quickPrompts?: string[];
  renderTicketActions?: (msg: ChatMsg) => React.ReactNode;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileType(mime: string): FileAttachment['type'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}

export function ChatInterface({
  messages, isLoading, inputValue, onInputChange, onSend, onNewChat, onClear,
  conversations, activeConversationId, onSelectConversation, onDeleteConversation,
  title, subtitle, quickPrompts, renderTicketActions,
}: ChatInterfaceProps) {
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const attachments: FileAttachment[] = [];
    for (const file of fileArr) {
      if (file.size > 10 * 1024 * 1024) continue; // 10MB max
      try {
        const base64 = await fileToBase64(file);
        attachments.push({ type: getFileType(file.type), name: file.name, base64, mimeType: file.type });
      } catch {}
    }
    if (attachments.length > 0) setPendingFiles(prev => [...prev, ...attachments]);
  }, []);

  // Paste handler (Ctrl+V)
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      await processFiles(files);
    }
  }, [processFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processFiles(e.target.files);
    e.target.value = '';
  };

  const removePendingFile = (idx: number) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSend = () => {
    if ((!inputValue.trim() && pendingFiles.length === 0) || isLoading) return;
    onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
    setPendingFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const fileIcon = (type: FileAttachment['type']) => {
    if (type === 'image') return <ImageIcon className="h-3 w-3" />;
    if (type === 'audio') return <Mic className="h-3 w-3" />;
    return <FileText className="h-3 w-3" />;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="hidden w-72 flex-shrink-0 flex-col rounded-xl border bg-card md:flex">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="text-sm font-semibold">Conversas</h3>
          <Button variant="ghost" size="icon" onClick={onNewChat} className="h-8 w-8"><Plus className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {conversations.map(conv => (
              <div key={conv.id} className={cn('group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent', activeConversationId === conv.id && 'bg-accent')} onClick={() => onSelectConversation(conv)}>
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{conv.title}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {conversations.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma conversa</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Chat */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5"><Bot className="h-5 w-5 text-primary" /></div>
            <span className="font-semibold">{title}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="md:hidden" onClick={onNewChat}><Plus className="h-4 w-4" /></Button>
            {messages.length > 0 && <Button variant="ghost" size="sm" onClick={onClear}><Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar</Button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-2xl bg-primary/10 p-5"><Bot className="h-12 w-12 text-primary" /></div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="max-w-md text-muted-foreground">{subtitle}</p>
              {quickPrompts && quickPrompts.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {quickPrompts.map(q => (
                    <Button key={q} variant="outline" size="sm" onClick={() => onInputChange(q)}>{q}</Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {/* Show attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-1 rounded bg-background/20 px-2 py-1 text-xs">
                            {fileIcon(att.type)}
                            <span className="max-w-[120px] truncate">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                    <p className={`mt-1 text-xs ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(msg.timestamp, 'HH:mm', { locale: ptBR })}
                    </p>
                    {renderTicketActions && msg.ticketSuggestion && renderTicketActions(msg)}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"><Bot className="h-4 w-4" /></div>
                  <div className="rounded-xl bg-muted p-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-3">
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border bg-muted px-2 py-1 text-xs">
                  {fileIcon(f.type)}
                  <span className="max-w-[100px] truncate">{f.name}</span>
                  <button onClick={() => removePendingFile(i)} className="ml-1 rounded-full p-0.5 hover:bg-background"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,audio/*" className="hidden" onChange={handleFileUpload} />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              ref={textareaRef}
              placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isLoading}
              className="min-h-[40px] max-h-[120px] flex-1 resize-none"
              rows={1}
            />
            <Button onClick={handleSend} disabled={isLoading || (!inputValue.trim() && pendingFiles.length === 0)} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
