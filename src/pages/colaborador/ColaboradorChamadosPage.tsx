import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useColaboradorTickets, Ticket } from '@/hooks/useColaboradorTickets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Ticket as TicketIcon, MessageSquare, Clock, Send, Loader2, ArrowLeft, Paperclip, CheckCircle, Image,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorChamadosPage() {
  const { profile } = useAuth();
  const {
    tickets, statuses, categories, urgencies, isLoading,
    createTicket, isCreating, sendMessage, useTicketMessages, updateTicketStatus,
  } = useColaboradorTickets();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [ticketForm, setTicketForm] = useState({
    title: '', description: '', category_id: '', urgency_id: '',
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticketMessages = [], isLoading: isLoadingMessages } = useTicketMessages(
    selectedTicket?.id ?? null
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticketMessages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('ticket-attachments').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('ticket-attachments').getPublicUrl(path);
        uploaded.push(urlData.publicUrl);
      }
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      await createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        category_id: ticketForm.category_id || undefined,
        urgency_id: ticketForm.urgency_id || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setCreateDialogOpen(false);
      setTicketForm({ title: '', description: '', category_id: '', urgency_id: '' });
      setAttachments([]);
    } catch {}
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    try {
      await sendMessage({ ticketId: selectedTicket.id, message: newMessage });
      setNewMessage('');
    } catch {}
  };

  const handleMarkResolved = async () => {
    if (!selectedTicket) return;
    const resolvedStatus = statuses.find(s => s.name === 'Resolvido pelo colaborador');
    if (resolvedStatus) {
      await updateTicketStatus({ ticketId: selectedTicket.id, statusId: resolvedStatus.id });
      setSelectedTicket(null);
    }
  };

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
      yellow: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
      orange: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
      green: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
      red: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
      purple: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
      gray: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
    };
    return colors[color] || 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    return (
      <DashboardLayout>
        <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{selectedTicket.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Aberto em {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                {selectedTicket.status && (
                  <Badge variant="outline" className={getStatusColor(selectedTicket.status.color)}>
                    {selectedTicket.status.name}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={handleMarkResolved}>
              <CheckCircle className="mr-2 h-4 w-4" /> Resolvi sozinho
            </Button>
          </div>

          <div className="grid flex-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{selectedTicket.description || 'Sem descrição'}</p>
                </div>
                {selectedTicket.category && (
                  <div>
                    <Label className="text-muted-foreground">Categoria</Label>
                    <p className="text-sm">{selectedTicket.category.name}</p>
                  </div>
                )}
                {selectedTicket.urgency && (
                  <div>
                    <Label className="text-muted-foreground">Prioridade</Label>
                    <Badge variant="outline" className={getStatusColor(selectedTicket.urgency.color)}>
                      {selectedTicket.urgency.name}
                    </Badge>
                  </div>
                )}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Anexos</Label>
                    <div className="mt-1 space-y-1">
                      {selectedTicket.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Image className="h-3 w-3" /> Anexo {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" /> Mensagens
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : ticketMessages.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticketMessages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.sender_id === profile?.id ? 'flex-row-reverse' : ''}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${msg.sender_id === profile?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <p className="mb-1 text-xs font-medium">{msg.sender?.full_name || 'Usuário'}</p>
                            <p className="text-sm">{msg.message}</p>
                            <p className={`mt-1 text-xs ${msg.sender_id === profile?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Tickets list
  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Meus Chamados</h2>
            <p className="text-muted-foreground">Acompanhe o status das suas solicitações em tempo real</p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo Chamado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Chamado</DialogTitle>
                <DialogDescription>Descreva o problema que você está enfrentando.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input placeholder="Resumo do problema" value={ticketForm.title} onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea placeholder="Descreva o problema em detalhes..." value={ticketForm.description} onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))} rows={4} />
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
                {/* File attachments */}
                <div>
                  <Label>Anexos (prints, arquivos)</Label>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                  <Button type="button" variant="outline" size="sm" className="mt-1 w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Paperclip className="mr-2 h-4 w-4" /> Anexar arquivo</>}
                  </Button>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Image className="h-3 w-3" />
                          <span>Arquivo {i + 1} anexado</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateTicket} disabled={isCreating || !ticketForm.title}>
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Abrindo...</> : 'Abrir Chamado'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Badge key={status.id} variant="outline" className={getStatusColor(status.color)}>
              {status.name}
            </Badge>
          ))}
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TicketIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">Nenhum chamado</h3>
              <p className="text-muted-foreground">Clique em "Novo Chamado" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="cursor-pointer transition-all hover:shadow-md" onClick={() => setSelectedTicket(ticket)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <TicketIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{ticket.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        {ticket.category && <><span>•</span><span>{ticket.category.name}</span></>}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <><span>•</span><Paperclip className="h-3 w-3" /><span>{ticket.attachments.length}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ticket.status && <Badge variant="outline" className={getStatusColor(ticket.status.color)}>{ticket.status.name}</Badge>}
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
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
