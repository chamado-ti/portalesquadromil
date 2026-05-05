import { useState, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
  Plus, Search, MoreHorizontal, Pencil, Key, UserX, UserCheck, Trash2, Users, AlertCircle, RefreshCw, Camera, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppRole } from "@/lib/auth";

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

  // Fetch credentials for selected user
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

  const deleteCredentialMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_credentials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-credentials', detailUser?.id] });
      toast({ title: 'Credencial removida' });
    },
  });

  // Avatar upload
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || (user.sector?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && user.is_active) || (statusFilter === "inactive" && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleFormSubmit = async (data: CreateUserData | UpdateUserData) => {
    if ("email" in data) await createUser(data); else await updateUser(data);
  };

  const stats = {
    total: users.length, active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  if (error) {
    return (
      <DashboardLayout>
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-medium">Erro ao carregar usuários</h3>
          <Button onClick={() => refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ativos</p><p className="text-2xl font-bold text-emerald-600">{stats.active}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inativos</p><p className="text-2xl font-bold text-destructive">{stats.inactive}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Gestão de Usuários</CardTitle>
            <Button onClick={() => { setSelectedUser(null); setFormDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo Usuário</Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nome, e-mail ou setor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={roleFilter} onValueChange={v => setRoleFilter(v as AppRole | "all")}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Perfil" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ti">TI</SelectItem>
                  <SelectItem value="guarita">Guarita</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium">Nenhum usuário encontrado</h3>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id} className="cursor-pointer" onClick={() => setDetailUser(user)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-semibold text-primary">
                              {(user as any).avatar_url ? <img src={(user as any).avatar_url} className="h-full w-full object-cover" /> : user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div><p className="font-medium">{user.full_name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm">{user.sector || "—"}</span></TableCell>
                        <TableCell><UserRoleBadge role={user.role} /></TableCell>
                        <TableCell><UserStatusBadge isActive={user.is_active} /></TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setFormDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedUser(user); setResetDialogOpen(true); }}><Key className="mr-2 h-4 w-4" />Redefinir Senha</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActiveStatus(user.id, user.is_active)}>
                                {user.is_active ? <><UserX className="mr-2 h-4 w-4" />Desativar</> : <><UserCheck className="mr-2 h-4 w-4" />Ativar</>}
                              </DropdownMenuItem>
                              {user.id !== currentUser?.id && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem></>)}
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

      {/* User Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          {detailUser && (
            <>
              <DialogHeader><DialogTitle>Detalhes do Usuário</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {(detailUser as any).avatar_url ? <img src={(detailUser as any).avatar_url} className="h-full w-full object-cover" /> : detailUser.full_name.charAt(0).toUpperCase()}
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    <Button variant="secondary" size="icon" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full" onClick={() => avatarInputRef.current?.click()}>
                      <Camera className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{detailUser.full_name}</p>
                    <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                    <div className="mt-1 flex gap-2"><UserRoleBadge role={detailUser.role} /><UserStatusBadge isActive={detailUser.is_active} /></div>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Senha de Acesso</h4>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPassword(s => !s)}>
                      <Eye className="mr-1 h-3 w-3" />{showPassword ? 'Ocultar' : 'Ver'}
                    </Button>
                  </div>
                  {showPassword ? (
                    <p className="mt-1 font-mono text-sm">
                      {(detailUser as any).tracked_password || <span className="text-muted-foreground">— sem registro. Use "Redefinir Senha" para definir uma nova.</span>}
                    </p>
                  ) : (
                    <p className="mt-1 font-mono text-sm tracking-widest">••••••••</p>
                  )}
                </div>

                <div className="rounded-lg border p-3">
                  <h4 className="mb-2 text-sm font-semibold">Credenciais de Serviço</h4>
                  <ScrollArea className="max-h-32">
                    {credentials.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhuma credencial cadastrada</p>
                    ) : (
                      <div className="space-y-2">
                        {credentials.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between rounded border bg-secondary/30 p-2">
                            <div>
                              <p className="text-xs font-medium">{c.service_name}</p>
                              <p className="text-xs text-muted-foreground">{c.service_email} / {c.service_password}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCredentialMutation.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Input placeholder="Serviço" value={credentialForm.service_name} onChange={e => setCredentialForm(p => ({ ...p, service_name: e.target.value }))} className="text-xs" />
                    <Input placeholder="Email/Login" value={credentialForm.service_email} onChange={e => setCredentialForm(p => ({ ...p, service_email: e.target.value }))} className="text-xs" />
                    <div className="flex gap-1">
                      <Input placeholder="Senha" value={credentialForm.service_password} onChange={e => setCredentialForm(p => ({ ...p, service_password: e.target.value }))} className="text-xs" />
                      <Button size="icon" className="h-9 w-9 shrink-0" disabled={!credentialForm.service_name || !credentialForm.service_email} onClick={() => addCredentialMutation.mutate()}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UserFormDialog open={formDialogOpen} onOpenChange={setFormDialogOpen} user={selectedUser} onSubmit={handleFormSubmit} isLoading={isCreating || isUpdating} />
      <ResetPasswordDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} user={selectedUser} onSubmit={(uid, pw) => resetPassword({ user_id: uid, new_password: pw })} isLoading={isResetting} />
      <DeleteUserDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} user={selectedUser} onConfirm={async () => { if (selectedUser) await deleteUser(selectedUser.id); }} isLoading={isDeleting} />
    </DashboardLayout>
  );
}
