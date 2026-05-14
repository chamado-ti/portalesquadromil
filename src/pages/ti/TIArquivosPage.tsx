import { useState, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, Trash2, Loader2, FileText, FolderOpen, Upload, File, FileSpreadsheet, 
  FileType, Eye, Download, FolderPlus, Grid, List, Search, MoreVertical,
  ChevronRight, Star, Clock, Trash, Folder, Image as ImageIcon, Video, Music,
  FileArchive, Filter, HardDrive, Share2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AttachmentPreviewDialog, getAttachmentKind } from '@/components/AttachmentPreview';
import { cn } from '@/lib/utils';

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
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState('Geral');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<TIFile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'recent' | 'favorites'>('all');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['ti-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ti_files').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as TIFile[];
    },
  });

  const folders = useMemo(() => {
    const set = new Set(files.map(f => f.folder));
    if (set.size === 0) set.add('Geral');
    return Array.from(set);
  }, [files]);

  const filteredFiles = useMemo(() => {
    let result = files;
    
    // Search
    if (searchTerm) {
      result = result.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      // Sidebar filter
      if (sidebarFilter === 'recent') {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        result = result.filter(f => parseISO(f.created_at) > twoDaysAgo);
      } else if (sidebarFilter === 'all') {
        result = result.filter(f => f.folder === activeFolder);
      }
    }
    
    return result;
  }, [files, searchTerm, activeFolder, sidebarFilter]);

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
      toast({ title: 'Arquivo enviado com sucesso' });
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
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: TIFile) => {
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

  const getFileIcon = (url: string | null, type: string) => {
    if (type === 'spreadsheet') return <FileSpreadsheet className="h-6 w-6 text-emerald-600" />;
    if (type === 'note') return <FileType className="h-6 w-6 text-amber-600" />;
    
    if (!url) return <FileText className="h-6 w-6 text-blue-600" />;
    
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext!)) return <ImageIcon className="h-6 w-6 text-rose-600" />;
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext!)) return <Video className="h-6 w-6 text-indigo-600" />;
    if (['pdf'].includes(ext!)) return <FileText className="h-6 w-6 text-red-600" />;
    if (['zip', 'rar', '7z'].includes(ext!)) return <FileArchive className="h-6 w-6 text-amber-700" />;
    
    return <File className="h-6 w-6 text-slate-600" />;
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in">
        {/* Sidebar Estilo Drive */}
        <div className="w-64 flex flex-col gap-6 shrink-0">
          <Button 
            onClick={() => { setEditingFile(null); setForm({ ...emptyForm, folder: activeFolder }); setDialogOpen(true); }}
            className="w-full h-12 shadow-institutional font-bold text-base gap-2 rounded-2xl"
          >
            <Plus className="h-5 w-5" /> Novo
          </Button>

          <div className="space-y-1">
            <Button 
              variant={sidebarFilter === 'all' ? 'secondary' : 'ghost'} 
              className="w-full justify-start gap-3 h-10 font-bold text-sm rounded-xl px-4"
              onClick={() => { setSidebarFilter('all'); setSearchTerm(''); }}
            >
              <HardDrive className="h-4 w-4" /> Meu Drive
            </Button>
            <Button 
              variant={sidebarFilter === 'recent' ? 'secondary' : 'ghost'} 
              className="w-full justify-start gap-3 h-10 font-bold text-sm rounded-xl px-4"
              onClick={() => { setSidebarFilter('recent'); setSearchTerm(''); }}
            >
              <Clock className="h-4 w-4" /> Recentes
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 font-bold text-sm rounded-xl px-4">
              <Star className="h-4 w-4" /> Favoritos
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 h-10 font-bold text-sm rounded-xl px-4">
              <Trash className="h-4 w-4" /> Lixeira
            </Button>
          </div>

          <div className="mt-4">
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Pastas</p>
            <div className="space-y-1">
              {folders.map(f => (
                <Button 
                  key={f} 
                  variant={activeFolder === f && sidebarFilter === 'all' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-3 h-9 font-medium text-xs rounded-xl px-4 truncate"
                  onClick={() => { setActiveFolder(f); setSidebarFilter('all'); setSearchTerm(''); }}
                >
                  <Folder className={cn("h-4 w-4", activeFolder === f ? "text-primary" : "text-muted-foreground")} /> 
                  {f}
                </Button>
              ))}
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 h-9 font-bold text-[10px] uppercase text-primary/70 rounded-xl px-4"
                onClick={() => setNewFolderOpen(true)}
              >
                <Plus className="h-3 w-3" /> Criar Pasta
              </Button>
            </div>
          </div>
        </div>

        {/* Área Principal */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border shadow-sm overflow-hidden">
          {/* Header de Navegação */}
          <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => { setActiveFolder('Geral'); setSidebarFilter('all'); }}>Arquivos</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{sidebarFilter === 'all' ? activeFolder : sidebarFilter === 'recent' ? 'Recentes' : 'Favoritos'}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="pl-9 h-9 bg-muted/40 border-none rounded-xl text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex bg-muted/40 rounded-xl p-1">
                <Button 
                  variant={viewMode === 'grid' ? 'white' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'white' : 'ghost'} 
                  size="icon" 
                  className="h-7 w-7 rounded-lg"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Grid de Arquivos */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Carregando seus arquivos...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-20 h-20 bg-muted/30 rounded-3xl flex items-center justify-center mb-4">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pasta Vazia</h3>
                <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
                  Arraste arquivos ou clique em novo para começar.
                </p>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                  : "space-y-1"
              )}>
                {filteredFiles.map(file => (
                  viewMode === 'grid' ? (
                    <Card 
                      key={file.id} 
                      className="group cursor-pointer border-none shadow-none hover:bg-muted/30 transition-all rounded-2xl overflow-hidden"
                      onClick={() => {
                        setEditingFile(file);
                        setForm({
                          name: file.name, description: file.description || '', file_type: file.file_type,
                          content: file.content || '', folder: file.folder, file_url: file.file_url || '',
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className="w-full aspect-square bg-muted/30 rounded-2xl flex items-center justify-center mb-3 relative group-hover:bg-white transition-colors">
                          {getFileIcon(file.file_url, file.file_type)}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl">
                                {file.file_url && (
                                  <DropdownMenuItem onClick={() => setPreviewUrl(file.file_url!)}>
                                    <Eye className="mr-2 h-4 w-4" /> Visualizar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => window.open(file.file_url!, '_blank')}>
                                  <Download className="mr-2 h-4 w-4" /> Baixar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(file)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground truncate w-full">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(parseISO(file.created_at), 'dd/MM/yyyy')}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div 
                      key={file.id} 
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all cursor-pointer group"
                      onClick={() => {
                        setEditingFile(file);
                        setForm({
                          name: file.name, description: file.description || '', file_type: file.file_type,
                          content: file.content || '', folder: file.folder, file_url: file.file_url || '',
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <div className="w-10 h-10 bg-muted/30 rounded-xl flex items-center justify-center shrink-0">
                        {getFileIcon(file.file_url, file.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{file.folder} • {format(parseISO(file.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                        {file.file_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={e => { e.stopPropagation(); setPreviewUrl(file.file_url!); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate(file); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nova Pasta */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle className="font-bold">Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome da Pasta</Label>
              <Input 
                value={newFolderName} 
                onChange={e => setNewFolderName(e.target.value)} 
                placeholder="Ex: Contratos, Relatórios..." 
                className="h-12 rounded-2xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-2xl h-12" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button 
              className="rounded-2xl h-12 shadow-institutional font-bold px-8"
              onClick={() => {
                if (!newFolderName.trim()) return;
                setActiveFolder(newFolderName.trim());
                setNewFolderName('');
                setNewFolderOpen(false);
                toast({ title: `Pasta "${newFolderName}" criada` });
              }}
            >
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Arquivo / Editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingFile ? 'Detalhes do Arquivo' : 'Novo Arquivo'}</DialogTitle>
                <p className="text-primary-foreground/80 text-xs">Organize seus documentos e notas em um só lugar.</p>
              </DialogHeader>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Título do Arquivo</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pasta Destino</Label>
                    <Select value={form.folder} onValueChange={v => setForm(p => ({ ...p, folder: v }))}>
                      <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        {folders.map(f => <SelectItem key={f} value={f} className="rounded-lg">{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de Arquivo</Label>
                  <Select value={form.file_type} onValueChange={v => setForm(p => ({ ...p, file_type: v }))}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {FILE_TYPES.map(t => {
                        const Icon = t.icon;
                        return (
                          <SelectItem key={t.value} value={t.value} className="rounded-lg">
                            <div className="flex items-center gap-2"><Icon className="h-4 w-4" /> {t.label}</div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Anexo Físico</Label>
                  <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-muted bg-muted/10 group hover:border-primary/30 transition-all">
                    <Button type="button" variant="white" className="shadow-sm rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {form.file_url ? 'Alterar Arquivo' : 'Selecionar Arquivo'}
                    </Button>
                    {form.file_url ? (
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <p className="text-xs font-bold text-primary truncate pr-4">{form.file_url.split('/').pop()}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewUrl(form.file_url)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => setForm(p => ({ ...p, file_url: '' }))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">PDF, JPG, XLSX, etc. Limite de 50MB.</p>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição / Notas Rápidas</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-10 rounded-xl" placeholder="Uma breve descrição..." />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conteúdo do Documento</Label>
                  <Textarea 
                    value={form.content} 
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))} 
                    rows={8}
                    className="rounded-2xl font-mono text-xs p-4 focus-visible:ring-primary shadow-inner bg-muted/10"
                    placeholder="Escreva aqui as notas, procedimentos ou o texto completo..." 
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
              <Button variant="ghost" className="rounded-xl h-11 px-8 font-bold" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button 
                className="rounded-xl h-11 px-10 shadow-institutional font-bold"
                onClick={() => saveMutation.mutate({ ...form, id: editingFile?.id })}
                disabled={saveMutation.isPending || !form.name}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingFile ? 'Atualizar Arquivo' : 'Criar Arquivo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AttachmentPreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </DashboardLayout>
  );
}
