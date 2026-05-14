import { useMemo } from 'react';
import { 
  differenceInHours, 
  parseISO, 
  isWithinInterval, 
  startOfDay, 
  endOfDay, 
  format, 
  eachDayOfInterval, 
  subDays,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  subMonths,
  getHours,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ticket, TicketStatus, TicketUrgency, TicketCategory } from '@/hooks/useTickets';

export interface ReportFiltersState {
  dateRange: { from: Date; to: Date } | undefined;
  sectors: string[];
  technicians: string[];
  statuses: string[];
  urgencies: string[];
  categories: string[];
  search: string;
}

export function useReportData(
  tickets: Ticket[],
  statuses: TicketStatus[],
  urgencies: TicketUrgency[],
  categories: TicketCategory[],
  filters: ReportFiltersState
) {
  // 1. Filtragem reativa
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const ticketDate = parseISO(ticket.created_at);
      
      // Filtro de Data
      if (filters.dateRange?.from && filters.dateRange?.to) {
        if (!isWithinInterval(ticketDate, { 
          start: startOfDay(filters.dateRange.from), 
          end: endOfDay(filters.dateRange.to) 
        })) return false;
      }

      // Filtro de Setor
      if (filters.sectors.length > 0 && !filters.sectors.includes(ticket.creator?.sector || 'Sem setor')) return false;

      // Filtro de Técnico
      if (filters.technicians.length > 0 && !filters.technicians.includes(ticket.assigned_to || 'unassigned')) return false;

      // Filtro de Status
      if (filters.statuses.length > 0 && !filters.statuses.includes(ticket.status_id)) return false;

      // Filtro de Urgência
      if (filters.urgencies.length > 0 && !filters.urgencies.includes(ticket.urgency_id || 'none')) return false;

      // Filtro de Categoria
      if (filters.categories.length > 0 && !filters.categories.includes(ticket.category_id || 'none')) return false;

      // Filtro de Pesquisa
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          ticket.title.toLowerCase().includes(search) ||
          ticket.description?.toLowerCase().includes(search) ||
          ticket.creator?.full_name.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [tickets, filters]);

  // 2. Cálculos de Período Anterior (para comparação)
  const previousTickets = useMemo(() => {
    if (!filters.dateRange?.from || !filters.dateRange?.to) return [];
    
    const duration = filters.dateRange.to.getTime() - filters.dateRange.from.getTime();
    const prevTo = new Date(filters.dateRange.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);

    return tickets.filter(ticket => {
      const ticketDate = parseISO(ticket.created_at);
      return isWithinInterval(ticketDate, { start: startOfDay(prevFrom), end: endOfDay(prevTo) });
    });
  }, [tickets, filters.dateRange]);

  // 3. Cruzamentos Operacionais
  const operationalData = useMemo(() => {
    const bySector: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    filteredTickets.forEach(t => {
      const sector = t.creator?.sector || 'Sem setor';
      bySector[sector] = (bySector[sector] || 0) + 1;

      const status = statuses.find(s => s.id === t.status_id)?.name || 'Desconhecido';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const urgency = urgencies.find(u => u.id === t.urgency_id)?.name || 'Sem prioridade';
      byUrgency[urgency] = (byUrgency[urgency] || 0) + 1;

      const category = categories.find(c => c.id === t.category_id)?.name || 'Sem categoria';
      byCategory[category] = (byCategory[category] || 0) + 1;

      const user = t.creator?.full_name || 'Desconhecido';
      byUser[user] = (byUser[user] || 0) + 1;
    });

    return {
      bySector: Object.entries(bySector).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byUrgency: Object.entries(byUrgency).map(([name, value]) => ({ name, value })),
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byUser: Object.entries(byUser).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
    };
  }, [filteredTickets, statuses, urgencies, categories]);

  // 4. Métricas de SLA e Tempo
  const timeMetrics = useMemo(() => {
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let slaMetCount = 0;
    let firstResponseTime = 0;
    let firstResponseCount = 0;

    filteredTickets.forEach(t => {
      if (t.closed_at) {
        const resolution = differenceInHours(parseISO(t.closed_at), parseISO(t.created_at));
        totalResolutionTime += resolution;
        resolvedCount++;

        const urgency = urgencies.find(u => u.id === t.urgency_id);
        if (urgency && urgency.response_time_minutes) {
          const resolutionMinutes = resolution * 60;
          if (resolutionMinutes <= urgency.response_time_minutes) {
            slaMetCount++;
          }
        }
      }

      if (t.messages && t.messages.length > 0) {
        // Encontrar a primeira mensagem que não é do criador
        const firstReply = t.messages.find(m => m.sender_id !== t.created_by);
        if (firstReply) {
          const firstResponse = differenceInHours(parseISO(firstReply.created_at), parseISO(t.created_at));
          firstResponseTime += firstResponse;
          firstResponseCount++;
        }
      }
    });

    return {
      avgResolutionTime: resolvedCount > 0 ? (totalResolutionTime / resolvedCount).toFixed(1) : 0,
      slaRate: resolvedCount > 0 ? ((slaMetCount / resolvedCount) * 100).toFixed(1) : 100,
      avgFirstResponseTime: firstResponseCount > 0 ? (firstResponseTime / firstResponseCount).toFixed(1) : 0,
      resolvedCount,
      totalCount: filteredTickets.length
    };
  }, [filteredTickets, urgencies]);

  // 5. Tendências e Histórico
  const trendData = useMemo(() => {
    const byDay: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const heatmap: any[] = []; // Day of week vs Hour

    // Inicializar heatmap
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmap.push({ day: d, hour: h, value: 0 });
      }
    }

    filteredTickets.forEach(t => {
      const date = parseISO(t.created_at);
      const dayKey = format(date, 'yyyy-MM-dd');
      const monthKey = format(date, 'yyyy-MM');
      const hour = getHours(date);
      const dayOfWeek = getDay(date);

      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

      const heatIdx = dayOfWeek * 24 + hour;
      if (heatmap[heatIdx]) heatmap[heatIdx].value++;
    });

    return {
      evolution: Object.entries(byDay).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
      monthly: Object.entries(byMonth).map(([month, value]) => ({ month, value })),
      heatmap
    };
  }, [filteredTickets]);

  // 6. Insights e Alertas
  const insights = useMemo(() => {
    const list: string[] = [];
    
    // Comparativo simples
    const currentCount = filteredTickets.length;
    const prevCount = previousTickets.length;
    if (prevCount > 0) {
      const diff = ((currentCount - prevCount) / prevCount) * 100;
      if (diff > 20) {
        list.push(`Alerta: Aumento de ${diff.toFixed(0)}% no volume de chamados em comparação ao período anterior.`);
      } else if (diff < -20) {
        list.push(`Ótimo: Redução de ${Math.abs(diff).toFixed(0)}% na abertura de chamados.`);
      }
    }

    // SLA Crítico
    if (parseFloat(timeMetrics.slaRate as string) < 70) {
      list.push(`Crítico: O nível de SLA está abaixo da meta (70%). Atualmente em ${timeMetrics.slaRate}%.`);
    }

    // Setor mais problemático
    if (operationalData.bySector.length > 0) {
      const topSector = operationalData.bySector[0];
      const total = filteredTickets.length;
      const percent = (topSector.value / total) * 100;
      if (percent > 40) {
        list.push(`Concentração: O setor "${topSector.name}" representa ${percent.toFixed(0)}% de todos os chamados.`);
      }
    }

    return list;
  }, [filteredTickets, previousTickets, timeMetrics, operationalData]);

  return {
    filteredTickets,
    previousTickets,
    operationalData,
    timeMetrics,
    trendData,
    insights
  };
}
