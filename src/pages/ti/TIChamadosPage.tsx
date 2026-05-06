import { useState, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useTickets, type Ticket, type TicketStatus } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MessageSquare, User, Calendar, Clock, Send, AlertCircle, RefreshCw,
  Ticket as TicketIcon, Download, Plus, Trash2, Image, Upload, FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AttachmentCardThumbs, AttachmentList } from "@/components/AttachmentPreview";
import * as XLSX from "xlsx";

const RESOLUTION_TYPES = ["Configuração", "Manutenção", "Hardware", "Software", "Rede", "Acesso/Senha", "Treinamento", "Outro"];
const FINAL_STATUS_NAMES = ["Finalizado", "Resolvido pelo colaborador"];

export default function TIChamadosPage() {
  const {
    tickets, statuses, urgencies, categories, isLoading, error, refetch,
    updateTicketStatus, addMessage, isUpdating, isSendingMessage, deleteTicket,
  } = useTickets();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = useMemo(
    () => (selectedTicketId ? tickets.find(t => t.id === selectedTicketId) ?? null : null),
    [selectedTicketId, tickets]
  );
  const [newMessage, setNewMessage] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [resolveDialog, setResolveDialog] = useState<{ ticketId: string; statusId: string } | null>(null);
  const [resolveForm, setResolveForm] = useState({ is_problem: 'yes', resolution_type: '', resolution_notes: '' });

  const { data: collaborators = [] } = useQuery({
    queryKey: ['profiles-colaboradores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email, sector').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const [ticketForm, setTicketForm] = useState({ title: '', description: '', category_id: '', urgency_id: '', created_by: '' });

  const ticketsByStatus = useMemo(() => {
    const filtered = tickets.filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) || (ticket.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesUrgency = urgencyFilter === "all" || ticket.urgency_id === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });
    return statuses.reduce((acc, status) => {
      acc[status.id] = filtered.filter(t => t.status_id === status.id);
      return acc;
    }, {} as Record<string, Ticket[]>);
  }, [tickets, statuses, searchTerm, urgencyFilter]);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => { e.dataTransfer.setData("ticketId", ticketId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const isFinalStatus = (statusId: string) => {
    const s = statuses.find(s => s.id === statusId);
    return s ? FINAL_STATUS_NAMES.includes(s.name) : false;
  };

  const requestStatusChange = (ticketId: string, statusId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (isFinalStatus(statusId) && ticket && (ticket as any).resolution_type == null) {
      setResolveForm({ is_problem: 'yes', resolution_type: '', resolution_notes: '' });
      setResolveDialog({ ticketId, statusId });
      return;
    }
    updateTicketStatus(ticketId, statusId);
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (ticketId) requestStatusChange(ticketId, statusId);
  };

  const confirmResolution = async () => {
    if (!resolveDialog) return;
    await (supabase as any).from('tickets').update({
      is_problem: resolveForm.is_problem === 'yes',
      resolution_type: resolveForm.resolution_type || null,
      resolution_notes: resolveForm.resolution_notes || null,
    }).eq('id', resolveDialog.ticketId);
    await updateTicketStatus(resolveDialog.ticketId, resolveDialog.statusId);
    setResolveDialog(null);
    refetch();
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;
    await addMessage(selectedTicket.id, newMessage.trim());
    setNewMessage("");
    // Refresh ticket data for messages
    refetch();
  };

  const handleCreateTicket = async () => {
    if (!ticketForm.title || !ticketForm.created_by) return;
    try {
      const firstStatus = statuses[0];
      if (!firstStatus) return;
      const { error } = await supabase.from('tickets').insert({
        title: ticketForm.title, description: ticketForm.description || null,
        category_id: ticketForm.category_id || null, urgency_id: ticketForm.urgency_id || null,
        created_by: ticketForm.created_by, status_id: firstStatus.id,
      });
      if (error) throw error;
      const { data: ticket } = await supabase.from('tickets').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (ticket) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await supabase.from('ticket_messages').insert({ ticket_id: ticket.id, sender_id: user.id, message: '📋 Chamado aberto pelo TI. A equipe já está ciente e trabalhará na resolução.' });
      }
      toast({ title: 'Chamado criado com sucesso!' });
      setCreateDialogOpen(false);
      setTicketForm({ title: '', description: '', category_id: '', urgency_id: '', created_by: '' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      await deleteTicket(ticketToDelete);
      setDeleteDialogOpen(false);
      setTicketToDelete(null);
      if (selectedTicket?.id === ticketToDelete) setSelectedTicket(null);
    } catch {}
  };

  const confirmDelete = (ticketId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTicketToDelete(ticketId);
    setDeleteDialogOpen(true);
  };

  // CSV import handler
  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { toast({ title: 'Planilha vazia', variant: 'destructive' }); return; }

      const firstStatus = statuses[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !firstStatus) return;

      // normalize keys
      const norm = (s: string) => s.toString().toLowerCase().trim();
      const findKey = (row: any, names: string[]) =>
        Object.keys(row).find(k => names.includes(norm(k)));

      let count = 0, skipped = 0;
      for (const row of rows) {
        const tKey = findKey(row, ['titulo', 'título', 'title']);
        const dKey = findKey(row, ['descricao', 'descrição', 'description']);
        const title = tKey ? String(row[tKey]).trim() : '';
        if (!title) { skipped++; continue; }
        const description = dKey ? String(row[dKey]).trim() : null;
        await supabase.from('tickets').insert({
          title, description, created_by: user.id, status_id: firstStatus.id,
        });
        count++;
      }
      toast({ title: `${count} chamado(s) importado(s)`, description: skipped ? `${skipped} linha(s) ignorada(s).` : undefined });
      refetch();
      setImportDialogOpen(false);
      if (importRef.current) importRef.current.value = '';
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ titulo: 'Exemplo de chamado', descricao: 'Detalhes opcionais' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    XLSX.writeFile(wb, 'modelo-chamados.xlsx');
  };

  const getUrgencyColor = (urgencyId: string | null) => urgencies.find(u => u.id === urgencyId)?.color || "#6b7280";
  const getUrgencyName = (urgencyId: string | null) => urgencies.find(u => u.id === urgencyId)?.name || "Não definida";

  if (error) {
    return (
      <DashboardLayout>
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-medium">Erro ao carregar chamados</h3>
          <Button onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar chamados..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Urgência" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {urgencies.map(u => (
                  <SelectItem key={u.id} value={u.id}><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: u.color }} />{u.name}</div></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="mr-1 h-4 w-4" />Novo</Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="mr-1 h-4 w-4" />Importar</Button>
              <Button variant="outline" size="sm" disabled={tickets.length === 0} onClick={() => {
                downloadCSV(tickets.map(t => ({
                  titulo: t.title, descricao: t.description || '', solicitante: t.creator?.full_name || '',
                  setor: t.creator?.sector || '', status: statuses.find(s => s.id === t.status_id)?.name || '',
                  urgencia: urgencies.find(u => u.id === t.urgency_id)?.name || '',
                  criado_em: formatDateForCSV(t.created_at),
                })), 'chamados', [
                  { key: 'titulo', label: 'Título' }, { key: 'solicitante', label: 'Solicitante' },
                  { key: 'setor', label: 'Setor' }, { key: 'status', label: 'Status' },
                  { key: 'urgencia', label: 'Urgência' }, { key: 'criado_em', label: 'Criado em' },
                ]);
              }}><Download className="mr-1 h-4 w-4" />CSV</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-4">
            {statuses.map(status => (
              <div key={status.id} className="flex flex-col" onDragOver={handleDragOver} onDrop={e => handleDrop(e, status.id)}>
                <div className="mb-2 flex items-center justify-between rounded-t-lg border-b-4 bg-card p-2.5" style={{ borderBottomColor: status.color }}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{status.name}</h3>
                    <Badge variant="secondary" className="text-xs">{ticketsByStatus[status.id]?.length || 0}</Badge>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)] rounded-b-lg border bg-secondary/30 p-1.5">
                  <div className="space-y-2">
                    {!ticketsByStatus[status.id]?.length ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <TicketIcon className="mb-2 h-6 w-6 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground">Vazio</p>
                      </div>
                    ) : ticketsByStatus[status.id]?.map(ticket => (
                      <Card key={ticket.id} className="cursor-pointer transition-all hover:shadow-md" draggable onDragStart={e => handleDragStart(e, ticket.id)} onClick={() => setSelectedTicket(ticket)}>
                        <CardContent className="p-2.5">
                          <div className="mb-1.5 flex items-start justify-between gap-1">
                            <h4 className="line-clamp-2 text-xs font-medium leading-tight">{ticket.title}</h4>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive/70 hover:text-destructive" onClick={e => confirmDelete(ticket.id, e)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1"><User className="h-3 w-3" /><span className="max-w-16 truncate">{ticket.creator?.full_name?.split(" ")[0] || "—"}</span></div>
                            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{format(new Date(ticket.created_at), "dd/MM", { locale: ptBR })}</span></div>
                            {ticket.messages && ticket.messages.length > 0 && (
                              <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /><span>{ticket.messages.length}</span></div>
                            )}
                            {ticket.attachments && ticket.attachments.length > 0 && (
                              <div className="flex items-center gap-1"><Image className="h-3 w-3" /><span>{ticket.attachments.length}</span></div>
                            )}
                          </div>
                          {ticket.attachments && ticket.attachments.length > 0 && (
                            <AttachmentCardThumbs urls={ticket.attachments} max={3} />
                          )}
                          {ticket.urgency_id && (
                            <Badge variant="outline" className="mt-1.5 text-[10px]" style={{ borderColor: getUrgencyColor(ticket.urgency_id), color: getUrgencyColor(ticket.urgency_id) }}>
                              {getUrgencyName(ticket.urgency_id)}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start justify-between gap-4 pr-6">
                  <span className="line-clamp-2">{selectedTicket.title}</span>
                  <Badge variant="outline" style={{ borderColor: getUrgencyColor(selectedTicket.urgency_id), color: getUrgencyColor(selectedTicket.urgency_id) }}>
                    {getUrgencyName(selectedTicket.urgency_id)}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-secondary/30 p-3 sm:grid-cols-3">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Solicitante</p><p className="text-sm font-medium">{selectedTicket.creator?.full_name || "—"}</p></div></div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Criado em</p><p className="text-sm font-medium">{format(new Date(selectedTicket.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div></div>
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Status</p>
                    <Select value={selectedTicket.status_id} onValueChange={v => requestStatusChange(selectedTicket.id, v)} disabled={isUpdating}>
                      <SelectTrigger className="h-7 w-36 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div></SelectItem>)}</SelectContent>
                    </Select>
                  </div></div>
                </div>

                {selectedTicket.description && (
                  <div><Label className="text-muted-foreground">Descrição</Label><p className="mt-1 rounded-lg border bg-secondary/30 p-3 text-sm">{selectedTicket.description}</p></div>
                )}

                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Anexos ({selectedTicket.attachments.length})</Label>
                    <div className="mt-1.5">
                      <AttachmentList urls={selectedTicket.attachments} size="md" />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Mensagens</Label>
                  <ScrollArea className="mt-2 h-48 rounded-lg border bg-secondary/30 p-3">
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTicket.messages.map(msg => (
                          <div key={msg.id} className="rounded-lg bg-background p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-medium">{msg.sender?.full_name || "Usuário"}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    )}
                  </ScrollArea>
                </div>

                <div className="flex items-end gap-2">
                  <Textarea placeholder="Digite uma mensagem..." value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    className="min-h-16 resize-none flex-1" />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSendingMessage} size="icon" className="h-10 w-10 shrink-0">
                    {isSendingMessage ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="destructive" size="sm" onClick={() => confirmDelete(selectedTicket.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                <Button variant="outline" onClick={() => setSelectedTicket(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Chamado</DialogTitle><DialogDescription>Crie um chamado em nome de um colaborador.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Colaborador *</Label>
              <Select value={ticketForm.created_by} onValueChange={v => setTicketForm(p => ({ ...p, created_by: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.sector || 'Sem setor'})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Título *</Label><Input placeholder="Resumo do problema" value={ticketForm.title} onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea placeholder="Detalhes..." value={ticketForm.description} onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Categoria</Label><Select value={ticketForm.category_id} onValueChange={v => setTicketForm(p => ({ ...p, category_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Prioridade</Label><Select value={ticketForm.urgency_id} onValueChange={v => setTicketForm(p => ({ ...p, urgency_id: v }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{urgencies.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTicket} disabled={!ticketForm.title || !ticketForm.created_by}>Criar Chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import XLSX Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Importar Chamados (XLSX)</DialogTitle><DialogDescription>Importe um lote de chamados via planilha Excel. Colunas: <strong>titulo</strong> (obrigatório) e <strong>descricao</strong>.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportXLSX} />
            <Button variant="outline" className="w-full" onClick={() => importRef.current?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Selecionar arquivo .xlsx
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Baixar modelo
            </Button>
            <p className="text-xs text-muted-foreground">Os chamados serão criados com status inicial e em seu nome (TI).</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolution Modal — required before closing tickets */}
      <Dialog open={!!resolveDialog} onOpenChange={(o) => !o && setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classificação Técnica</DialogTitle>
            <DialogDescription>Antes de finalizar, registre a classificação do chamado. Visível apenas para o TI.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Foi um problema?</Label>
              <Select value={resolveForm.is_problem} onValueChange={v => setResolveForm(p => ({ ...p, is_problem: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sim, era um problema</SelectItem>
                  <SelectItem value="no">Não (dúvida, configuração, solicitação)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={resolveForm.resolution_type} onValueChange={v => setResolveForm(p => ({ ...p, resolution_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{RESOLUTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição técnica</Label>
              <Textarea rows={3} placeholder="Ex: Reinstalação do driver de rede, ajuste de DNS..." value={resolveForm.resolution_notes} onChange={e => setResolveForm(p => ({ ...p, resolution_notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancelar</Button>
            <Button onClick={confirmResolution} disabled={!resolveForm.resolution_type}>Concluir Chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Chamado</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. O chamado e todas as mensagens serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
