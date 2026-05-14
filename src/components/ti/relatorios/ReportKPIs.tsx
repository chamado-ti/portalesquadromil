import { Card, CardContent } from '@/components/ui/card';
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Timer, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon: any;
  sparklineData?: any[];
  color?: string;
}

function KPICard({ title, value, trend, trendLabel, icon: Icon, sparklineData, color = "hsl(215, 90%, 32%)" }: KPICardProps) {
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <Card className="card-institutional overflow-hidden group">
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors">
            <Icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs">
            {trend !== undefined && (
              <>
                {isPositiveTrend ? (
                  <div className="flex items-center text-destructive font-semibold">
                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    +{trend}%
                  </div>
                ) : isNegativeTrend ? (
                  <div className="flex items-center text-emerald-600 font-semibold">
                    <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    {trend}%
                  </div>
                ) : (
                  <div className="flex items-center text-muted-foreground">
                    <Minus className="h-3 w-3 mr-0.5" />
                    0%
                  </div>
                )}
                <span className="text-muted-foreground whitespace-nowrap">{trendLabel}</span>
              </>
            )}
          </div>
          
          {sparklineData && (
            <div className="h-8 w-20 opacity-50 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={color} 
                    fill={color} 
                    fillOpacity={0.1} 
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportKPIs({ data, previousData, evolutionData }: any) {
  const calcTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard 
        title="Chamados no Período"
        value={data.totalCount}
        trend={calcTrend(data.totalCount, previousData.length)}
        trendLabel="vs anterior"
        icon={Ticket}
        sparklineData={evolutionData.slice(-10)}
      />
      <KPICard 
        title="Tempo Médio Resolução"
        value={`${data.avgResolutionTime}h`}
        icon={Clock}
        color="hsl(199, 89%, 48%)"
      />
      <KPICard 
        title="SLA Cumprido"
        value={`${data.slaRate}%`}
        icon={CheckCircle2}
        color="hsl(142, 76%, 36%)"
      />
      <KPICard 
        title="1º Atendimento (Média)"
        value={`${data.avgFirstResponseTime}h`}
        icon={Timer}
        color="hsl(280, 65%, 55%)"
      />
      <KPICard 
        title="Taxa de Resolução"
        value={`${Math.round((data.resolvedCount / data.totalCount) * 100 || 0)}%`}
        icon={CheckCircle2}
      />
      <KPICard 
        title="Setores Atendidos"
        value={data.sectorsCount}
        icon={Layers}
        color="hsl(215, 40%, 55%)"
      />
      <KPICard 
        title="Chamados Urgentes"
        value={`${data.urgentRate}%`}
        icon={AlertTriangle}
        color="hsl(0, 72%, 51%)"
      />
      <KPICard 
        title="Pendentes"
        value={data.totalCount - data.resolvedCount}
        icon={Clock}
        color="hsl(38, 92%, 50%)"
      />
    </div>
  );
}
