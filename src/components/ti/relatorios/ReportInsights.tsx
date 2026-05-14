import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lightbulb, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportInsightsProps {
  insights: string[];
}

export function ReportInsights({ insights }: ReportInsightsProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-5 flex flex-row items-center gap-2 border-b border-primary/10">
        <Lightbulb className="h-4 w-4 text-primary" />
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Insights Analíticos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight, index) => {
            const isAlert = insight.toLowerCase().includes('alerta') || insight.toLowerCase().includes('crítico');
            const isSuccess = insight.toLowerCase().includes('ótimo') || insight.toLowerCase().includes('sucesso');
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed transition-all hover:scale-[1.02]",
                  isAlert ? "bg-red-50 border-red-100 text-red-900" : 
                  isSuccess ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
                  "bg-white border-primary/10 text-muted-foreground"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isAlert ? <ShieldAlert className="h-4 w-4 text-red-600" /> : 
                   isSuccess ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                   <TrendingUp className="h-4 w-4 text-primary" />}
                </div>
                <p className={cn("font-medium", !isAlert && !isSuccess && "text-foreground")}>
                  {insight}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
