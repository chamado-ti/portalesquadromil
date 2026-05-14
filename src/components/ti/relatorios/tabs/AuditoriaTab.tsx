import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function AuditoriaTab({ data, previousTickets }: any) {
  return (
    <Card className="card-institutional">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider">Detalhamento por Setor</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Auditoria de volume e variação por unidade</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.bySector.map((s: any) => {
            const prev = previousTickets.filter((t: any) => (t.creator?.sector || 'Sem setor') === s.name).length;
            const diff = s.value - prev;
            
            return (
              <div key={s.name} className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-sm">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight">Setor cadastrado</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">Chamados</p>
                  </div>
                  
                  <div className="h-10 w-[1px] bg-border mx-2" />
                  
                  <div className="flex flex-col items-end gap-1">
                    {diff > 0 ? (
                      <Badge className="bg-red-100 text-red-700 border-none flex items-center gap-1 py-0 px-2 h-6">
                        <TrendingUp className="h-3 w-3" />
                        +{diff}
                      </Badge>
                    ) : diff < 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-none flex items-center gap-1 py-0 px-2 h-6">
                        <TrendingDown className="h-3 w-3" />
                        {diff}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 py-0 px-2 h-6">
                        <Minus className="h-3 w-3" />
                        0
                      </Badge>
                    )}
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Variação</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
