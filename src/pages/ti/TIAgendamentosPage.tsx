import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { downloadCSV, formatDateForCSV } from "@/lib/csvExport";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAppointments } from "@/hooks/useAppointments";
import {
  Search,
  Calendar,
  Clock,
  User,
  Building2,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
} from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmado", className: "bg-info/15 text-info" },
  completed: { label: "Concluído", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelado", className: "bg-destructive/15 text-destructive" },
};

export default function TIAgendamentosPage() {
  const { appointments, isLoading, error, refetch } = useAppointments();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Filter appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.purpose?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (apt.user?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;

    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate = isToday(new Date(apt.scheduled_date));
    } else if (dateFilter === "tomorrow") {
      matchesDate = isTomorrow(new Date(apt.scheduled_date));
    } else if (dateFilter === "past") {
      matchesDate = isPast(new Date(apt.scheduled_date)) && !isToday(new Date(apt.scheduled_date));
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Stats
  const stats = {
    total: appointments.length,
    today: appointments.filter((a) => isToday(new Date(a.scheduled_date))).length,
    pending: appointments.filter((a) => a.status === "pending").length,
    completed: appointments.filter((a) => a.status === "completed").length,
  };

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Erro ao carregar agendamentos</h3>
            <p className="mb-4 text-muted-foreground">
              Não foi possível carregar a lista de agendamentos.
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
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold text-info">{stats.today}</p>
                </div>
                <Clock className="h-8 w-8 text-info/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                  <p className="text-2xl font-bold text-success">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="card-institutional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Agendamentos (Somente Leitura)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCSV(
                  filteredAppointments.map(a => ({
                    visitante: a.visitor_name,
                    documento: a.visitor_document || '',
                    colaborador: a.user?.full_name || '',
                    setor: a.user?.sector || '',
                    data: a.scheduled_date,
                    hora: a.scheduled_time?.substring(0, 5) || '',
                    duracao: `${a.duration_minutes} min`,
                    motivo: a.purpose || '',
                    status: STATUS_CONFIG[a.status]?.label || a.status,
                    entrada: formatDateForCSV(a.entry_at),
                    saida: formatDateForCSV(a.exit_at),
                  })),
                  'agendamentos',
                  [
                    { key: 'visitante', label: 'Visitante' },
                    { key: 'documento', label: 'Documento' },
                    { key: 'colaborador', label: 'Colaborador' },
                    { key: 'setor', label: 'Setor' },
                    { key: 'data', label: 'Data' },
                    { key: 'hora', label: 'Hora' },
                    { key: 'duracao', label: 'Duração' },
                    { key: 'motivo', label: 'Motivo' },
                    { key: 'status', label: 'Status' },
                    { key: 'entrada', label: 'Entrada' },
                    { key: 'saida', label: 'Saída' },
                  ]
                );
              }}
              disabled={filteredAppointments.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por visitante, motivo ou colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="tomorrow">Amanhã</SelectItem>
                  <SelectItem value="past">Passados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">
                  Nenhum agendamento encontrado
                </h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros para ver mais resultados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visitante</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              {apt.visitor_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{apt.visitor_name}</p>
                              {apt.visitor_document && (
                                <p className="text-sm text-muted-foreground">
                                  {apt.visitor_document}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {apt.user?.full_name || "—"}
                              </p>
                              {apt.user?.sector && (
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  {apt.user.sector}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">
                                {format(new Date(apt.scheduled_date), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {apt.scheduled_time.substring(0, 5)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {apt.duration_minutes} min
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {apt.purpose || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              STATUS_CONFIG[apt.status]?.className
                            )}
                          >
                            {STATUS_CONFIG[apt.status]?.label || apt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Info note */}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-sm text-info">
              <Eye className="h-4 w-4 shrink-0" />
              <p>
                Esta é uma visualização somente leitura. Agendamentos são criados e
                gerenciados pelos colaboradores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
