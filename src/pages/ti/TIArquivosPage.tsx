import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2, FileText, FolderOpen, Download, Pencil, File, FileSpreadsheet, FileType } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TIFile {
  id: string; name: string; description: string | null; file_type: string;
  content: string | null; file_url: string | null; folder: string; created_by: string; created_at: string;
}

const FILE_TYPES = [
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'spreadsheet', label: 'Planilha', icon: FileSpreadsheet },
  { value: 'note', label: 'Nota / Anotação', icon: FileType },
  { value: 'file', label: 'Arquivo Upload', icon: File },
];

const emptyForm = { name: '', description: '', file_type: 'document', content: '', folder: 'Geral' };

export default function TIArquivosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<TIFile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeFolder, setActiveFolder] = useState('Todos');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['ti-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ti_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TIFile[];
    },
  });

  const folders = ['Todos', ...Array.from(new Set(files.map(f => f.folder)))];
  const filteredFiles = activeFolder === 'Todos' ? files : files.filter(f => f.folder === activeFolder);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload: any = {
        name: data.name, description: data.description || null,
        file_type: data.file_type, content: data.content || null, folder: data.folder,
      };
      if (data.id) {
        const { error } = await supabase.from('ti_files').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ti_files').insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-files'] });
      setDialogOpen(false); setEditingFile(null); setForm(emptyForm);
      toast({ title: editingFile ? 'Arquivo atualizado' : 'Arquivo criado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ti_files').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-files'] });
      toast({ title: 'Arquivo removido' });
    },
  });

  const openEdit = (file: TIFile) => {
    setEditingFile(file);
    setForm({ name: file.name, description: file.description || '', file_type: file.file_type, content: file.content || '', folder: file.folder });
    setDialogOpen(true);
  };

  const getIcon = (type: string) => {
    const ft = FILE_TYPES.find(f => f.value === type);
    return ft ? ft.icon : File;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Arquivos & Notas</h2>
            <p className="text-muted-foreground">Central de documentos do TI — substitui planilhas e anotações dispersas</p>
          </div>
          <Button onClick={() => { setEditingFile(null); setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Novo Arquivo
          </Button>
        </div>

        {/* Folder tabs */}
        <div className="flex gap-2 flex-wrap">
          {folders.map(f => (
            <Button key={f} variant={activeFolder === f ? 'default' : 'outline'} size="sm" onClick={() => setActiveFolder(f)}>
              <FolderOpen className="mr-1 h-3 w-3" />{f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filteredFiles.length === 0 ? (
          <Card className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum arquivo nesta pasta</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map(file => {
              const Icon = getIcon(file.file_type);
              return (
                <Card key={file.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(file)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        {file.description && <p className="text-xs text-muted-foreground truncate">{file.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">{FILE_TYPES.find(f => f.value === file.file_type)?.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{file.folder}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(file.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => { e.stopPropagation(); deleteMutation.mutate(file.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingFile ? 'Editar Arquivo' : 'Novo Arquivo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Pasta</Label><Input value={form.folder} onChange={e => setForm(p => ({ ...p, folder: e.target.value }))} placeholder="Geral" /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.file_type} onValueChange={v => setForm(p => ({ ...p, file_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={12}
                placeholder="Escreva aqui o conteúdo do documento, nota ou dados..." className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingFile?.id })} disabled={saveMutation.isPending || !form.name}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingFile ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
