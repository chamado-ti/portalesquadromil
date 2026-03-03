import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// TI pages
import TIDashboard from "./pages/ti/TIDashboard";
import TIUsuariosPage from "./pages/ti/TIUsuariosPage";
import TIChamadosPage from "./pages/ti/TIChamadosPage";
import TIAgendamentosPage from "./pages/ti/TIAgendamentosPage";
import TILogsPage from "./pages/ti/TILogsPage";
import TIConfiguracoesPage from "./pages/ti/TIConfiguracoesPage";
import TIRelatoriosPage from "./pages/ti/TIRelatoriosPage";

// Guarita pages
import GuaritaDashboard from "./pages/guarita/GuaritaDashboard";
import GuaritaQRCodePage from "./pages/guarita/GuaritaQRCodePage";
import GuaritaHistoricoPage from "./pages/guarita/GuaritaHistoricoPage";

// Colaborador pages
import ColaboradorDashboard from "./pages/colaborador/ColaboradorDashboard";
import ColaboradorAssistentePage from "./pages/colaborador/ColaboradorAssistentePage";
import ColaboradorChamadosPage from "./pages/colaborador/ColaboradorChamadosPage";
import ColaboradorAgendamentosPage from "./pages/colaborador/ColaboradorAgendamentosPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />

              {/* TI routes */}
              <Route
                path="/ti"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/usuarios"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIUsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/chamados"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIChamadosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/agendamentos"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIAgendamentosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/logs"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TILogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/configuracoes"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIConfiguracoesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ti/relatorios"
                element={
                  <ProtectedRoute allowedRoles={['ti']}>
                    <TIRelatoriosPage />
                  </ProtectedRoute>
                }
              />

              {/* Guarita routes */}
              <Route
                path="/guarita"
                element={
                  <ProtectedRoute allowedRoles={['guarita']}>
                    <GuaritaDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guarita/qrcode"
                element={
                  <ProtectedRoute allowedRoles={['guarita']}>
                    <GuaritaQRCodePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/guarita/historico"
                element={
                  <ProtectedRoute allowedRoles={['guarita']}>
                    <GuaritaHistoricoPage />
                  </ProtectedRoute>
                }
              />

              {/* Colaborador routes */}
              <Route
                path="/colaborador"
                element={
                  <ProtectedRoute allowedRoles={['colaborador']}>
                    <ColaboradorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/colaborador/assistente"
                element={
                  <ProtectedRoute allowedRoles={['colaborador']}>
                    <ColaboradorAssistentePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/colaborador/chamados"
                element={
                  <ProtectedRoute allowedRoles={['colaborador']}>
                    <ColaboradorChamadosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/colaborador/agendamentos"
                element={
                  <ProtectedRoute allowedRoles={['colaborador']}>
                    <ColaboradorAgendamentosPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
