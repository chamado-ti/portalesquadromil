import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaTrendChart } from '../charts/BaseCharts';
import { cn } from '@/lib/utils';

export function TendenciasTab({ data }: any) {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}h`);

  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-muted/10';
    if (value < 2) return 'bg-blue-100';
    if (value < 5) return 'bg-blue-300';
    if (value < 10) return 'bg-blue-500';
    return 'bg-blue-700';
  };

  return (
    <div className="grid gap-6">
      {/* Heatmap de Horários */}
      <Card className="card-institutional">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Heatmap de Chamados</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Concentração de abertura por Dia da Semana e Horário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px] space-y-1">
              <div className="flex">
                <div className="w-12 h-6" />
                {hours.map(h => (
                  <div key={h} className="flex-1 text-[9px] text-center text-muted-foreground font-bold">{h}</div>
                ))}
              </div>
              
              {days.map((day, dIdx) => (
                <div key={day} className="flex items-center">
                  <div className="w-12 text-[10px] font-bold text-muted-foreground">{day}</div>
                  <div className="flex-1 flex gap-1">
                    {hours.map((_, hIdx) => {
                      const entry = data.heatmap.find((h: any) => h.day === dIdx && h.hour === hIdx);
                      const val = entry?.value || 0;
                      return (
                        <div 
                          key={hIdx} 
                          className={cn(
                            "flex-1 h-6 rounded-sm transition-all hover:scale-110 cursor-help",
                            getHeatColor(val)
                          )}
                          title={`${day} às ${hIdx}h: ${val} chamados`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-3">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Densidade:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/20" />
              <span className="text-[9px] text-muted-foreground">0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-blue-100" />
              <span className="text-[9px] text-muted-foreground">1-2</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-blue-300" />
              <span className="text-[9px] text-muted-foreground">3-5</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-[9px] text-muted-foreground">6-10</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-blue-700" />
              <span className="text-[9px] text-muted-foreground">10+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendência Preditiva Simples */}
      <Card className="card-institutional">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Análise de Tendência</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Média móvel e projeção de volume</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaTrendChart data={data.evolution} />
        </CardContent>
      </Card>
    </div>
  );
}
