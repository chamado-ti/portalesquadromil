import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AnimatedBarChart, AnimatedPieChart } from '../charts/BaseCharts';

export function OperacionalTab({ data }: any) {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setores */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Chamados por Setor</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Volume total por unidade organizacional</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={data.bySector} />
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Distribuição por Status</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Estado atual de todos os chamados no período</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedPieChart data={data.byStatus} donut />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorias */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Chamados por Categoria</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Principais tipos de solicitações</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={data.byCategory} horizontal />
          </CardContent>
        </Card>

        {/* Urgência */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Distribuição por Prioridade</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Impacto dos chamados no negócio</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatedPieChart data={data.byUrgency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
