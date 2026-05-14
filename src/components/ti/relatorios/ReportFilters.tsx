import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  Search, 
  X, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ReportFiltersState } from './useReportData';

interface ReportFiltersProps {
  filters: ReportFiltersState;
  setFilters: (filters: ReportFiltersState) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  options: {
    sectors: string[];
    technicians: { id: string; name: string }[];
    statuses: { id: string; name: string }[];
    urgencies: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
}

export function ReportFilters({ filters, setFilters, onExport, options }: ReportFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const clearFilters = () => {
    setFilters({
      dateRange: filters.dateRange,
      sectors: [],
      technicians: [],
      statuses: [],
      urgencies: [],
      categories: [],
      search: ''
    });
  };

  const toggleFilter = (key: keyof ReportFiltersState, value: string) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: next });
  };

  const activeFiltersCount = 
    filters.sectors.length + 
    filters.technicians.length + 
    filters.statuses.length + 
    filters.urgencies.length + 
    filters.categories.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          {/* Período */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal h-10", !filters.dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "dd/MM/yy")} - {format(filters.dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(filters.dateRange.from, "dd/MM/yy")
                    )
                  ) : (
                    <span>Selecionar datas</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.from}
                  selected={filters.dateRange}
                  onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Busca */}
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Pesquisa</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por título, técnico ou setor..." 
                className="pl-9 h-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          {/* Filtros Avançados Trigger */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground opacity-0">Filtros</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button variant={activeFiltersCount > 0 ? "default" : "outline"} className="h-10 gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-white text-primary">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-4" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Filtros Avançados</h4>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">Limpar</Button>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {/* Setores */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Setores</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {options.sectors.map(sector => (
                          <Badge 
                            key={sector} 
                            variant={filters.sectors.includes(sector) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFilter('sectors', sector)}
                          >
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {options.statuses.map(s => (
                          <Badge 
                            key={s.id} 
                            variant={filters.statuses.includes(s.id) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFilter('statuses', s.id)}
                          >
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Urgência */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Urgência</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {options.urgencies.map(u => (
                          <Badge 
                            key={u.id} 
                            variant={filters.urgencies.includes(u.id) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleFilter('urgencies', u.id)}
                          >
                            {u.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Exportação */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start gap-2 h-9" onClick={() => onExport('csv')}>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  CSV
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2 h-9" onClick={() => onExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Excel (XLSX)
                </Button>
                <Button variant="ghost" size="sm" className="justify-start gap-2 h-9" onClick={() => onExport('pdf')}>
                  <Printer className="h-4 w-4 text-red-600" />
                  PDF / Imprimir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground mr-1">Filtros ativos:</span>
          {filters.sectors.map(s => (
            <Badge key={s} variant="secondary" className="text-[10px] gap-1 py-0 px-2 h-5">
              Setor: {s}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter('sectors', s)} />
            </Badge>
          ))}
          {filters.statuses.map(id => (
            <Badge key={id} variant="secondary" className="text-[10px] gap-1 py-0 px-2 h-5">
              Status: {options.statuses.find(s => s.id === id)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => toggleFilter('statuses', id)} />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-5 text-[10px] px-2 text-muted-foreground hover:text-foreground">
            Limpar tudo
          </Button>
        </div>
      )}
    </div>
  );
}
