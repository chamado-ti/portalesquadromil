import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import React, { Suspense } from "react";
import { LoadingPage } from "@/components/ui/LoadingSpinner";

// Public pages (keep eager)
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy load all dashboard pages
const TIDashboard = React.lazy(() => import("./pages/ti/TIDashboard"));
const TIUsuariosPage = React.lazy(() => import("./pages/ti/TIUsuariosPage"));
const TIChamadosPage = React.lazy(() => import("./pages/ti/TIChamadosPage"));
const TIAgendamentosPage = React.lazy(() => import("./pages/ti/TIAgendamentosPage"));
const TILogsPage = React.lazy(() => import("./pages/ti/TILogsPage"));
const TIConfiguracoesPage = React.lazy(() => import("./pages/ti/TIConfiguracoesPage"));
const TIRelatoriosPage = React.lazy(() => import("./pages/ti/TIRelatoriosPage"));

const GuaritaDashboard = React.lazy(() => import("./pages/guarita/GuaritaDashboard"));
const GuaritaQRCodePage = React.lazy(() => import("./pages/guarita/GuaritaQRCodePage"));
const GuaritaHistoricoPage = React.lazy(() => import("./pages/guarita/GuaritaHistoricoPage"));

const ColaboradorDashboard = React.lazy(() => import("./pages/colaborador/ColaboradorDashboard"));
const ColaboradorAssistentePage = React.lazy(() => import("./pages/colaborador/ColaboradorAssistentePage"));
const ColaboradorChamadosPage = React.lazy(() => import("./pages/colaborador/ColaboradorChamadosPage"));
const ColaboradorAgendamentosPage = React.lazy(() => import("./pages/colaborador/ColaboradorAgendamentosPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 min stale time for snappier nav
    },
  },
});

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingPage message="Carregando..." />}>
    {children}
  </Suspense>
);

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
              <Route path="/ti" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIDashboard /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/usuarios" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIUsuariosPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/chamados" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIChamadosPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/agendamentos" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIAgendamentosPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/logs" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TILogsPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/configuracoes" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIConfiguracoesPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/ti/relatorios" element={<ProtectedRoute allowedRoles={['ti']}><SuspenseWrapper><TIRelatoriosPage /></SuspenseWrapper></ProtectedRoute>} />

              {/* Guarita routes */}
              <Route path="/guarita" element={<ProtectedRoute allowedRoles={['guarita']}><SuspenseWrapper><GuaritaDashboard /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/guarita/qrcode" element={<ProtectedRoute allowedRoles={['guarita']}><SuspenseWrapper><GuaritaQRCodePage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/guarita/historico" element={<ProtectedRoute allowedRoles={['guarita']}><SuspenseWrapper><GuaritaHistoricoPage /></SuspenseWrapper></ProtectedRoute>} />

              {/* Colaborador routes */}
              <Route path="/colaborador" element={<ProtectedRoute allowedRoles={['colaborador']}><SuspenseWrapper><ColaboradorDashboard /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/colaborador/assistente" element={<ProtectedRoute allowedRoles={['colaborador']}><SuspenseWrapper><ColaboradorAssistentePage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/colaborador/chamados" element={<ProtectedRoute allowedRoles={['colaborador']}><SuspenseWrapper><ColaboradorChamadosPage /></SuspenseWrapper></ProtectedRoute>} />
              <Route path="/colaborador/agendamentos" element={<ProtectedRoute allowedRoles={['colaborador']}><SuspenseWrapper><ColaboradorAgendamentosPage /></SuspenseWrapper></ProtectedRoute>} />

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
