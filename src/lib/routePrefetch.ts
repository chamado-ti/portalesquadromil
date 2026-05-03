// Centralized lazy-loaded route imports with prefetch support.
// Hovering/focusing a sidebar link triggers the dynamic import early,
// so by the time the user clicks the chunk is already in cache.

type Loader = () => Promise<unknown>;

export const routeLoaders: Record<string, Loader> = {
  // TI
  '/ti': () => import('@/pages/ti/TIDashboard'),
  '/ti/usuarios': () => import('@/pages/ti/TIUsuariosPage'),
  '/ti/chamados': () => import('@/pages/ti/TIChamadosPage'),
  '/ti/agendamentos': () => import('@/pages/ti/TIAgendamentosPage'),
  '/ti/logs': () => import('@/pages/ti/TILogsPage'),
  '/ti/configuracoes': () => import('@/pages/ti/TIConfiguracoesPage'),
  '/ti/relatorios': () => import('@/pages/ti/TIRelatoriosPage'),
  '/ti/assistente': () => import('@/pages/ti/TIAssistentePage'),
  '/ti/agentes': () => import('@/pages/ti/TIAgentesPage'),
  '/ti/modulos': () => import('@/pages/ti/TIModulosPage'),
  '/ti/tarefas': () => import('@/pages/ti/TITarefasPage'),
  '/ti/kanban': () => import('@/pages/ti/TIKanbanPage'),
  '/ti/arquivos': () => import('@/pages/ti/TIArquivosPage'),
  '/ti/processos': () => import('@/pages/ti/TIProcessosPage'),
  '/ti/grupos': () => import('@/pages/ti/TIGruposPage'),
  // Guarita
  '/guarita': () => import('@/pages/guarita/GuaritaDashboard'),
  '/guarita/agendar': () => import('@/pages/guarita/GuaritaAgendarPage'),
  '/guarita/qrcode': () => import('@/pages/guarita/GuaritaQRCodePage'),
  '/guarita/historico': () => import('@/pages/guarita/GuaritaHistoricoPage'),
  // Colaborador
  '/colaborador': () => import('@/pages/colaborador/ColaboradorDashboard'),
  '/colaborador/assistente': () => import('@/pages/colaborador/ColaboradorAssistentePage'),
  '/colaborador/chamados': () => import('@/pages/colaborador/ColaboradorChamadosPage'),
  '/colaborador/agendamentos': () => import('@/pages/colaborador/ColaboradorAgendamentosPage'),
  '/colaborador/agentes': () => import('@/pages/colaborador/ColaboradorAgentesPage'),
  '/colaborador/grupos': () => import('@/pages/colaborador/ColaboradorGruposPage'),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const loader = routeLoaders[path];
  if (!loader) return;
  prefetched.add(path);
  // Fire-and-forget; failures are silent (will retry on real navigation).
  loader().catch(() => prefetched.delete(path));
}

export function prefetchRoutesForRole(role: 'ti' | 'guarita' | 'colaborador') {
  const prefix = `/${role}`;
  // Defer to idle time so it doesn't compete with current page render.
  const run = () => {
    Object.keys(routeLoaders)
      .filter((p) => p === prefix || p.startsWith(prefix + '/'))
      .forEach(prefetchRoute);
  };
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 800);
  }
}
