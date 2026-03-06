import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useColaboradorTickets } from '@/hooks/useColaboradorTickets';
import { Bot, Send, Trash2, User, Ticket, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

export default function ColaboradorAssistentePage() {
  const { messages, isLoading, sendMessage, clearMessages, autoCreateTicket } = useAIAssistant();
  const { categories, urgencies, createTicket, isCreating } = useColaboradorTickets();
  const [inputValue, setInputValue] = useState('');
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<ChatMessage['ticketSuggestion'] | null>(null);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category_id: '', urgency_id: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue;
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenTicketDialog = (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    setPendingTicket(suggestion);
    setTicketForm({ title: suggestion.titulo, description: suggestion.descricao, category_id: '', urgency_id: '' });
    setTicketDialogOpen(true);
  };

  const handleAutoCreateTicket = async (suggestion: ChatMessage['ticketSuggestion']) => {
    if (!suggestion) return;
    await autoCreateTicket(suggestion);
  };

  const handleCreateTicket = async () => {
    try {
      await createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        category_id: ticketForm.category_id || undefined,
        urgency_id: ticketForm.urgency_id || undefined,
      });
      setTicketDialogOpen(false);
      setPendingTicket(null);
    } catch {}
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col">
        <Card className="flex flex-1 flex-col overflow-hidden border-none shadow-sm">
          <CardHeader className="flex-shrink-0 border-b bg-card">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                Assistente IA
              </CardTitle>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  <Trash2 className="mr-2 h-4 w-4" /> Limpar
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-2xl bg-primary/10 p-5">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Olá! Sou o Assistente TI</h3>
                  <p className="max-w-md text-muted-foreground">
                    Posso ajudar com problemas técnicos, dúvidas sobre sistemas e equipamentos.
                    Se não conseguir resolver, posso abrir um chamado automaticamente para o TI.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {['Meu PC está lento', 'Impressora não funciona', 'Sem acesso ao email'].map(q => (
                      <Button key={q} variant="outline" size="sm" onClick={() => { setInputValue(q); }}>
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`max-w-[80%] rounded-xl p-3 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
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
                            <Button size="sm" variant="outline" onClick={() => handleOpenTicketDialog(message.ticketSuggestion)}>
                              Personalizar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-xl bg-muted p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="flex-shrink-0 border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir Chamado</DialogTitle>
              <DialogDescription>Revise as informações antes de confirmar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={ticketForm.title} onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={ticketForm.description} onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={ticketForm.category_id} onValueChange={(v) => setTicketForm(prev => ({ ...prev, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={ticketForm.urgency_id} onValueChange={(v) => setTicketForm(prev => ({ ...prev, urgency_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTicket} disabled={isCreating}>
                {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</> : 'Abrir Chamado'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
