import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, RadialBarChart, RadialBar, Legend, Tooltip } from 'recharts';
import { Timer, Clock, CheckCircle2 } from 'lucide-react';

export function SLATab({ data }: any) {
  const slaData = [
    { name: 'SLA Cumprido', value: parseFloat(data.slaRate), fill: 'hsl(142, 76%, 36%)' },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Radial SLA */}
        <Card className="card-institutional lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Performance de SLA</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">% de chamados dentro do prazo</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-5">
            <div className="relative h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={20} data={slaData} startAngle={90} endAngle={90 + (3.6 * parseFloat(data.slaRate))}>
                  <RadialBar dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{data.slaRate}%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Meta: 90%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Tempo */}
        <Card className="card-institutional lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Métricas de Resposta e Resolução</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Eficiência temporal do atendimento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="p-3 rounded-full bg-blue-100">
                  <Timer className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Tempo Médio 1º Resposta</p>
                  <p className="text-2xl font-bold">{data.avgFirstResponseTime}h</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="p-3 rounded-full bg-emerald-100">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Tempo Médio Resolução</p>
                  <p className="text-2xl font-bold">{data.avgResolutionTime}h</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="p-3 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Resolvido</p>
                  <p className="text-2xl font-bold">{data.resolvedCount}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                <div className="p-3 rounded-full bg-warning/10">
                  <AlertCircle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Chamados com Atraso</p>
                  <p className="text-2xl font-bold">{data.resolvedCount - Math.round(data.resolvedCount * (parseFloat(data.slaRate)/100))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { AlertCircle } from 'lucide-react';
