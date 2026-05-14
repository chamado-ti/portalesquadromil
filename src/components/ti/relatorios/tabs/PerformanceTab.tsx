import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AnimatedBarChart } from '../charts/BaseCharts';
import { useMemo } from 'react';
import { Ticket } from '@/hooks/useTickets';
import { differenceInHours, parseISO } from 'date-fns';

export function PerformanceTab({ tickets }: { tickets: Ticket[] }) {
  const techData = useMemo(() => {
    const map: Record<string, { count: number; time: number; resolved: number }> = {};
    
    tickets.forEach(t => {
      const techName = t.assignee?.full_name || 'Não atribuído';
      if (!map[techName]) map[techName] = { count: 0, time: 0, resolved: 0 };
      
      map[techName].count++;
      
      if (t.closed_at) {
        map[techName].resolved++;
        map[techName].time += differenceInHours(parseISO(t.closed_at), parseISO(t.created_at));
      }
    });

    const ranking = Object.entries(map).map(([name, data]) => ({
      name,
      value: data.resolved,
      avgTime: data.resolved > 0 ? (data.time / data.resolved).toFixed(1) : 0
    })).sort((a, b) => b.value - a.value);

    const timeRanking = [...ranking].sort((a, b) => parseFloat(b.avgTime as string) - parseFloat(a.avgTime as string));

    return { ranking, timeRanking };
  }, [tickets]);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Resolvidos */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Ranking de Resolução</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Chamados finalizados por técnico</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={techData.ranking} horizontal />
          </CardContent>
        </Card>

        {/* Ranking Tempo */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Tempo Médio por Técnico</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Horas médias para finalizar um chamado</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={techData.timeRanking} horizontal dataKey="avgTime" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
