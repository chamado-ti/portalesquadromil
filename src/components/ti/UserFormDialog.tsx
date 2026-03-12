import { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSectors } from "@/hooks/useSectors";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";
import type { User, CreateUserData, UpdateUserData } from "@/hooks/useUsers";
import type { AppRole } from "@/lib/auth";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  isLoading: boolean;
}

const ROLES: { value: AppRole; label: string }[] = [
  { value: "ti", label: "TI (Administrador)" },
  { value: "guarita", label: "Guarita" },
  { value: "colaborador", label: "Colaborador" },
];

export function UserFormDialog({ open, onOpenChange, user, onSubmit, isLoading }: UserFormDialogProps) {
  const isEditing = !!user;
  const { sectors } = useSectors();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    email: "", password: "", full_name: "", sector: "", role: "colaborador" as AppRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({ email: user.email, password: "", full_name: user.full_name, sector: user.sector || "", role: user.role });
      setAvatarPreview((user as any).avatar_url || null);
    } else {
      setFormData({ email: "", password: "", full_name: "", sector: "", role: "colaborador" });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setErrors({});
  }, [user, open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = "Nome é obrigatório";
    if (!isEditing) {
      if (!formData.email.trim()) newErrors.email = "E-mail é obrigatório";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "E-mail inválido";
      if (!formData.password) newErrors.password = "Senha é obrigatória";
      else if (formData.password.length < 6) newErrors.password = "Senha deve ter no mínimo 6 caracteres";
    }
    if (!formData.sector) newErrors.sector = "Setor é obrigatório";
    if (!formData.role) newErrors.role = "Perfil é obrigatório";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (isEditing && user) {
        await onSubmit({ user_id: user.id, full_name: formData.full_name, sector: formData.sector, role: formData.role });
        // Upload avatar if changed
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop();
          const path = `${user.id}.${ext}`;
          await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          await supabase.from('profiles').update({ avatar_url: data.publicUrl } as any).eq('id', user.id);
        }
      } else {
        await onSubmit({ email: formData.email, password: formData.password, full_name: formData.full_name, sector: formData.sector, role: formData.role });
        // For new users, avatar will be uploaded after user is created via the detail dialog
      }
      onOpenChange(false);
    } catch {}
  };

  const sectorOptions = sectors.map(s => s.name);
  if (formData.sector && !sectorOptions.includes(formData.sector)) {
    sectorOptions.push(formData.sector);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {avatarPreview
                  ? <img src={avatarPreview} className="h-full w-full object-cover" />
                  : formData.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <Button type="button" variant="secondary" size="icon" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full" onClick={() => avatarInputRef.current?.click()}>
                <Camera className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input id="full_name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nome completo" className={errors.full_name ? "border-destructive" : ""} />
            {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
          </div>

          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="usuario@empresa.com" className={errors.email ? "border-destructive" : ""} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Mínimo 6 caracteres" className={errors.password ? "border-destructive" : ""} />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="sector">Setor *</Label>
            <Select value={formData.sector} onValueChange={value => setFormData({ ...formData, sector: value })}>
              <SelectTrigger id="sector" className={errors.sector ? "border-destructive" : ""}><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>
                {sectorOptions.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
                {sectorOptions.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhum setor cadastrado.</div>
                )}
              </SelectContent>
            </Select>
            {errors.sector && <p className="text-sm text-destructive">{errors.sector}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Perfil de Acesso *</Label>
            <Select value={formData.role} onValueChange={value => setFormData({ ...formData, role: value as AppRole })}>
              <SelectTrigger id="role" className={errors.role ? "border-destructive" : ""}><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
              <SelectContent>
                {ROLES.map(role => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><LoadingSpinner size="sm" className="mr-2" />Salvando...</> : isEditing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
