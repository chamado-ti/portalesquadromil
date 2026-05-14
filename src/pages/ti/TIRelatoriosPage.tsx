import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useTickets } from '@/hooks/useTickets';
import { downloadCSV } from '@/lib/csvExport';
import { subDays, format } from 'date-fns';
import * as XLSX from 'xlsx';

// Components
import { useReportData, ReportFiltersState } from '@/components/ti/relatorios/useReportData';
import { ReportFilters } from '@/components/ti/relatorios/ReportFilters';
import { ReportKPIs } from '@/components/ti/relatorios/ReportKPIs';
import { ReportInsights } from '@/components/ti/relatorios/ReportInsights';

// Tabs
import { OperacionalTab } from '@/components/ti/relatorios/tabs/OperacionalTab';
import { GestaoTab } from '@/components/ti/relatorios/tabs/GestaoTab';
import { SLATab } from '@/components/ti/relatorios/tabs/SLATab';
import { PerformanceTab } from '@/components/ti/relatorios/tabs/PerformanceTab';
import { TendenciasTab } from '@/components/ti/relatorios/tabs/TendenciasTab';
import { AuditoriaTab } from '@/components/ti/relatorios/tabs/AuditoriaTab';

export default function TIRelatoriosPage() {
  const { tickets, statuses, urgencies, categories, isLoading } = useTickets();
  
  // Estado inicial dos filtros (últimos 30 dias)
  const [filters, setFilters] = useState<ReportFiltersState>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
    sectors: [],
    technicians: [],
    statuses: [],
    urgencies: [],
    categories: [],
    search: ''
  });

  // Processamento de dados
  const report = useReportData(tickets, statuses, urgencies, categories, filters);

  // Opções para os filtros
  const filterOptions = useMemo(() => {
    const sectors = Array.from(new Set(tickets.map(t => t.creator?.sector || 'Sem setor'))).sort();
    const technicians = Array.from(new Set(tickets.filter(t => t.assigned_to).map(t => JSON.stringify({
      id: t.assigned_to,
      name: t.assignee?.full_name || 'Desconhecido'
    })))).map(s => JSON.parse(s));

    return {
      sectors,
      technicians,
      statuses: statuses.map(s => ({ id: s.id, name: s.name })),
      urgencies: urgencies.map(u => ({ id: u.id, name: u.name })),
      categories: categories.map(c => ({ id: c.id, name: c.name }))
    };
  }, [tickets, statuses, urgencies, categories]);

  // KPIs formatados para o componente
  const kpiData = {
    ...report.timeMetrics,
    totalCount: report.filteredTickets.length,
    sectorsCount: new Set(report.filteredTickets.map(t => t.creator?.sector || 'Sem setor')).size,
    urgentRate: report.filteredTickets.length > 0 
      ? ((report.filteredTickets.filter(t => {
          const urgency = urgencies.find(u => u.id === t.urgency_id)?.name.toLowerCase();
          return urgency === 'urgente' || urgency === 'crítico' || urgency === 'alta';
        }).length / report.filteredTickets.length) * 100).toFixed(0)
      : 0
  };

  const handleExport = (formatType: 'csv' | 'excel' | 'pdf') => {
    const dataToExport = report.filteredTickets.map(t => ({
      'ID': t.id.slice(0, 8),
      'Título': t.title,
      'Solicitante': t.creator?.full_name || 'Desconhecido',
      'Setor': t.creator?.sector || 'Sem setor',
      'Técnico': t.assignee?.full_name || 'Não atribuído',
      'Status': statuses.find(s => s.id === t.status_id)?.name || 'Desconhecido',
      'Urgência': urgencies.find(u => u.id === t.urgency_id)?.name || 'N/A',
      'Categoria': categories.find(c => c.id === t.category_id)?.name || 'N/A',
      'Criado em': format(new Date(t.created_at), 'dd/MM/yyyy HH:mm'),
      'Finalizado em': t.closed_at ? format(new Date(t.closed_at), 'dd/MM/yyyy HH:mm') : 'Pendente'
    }));

    if (formatType === 'csv') {
      downloadCSV(
        dataToExport as any,
        `relatorio-ti-${format(new Date(), 'yyyy-MM-dd')}`,
        Object.keys(dataToExport[0]).map(k => ({ key: k, label: k }))
      );
    } else if (formatType === 'excel') {
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório de Chamados");
      XLSX.writeFile(wb, `relatorio-ti-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else if (formatType === 'pdf') {
      window.print();
    }
  };

  if (isLoading) return <LoadingPage message="Processando dados analíticos..." />;

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-8 pb-10 print:p-0 print:space-y-4">
        {/* Header - Hidden in print */}
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-3xl font-bold tracking-tight">Inteligência de Dados</h2>
          <p className="text-muted-foreground">Visão analítica e estratégica do suporte técnico</p>
        </div>

        {/* Filters - Hidden in print */}
        <div className="print:hidden">
          <ReportFilters 
            filters={filters} 
            setFilters={setFilters} 
            onExport={handleExport}
            options={filterOptions}
          />
        </div>

        {/* KPIs Section */}
        <ReportKPIs 
          data={kpiData} 
          previousData={report.previousTickets}
          evolutionData={report.trendData.evolution}
        />

        {/* Insights Section - Hidden in print if empty */}
        <ReportInsights insights={report.insights} />

        {/* Tabs Section */}
        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6 print:hidden">
            <TabsTrigger value="operacional" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">Operacional</TabsTrigger>
            <TabsTrigger value="gestao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">Gestão</TabsTrigger>
            <TabsTrigger value="sla" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">SLA</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">Performance</TabsTrigger>
            <TabsTrigger value="tendencias" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">Tendências</TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 pt-2 text-xs font-bold uppercase tracking-wider">Auditoria</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="operacional" className="animate-in fade-in-50 duration-500">
              <OperacionalTab data={report.operationalData} />
            </TabsContent>
            <TabsContent value="gestao" className="animate-in fade-in-50 duration-500">
              <GestaoTab data={report.trendData} />
            </TabsContent>
            <TabsContent value="sla" className="animate-in fade-in-50 duration-500">
              <SLATab data={report.timeMetrics} />
            </TabsContent>
            <TabsContent value="performance" className="animate-in fade-in-50 duration-500">
              <PerformanceTab tickets={report.filteredTickets} />
            </TabsContent>
            <TabsContent value="tendencias" className="animate-in fade-in-50 duration-500">
              <TendenciasTab data={report.trendData} />
            </TabsContent>
            <TabsContent value="auditoria" className="animate-in fade-in-50 duration-500">
              <AuditoriaTab data={report.operationalData} previousTickets={report.previousTickets} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Print Overlay for current active tab if needed - Simplified as window.print prints the DOM */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\:hidden { display: none !important; }
          .card-institutional { border: 1px solid #eee !important; box-shadow: none !important; }
          @page { margin: 1cm; }
        }
      `}} />
    </DashboardLayout>
  );
}
