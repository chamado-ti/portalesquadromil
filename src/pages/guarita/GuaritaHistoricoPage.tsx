import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGuaritaAppointments } from '@/hooks/useGuaritaAppointments';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  History,
  Search,
  User,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuaritaHistoricoPage() {
  const { history, isLoadingHistory, refetchHistory } = useGuaritaAppointments();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(
    (apt) =>
      apt.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.user?.sector?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateDuration = (entry: string | null, exit: string | null) => {
    if (!entry || !exit) return '-';
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);
    const diffMs = exitDate.getTime() - entryDate.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  };

  if (isLoadingHistory) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Histórico de Acessos</h2>
            <p className="text-muted-foreground">
              Registro completo de entradas e saídas
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchHistory()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Search */}
        <Card className="card-institutional">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por visitante, colaborador ou setor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* History table */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Registros ({filteredHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center">
                <History className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-medium">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Ainda não há registros de acesso.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitante</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{apt.visitor_name}</p>
                            {apt.purpose && (
                              <p className="text-xs text-muted-foreground">{apt.purpose}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{apt.user?.full_name || '-'}</TableCell>
                      <TableCell>{apt.user?.sector || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(apt.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {apt.entry_at
                          ? format(new Date(apt.entry_at), "HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {apt.exit_at
                          ? format(new Date(apt.exit_at), "HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {calculateDuration(apt.entry_at, apt.exit_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {apt.status === 'completed' ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="mr-1 h-3 w-3" />
                            Cancelado
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
