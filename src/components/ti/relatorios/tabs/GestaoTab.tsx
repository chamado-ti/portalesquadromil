import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaTrendChart, AnimatedBarChart } from '../charts/BaseCharts';

export function GestaoTab({ data }: any) {
  return (
    <div className="grid gap-6">
      {/* Evolução Temporal */}
      <Card className="card-institutional">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Evolução Histórica</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Volume de chamados ao longo do tempo (últimos meses)</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaTrendChart data={data.evolution} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparativo Mensal */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Comparativo Mensal</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Total de chamados por mês (Ano Atual)</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={data.monthly} nameKey="month" />
          </CardContent>
        </Card>

        {/* Top Usuários */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Top 10 Solicitantes</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Usuários com maior volume de aberturas</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={data.byUser} horizontal />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
