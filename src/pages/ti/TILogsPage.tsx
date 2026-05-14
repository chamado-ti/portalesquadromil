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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Eye,
  ShieldAlert,
  ArrowRight
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
    <DashboardLayout title="Auditoria do Sistema">
      <div className="space-y-8 animate-fade-in">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total de Registros" value={logs.length} icon={FileText} color="text-blue-600" bg="bg-blue-50" />
          <StatCard 
            title="Hoje" 
            value={logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length} 
            icon={Calendar} 
            color="text-indigo-600" 
            bg="bg-indigo-50" 
          />
          <StatCard title="Ações Críticas" value={logs.filter(l => l.action.includes('delete') || l.action.includes('reset')).length} icon={ShieldAlert} color="text-rose-600" bg="bg-rose-50" />
          <StatCard title="Módulos Ativos" value={entityTypes.length} icon={Activity} color="text-amber-600" bg="bg-amber-50" />
        </div>

        <Card className="card-institutional border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 px-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Histórico de Operações</CardTitle>
              <p className="text-xs text-muted-foreground">Rastreabilidade total de todas as ações realizadas no portal esquadromil.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ação, usuário ou detalhe..."
                  className="pl-9 w-[280px] h-10 bg-muted/30 border-none rounded-xl text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[160px] h-10 bg-muted/30 border-none rounded-xl text-sm">
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas Ações</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_CONFIG[action]?.label || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground pl-6">Data/Hora</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Usuário</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Ação</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Módulo</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground pr-6">Detalhes do Evento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="group hover:bg-muted/10 transition-colors border-b">
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{format(new Date(log.created_at), "dd/MM/yyyy")}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(log.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-bold text-[10px]">
                              {log.user?.full_name?.charAt(0) || "S"}
                            </div>
                            <span className="text-sm font-medium text-foreground">{log.user?.full_name || "Sistema"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-lg font-bold text-[9px] uppercase border px-2 py-0.5", ACTION_CONFIG[log.action]?.color || "bg-muted text-muted-foreground")}>
                            {ACTION_CONFIG[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter bg-muted/50 px-1.5 py-0.5 rounded">
                            {log.entity_type || "Geral"}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6">
                          {log.details ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter hover:bg-primary/5 hover:text-primary">
                                  <Eye className="mr-1.5 h-3 w-3" /> Ver JSON
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl bg-[#1e1e1e] border-none text-white p-0 overflow-hidden rounded-2xl">
                                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary-foreground/70">Payload do Evento</h3>
                                  <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">{log.action}</Badge>
                                </div>
                                <ScrollArea className="h-[400px] w-full p-6">
                                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
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
  
function StatCard({ title, value, icon: Icon, color, bg }: any) {  
  return (  
    <Card className=\" card-institutional border-none shadow-sm group hover:shadow-md transition-all "duration-300\>  
      <CardContent className=\p-4\>  
        <div className=\flex" items-center justify-between "mb-2\>  
          <div className={cn(\p-2" rounded-xl "transition-colors\, bg)}>  
            <Icon className={cn(\h-4" "w-4\, color)} />  
          </div>  
          <ArrowRight className=\h-4" w-4 text-muted-foreground/10 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 "transition-all\ />  
        </div>  
        <div className=\space-y-0.5\>  
          <p className=\text-[10px]" font-bold uppercase tracking-wider "text-muted-foreground\>{title}</p>  
          <h3 className=\text-xl" font-bold text-foreground "truncate\>{value}</h3>  
        </div>  
      </CardContent>  
    </Card>  
  );  
