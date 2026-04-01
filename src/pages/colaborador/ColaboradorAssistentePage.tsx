import { useState, useCallback, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAIAssistant, ChatMessage, FileAttachment } from '@/hooks/useAIAssistant';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useColaboradorTickets } from '@/hooks/useColaboradorTickets';
import { Ticket, Loader2 } from 'lucide-react';

export default function ColaboradorAssistentePage() {
  const { messages, isLoading, sendMessage, clearMessages, autoCreateTicket, setMessages } = useAIAssistant();
  const { conversations, createConversation, updateConversation, deleteConversation } = useAIConversations();
  const { categories, urgencies, createTicket, isCreating } = useColaboradorTickets();
  const [inputValue, setInputValue] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<ChatMessage['ticketSuggestion'] | null>(null);
  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category_id: '', urgency_id: '' });

  const loadConversation = useCallback((conv: typeof conversations[0]) => {
    setActiveConversationId(conv.id);
    const loaded: ChatMessage[] = (conv.messages as any[]).map((m: any) => ({
      id: m.id || crypto.randomUUID(), role: m.role, content: m.content,
      timestamp: new Date(m.timestamp || Date.now()), ticketSuggestion: m.ticketSuggestion, attachments: m.attachments,
    }));
    setMessages(loaded);
  }, [setMessages]);

  const saveConversation = useCallback(async () => {
    if (!activeConversationId || messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 50) || 'Nova Conversa';
    await updateConversation({
      id: activeConversationId,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString(), ticketSuggestion: m.ticketSuggestion })) as any,
      title,
    });
  }, [activeConversationId, messages, updateConversation]);

  useEffect(() => {
    if (messages.length > 0 && activeConversationId && !isLoading) {
      const timer = setTimeout(saveConversation, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, activeConversationId, isLoading, saveConversation]);

  const handleNewChat = async () => {
    const conv = await createConversation('Nova Conversa');
    setActiveConversationId(conv.id);
    clearMessages();
  };

  const handleDeleteConv = async (id: string) => {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) { setActiveConversationId(null); clearMessages(); }
    } catch (err) { console.error('Delete error:', err); }
  };

  const handleSend = async (attachments?: FileAttachment[]) => {
    if (!inputValue.trim() && (!attachments || attachments.length === 0)) return;
    if (!activeConversationId) {
      const conv = await createConversation(inputValue.slice(0, 50) || 'Arquivo');
      setActiveConversationId(conv.id);
    }
    const msg = inputValue;
    setInputValue('');
    await sendMessage(msg, attachments);
  };

  const renderTicketActions = (msg: ChatMessage) => {
    if (!msg.ticketSuggestion) return null;
    return (
      <div className="mt-3 flex gap-2 border-t pt-3">
        <Button size="sm" variant="secondary" onClick={() => autoCreateTicket(msg.ticketSuggestion)}>
          <Ticket className="mr-2 h-4 w-4" /> Abrir chamado
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setPendingTicket(msg.ticketSuggestion!);
          setTicketForm({ title: msg.ticketSuggestion!.titulo, description: msg.ticketSuggestion!.descricao, category_id: '', urgency_id: '' });
          setTicketDialogOpen(true);
        }}>Personalizar</Button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        onNewChat={handleNewChat}
        onClear={() => { clearMessages(); setActiveConversationId(null); }}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversation}
        onDeleteConversation={handleDeleteConv}
        title="Assistente IA"
        subtitle="Posso ajudar com problemas técnicos. Envie prints, PDFs ou áudios. Se não conseguir resolver, abro um chamado."
        quickPrompts={['Meu PC está lento', 'Impressora não funciona', 'Sem acesso ao email']}
        renderTicketActions={renderTicketActions}
      />

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
            <Button onClick={async () => { try { await createTicket({ title: ticketForm.title, description: ticketForm.description, category_id: ticketForm.category_id || undefined, urgency_id: ticketForm.urgency_id || undefined }); setTicketDialogOpen(false); } catch {} }} disabled={isCreating}>
              {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</> : 'Abrir Chamado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
