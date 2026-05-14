import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/hooks/useTickets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Users, Ticket, Calendar, TrendingUp, ArrowRight, AlertTriangle, 
  CheckCircle2, Clock, BarChart3, Activity, ShieldAlert, Timer,
  UserCheck, Zap, Target, History, Settings, ExternalLink
} from 'lucide-react';
import { format, isSameDay, parseISO, differenceInMinutes, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaTrendChart, AnimatedPieChart } from '@/components/ti/relatorios/charts/BaseCharts';

export default function TIDashboard() {
  const { profile } = useAuth();
  const { tickets, statuses, urgencies, isLoading: isLoadingTickets } = useTickets();

  // 1. Queries de apoio
  const usersQuery = useQuery({
    queryKey: ['profiles-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, is_active');
      if (error) throw error;
      return data;
    },
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('appointments').select('id, scheduled_date, status');
      if (error) throw error;
      return data;
    },
  });

  // 2. Lógica de cálculo dos 10 KPIs
  const stats = useMemo(() => {
    if (isLoadingTickets) return null;

    const CLOSED_NAMES = ['finalizado', 'resolvido', 'concluido', 'concluído', 'fechado'];
    const isClosed = (t: any) => {
      const status = statuses.find(s => s.id === t.status_id);
      return status && CLOSED_NAMES.some(n => status.name.toLowerCase().includes(n));
    };

    const open = tickets.filter(t => !isClosed(t));
    const finished = tickets.filter(t => isClosed(t));
    const critical = open.filter(t => {
      const urg = urgencies.find(u => u.id === t.urgency_id);
      return urg && (urg.name.toLowerCase().includes('crítico') || urg.name.toLowerCase().includes('urgente'));
    });

    const today = new Date();
    const resolvedToday = tickets.filter(t => t.closed_at && isSameDay(parseISO(t.closed_at), today));
    const todayAppointments = (appointmentsQuery.data || []).filter(a => isSameDay(parseISO(a.scheduled_date), today));

    // SLA Calculations
    let outOfSLA = 0;
    let nearSLA = 0;
    open.forEach(t => {
      const urg = urgencies.find(u => u.id === t.urgency_id);
      if (urg && urg.response_time_minutes) {
        const elapsed = differenceInMinutes(new Date(), parseISO(t.created_at));
        if (elapsed > urg.response_time_minutes) {
          outOfSLA++;
        } else if (elapsed > urg.response_time_minutes * 0.8) {
          nearSLA++;
        }
      }
    });

    const activeUsers = (usersQuery.data || []).filter(u => u.is_active).length;
    const resolutionRate = tickets.length > 0 ? Math.round((finished.length / tickets.length) * 100) : 0;

    return {
      activeUsers,
      openTickets: open.length,
      criticalTickets: critical.length,
      finishedTickets: finished.length,
      todayAppointments: todayAppointments.length,
      nearSLA,
      outOfSLA,
      resolvedToday: resolvedToday.length,
      resolutionRate,
      totalTickets: tickets.length
    };
  }, [tickets, statuses, urgencies, isLoadingTickets, usersQuery.data, appointmentsQuery.data]);

  // 3. Dados para gráficos resumidos
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = tickets.filter(t => format(parseISO(t.created_at), 'yyyy-MM-dd') === dateStr).length;
      return { date: format(date, 'dd/MM'), value: count };
    });

    const priorityDist = urgencies.map(u => ({
      name: u.name,
      value: tickets.filter(t => t.urgency_id === u.id).length
    })).filter(d => d.value > 0);

    return { last7Days, priorityDist };
  }, [tickets, urgencies]);

  const kpis = [
    { label: 'Ativos', value: stats?.activeUsers || 0, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Abertos', value: stats?.openTickets || 0, icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Críticos', value: stats?.criticalTickets || 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Finalizados', value: stats?.finishedTickets || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Resolvidos Hoje', value: stats?.resolvedToday || 0, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Agendamentos', value: stats?.todayAppointments || 0, icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Próximos SLA', value: stats?.nearSLA || 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Fora do SLA', value: stats?.outOfSLA || 0, icon: Timer, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Taxa Resolução', value: `${stats?.resolutionRate || 0}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Geral', value: stats?.totalTickets || 0, icon: History, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <DashboardLayout title="Dashboard Executivo">
      <div className="animate-fade-in space-y-8 pb-10">
        {/* Header Profissional */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-primary/5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Administrador'} 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Bem-vindo ao centro de comando operacional do Portal Esquadromil.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-xl border-primary/10 hover:bg-primary/5" asChild>
              <Link to="/ti/relatorios"><BarChart3 className="mr-2 h-4 w-4" /> Relatórios</Link>
            </Button>
            <Link to="/ti/chamados">
              <Button className="h-10 px-6 font-semibold shadow-lg shadow-primary/20 rounded-xl">Novo Chamado</Button>
            </Link>
          </div>
        </div>

        {/* Grid de KPIs - 10 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi, idx) => (
            <Card key={idx} className="card-institutional border-none shadow-sm group hover:shadow-md transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-2xl ${kpi.bg} transition-all group-hover:scale-110`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/20 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{isLoadingTickets ? '...' : kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Evolução de Chamados */}
          <Card className="lg:col-span-2 card-institutional border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Evolução de Chamados (7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 h-[300px]">
              <AreaTrendChart data={chartData.last7Days} />
            </CardContent>
          </Card>

          {/* Distribuição por Prioridade */}
          <Card className="card-institutional border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" /> Prioridades
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <AnimatedPieChart data={chartData.priorityDist} donut />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chamados Recentes */}
          <Card className="lg:col-span-2 card-institutional border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Atividade Recente
              </CardTitle>
              <Link to="/ti/chamados">
                <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-tighter">Ver Todos</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-14 shimmer rounded-lg" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.slice(0, 5).map((ticket) => {
                    const status = statuses.find(s => s.id === ticket.status_id);
                    const urgency = urgencies.find(u => u.id === ticket.urgency_id);
                    return (
                      <Link key={ticket.id} to="/ti/chamados" className="block group">
                        <div className="flex items-center justify-between rounded-xl border p-3.5 transition-all group-hover:border-primary/30 group-hover:bg-primary/5">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">{ticket.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                              {ticket.creator?.full_name || '—'} • {ticket.creator?.sector || '—'} • {format(parseISO(ticket.created_at), "HH:mm 'em' dd/MM")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {status && (
                              <Badge variant="outline" className="text-[10px] py-0 h-5" style={{ borderColor: status.color, color: status.color }}>
                                {status.name}
                              </Badge>
                            )}
                            <div className="p-1 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
                              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas & Widgets */}
          <div className="space-y-6">
            <Card className="card-institutional border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Ações Estratégicas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Usuários', icon: Users, path: '/ti/usuarios', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Kanban', icon: Ticket, path: '/ti/chamados', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Relatórios', icon: BarChart3, path: '/ti/relatorios', color: 'text-sky-600', bg: 'bg-sky-50' },
                  { label: 'Agendas', icon: Calendar, path: '/ti/agendamentos', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((action, i) => (
                  <Link key={i} to={action.path} className="block group">
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border transition-all group-hover:border-primary/30 group-hover:bg-primary/5">
                      <div className={`p-3 rounded-xl ${action.bg} mb-2 group-hover:scale-110 transition-transform`}>
                        <action.icon className={`h-5 w-5 ${action.color}`} />
                      </div>
                      <span className="text-xs font-bold text-foreground">{action.label}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Widget Informativo */}
            <Card className="card-institutional border-none bg-primary text-primary-foreground overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BarChart3 className="h-24 w-24" />
              </div>
              <CardContent className="p-6 relative z-10">
                <h4 className="font-bold text-lg mb-1">Módulo Analítico</h4>
                <p className="text-primary-foreground/80 text-xs mb-4 leading-relaxed">
                  Acesse o novo módulo de relatórios para cruzamentos avançados de dados e inteligência de SLA.
                </p>
                <Link to="/ti/relatorios">
                  <Button variant="secondary" size="sm" className="w-full font-bold">Ver Analítico</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
