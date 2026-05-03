import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, FileText, FolderOpen, Upload, File, FileSpreadsheet, FileType, Eye, Download, FolderPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AttachmentPreviewDialog, getAttachmentKind } from '@/components/AttachmentPreview';

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

const emptyForm = { name: '', description: '', file_type: 'document', content: '', folder: 'Geral', file_url: '' };

export default function TIArquivosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<TIFile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeFolder, setActiveFolder] = useState('Todos');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [extraFolders, setExtraFolders] = useState<string[]>([]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['ti-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ti_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TIFile[];
    },
  });

  const folders = ['Todos', ...Array.from(new Set([...files.map(f => f.folder), ...extraFolders]))];
  const filteredFiles = activeFolder === 'Todos' ? files : files.filter(f => f.folder === activeFolder);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('ti-files').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('ti-files').getPublicUrl(path);
      setForm(p => ({
        ...p,
        file_url: publicUrl,
        file_type: 'file',
        name: p.name || file.name,
      }));
      toast({ title: 'Arquivo enviado' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro no upload', description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload: any = {
        name: data.name, description: data.description || null,
        file_type: data.file_type, content: data.content || null,
        file_url: data.file_url || null, folder: data.folder || 'Geral',
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
    mutationFn: async (file: TIFile) => {
      // tenta remover do storage se for upload
      if (file.file_url?.includes('/ti-files/')) {
        const path = file.file_url.split('/ti-files/')[1]?.split('?')[0];
        if (path) await supabase.storage.from('ti-files').remove([decodeURIComponent(path)]);
      }
      const { error } = await supabase.from('ti_files').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ti-files'] });
      toast({ title: 'Arquivo removido' });
    },
  });

  const openEdit = (file: TIFile) => {
    setEditingFile(file);
    setForm({
      name: file.name, description: file.description || '', file_type: file.file_type,
      content: file.content || '', folder: file.folder, file_url: file.file_url || '',
    });
    setDialogOpen(true);
  };

  const getIcon = (type: string) => FILE_TYPES.find(f => f.value === type)?.icon ?? File;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">Arquivos & Notas</h2>
            <p className="text-muted-foreground">Documentos, planilhas e uploads do TI organizados por pasta</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />Nova Pasta
            </Button>
            <Button onClick={() => { setEditingFile(null); setForm({ ...emptyForm, folder: activeFolder !== 'Todos' ? activeFolder : 'Geral' }); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Novo Arquivo
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {folders.map(f => {
            const count = f === 'Todos' ? files.length : files.filter(x => x.folder === f).length;
            return (
              <Button key={f} variant={activeFolder === f ? 'default' : 'outline'} size="sm" onClick={() => setActiveFolder(f)}>
                <FolderOpen className="mr-1 h-3 w-3" />{f} <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
              </Button>
            );
          })}
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
              const hasUpload = !!file.file_url;
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(file)}>
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        {file.description && <p className="text-xs text-muted-foreground truncate">{file.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{FILE_TYPES.find(f => f.value === file.file_type)?.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{file.folder}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(file.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {hasUpload && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewUrl(file.file_url!)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a href={file.file_url!} download target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Baixar">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(file)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nova pasta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Nome da pasta</Label>
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Ex: Procedimentos" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              const n = newFolderName.trim();
              if (!n) return;
              setExtraFolders(p => Array.from(new Set([...p, n])));
              setActiveFolder(n);
              setNewFolderName('');
              setNewFolderOpen(false);
              toast({ title: `Pasta "${n}" criada` });
            }}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal arquivo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingFile ? 'Editar Arquivo' : 'Novo Arquivo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Pasta</Label>
                <Select value={form.folder} onValueChange={v => setForm(p => ({ ...p, folder: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {folders.filter(f => f !== 'Todos').map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={form.file_type} onValueChange={v => setForm(p => ({ ...p, file_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Anexar arquivo (PDF, imagem, vídeo, planilha, etc.)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {form.file_url ? 'Substituir arquivo' : 'Enviar arquivo'}
                </Button>
                {form.file_url && (
                  <>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewUrl(form.file_url)}>
                      <Eye className="mr-1 h-4 w-4" />Ver
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm(p => ({ ...p, file_url: '' }))}>
                      <Trash2 className="mr-1 h-4 w-4" />Remover
                    </Button>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              </div>
              {form.file_url && (
                <p className="text-xs text-muted-foreground truncate">
                  Tipo detectado: <span className="font-medium">{getAttachmentKind(form.file_url)}</span>
                </p>
              )}
            </div>

            <div>
              <Label>Conteúdo / Notas</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={10}
                placeholder="Escreva aqui o conteúdo do documento, nota ou observações sobre o arquivo..." className="font-mono text-sm" />
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

      <AttachmentPreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </DashboardLayout>
  );
}
