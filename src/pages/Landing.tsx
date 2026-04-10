import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Shield, Cpu, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from '@/lib/auth';
import { LoadingPage, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoEsquadromil from '@/assets/logo-esquadromil.png';

export default function Landing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      const routes: Record<string, string> = { ti: '/ti', guarita: '/guarita', colaborador: '/colaborador' };
      navigate(routes[role] || '/login');
    }
  }, [isAuthenticated, isLoading, role, navigate]);

  if (isLoading) return <LoadingPage message="Verificando sessão..." />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao entrar', description: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Shield, label: 'Segurança', desc: 'Criptografia end-to-end' },
    { icon: Cpu, label: 'IA Integrada', desc: 'Assistente inteligente' },
    { icon: Users, label: 'Multi-perfil', desc: 'Controle de acesso' },
    { icon: BarChart3, label: 'Analytics', desc: 'Dashboards em tempo real' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(215, 95%, 18%) 0%, hsl(215, 90%, 12%) 50%, hsl(220, 95%, 8%) 100%)' }}>
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff_0.5px,transparent_0.5px)] [background-size:48px_48px] opacity-[0.03]" />
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, hsl(215, 80%, 50%) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, hsl(215, 80%, 40%) 0%, transparent 70%)' }} />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          {/* Logo with glow */}
          <div className="relative mb-10">
            <div className="absolute inset-0 blur-3xl opacity-20 rounded-full"
              style={{ background: 'hsl(215, 80%, 50%)' }} />
            <div className="relative bg-white/[0.06] backdrop-blur-sm rounded-3xl p-6 border border-white/[0.08]">
              <img src={logoEsquadromil} alt="Esquadromil" className="h-24 w-24 object-contain drop-shadow-2xl" />
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">
            Portal Esquadromil
          </h1>
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 mb-6" />
          <p className="text-blue-200/60 text-lg leading-relaxed mb-12">
            Plataforma inteligente de gestão corporativa.<br />
            Automação, controle e eficiência em um só lugar.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm px-4 py-3 text-left transition-colors hover:bg-white/[0.06]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Icon className="h-4 w-4 text-blue-400/80" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{label}</p>
                  <p className="text-xs text-blue-200/40">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-2 text-blue-300/30 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span>Conexão segura e criptografada • TLS 1.3</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="bg-primary/5 rounded-2xl p-4 mb-4">
              <img src={logoEsquadromil} alt="Esquadromil" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Portal Esquadromil</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Entrar no sistema</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">Acesse com suas credenciais corporativas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Corporativo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" className="pl-11 h-12 text-sm" disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-11 pr-11 h-12 text-sm" disabled={isSubmitting}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-sm font-semibold" disabled={isSubmitting || !email || !password}>
              {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Entrando...</> : 'Entrar'}
            </Button>
          </form>

          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Acesso controlado por administrador.
            </p>
            <p className="text-xs text-primary/60">
              Solicite suas credenciais ao setor de TI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
