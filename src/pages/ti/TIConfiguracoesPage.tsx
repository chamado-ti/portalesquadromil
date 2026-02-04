import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TIConfiguracoesPage() {
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
    isDeletingCategory,
  } = useConfigurations();

  const [categoryDialog, setCategoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryError, setCategoryError] = useState("");

  const handleOpenCategoryDialog = (
    category?: { id: string; name: string; description: string | null }
  ) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || "",
      });
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
        await updateCategory({
          id: selectedCategory.id,
          name: categoryForm.name,
          description: categoryForm.description || null,
        });
      } else {
        await createCategory({
          name: categoryForm.name,
          description: categoryForm.description || null,
        });
      }
      setCategoryDialog(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      await deleteCategory(id);
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <Card className="card-institutional">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
            <h3 className="mb-2 text-lg font-medium">Erro ao carregar configurações</h3>
            <p className="mb-4 text-muted-foreground">
              Não foi possível carregar as configurações do sistema.
            </p>
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
        {/* Header */}
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Sistema
            </CardTitle>
            <CardDescription>
              Gerencie categorias, status e urgências de chamados
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="categories" className="gap-2">
                <Tag className="h-4 w-4" />
                Categorias
              </TabsTrigger>
              <TabsTrigger value="urgencies" className="gap-2">
                <Zap className="h-4 w-4" />
                Urgências
              </TabsTrigger>
              <TabsTrigger value="statuses" className="gap-2">
                <Clock className="h-4 w-4" />
                Status
              </TabsTrigger>
            </TabsList>

            {/* Categories */}
            <TabsContent value="categories">
              <Card className="card-institutional">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Categorias de Chamados</CardTitle>
                    <CardDescription>
                      Tipos de problemas que podem ser reportados
                    </CardDescription>
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
                      <h3 className="mb-2 text-lg font-medium">
                        Nenhuma categoria cadastrada
                      </h3>
                      <p className="text-muted-foreground">
                        Clique em "Nova Categoria" para adicionar a primeira.
                      </p>
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
                              <TableCell className="font-medium">
                                {category.name}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {category.description || "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenCategoryDialog(category)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
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
                  <CardDescription>
                    Prioridades disponíveis para chamados (somente visualização)
                  </CardDescription>
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
                            <TableCell className="font-medium">
                              {urgency.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded-full"
                                  style={{ backgroundColor: urgency.color }}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {urgency.color}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {urgency.response_time_minutes} minutos
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{urgency.sort_order}</Badge>
                            </TableCell>
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
                  <CardDescription>
                    Estados disponíveis para o fluxo de chamados (somente visualização)
                  </CardDescription>
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
                            <TableCell className="font-medium">
                              {status.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {status.color}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{status.sort_order}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
            <DialogTitle>
              {selectedCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="Ex: Hardware, Software, Rede..."
                className={categoryError ? "border-destructive" : ""}
              />
              {categoryError && (
                <p className="text-sm text-destructive">{categoryError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Descrição</Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="Descrição opcional da categoria"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} disabled={isCreatingCategory}>
              {isCreatingCategory ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : null}
              {selectedCategory ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
