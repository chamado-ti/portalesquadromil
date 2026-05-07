import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGuaritaSimpleRequests, SimpleRequest } from '@/hooks/useGuaritaSimpleRequests';
import { CheckCircle, Clock, Package, Building2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}

function RequestCard({ a, onMark }: { a: SimpleRequest; onMark: (a: SimpleRequest) => void }) {
  const initials = a.requester?.full_name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div className="group flex items-center gap-3 rounded-lg border-2 border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50 p-3 shadow-sm transition hover:shadow-md animate-fade-in">
      <Avatar className="h-12 w-12 ring-2 ring-amber-300">
        <AvatarImage src={a.requester?.avatar_url || undefined} />
        <AvatarFallback className="bg-amber-200 text-amber-900 font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground">{a.requester?.full_name || 'Usuário'}</p>
          {a.requester?.sector && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-white">
              <Building2 className="h-2.5 w-2.5" />{a.requester.sector}
            </Badge>
          )}
          <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">
            <Clock className="mr-1 h-2.5 w-2.5" />Aguardando
          </Badge>
        </div>
        <p className="text-sm font-medium text-foreground/90 mt-0.5">📦 {a.purpose}</p>
        {a.notes && <p className="text-xs italic text-muted-foreground mt-0.5">"{a.notes}"</p>}
        <p className="text-[11px] text-muted-foreground mt-1">
          {format(new Date(a.created_at), "HH:mm", { locale: ptBR })} · {timeAgo(a.created_at)}
        </p>
      </div>
      <Button size="sm" onClick={() => onMark(a)} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
        <CheckCircle className="mr-1 h-4 w-4" />Recebido
      </Button>
    </div>
  );
}

export default function GuaritaSolicitacoesPage() {
  const { pending, received, isLoading, markReceived } = useGuaritaSimpleRequests();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Card className="border-amber-300/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Solicitações Rápidas — Aguardando
              {pending.length > 0 && (
                <Badge className="bg-amber-500 text-white animate-pulse">{pending.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
            ) : (
              pending.map(a => <RequestCard key={a.id} a={a} onMark={markReceived} />)
            )}
          </CardContent>
        </Card>

        {received.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recebidas recentemente</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {received.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-center justify-between border-b py-1.5 text-xs text-muted-foreground last:border-0">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{a.requester?.full_name}</span> — {a.purpose}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    {a.received_at && format(new Date(a.received_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
