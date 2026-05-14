import { useState, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { UserFormDialog } from "@/components/ti/UserFormDialog";
import { ResetPasswordDialog } from "@/components/ti/ResetPasswordDialog";
import { DeleteUserDialog } from "@/components/ti/DeleteUserDialog";
import { UserStatusBadge } from "@/components/ti/UserStatusBadge";
import { UserRoleBadge } from "@/components/ti/UserRoleBadge";
import { useUsers, type User, type CreateUserData, type UpdateUserData } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, MoreHorizontal, Pencil, Key, UserX, UserCheck, Trash2, Users, 
  AlertCircle, RefreshCw, Camera, Eye, UserPlus, ShieldCheck, Activity
} from "lucide-react";
import { format, subDays, isAfter, parseISO } from "date-fns";
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function TIUsuariosPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    users, isLoading, error, refetch, createUser, updateUser, resetPassword, deleteUser, toggleActiveStatus,
    isCreating, isUpdating, isResetting, isDeleting,
  } = useUsers();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialForm, setCredentialForm] = useState({ service_email: '', service_password: '', service_name: '' });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Stats refinadas
  const stats = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    const recent = users.filter(u => isAfter(parseISO(u.created_at), sevenDaysAgo)).length;
    const bySector: Record<string, number> = {};
    users.forEach(u => {
      const s = u.sector || "Sem setor";
      bySector[s] = (bySector[s] || 0) + 1;
    });
    const topSector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0];

    return {
      total: users.length,
      active: users.filter(u => u.is_active).length,
      inactive: users.filter(u => !u.is_active).length,
      recent,
      topSector: topSector ? `${topSector[0]} (${topSector[1]})` : "—"
    };
  }, [users]);

  // Fetch credentials
  const { data: credentials = [] } = useQuery({
    queryKey: ['user-credentials', detailUser?.id],
    queryFn: async () => {
      if (!detailUser?.id) return [];
      const { data, error } = await supabase.from('user_credentials').select('*').eq('user_id', detailUser.id).order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!detailUser?.id,
  });

  const addCredentialMutation = useMutation({
    mutationFn: async () => {
      if (!detailUser?.id) return;
      const { error } = await supabase.from('user_credentials').insert({ user_id: detailUser.id, ...credentialForm });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credentials', detailUser?.id] });
      setCredentialForm({ service_email: '', service_password: '', service_name: '' });
      toast({ title: 'Credencial adicionada' });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailUser) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${detailUser.id}.${ext}`;
      await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: data.publicUrl } as any).eq('id', detailUser.id);
      toast({ title: 'Foto atualizada' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (user.sector?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && user.is_active) || (statusFilter === "inactive" && !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  if (error) {
    return (
      <DashboardLayout>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-bold uppercase tracking-wider">Erro ao carregar usuários</h3>
          <Button onClick={() => refetch()} className="shadow-institutional"><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8">
        {/* Header Moderno */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h2>
            <p className="text-muted-foreground mt-1">Administre acessos, perfis e credenciais da organização.</p>
          </div>
          <Button onClick={() => { setSelectedUser(null); setFormDialogOpen(true); }} className="h-10 px-6 font-semibold shadow-institutional">
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        {/* KPIs Modernos */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Ativos', value: stats.active, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Inativos', value: stats.inactive, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Setor Líder', value: stats.topSector, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Recentes (7d)', value: stats.recent, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((kpi, idx) => (
            <Card key={idx} className="card-institutional border-none shadow-sm">
              <CardContent className="p-4">
                <div className={`p-2 w-fit rounded-lg ${kpi.bg} mb-3`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className={cn("text-xl font-bold mt-0.5 truncate", kpi.label === 'Setor Líder' && "text-sm mt-2")}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros e Tabela */}
        <Card className="card-institutional border-none shadow-sm">
          <CardHeader className="pb-3 px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nome, e-mail ou setor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={v => setRoleFilter(v as AppRole | "all")}>
                  <SelectTrigger className="w-full sm:w-36 h-10"><SelectValue placeholder="Perfil" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Perfis</SelectItem>
                    <SelectItem value="ti">TI</SelectItem>
                    <SelectItem value="guarita">Guarita</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-36 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-lg font-bold uppercase text-muted-foreground/50">Nenhum usuário encontrado</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="px-6 h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Usuário</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Setor</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Perfil</TableHead>
                      <TableHead className="h-12 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="px-6 h-12 text-right font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-muted/20 transition-colors group" onClick={() => setDetailUser(user)}>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/5 border border-primary/10 font-bold text-primary shadow-sm group-hover:scale-110 transition-transform">
                              {(user as any).avatar_url ? <img src={(user as any).avatar_url} className="h-full w-full object-cover" /> : user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-xs font-semibold text-muted-foreground uppercase">{user.sector || "—"}</span></TableCell>
                        <TableCell><UserRoleBadge role={user.role} /></TableCell>
                        <TableCell><UserStatusBadge isActive={user.is_active} /></TableCell>
                        <TableCell className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setFormDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Editar Perfil</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setResetDialogOpen(true); }}><Key className="mr-2 h-4 w-4" />Trocar Senha</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActiveStatus(user.id, user.is_active)}>
                                {user.is_active ? <><UserX className="mr-2 h-4 w-4 text-rose-600" />Desativar</> : <><UserCheck className="mr-2 h-4 w-4 text-emerald-600" />Ativar</>}
                              </DropdownMenuItem>
                              {user.id !== currentUser?.id && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir Usuário</DropdownMenuItem></>)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do Usuário */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          {detailUser && (
            <div className="flex flex-col">
              {/* Header com Cover Simulado */}
              <div className="h-24 bg-gradient-to-r from-primary to-accent relative">
                <div className="absolute -bottom-10 left-6">
                  <div className="relative group">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white border-4 border-white shadow-lg text-2xl font-bold text-primary">
                      {(detailUser as any).avatar_url ? <img src={(detailUser as any).avatar_url} className="h-full w-full object-cover" /> : detailUser.full_name.charAt(0).toUpperCase()}
                    </div>
                    <Button variant="secondary" size="icon" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => avatarInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="pt-12 px-6 pb-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{detailUser.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  <div className="mt-2 flex gap-2"><UserRoleBadge role={detailUser.role} /><UserStatusBadge isActive={detailUser.is_active} /></div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha Master</h4>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold uppercase" onClick={() => setShowPassword(s => !s)}>
                        <Eye className="mr-1 h-3 w-3" />{showPassword ? 'Ocultar' : 'Revelar'}
                      </Button>
                    </div>
                    <div className="bg-white rounded-lg p-3 border font-mono text-sm shadow-inner">
                      {showPassword ? (
                        (detailUser as any).tracked_password || "Sem registro"
                      ) : (
                        "••••••••••••"
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Credenciais de Serviços</h4>
                    <ScrollArea className="max-h-40 pr-3">
                      {credentials.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">Nenhuma credencial vinculada</p>
                      ) : (
                        <div className="space-y-2">
                          {credentials.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between rounded-xl bg-white border p-3 shadow-sm group">
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase text-primary">{c.service_name}</p>
                                <p className="text-xs font-medium text-foreground truncate">{c.service_email}</p>
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{c.service_password}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteCredentialMutation.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      <div className="flex gap-2">
                        <Input placeholder="Nome do Serviço" value={credentialForm.service_name} onChange={e => setCredentialForm(p => ({ ...p, service_name: e.target.value }))} className="h-9 text-xs" />
                        <Input placeholder="Login" value={credentialForm.service_email} onChange={e => setCredentialForm(p => ({ ...p, service_email: e.target.value }))} className="h-9 text-xs" />
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Senha" value={credentialForm.service_password} onChange={e => setCredentialForm(p => ({ ...p, service_password: e.target.value }))} className="h-9 text-xs flex-1" />
                        <Button size="sm" className="h-9 shadow-institutional" disabled={!credentialForm.service_name || !credentialForm.service_email} onClick={() => addCredentialMutation.mutate()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </DialogContent>
      </Dialog>

      <UserFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} user={selectedUser} onSubmit={handleFormSubmit} isLoading={isCreating || isUpdating} />
      <ResetPasswordDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} user={selectedUser} onSubmit={(uid, pw) => resetPassword({ user_id: uid, new_password: pw })} isLoading={isResetting} />
      <DeleteUserDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} user={selectedUser} onConfirm={async () => { if (selectedUser) await deleteUser(selectedUser.id); }} isLoading={isDeleting} />
    </DashboardLayout>
  );
}
