import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, Clock, User, CheckCircle2, XCircle, Timer, 
  Search, MoreVertical, Trash2, Filter, Download,
  Building2, AlertTriangle, ShieldCheck, History, Settings,
  Activity, Info, Zap
} from 'lucide-react';
import { useReservations } from '@/hooks/useReservations';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_MAP = {
  pending: { label: 'Pendente', class: 'bg-amber-50 text-amber-700 border-amber-200', icon: Timer },
  confirmed: { label: 'Confirmado', class: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', class: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
};

export default function TIReservaPage() {
  const { 
    reservations, auditLogs, settings, isLoading, 
    updateReservationStatus, updateSettings, deleteReservation 
  } = useReservations();
  
  const [activeTab, setActiveTab] = useState('reservations');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReservations = useMemo(() => {
    return reservations.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.profiles?.full_name.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [reservations, searchTerm]);

  const conflicts = useMemo(() => {
    const sorted = [...reservations].filter(r => r.status === 'confirmed').sort((a, b) => a.date.localeCompare(b.date));
    const list: any[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].date === sorted[i+1].date) {
        list.push({ res1: sorted[i], res2: sorted[i+1] });
      }
    }
    return list;
  }, [reservations]);

  return (
    <DashboardLayout title="Governança de Auditório">
      <div className="space-y-8 max-w-7xl mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Ocupação Mensal', val: '78%', icon: Activity, color: 'bg-primary' },
            { label: 'Conflitos Detectados', val: conflicts.length, icon: AlertTriangle, color: 'bg-amber-500' },
            { label: 'Tempo de Resposta', val: '2.4h', icon: Zap, color: 'bg-emerald-500' },
            { label: 'Logs nas 24h', val: auditLogs.length, icon: History, color: 'bg-indigo-500' },
          ].map((stat, i) => (
            <Card key={i} className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden hover:scale-[1.02] transition-transform">
              <CardContent className="p-8 flex items-center gap-6">
                <div className={cn("h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-2xl", stat.color)}>
                  <stat.icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900">{stat.val}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-4 rounded-3xl shadow-xl">
            <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-auto gap-1">
              <TabsTrigger value="reservations" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-xs gap-2">
                <Calendar className="h-4 w-4" /> Reservas
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-xs gap-2">
                <AlertTriangle className="h-4 w-4" /> Negociações
                {conflicts.length > 0 && <Badge className="ml-1 bg-amber-500 h-5 min-w-[20px] flex justify-center p-1">{conflicts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="audit" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-xs gap-2">
                <ShieldCheck className="h-4 w-4" /> Auditoria
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md font-bold text-xs gap-2">
                <Settings className="h-4 w-4" /> Configurações
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="h-11 pl-11 w-64 rounded-xl bg-slate-50 border-none focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-11 rounded-xl font-bold gap-2"><Download className="h-4 w-4" /> Exportar</Button>
            </div>
          </div>

          <TabsContent value="reservations" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="px-8 h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Solicitante</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Evento</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data & Horário</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</TableHead>
                    <TableHead className="h-14 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-400 font-bold">Carregando...</TableCell></TableRow>
                  ) : filteredReservations.map((res) => {
                    const status = STATUS_MAP[res.status];
                    return (
                      <TableRow key={res.id} className="group border-b border-slate-50 last:border-none transition-colors hover:bg-slate-50/50">
                        <TableCell className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                              {res.profiles?.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 leading-none mb-1">{res.profiles?.full_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{res.profiles?.sector}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <p className="text-sm font-bold text-slate-900">{res.title}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{res.description || 'Sem descrição'}</p>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">{format(parseISO(res.date), "dd/MM/yyyy")}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{res.start_time.slice(0, 5)} às {res.end_time.slice(0, 5)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge className={cn("rounded-xl border font-bold text-[10px] uppercase gap-1.5 px-3 py-1", status.class)}>
                            <status.icon className="h-3 w-3" /> {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5 text-right pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md transition-all">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-none shadow-2xl p-2">
                              {res.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => updateReservationStatus.mutate({ id: res.id, status: 'confirmed' })} className="gap-2 p-3 cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50 rounded-xl font-bold text-xs">
                                    <CheckCircle2 className="h-4 w-4" /> Aprovar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateReservationStatus.mutate({ id: res.id, status: 'cancelled' })} className="gap-2 p-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-xl font-bold text-xs">
                                    <XCircle className="h-4 w-4" /> Recusar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="my-1" />
                                </>
                              )}
                              <DropdownMenuItem className="gap-2 p-3 cursor-pointer rounded-xl font-bold text-xs">
                                <History className="h-4 w-4 text-indigo-500" /> Ver Log Detalhado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteReservation.mutate(res.id)} className="gap-2 p-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 rounded-xl font-bold text-xs">
                                <Trash2 className="h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {conflicts.map((c, i) => (
                <Card key={i} className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                  <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg font-bold">Conflito de Horário</CardTitle>
                    </div>
                    <Badge variant="outline" className="rounded-full">{format(parseISO(c.res1.date), "dd 'de' MMMM", { locale: ptBR })}</Badge>
                  </CardHeader>
                  <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-3">
                      {[c.res1, c.res2].map((res, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-400 font-bold text-[10px] shadow-sm">
                              {res.profiles?.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{res.title}</p>
                              <p className="text-[10px] text-slate-400">{res.start_time.slice(0, 5)} - {res.end_time.slice(0, 5)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t flex gap-3">
                      <Button className="flex-1 rounded-xl h-10 font-bold text-xs bg-slate-900 hover:bg-slate-800">Mediar Negociação</Button>
                      <Button variant="outline" className="flex-1 rounded-xl h-10 font-bold text-xs border-slate-200">Notificar Partes</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {conflicts.length === 0 && (
                <div className="col-span-full h-64 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-50">
                   <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nenhum conflito ativo</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
               <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Histórico de Alterações</h3>
                 <Badge variant="outline" className="rounded-full font-bold">{auditLogs.length} Entradas</Badge>
               </div>
               <ScrollArea className="h-[500px]">
                 <div className="p-8 space-y-6">
                   {auditLogs.map((log: any) => (
                     <div key={log.id} className="flex gap-4 relative group">
                        <div className="absolute left-[19px] top-8 bottom-0 w-[1px] bg-slate-100 group-last:hidden" />
                        <div className="h-10 w-10 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center shrink-0 z-10">
                          <Activity className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="flex-1 pt-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-900">{log.action}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{format(parseISO(log.created_at), "HH:mm '•' dd/MM")}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">{log.details}</p>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-tighter mt-1.5 flex items-center gap-1.5">
                            <User className="h-3 w-3" /> {log.profiles?.full_name || 'Sistema'}
                          </p>
                        </div>
                     </div>
                   ))}
                 </div>
               </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="m-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Parâmetros do Auditório</h3>
                  <p className="text-sm text-slate-500 font-medium">Defina as regras globais de uso do espaço.</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capacidade Máxima</Label>
                    <div className="flex items-center gap-4">
                      <Input type="number" defaultValue={settings.max_capacity} className="h-12 rounded-xl bg-slate-50 border-none w-32 font-bold" />
                      <span className="text-xs text-slate-400 font-medium">Pessoas sentadas</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">Permitir Finais de Semana</p>
                      <p className="text-[10px] text-slate-500">Habilita reservas aos sábados e domingos.</p>
                    </div>
                    <Switch defaultChecked={settings.allow_weekends} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">Confirmação Automática</p>
                      <p className="text-[10px] text-slate-500">Reservas são aprovadas sem intervenção TI.</p>
                    </div>
                    <Switch defaultChecked={settings.auto_confirm} />
                  </div>
                </div>
                <Button className="w-full h-12 rounded-xl shadow-xl shadow-primary/20 font-bold" onClick={() => updateSettings.mutate({})}>Salvar Alterações</Button>
              </Card>

              <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-10 space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Horários de Funcionamento</h3>
                  <p className="text-sm text-slate-500 font-medium">Defina a janela operacional para reservas.</p>
                </div>
                <div className="space-y-4">
                  {['Segunda a Sexta', 'Sábado', 'Domingo'].map((day, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b last:border-none">
                      <span className="text-sm font-bold text-slate-700">{day}</span>
                      <div className="flex items-center gap-2">
                        <Input defaultValue="08:00" className="h-9 w-20 rounded-lg bg-slate-50 border-none text-xs text-center font-bold" />
                        <span className="text-slate-400 text-xs">-</span>
                        <Input defaultValue="18:00" className="h-9 w-20 rounded-lg bg-slate-50 border-none text-xs text-center font-bold" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                    Horários fora desta janela serão bloqueados automaticamente.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
