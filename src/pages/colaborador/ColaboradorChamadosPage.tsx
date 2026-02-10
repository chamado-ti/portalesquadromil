import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useColaboradorTickets, Ticket } from '@/hooks/useColaboradorTickets';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Ticket as TicketIcon,
  MessageSquare,
  Clock,
  Send,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorChamadosPage() {
  const { profile } = useAuth();
  const {
    tickets,
    statuses,
    categories,
    urgencies,
    isLoading,
    createTicket,
    isCreating,
    sendMessage,
    useTicketMessages,
  } = useColaboradorTickets();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category_id: '',
    urgency_id: '',
  });

  const { data: ticketMessages = [], isLoading: isLoadingMessages } = useTicketMessages(
    selectedTicket?.id ?? null
  );

  const handleCreateTicket = async () => {
    try {
      await createTicket({
        title: ticketForm.title,
        description: ticketForm.description,
        category_id: ticketForm.category_id || undefined,
        urgency_id: ticketForm.urgency_id || undefined,
      });
      setCreateDialogOpen(false);
      setTicketForm({ title: '', description: '', category_id: '', urgency_id: '' });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      await sendMessage({ ticketId: selectedTicket.id, message: newMessage });
      setNewMessage('');
    } catch (error) {
      // Error handled by hook
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
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    return (
      <DashboardLayout>
        <div className="animate-fade-in flex h-[calc(100vh-8rem)] flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
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
          </div>

          <div className="grid flex-1 gap-4 lg:grid-cols-3">
            {/* Ticket info */}
            <Card className="card-institutional lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
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
                    <Badge
                      variant="outline"
                      className={getStatusColor(selectedTicket.urgency.color)}
                    >
                      {selectedTicket.urgency.name}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="card-institutional flex flex-col lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  Mensagens
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : ticketMessages.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      <p>Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ticketMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.sender_id === profile?.id ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.sender_id === profile?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="mb-1 text-xs font-medium">
                              {msg.sender?.full_name || 'Usuário'}
                            </p>
                            <p className="text-sm">{msg.message}</p>
                            <p
                              className={`mt-1 text-xs ${
                                msg.sender_id === profile?.id
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
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
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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

  // Tickets list view
  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Meus Chamados</h2>
            <p className="text-muted-foreground">
              Acompanhe o status das suas solicitações em tempo real
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Chamado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Abrir Chamado</DialogTitle>
                <DialogDescription>
                  Descreva o problema que você está enfrentando.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    placeholder="Resumo do problema"
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva o problema em detalhes..."
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={ticketForm.category_id}
                      onValueChange={(value) => setTicketForm(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={ticketForm.urgency_id}
                      onValueChange={(value) => setTicketForm(prev => ({ ...prev, urgency_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencies.map((urg) => (
                          <SelectItem key={urg.id} value={urg.id}>
                            {urg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTicket} disabled={isCreating || !ticketForm.title}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Abrindo...
                    </>
                  ) : (
                    'Abrir Chamado'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Badge key={status.id} variant="outline" className={getStatusColor(status.color)}>
              {status.name}
            </Badge>
          ))}
        </div>

        {/* Tickets list */}
        {tickets.length === 0 ? (
          <Card className="card-institutional">
            <CardContent className="py-12 text-center">
              <TicketIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 text-lg font-medium">Nenhum chamado</h3>
              <p className="text-muted-foreground">
                Você ainda não abriu nenhum chamado. Clique em "Novo Chamado" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className="card-institutional cursor-pointer transition-all hover:shadow-md"
                onClick={() => setSelectedTicket(ticket)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <TicketIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{ticket.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {ticket.category && (
                          <>
                            <span>•</span>
                            <span>{ticket.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ticket.status && (
                      <Badge variant="outline" className={getStatusColor(ticket.status.color)}>
                        {ticket.status.name}
                      </Badge>
                    )}
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
