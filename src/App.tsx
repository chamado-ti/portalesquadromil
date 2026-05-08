import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import React, { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RoutePrefetcher } from "@/components/RoutePrefetcher";

// Public pages (keep eager)
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy load all dashboard pages
const TIDashboard = React.lazy(() => import("./pages/ti/TIDashboard"));
const TIUsuariosPage = React.lazy(() => import("./pages/ti/TIUsuariosPage"));
const TIChamadosPage = React.lazy(() => import("./pages/ti/TIChamadosPage"));
const TIAgendamentosPage = React.lazy(() => import("./pages/ti/TIAgendamentosPage"));
const TILogsPage = React.lazy(() => import("./pages/ti/TILogsPage"));
const TIConfiguracoesPage = React.lazy(() => import("./pages/ti/TIConfiguracoesPage"));
const TIRelatoriosPage = React.lazy(() => import("./pages/ti/TIRelatoriosPage"));
const TIAssistentePage = React.lazy(() => import("./pages/ti/TIAssistentePage"));
const TIAgentesPage = React.lazy(() => import("./pages/ti/TIAgentesPage"));
const TIModulosPage = React.lazy(() => import("./pages/ti/TIModulosPage"));
const TITarefasPage = React.lazy(() => import("./pages/ti/TITarefasPage"));
const TIKanbanPage = React.lazy(() => import("./pages/ti/TIKanbanPage"));
const TIArquivosPage = React.lazy(() => import("./pages/ti/TIArquivosPage"));
const TIProcessosPage = React.lazy(() => import("./pages/ti/TIProcessosPage"));
const TIGruposPage = React.lazy(() => import("./pages/ti/TIGruposPage"));

const GuaritaDashboard = React.lazy(() => import("./pages/guarita/GuaritaDashboard"));
const GuaritaQRCodePage = React.lazy(() => import("./pages/guarita/GuaritaQRCodePage"));
const GuaritaHistoricoPage = React.lazy(() => import("./pages/guarita/GuaritaHistoricoPage"));
const GuaritaAgendarPage = React.lazy(() => import("./pages/guarita/GuaritaAgendarPage"));
const GuaritaSolicitacoesPage = React.lazy(() => import("./pages/guarita/GuaritaSolicitacoesPage"));
const GuaritaChamadosPage = React.lazy(() => import("./pages/guarita/GuaritaChamadosPage"));

const ColaboradorDashboard = React.lazy(() => import("./pages/colaborador/ColaboradorDashboard"));
const ColaboradorAssistentePage = React.lazy(() => import("./pages/colaborador/ColaboradorAssistentePage"));
const ColaboradorChamadosPage = React.lazy(() => import("./pages/colaborador/ColaboradorChamadosPage"));
const ColaboradorAgendamentosPage = React.lazy(() => import("./pages/colaborador/ColaboradorAgendamentosPage"));
const ColaboradorAgentesPage = React.lazy(() => import("./pages/colaborador/ColaboradorAgentesPage"));
const ColaboradorGruposPage = React.lazy(() => import("./pages/colaborador/ColaboradorGruposPage"));
const ColaboradorSolicitarPage = React.lazy(() => import("./pages/colaborador/ColaboradorSolicitarPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RoutePrefetcher />
            <Suspense fallback={
              <div className="flex min-h-screen w-full items-center justify-center bg-secondary">
                <LoadingSpinner size="md" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Landing />} />

                <Route path="/ti" element={<ProtectedRoute allowedRoles={['ti']}><TIDashboard /></ProtectedRoute>} />
                <Route path="/ti/usuarios" element={<ProtectedRoute allowedRoles={['ti']}><TIUsuariosPage /></ProtectedRoute>} />
                <Route path="/ti/chamados" element={<ProtectedRoute allowedRoles={['ti']}><TIChamadosPage /></ProtectedRoute>} />
                <Route path="/ti/agendamentos" element={<ProtectedRoute allowedRoles={['ti']}><TIAgendamentosPage /></ProtectedRoute>} />
                <Route path="/ti/logs" element={<ProtectedRoute allowedRoles={['ti']}><TILogsPage /></ProtectedRoute>} />
                <Route path="/ti/configuracoes" element={<ProtectedRoute allowedRoles={['ti']}><TIConfiguracoesPage /></ProtectedRoute>} />
                <Route path="/ti/relatorios" element={<ProtectedRoute allowedRoles={['ti']}><TIRelatoriosPage /></ProtectedRoute>} />
                <Route path="/ti/assistente" element={<ProtectedRoute allowedRoles={['ti']}><TIAssistentePage /></ProtectedRoute>} />
                <Route path="/ti/agentes" element={<ProtectedRoute allowedRoles={['ti']}><TIAgentesPage /></ProtectedRoute>} />
                <Route path="/ti/modulos" element={<ProtectedRoute allowedRoles={['ti']}><TIModulosPage /></ProtectedRoute>} />
                <Route path="/ti/tarefas" element={<ProtectedRoute allowedRoles={['ti']}><TITarefasPage /></ProtectedRoute>} />
                <Route path="/ti/kanban" element={<ProtectedRoute allowedRoles={['ti']}><TIKanbanPage /></ProtectedRoute>} />
                <Route path="/ti/arquivos" element={<ProtectedRoute allowedRoles={['ti']}><TIArquivosPage /></ProtectedRoute>} />
                <Route path="/ti/processos" element={<ProtectedRoute allowedRoles={['ti']}><TIProcessosPage /></ProtectedRoute>} />
                <Route path="/ti/grupos" element={<ProtectedRoute allowedRoles={['ti']}><TIGruposPage /></ProtectedRoute>} />
                <Route path="/ti/solicitacoes" element={<ProtectedRoute allowedRoles={['ti']}><GuaritaSolicitacoesPage /></ProtectedRoute>} />

                <Route path="/guarita" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaDashboard /></ProtectedRoute>} />
                <Route path="/guarita/agendar" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaAgendarPage /></ProtectedRoute>} />
                <Route path="/guarita/solicitacoes" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaSolicitacoesPage /></ProtectedRoute>} />
                <Route path="/guarita/qrcode" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaQRCodePage /></ProtectedRoute>} />
                <Route path="/guarita/chamados" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaChamadosPage /></ProtectedRoute>} />
                <Route path="/guarita/historico" element={<ProtectedRoute allowedRoles={['guarita']}><GuaritaHistoricoPage /></ProtectedRoute>} />

                <Route path="/colaborador" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorDashboard /></ProtectedRoute>} />
                <Route path="/colaborador/assistente" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorAssistentePage /></ProtectedRoute>} />
                <Route path="/colaborador/chamados" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorChamadosPage /></ProtectedRoute>} />
                <Route path="/colaborador/agendamentos" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorAgendamentosPage /></ProtectedRoute>} />
                <Route path="/colaborador/agentes" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorAgentesPage /></ProtectedRoute>} />
                <Route path="/colaborador/grupos" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorGruposPage /></ProtectedRoute>} />
                <Route path="/colaborador/solicitar" element={<ProtectedRoute allowedRoles={['colaborador']}><ColaboradorSolicitarPage /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
