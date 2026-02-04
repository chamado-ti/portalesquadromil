import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import logoEsquadromil from '@/assets/logo-esquadromil.png';
import {
  Shield,
  Users,
  Ticket,
  Calendar,
  Bot,
  QrCode,
  BarChart3,
  Lock,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      switch (role) {
        case 'ti':
          navigate('/ti');
          break;
        case 'guarita':
          navigate('/guarita');
          break;
        case 'colaborador':
          navigate('/colaborador');
          break;
        default:
          navigate('/colaborador');
      }
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) {
    return <LoadingPage message="Verificando sessão..." />;
  }

  const features = [
    {
      icon: Ticket,
      title: 'Gestão de Chamados',
      description: 'Sistema completo de tickets com Kanban, prioridades e histórico detalhado.',
    },
    {
      icon: Bot,
      title: 'Assistente IA',
      description: 'Suporte inteligente que auxilia colaboradores e cria chamados automaticamente.',
    },
    {
      icon: Calendar,
      title: 'Agendamentos',
      description: 'Controle de visitas com geração de QR Code e registro de entrada/saída.',
    },
    {
      icon: QrCode,
      title: 'Controle de Acesso',
      description: 'Validação de visitantes via QR Code com monitoramento em tempo real.',
    },
    {
      icon: Users,
      title: 'Gestão de Usuários',
      description: 'Administração centralizada de colaboradores, perfis e permissões.',
    },
    {
      icon: BarChart3,
      title: 'Dashboard & Relatórios',
      description: 'Métricas e indicadores para tomada de decisão estratégica.',
    },
  ];

  const benefits = [
    'Acesso restrito e seguro por perfil',
    'Notificações em tempo real',
    'Histórico completo de ações',
    'Interface intuitiva e moderna',
    'Suporte técnico centralizado',
    'Conformidade com políticas internas',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logoEsquadromil} alt="Esquadromil" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold text-foreground">Portal Esquadromil</span>
          </div>
          <Button onClick={() => navigate('/login')} variant="default">
            Acessar Portal
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="hero-institutional min-h-[600px] py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 flex justify-center">
                <img
                  src={logoEsquadromil}
                  alt="Esquadromil"
                  className="h-28 w-28 object-contain drop-shadow-2xl"
                />
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
                Portal Corporativo
                <span className="block text-primary-foreground/90">Esquadromil</span>
              </h1>
              <p className="mb-8 text-xl text-primary-foreground/80 md:text-2xl">
                Plataforma integrada de gestão interna para suporte técnico,
                controle de acesso e comunicação corporativa.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                >
                  Entrar no Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <div className="mt-12 flex items-center justify-center gap-2 text-primary-foreground/70">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Acesso exclusivo para colaboradores autorizados</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Funcionalidades Principais
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Ferramentas integradas para otimizar processos internos e melhorar a produtividade da equipe.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y border-border bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
                Segurança e Controle
                <span className="block text-primary">em Primeiro Lugar</span>
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Desenvolvido para atender às exigências de segurança corporativa,
                o Portal Esquadromil oferece controle total sobre acessos,
                ações e informações da sua equipe.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="flex-shrink-0 rounded-full bg-success/10 p-1">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl" />
                <Card className="relative border-2 border-primary/20 bg-card/80 backdrop-blur">
                  <CardContent className="p-8">
                    <div className="mb-6 flex items-center gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Perfis de Acesso
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Controle granular de permissões
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="font-medium text-foreground">TI</span>
                        <span className="text-sm text-muted-foreground">Acesso Total</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="font-medium text-foreground">Guarita</span>
                        <span className="text-sm text-muted-foreground">Controle de Acesso</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <span className="font-medium text-foreground">Colaborador</span>
                        <span className="text-sm text-muted-foreground">Chamados & Agendamentos</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-institutional-dark p-12 text-center shadow-2xl">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              Pronto para Começar?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Acesse o portal com suas credenciais corporativas e aproveite
              todas as funcionalidades disponíveis para seu perfil.
            </p>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="px-10 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-105"
            >
              Acessar Agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <img src={logoEsquadromil} alt="Esquadromil" className="h-8 w-8 object-contain" />
              <span className="font-semibold text-foreground">Portal Esquadromil</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Esquadromil. Todos os direitos reservados.
              <span className="mx-2">•</span>
              <span>Sistema de uso interno</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
