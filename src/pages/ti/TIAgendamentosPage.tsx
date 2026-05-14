import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  Trash2,
  CheckCircle2,
  Timer,
  AlertTriangle,
  History
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "Pendente", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Timer },
  confirmed: { label: "Confirmado", className: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
  completed: { label: "Concluído", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", className: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle },
};

export default function TIAgendamentosPage() {
  const { appointments, isLoading, error, refetch } = useAppointments();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesSearch =
        apt.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apt.purpose?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (apt.user?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || apt.status === statusFilter;

      let matchesDate = true;
      const aptDate = parseISO(apt.scheduled_date);
      if (dateFilter === "today") {
        matchesDate = isToday(aptDate);
      } else if (dateFilter === "tomorrow") {
        matchesDate = isTomorrow(aptDate);
      } else if (dateFilter === "past") {
        matchesDate = isPast(aptDate) && !isToday(aptDate);
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchTerm, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const next = appointments.filter((a) => {
      const aptDate = parseISO(a.scheduled_date);
      return isAfter(aptDate, new Date()) && !isToday(aptDate);
    }).length;

    return { total: appointments.length, today, pending, completed, late, rate, next };
  }, [appointments]);

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="text-lg font-bold uppercase tracking-wider">Erro ao carregar agendamentos</h3>
            <Button onClick={() => refetch()} className="mt-4 shadow-institutional">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Agendamentos</h2>
            <p className="text-muted-foreground mt-1">Controle de visitas e acesso às dependências da empresa.</p>
          </div>
          <Button
            variant="outline"
            className="h-10 px-6 font-bold shadow-sm"
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
                  { key: 'visitante', label: 'Visitante' }, { key: 'documento', label: 'Documento' },
                  { key: 'colaborador', label: 'Colaborador' }, { key: 'setor', label: 'Setor' },
                  { key: 'data', label: 'Data' }, { key: 'hora', label: 'Hora' },
                  { key: 'motivo', label: 'Motivo' }, { key: 'status', label: 'Status' }
                ]
              );
            }}
            disabled={filteredAppointments.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Hoje', value: stats.today, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Pendentes', value: stats.pending, icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Concluídos', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Atrasados', value: stats.late, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Taxa Conclusão', value: `${stats.rate}%`, icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((kpi, idx) => (
            <Card key={idx} className="card-institutional border-none shadow-sm">
              <CardContent className="p-4">
                <div className={`p-2 w-fit rounded-lg ${kpi.bg} mb-3`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
    <DashboardLayout title="Controle de Agendamentos">
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Para Hoje" value={stats.today} icon={Calendar} color="text-blue-600" bg="bg-blue-50" />
          <StatCard title="Atrasados" value={stats.late} icon={AlertTriangle} color="text-rose-600" bg="bg-rose-50" />
          <StatCard title="Pendentes" value={stats.pending} icon={Timer} color="text-amber-600" bg="bg-amber-50" />
          <StatCard title="Concluídos" value={stats.completed} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard title="Próximos" value={stats.next} icon={Clock} color="text-indigo-600" bg="bg-indigo-50" />
          <StatCard title="Taxa Conclusão" value={`${stats.rate}%`} icon={Activity} color="text-purple-600" bg="bg-purple-50" />
        </div>

        <Card className="card-institutional border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 px-6">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Registro de Visitantes</CardTitle>
              <p className="text-xs text-muted-foreground">Monitore e gerencie todos os acessos e visitas agendadas para a empresa.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar visitante ou responsável..."
                  className="pl-9 w-[280px] h-10 bg-muted/30 border-none rounded-xl text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-lg font-bold uppercase text-muted-foreground/50">Nenhum agendamento encontrado</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="px-6 h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Visitante</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Colaborador</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Data/Hora</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Motivo</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="px-6 h-12 text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((apt) => (
                      <TableRow key={apt.id} className="hover:bg-muted/20 transition-colors group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 border border-primary/10 font-bold text-primary group-hover:scale-110 transition-transform">
                              {apt.visitor_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{apt.visitor_name}</p>
                              {apt.visitor_document && <p className="text-[10px] text-muted-foreground uppercase font-medium">{apt.visitor_document}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{apt.user?.full_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">{apt.user?.sector || "Sem setor"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-foreground">
                              {format(parseISO(apt.scheduled_date), "dd/MM/yyyy")}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {apt.scheduled_time.substring(0, 5)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">{apt.purpose || "—"}</p>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const StatusIcon = STATUS_CONFIG[apt.status]?.icon;
                            return (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-tighter h-6 px-2 flex items-center gap-1 w-fit",
                                  STATUS_CONFIG[apt.status]?.className
                                )}
                              >
                                {StatusIcon && <StatusIcon className="h-3 w-3" />}
                                {STATUS_CONFIG[apt.status]?.label || apt.status}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                            onClick={async () => {
                              if (!confirm('Deseja excluir este agendamento?')) return;
                              const { error: delErr } = await supabase.from('appointments').delete().eq('id', apt.id);
                              if (delErr) toast({ title: 'Erro ao excluir', description: delErr.message, variant: 'destructive' });
                              else { toast({ title: 'Agendamento excluído' }); refetch(); }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
}  
