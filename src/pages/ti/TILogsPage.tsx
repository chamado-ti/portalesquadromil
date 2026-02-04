import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useAuditLogs, type AuditLog } from "@/hooks/useAuditLogs";
import {
  Search,
  FileText,
  User,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  Shield,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  user_created: { label: "Usuário criado", color: "bg-success/15 text-success" },
  user_updated: { label: "Usuário atualizado", color: "bg-info/15 text-info" },
  user_deleted: { label: "Usuário excluído", color: "bg-destructive/15 text-destructive" },
  password_reset: { label: "Senha redefinida", color: "bg-warning/15 text-warning" },
  login: { label: "Login", color: "bg-primary/15 text-primary" },
  logout: { label: "Logout", color: "bg-muted text-muted-foreground" },
  ticket_created: { label: "Chamado criado", color: "bg-info/15 text-info" },
  ticket_updated: { label: "Chamado atualizado", color: "bg-info/15 text-info" },
  appointment_created: { label: "Agendamento criado", color: "bg-success/15 text-success" },
  qr_scanned: { label: "QR Code lido", color: "bg-primary/15 text-primary" },
};

export default function TILogsPage() {
  const { logs, isLoading, error, refetch } = useAuditLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  // Get unique entity types
  const entityTypes = Array.from(
    new Set(logs.map((log) => log.entity_type).filter(Boolean))
  );

  // Get unique actions
  const actions = Array.from(new Set(logs.map((log) => log.action)));

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (log.entity_type?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details || {})
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity =
      entityFilter === "all" || log.entity_type === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Erro ao carregar logs</h3>
            <p className="mb-4 text-muted-foreground">
              Não foi possível carregar os logs de auditoria.
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Registros</p>
                  <p className="text-2xl font-bold">{logs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold text-info">
                    {
                      logs.filter((l) => {
                        const logDate = new Date(l.created_at).toDateString();
                        const today = new Date().toDateString();
                        return logDate === today;
                      }).length
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-info/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tipos de Ação</p>
                  <p className="text-2xl font-bold text-warning">{actions.length}</p>
                </div>
                <Shield className="h-8 w-8 text-warning/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="card-institutional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Logs de Auditoria
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Somente Leitura
            </Badge>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_CONFIG[action]?.label || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as entidades</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type!}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">Nenhum log encontrado</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros para ver mais resultados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm">
                                {format(new Date(log.created_at), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "HH:mm:ss", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {log.user?.full_name || "Sistema"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              ACTION_CONFIG[log.action]?.color || "bg-muted"
                            )}
                          >
                            {ACTION_CONFIG[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">
                            {log.entity_type || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <pre className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                              {JSON.stringify(log.details, null, 2).substring(0, 50)}...
                            </pre>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Info note */}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              <Shield className="h-4 w-4 shrink-0" />
              <p>
                Logs de auditoria são imutáveis e não podem ser editados ou excluídos.
                Todas as ações críticas do sistema são registradas automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
