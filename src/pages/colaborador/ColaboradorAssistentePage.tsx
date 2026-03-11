import { useState, useRef, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAIAssistant, ChatMessage } from '@/hooks/useAIAssistant';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useColaboradorTickets } from '@/hooks/useColaboradorTickets';
import { Bot, Send, Trash2, User, Ticket, Loader2, Plus, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function ColaboradorAssistentePage() {
  const { messages, isLoading, sendMessage, clearMessages, autoCreateTicket, setMessages } = useAIAssistant();
  const { conversations, createConversation, updateConversation, deleteConversation, isLoading: isLoadingConvs } = useAIConversations();
  const { categories, urgencies, createTicket, isCreating } = useColaboradorTickets();
  const [inputValue, setInputValue] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<ChatMessage['ticketSuggestion'] | null>(null);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category_id: '', urgency_id: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Load conversation messages when switching
  const loadConversation = useCallback((conv: typeof conversations[0]) => {
    setActiveConversationId(conv.id);
    const loaded: ChatMessage[] = conv.messages.map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp || Date.now()),
      ticketSuggestion: m.ticketSuggestion,
    }));
    setMessages(loaded);
  }, [setMessages]);

  // Save current messages to active conversation
  const saveCurrentConversation = useCallback(async () => {
    if (!activeConversationId || messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 50) || 'Nova Conversa';
    await updateConversation({
      id: activeConversationId,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString(), ticketSuggestion: m.ticketSuggestion })) as any,
      title,
    });
  }, [activeConversationId, messages, updateConversation]);

  // Auto-save on message changes
  useEffect(() => {
    if (messages.length > 0 && activeConversationId && !isLoading) {
      const timer = setTimeout(saveCurrentConversation, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeConversationId, isLoading, saveCurrentConversation]);

  const handleNewChat = async () => {
    const conv = await createConversation('Nova Conversa');
    setActiveConversationId(conv.id);
    clearMessages();
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      clearMessages();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    if (!activeConversationId) {
      const conv = await createConversation(inputValue.slice(0, 50));
      setActiveConversationId(conv.id);
    }
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleAutoCreateTicket = async (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    await autoCreateTicket(suggestion);
  };

  const handleOpenTicketDialog = (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    setPendingTicket(suggestion);
    setTicketForm({ title: suggestion.titulo, description: suggestion.descricao, category_id: '', urgency_id: '' });
    setTicketDialogOpen(true);
  };

  const handleCreateTicket = async () => {
    try {
      await createTicket({ title: ticketForm.title, description: ticketForm.description, category_id: ticketForm.category_id || undefined, urgency_id: ticketForm.urgency_id || undefined });
      setTicketDialogOpen(false);
      setPendingTicket(null);
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar - Chat History */}
        <div className="hidden w-72 flex-shrink-0 flex-col rounded-xl border bg-card md:flex">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-semibold">Conversas</h3>
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
                    activeConversationId === conv.id && 'bg-accent'
                  )}
                  onClick={() => loadConversation(conv)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{conv.title}</span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma conversa</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5"><Bot className="h-5 w-5 text-primary" /></div>
              <span className="font-semibold">Assistente IA</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { clearMessages(); setActiveConversationId(null); }}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-2xl bg-primary/10 p-5"><Bot className="h-12 w-12 text-primary" /></div>
                <h3 className="mb-2 text-lg font-semibold">Olá! Sou o Assistente TI</h3>
                <p className="max-w-md text-muted-foreground">Posso ajudar com problemas técnicos. Se não conseguir resolver, abro um chamado para o TI.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Meu PC está lento', 'Impressora não funciona', 'Sem acesso ao email'].map(q => (
                    <Button key={q} variant="outline" size="sm" onClick={() => setInputValue(q)}>{q}</Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(message => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-xl p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                      <p className={`mt-1 text-xs ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {format(message.timestamp, "HH:mm", { locale: ptBR })}
                      </p>
                      {message.ticketSuggestion && (
                        <div className="mt-3 flex gap-2 border-t pt-3">
                          <Button size="sm" variant="secondary" onClick={() => handleAutoCreateTicket(message.ticketSuggestion)}>
                            <Ticket className="mr-2 h-4 w-4" /> Abrir chamado
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleOpenTicketDialog(message.ticketSuggestion)}>Personalizar</Button>
                        </div>
                      )}
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
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input placeholder="Digite sua mensagem..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} className="flex-1" />
              <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Chamado</DialogTitle><DialogDescription>Revise as informações antes de confirmar.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={ticketForm.title} onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={ticketForm.description} onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Categoria</Label><Select value={ticketForm.category_id} onValueChange={v => setTicketForm(p => ({ ...p, category_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Prioridade</Label><Select value={ticketForm.urgency_id} onValueChange={v => setTicketForm(p => ({ ...p, urgency_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTicket} disabled={isCreating}>{isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</> : 'Abrir Chamado'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
