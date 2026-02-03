import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <Card className="card-institutional">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Construction className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Em desenvolvimento
              </h3>
              <p className="max-w-md text-muted-foreground">
                {description ||
                  'Esta funcionalidade está sendo desenvolvida e estará disponível em breve.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// TI Pages
export function TIUsuariosPage() {
  return (
    <PlaceholderPage
      title="Gestão de Usuários"
      description="Gerencie usuários, defina perfis, ative/desative acessos e resete senhas."
    />
  );
}

export function TIChamadosPage() {
  return (
    <PlaceholderPage
      title="Gestão de Chamados"
      description="Visualize todos os chamados em formato Kanban, gerencie status e prioridades."
    />
  );
}

export function TIAgendamentosPage() {
  return (
    <PlaceholderPage
      title="Agendamentos"
      description="Visualize e gerencie todos os agendamentos do sistema."
    />
  );
}

export function TILogsPage() {
  return (
    <PlaceholderPage
      title="Logs de Auditoria"
      description="Acompanhe todas as ações realizadas no sistema."
    />
  );
}

export function TIConfiguracoesPage() {
  return (
    <PlaceholderPage
      title="Configurações"
      description="Configure categorias de chamados, níveis de urgência e outras opções."
    />
  );
}

// Guarita Pages
export function GuaritaQRCodePage() {
  return (
    <PlaceholderPage
      title="Leitura de QR Code"
      description="Escaneie QR Codes para liberar entrada e registrar saída de visitantes."
    />
  );
}

export function GuaritaHistoricoPage() {
  return (
    <PlaceholderPage
      title="Histórico de Acessos"
      description="Visualize o histórico de entradas e saídas de visitantes."
    />
  );
}

// Colaborador Pages
export function ColaboradorAssistentePage() {
  return (
    <PlaceholderPage
      title="Assistente IA"
      description="Tire dúvidas de TI com nosso assistente virtual e abra chamados automaticamente."
    />
  );
}

export function ColaboradorChamadosPage() {
  return (
    <PlaceholderPage
      title="Meus Chamados"
      description="Abra novos chamados e acompanhe o status das suas solicitações."
    />
  );
}

export function ColaboradorAgendamentosPage() {
  return (
    <PlaceholderPage
      title="Meus Agendamentos"
      description="Crie agendamentos para visitantes e gerencie QR Codes."
    />
  );
}
