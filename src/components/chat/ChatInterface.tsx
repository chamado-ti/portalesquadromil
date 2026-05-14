import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, Send, Trash2, User, Plus, MessageSquare, Paperclip, X, 
  FileText, Image as ImageIcon, Mic, ChevronRight, Sparkles, 
  Clock, Calendar, History, MoreVertical, Search, Settings, 
  Layout, ArrowLeft, RefreshCcw, ThumbsUp, ThumbsDown, Copy
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import { format, isToday, isYesterday } from 'date-fns';
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

export function ChatInterface({
  messages, isLoading, inputValue, onInputChange, onSend, onNewChat, onClear,
  conversations, activeConversationId, onSelectConversation, onDeleteConversation,
  title, subtitle, quickPrompts, renderTicketActions,
}: ChatInterfaceProps) {
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if ((!inputValue.trim() && pendingFiles.length === 0) || isLoading) return;
    onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
    setPendingFiles([]);
  };

  const groupConversations = () => {
    const today: ConversationItem[] = [];
    const yesterday: ConversationItem[] = [];
    const older: ConversationItem[] = [];

    conversations.forEach(c => {
      const date = c.updated_at ? new Date(c.updated_at) : new Date();
      if (isToday(date)) today.push(c);
      else if (isYesterday(date)) yesterday.push(c);
      else older.push(c);
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupConversations();

  return (
    <div className="flex h-[calc(100vh-100px)] -m-4 md:-m-6 bg-[#f9fafb] overflow-hidden rounded-xl shadow-2xl border">
      {/* Enhanced Sidebar */}
      <aside className={cn(
        "bg-white border-r flex flex-col transition-all duration-300 z-30 relative shadow-sm",
        sidebarOpen ? "w-72" : "w-0 overflow-hidden"
      )}>
        <div className="p-6 border-b bg-white/50 backdrop-blur">
          <Button onClick={onNewChat} className="w-full h-11 rounded-xl shadow-lg shadow-primary/10 gap-2 font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Novo Chat
          </Button>
          <div className="mt-4 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input 
              placeholder="Buscar histórico..." 
              className="w-full pl-9 pr-4 py-2 bg-secondary/50 border-none text-xs rounded-xl focus:ring-2 ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-6">
            {[
              { label: 'Hoje', items: today, icon: Clock },
              { label: 'Ontem', items: yesterday, icon: Calendar },
              { label: 'Anterior', items: older, icon: History }
            ].map(group => group.items.length > 0 && (
              <div key={group.label} className="space-y-1.5">
                <h4 className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mb-2">
                  <group.icon className="h-3 w-3" /> {group.label}
                </h4>
                {group.items.map(conv => (
                  <div 
                    key={conv.id} 
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all cursor-pointer relative',
                      activeConversationId === conv.id ? 'bg-primary/5 text-primary font-bold' : 'hover:bg-muted/50 text-muted-foreground'
                    )}
                    onClick={() => onSelectConversation(conv)}
                  >
                    <MessageSquare className={cn("h-4 w-4 shrink-0", activeConversationId === conv.id ? "text-primary" : "text-muted-foreground/50")} />
                    <span className="flex-1 truncate pr-6">{conv.title}</span>
                    <button 
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                      onClick={e => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <History className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Nenhum histórico</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-muted/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-black/5">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">TI</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">Time de Operações</p>
              <p className="text-[10px] text-muted-foreground truncate">Ambiente Corporativo</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground cursor-pointer hover:rotate-90 transition-transform duration-500" />
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {/* Toggle Sidebar Mobile */}
        <div className="absolute top-4 left-4 z-20 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Layout className="h-5 w-5" />
          </Button>
        </div>

        {/* Chat Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b bg-white/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Bot className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none mb-1.5">{title}</h1>
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Online • Agente TI</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs gap-2" onClick={onClear}>
              <RefreshCcw className="h-3.5 w-3.5" /> Reiniciar
            </Button>
            <div className="h-8 w-[1px] bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button>
          </div>
        </header>

        {/* Messages List */}
        <ScrollArea className="flex-1 px-8 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="relative mb-8">
                <div className="h-20 w-20 rounded-[30%] bg-primary/5 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">SaaS PRO</div>
              </div>
              <h2 className="text-xl font-bold mb-3 text-center tracking-tight">Como posso acelerar sua operação hoje?</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-10">{subtitle}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                {quickPrompts?.map(q => (
                  <button 
                    key={q} 
                    className="p-4 rounded-2xl bg-[#f9fafb] border border-black/5 hover:border-primary/20 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all text-left group"
                    onClick={() => onInputChange(q)}
                  >
                    <p className="text-xs font-bold text-primary mb-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Sugestão</p>
                    <p className="text-sm font-medium text-foreground">{q}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-10 pb-10">
              {messages.map((msg, idx) => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-500",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-primary text-white" : "bg-white border"
                  )}>
                    {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5 text-primary" />}
                  </div>
                  
                  <div className={cn(
                    "flex flex-col gap-2 max-w-[85%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-4 md:p-5 rounded-3xl shadow-sm border transition-all",
                      msg.role === 'user' 
                        ? "bg-primary text-white border-primary rounded-tr-none" 
                        : "bg-white border-black/5 text-foreground rounded-tl-none hover:shadow-md"
                    )}>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-[11px] font-bold">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="max-w-[120px] truncate">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={cn(
                        "prose prose-sm dark:prose-invert max-w-none text-sm md:text-base leading-relaxed",
                        msg.role === 'user' ? "text-white" : "text-[#374151]"
                      )}>
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown components={{
                            p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                            ul: ({children}) => <ul className="list-disc pl-4 mb-4">{children}</ul>,
                            code: ({children}) => <code className="bg-black/5 rounded px-1.5 py-0.5 font-mono text-[0.9em]">{children}</code>
                          }}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {format(msg.timestamp, 'HH:mm', { locale: ptBR })}
                      </span>
                      {msg.role === 'assistant' && !isLoading && idx === messages.length - 1 && (
                        <div className="flex items-center gap-1">
                          <button className="p-1 hover:text-primary transition-colors"><ThumbsUp className="h-3 w-3" /></button>
                          <button className="p-1 hover:text-primary transition-colors"><ThumbsDown className="h-3 w-3" /></button>
                          <button className="p-1 hover:text-primary transition-colors"><Copy className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                    {renderTicketActions && msg.ticketSuggestion && (
                      <div className="mt-2 w-full animate-in zoom-in-95 duration-300">
                        {renderTicketActions(msg)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-4 animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-white border flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-primary opacity-50" />
                  </div>
                  <div className="bg-white border-black/5 p-5 rounded-3xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-bounce" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-bounce [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/30 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Enhanced Input Footer */}
        <footer className="p-6 md:p-8 bg-white border-t relative">
          <div className="max-w-4xl mx-auto">
            {pendingFiles.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border bg-white shadow-sm p-2 text-[11px] font-bold group">
                    <div className="h-6 w-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="max-w-[150px] truncate">{f.name}</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 p-1 rounded-lg hover:bg-secondary text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative group bg-white rounded-[24px] border-2 border-black/5 focus-within:border-primary/20 shadow-lg shadow-black/[0.02] transition-all p-2">
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={async (e) => {
                   if (e.target.files) {
                     const files = Array.from(e.target.files);
                     for (const file of files) {
                       const reader = new FileReader();
                       reader.onload = (re) => {
                         const base64 = (re.target?.result as string).split(',')[1];
                         setPendingFiles(prev => [...prev, { name: file.name, type: 'file', base64, mimeType: file.type }]);
                       };
                       reader.readAsDataURL(file);
                     }
                   }
                }} />
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-11 w-11 rounded-full shrink-0 hover:bg-primary/5 hover:text-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Textarea
                  ref={textareaRef}
                  placeholder="Mensagem para o Agente..."
                  value={inputValue}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] max-h-[200px] border-none focus-visible:ring-0 resize-none text-base bg-transparent px-2 py-2.5 scrollbar-hide"
                  rows={1}
                />

                <Button 
                  onClick={handleSend} 
                  disabled={isLoading || (!inputValue.trim() && pendingFiles.length === 0)} 
                  className={cn(
                    "h-11 w-11 rounded-full shrink-0 shadow-lg transition-all",
                    isLoading ? "bg-muted" : "bg-primary hover:scale-105"
                  )}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <p className="mt-3 text-[10px] text-center font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
              Powered by Esquadromil Intel Engine
            </p>
          </div>
        </footer>
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={open => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Encerrar histórico?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Esta conversa será removida permanentemente do banco de dados e não poderá ser recuperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-none bg-secondary font-bold">Manter</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { if (deleteConfirmId) { onDeleteConversation(deleteConfirmId); setDeleteConfirmId(null); } }} 
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
