import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useConfigurations } from "@/hooks/useConfigurations";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAIKnowledgeBase } from "@/hooks/useAIKnowledgeBase";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  Tag,
  Zap,
  Clock,
  Upload,
  Image,
  Bot,
  BookOpen,
} from "lucide-react";

export default function TIConfiguracoesPage() {
  const { toast } = useToast();
  const {
    statuses,
    urgencies,
    categories,
    isLoading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreatingCategory,
  } = useConfigurations();

  const { getSetting, updateSetting, isUpdating: isUpdatingSettings } = useSystemSettings();
  const {
    items: knowledgeItems,
    isLoading: isLoadingKnowledge,
    create: createKnowledge,
    update: updateKnowledge,
    delete: deleteKnowledge,
    isCreating: isCreatingKnowledge,
  } = useAIKnowledgeBase();

  const [categoryDialog, setCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryError, setCategoryError] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Knowledge base state
  const [knowledgeDialog, setKnowledgeDialog] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<{
    id: string;
    title: string;
    content: string;
  } | null>(null);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", content: "" });

  const handleOpenCategoryDialog = (
    category?: { id: string; name: string; description: string | null }
  ) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({ name: category.name, description: category.description || "" });
    } else {
      setSelectedCategory(null);
      setCategoryForm({ name: "", description: "" });
    }
    setCategoryError("");
    setCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setCategoryError("Nome é obrigatório");
      return;
    }
    try {
      if (selectedCategory) {
        await updateCategory({ id: selectedCategory.id, name: categoryForm.name, description: categoryForm.description || null });
      } else {
        await createCategory({ name: categoryForm.name, description: categoryForm.description || null });
      }
      setCategoryDialog(false);
    } catch {}
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      await deleteCategory(id);
    }
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);

      await updateSetting({ key: "company_logo", value: { url: publicUrl } });

      toast({ title: "Logo atualizado", description: "O logotipo foi atualizado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao fazer upload", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Knowledge base
  const handleOpenKnowledgeDialog = (item?: { id: string; title: string; content: string }) => {
    if (item) {
      setSelectedKnowledge(item);
      setKnowledgeForm({ title: item.title, content: item.content });
    } else {
      setSelectedKnowledge(null);
      setKnowledgeForm({ title: "", content: "" });
    }
    setKnowledgeDialog(true);
  };

  const handleSaveKnowledge = async () => {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    try {
      if (selectedKnowledge) {
        await updateKnowledge({ id: selectedKnowledge.id, title: knowledgeForm.title, content: knowledgeForm.content });
      } else {
        await createKnowledge({ title: knowledgeForm.title, content: knowledgeForm.content });
      }
      setKnowledgeDialog(false);
    } catch {}
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este item da base de conhecimento?")) {
      await deleteKnowledge(id);
    }
  };

  const currentLogo = getSetting("company_logo") as { url?: string } | undefined;

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Erro ao carregar configurações</h3>
            <p className="mb-4 text-muted-foreground">Não foi possível carregar as configurações.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-6">
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <CardDescription>Gerencie categorias, identidade visual e base de conhecimento da IA</CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="categories" className="gap-2">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="urgencies" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Urgências</span>
              </TabsTrigger>
              <TabsTrigger value="statuses" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Logo</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">IA</span>
              </TabsTrigger>
            </TabsList>

            {/* Categories */}
            <TabsContent value="categories">
              <Card className="card-institutional">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Categorias de Chamados</CardTitle>
                    <CardDescription>Tipos de problemas que podem ser reportados</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenCategoryDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Categoria
                  </Button>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Tag className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mb-2 text-lg font-medium">Nenhuma categoria cadastrada</h3>
                      <p className="text-muted-foreground">Clique em "Nova Categoria" para adicionar.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categories.map((category) => (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.name}</TableCell>
                              <TableCell className="text-muted-foreground">{category.description || "—"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenCategoryDialog(category)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Urgencies */}
            <TabsContent value="urgencies">
              <Card className="card-institutional">
                <CardHeader>
                  <CardTitle>Níveis de Urgência</CardTitle>
                  <CardDescription>Prioridades disponíveis para chamados (somente visualização)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Tempo de Resposta</TableHead>
                          <TableHead>Ordem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {urgencies.map((urgency) => (
                          <TableRow key={urgency.id}>
                            <TableCell className="font-medium">{urgency.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: urgency.color }} />
                                <span className="text-sm text-muted-foreground">{urgency.color}</span>
                              </div>
                            </TableCell>
                            <TableCell>{urgency.response_time_minutes} minutos</TableCell>
                            <TableCell><Badge variant="outline">{urgency.sort_order}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statuses */}
            <TabsContent value="statuses">
              <Card className="card-institutional">
                <CardHeader>
                  <CardTitle>Status de Chamados</CardTitle>
                  <CardDescription>Estados disponíveis para o fluxo de chamados (somente visualização)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Ordem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statuses.map((status) => (
                          <TableRow key={status.id}>
                            <TableCell className="font-medium">{status.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: status.color }} />
                                <span className="text-sm text-muted-foreground">{status.color}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant="outline">{status.sort_order}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding / Logo */}
            <TabsContent value="branding">
              <Card className="card-institutional">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Identidade Visual
                  </CardTitle>
                  <CardDescription>Faça upload do logotipo da empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                      {currentLogo?.url ? (
                        <img src={currentLogo.url} alt="Logo" className="h-20 w-20 object-contain" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {currentLogo?.url ? "Alterar Logo" : "Enviar Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máximo 2MB.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Knowledge Base */}
            <TabsContent value="ai">
              <Card className="card-institutional">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Base de Conhecimento da IA
                    </CardTitle>
                    <CardDescription>Adicione conteúdos para treinar o assistente</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenKnowledgeDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Conteúdo
                  </Button>
                </CardHeader>
                <CardContent>
                  {isLoadingKnowledge ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : knowledgeItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mb-2 text-lg font-medium">Nenhum conteúdo cadastrado</h3>
                      <p className="text-muted-foreground">Adicione instruções, FAQs e procedimentos para a IA utilizar.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {knowledgeItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between rounded-lg border bg-secondary/30 p-4"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{item.title}</h4>
                              <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                                {item.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                          </div>
                          <div className="ml-4 flex items-center gap-2">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={(checked) => updateKnowledge({ id: item.id, is_active: checked })}
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleOpenKnowledgeDialog(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteKnowledge(item.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Hardware, Software, Rede..."
                className={categoryError ? "border-destructive" : ""}
              />
              {categoryError && <p className="text-sm text-destructive">{categoryError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Descrição</Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Descrição opcional da categoria"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={isCreatingCategory}>
              {isCreatingCategory && <LoadingSpinner size="sm" className="mr-2" />}
              {selectedCategory ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Knowledge Dialog */}
      <Dialog open={knowledgeDialog} onOpenChange={setKnowledgeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedKnowledge ? "Editar Conteúdo" : "Novo Conteúdo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                placeholder="Ex: Como resetar senha do email"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                placeholder="Descreva o procedimento, FAQ ou instrução que a IA deve conhecer..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKnowledgeDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleSaveKnowledge}
              disabled={isCreatingKnowledge || !knowledgeForm.title.trim() || !knowledgeForm.content.trim()}
            >
              {isCreatingKnowledge && <LoadingSpinner size="sm" className="mr-2" />}
              {selectedKnowledge ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
