import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTickets } from '@/hooks/useTickets';
import { useAppointments } from '@/hooks/useAppointments';
import { downloadCSV } from '@/lib/csvExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, TrendingDown, Minus, FileBarChart } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(198, 93%, 60%)'];

export default function TIRelatoriosPage() {
  const { tickets, statuses } = useTickets();
  const { appointments } = useAppointments();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const months = useMemo(() => {
    const m = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(new Date(), i);
      m.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
    }
    return m;
  }, []);

  const monthStart = startOfMonth(new Date(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const prevMonthStart = startOfMonth(subMonths(monthStart, 1));
  const prevMonthEnd = endOfMonth(prevMonthStart);

  const currentTickets = tickets.filter(t => isWithinInterval(new Date(t.created_at), { start: monthStart, end: monthEnd }));
  const prevTickets = tickets.filter(t => isWithinInterval(new Date(t.created_at), { start: prevMonthStart, end: prevMonthEnd }));

  // By sector
  const bySector = useMemo(() => {
    const map: Record<string, number> = {};
    currentTickets.forEach(t => {
      const sector = t.creator?.sector || 'Sem setor';
      map[sector] = (map[sector] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [currentTickets]);

  // By status
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    currentTickets.forEach(t => {
      const status = statuses.find(s => s.id === t.status_id)?.name || 'Desconhecido';
      map[status] = (map[status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [currentTickets, statuses]);

  const change = prevTickets.length > 0 ? ((currentTickets.length - prevTickets.length) / prevTickets.length * 100) : 0;

  const handleExport = () => {
    downloadCSV(
      currentTickets.map(t => ({
        titulo: t.title,
        setor: t.creator?.sector || '',
        solicitante: t.creator?.full_name || '',
        status: statuses.find(s => s.id === t.status_id)?.name || '',
        criado: t.created_at,
      })),
      `relatorio-${selectedMonth}`,
      [
        { key: 'titulo', label: 'Título' },
        { key: 'setor', label: 'Setor' },
        { key: 'solicitante', label: 'Solicitante' },
        { key: 'status', label: 'Status' },
        { key: 'criado', label: 'Criado em' },
      ]
    );
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Relatórios</h2>
            <p className="text-muted-foreground">Análise mensal por setores</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Exportar</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-institutional">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Chamados no Mês</p>
              <p className="text-3xl font-bold">{currentTickets.length}</p>
              <div className="mt-1 flex items-center gap-1 text-sm">
                {change > 0 ? <TrendingUp className="h-4 w-4 text-destructive" /> : change < 0 ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : <Minus className="h-4 w-4" />}
                <span className={change > 0 ? 'text-destructive' : change < 0 ? 'text-emerald-500' : ''}>
                  {Math.abs(change).toFixed(0)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Setores Afetados</p>
              <p className="text-3xl font-bold">{bySector.length}</p>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Mês Anterior</p>
              <p className="text-3xl font-bold">{prevTickets.length}</p>
            </CardContent>
          </Card>
          <Card className="card-institutional">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Visitas no Mês</p>
              <p className="text-3xl font-bold">
                {appointments.filter(a => isWithinInterval(new Date(a.scheduled_date), { start: monthStart, end: monthEnd })).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Sector Chart */}
          <Card className="card-institutional">
            <CardHeader><CardTitle>Chamados por Setor</CardTitle></CardHeader>
            <CardContent>
              {bySector.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={bySector}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By Status */}
          <Card className="card-institutional">
            <CardHeader><CardTitle>Distribuição por Status</CardTitle></CardHeader>
            <CardContent>
              {byStatus.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sector detail table */}
        <Card className="card-institutional">
          <CardHeader><CardTitle>Detalhamento por Setor</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bySector.map(s => (
                <div key={s.name} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.value} chamado{s.value > 1 ? 's' : ''}</Badge>
                    {(() => {
                      const prev = prevTickets.filter(t => (t.creator?.sector || 'Sem setor') === s.name).length;
                      const diff = s.value - prev;
                      if (diff > 0) return <Badge className="bg-destructive/10 text-destructive">↑ +{diff}</Badge>;
                      if (diff < 0) return <Badge className="bg-emerald-500/10 text-emerald-600">↓ {diff}</Badge>;
                      return <Badge variant="outline">= 0</Badge>;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
