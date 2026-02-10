import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useTickets, type Ticket, type TicketStatus } from "@/hooks/useTickets";
import {
  Search,
  MessageSquare,
  User,
  Calendar,
  Clock,
  ChevronRight,
  Send,
  AlertCircle,
  RefreshCw,
  Ticket as TicketIcon,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function TIChamadosPage() {
  const {
    tickets,
    statuses,
    urgencies,
    isLoading,
    error,
    refetch,
    updateTicketStatus,
    addMessage,
    isUpdating,
    isSendingMessage,
  } = useTickets();

  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");

  // Group tickets by status for Kanban
  const ticketsByStatus = useMemo(() => {
    const filtered = tickets.filter((ticket) => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesUrgency =
        urgencyFilter === "all" || ticket.urgency_id === urgencyFilter;

      return matchesSearch && matchesUrgency;
    });

    return statuses.reduce((acc, status) => {
      acc[status.id] = filtered.filter((t) => t.status_id === status.id);
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [tickets, statuses, searchTerm, urgencyFilter]);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (ticketId) {
      await updateTicketStatus(ticketId, statusId);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    await addMessage(selectedTicket.id, newMessage.trim());
    setNewMessage("");
  };

  const getUrgencyColor = (urgencyId: string | null) => {
    const urgency = urgencies.find((u) => u.id === urgencyId);
    return urgency?.color || "#6b7280";
  };

  const getUrgencyName = (urgencyId: string | null) => {
    const urgency = urgencies.find((u) => u.id === urgencyId);
    return urgency?.name || "Não definida";
  };

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Erro ao carregar chamados</h3>
            <p className="mb-4 text-muted-foreground">
              Não foi possível carregar a lista de chamados.
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        {/* Filters */}
        <Card className="card-institutional">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar chamados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as urgências</SelectItem>
                {urgencies.map((urgency) => (
                  <SelectItem key={urgency.id} value={urgency.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: urgency.color }}
                      />
                      {urgency.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCSV(
                  tickets.map(t => ({
                    titulo: t.title,
                    descricao: t.description || '',
                    solicitante: t.creator?.full_name || '',
                    setor: t.creator?.sector || '',
                    atribuido: t.assignee?.full_name || '',
                    status: statuses.find(s => s.id === t.status_id)?.name || '',
                    urgencia: urgencies.find(u => u.id === t.urgency_id)?.name || '',
                    criado_em: formatDateForCSV(t.created_at),
                    atualizado_em: formatDateForCSV(t.updated_at),
                    fechado_em: formatDateForCSV(t.closed_at),
                    mensagens: t.messages?.length || 0,
                  })),
                  'chamados',
                  [
                    { key: 'titulo', label: 'Título' },
                    { key: 'descricao', label: 'Descrição' },
                    { key: 'solicitante', label: 'Solicitante' },
                    { key: 'setor', label: 'Setor' },
                    { key: 'atribuido', label: 'Atribuído a' },
                    { key: 'status', label: 'Status' },
                    { key: 'urgencia', label: 'Urgência' },
                    { key: 'criado_em', label: 'Criado em' },
                    { key: 'atualizado_em', label: 'Atualizado em' },
                    { key: 'fechado_em', label: 'Fechado em' },
                    { key: 'mensagens', label: 'Mensagens' },
                  ]
                );
              }}
              disabled={tickets.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-4">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status.id)}
              >
                <div
                  className="mb-3 flex items-center justify-between rounded-t-lg border-b-4 bg-card p-3"
                  style={{ borderBottomColor: status.color }}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{status.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {ticketsByStatus[status.id]?.length || 0}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="h-[calc(100vh-320px)] rounded-b-lg border bg-secondary/30 p-2">
                  <div className="space-y-2">
                    {ticketsByStatus[status.id]?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <TicketIcon className="mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum chamado
                        </p>
                      </div>
                    ) : (
                      ticketsByStatus[status.id]?.map((ticket) => (
                        <Card
                          key={ticket.id}
                          className="cursor-pointer transition-all hover:shadow-md"
                          draggable
                          onDragStart={(e) => handleDragStart(e, ticket.id)}
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-3">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <h4 className="line-clamp-2 text-sm font-medium">
                                {ticket.title}
                              </h4>
                              <Badge
                                variant="outline"
                                className="shrink-0 text-xs"
                                style={{
                                  borderColor: getUrgencyColor(ticket.urgency_id),
                                  color: getUrgencyColor(ticket.urgency_id),
                                }}
                              >
                                {getUrgencyName(ticket.urgency_id)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="max-w-20 truncate">
                                  {ticket.creator?.full_name?.split(" ")[0] || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {format(new Date(ticket.created_at), "dd/MM", {
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                              {ticket.messages && ticket.messages.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{ticket.messages.length}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start justify-between gap-4 pr-6">
                  <span className="line-clamp-2">{selectedTicket.title}</span>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: getUrgencyColor(selectedTicket.urgency_id),
                      color: getUrgencyColor(selectedTicket.urgency_id),
                    }}
                  >
                    {getUrgencyName(selectedTicket.urgency_id)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Info */}
                <div className="grid gap-4 rounded-lg border bg-secondary/30 p-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Solicitante</p>
                      <p className="text-sm font-medium">
                        {selectedTicket.creator?.full_name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Criado em</p>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedTicket.created_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Select
                        value={selectedTicket.status_id}
                        onValueChange={(value) =>
                          updateTicketStatus(selectedTicket.id, value)
                        }
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="h-7 w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                {status.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedTicket.description && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="mt-1 rounded-lg border bg-secondary/30 p-3 text-sm">
                      {selectedTicket.description}
                    </p>
                  </div>
                )}

                {/* Messages */}
                <div>
                  <Label className="text-muted-foreground">Mensagens</Label>
                  <ScrollArea className="mt-2 h-48 rounded-lg border bg-secondary/30 p-3">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTicket.messages.map((msg) => (
                          <div key={msg.id} className="rounded-lg bg-background p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {msg.sender?.full_name || "Usuário"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(
                                  new Date(msg.created_at),
                                  "dd/MM/yyyy 'às' HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {msg.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Nenhuma mensagem ainda
                      </p>
                    )}
                  </ScrollArea>
                </div>

                {/* New Message */}
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-16 resize-none flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSendingMessage}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                  >
                    {isSendingMessage ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
