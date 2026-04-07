import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Monitor, QrCode, UserCheck, Cpu, Lock, LayoutDashboard, 
  ArrowRight, ChevronRight, Clock, MessageSquare, BarChart3, CheckCircle2, Mail, Eye, EyeOff
} from 'lucide-react';
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

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(220,70%,25%)] to-[hsl(220,80%,15%)] relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-[hsl(220,70%,35%)] rounded-full blur-[120px] opacity-20" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-8">
            <img src={logoEsquadromil} alt="Esquadromil" className="h-28 w-28 object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Dashboard Control
          </h1>
          <p className="text-[hsl(220,30%,75%)] text-lg max-w-sm leading-relaxed">
            Plataforma segura de gestão interna. Acesso restrito a colaboradores autorizados.
          </p>
          <div className="mt-12 flex items-center gap-2 text-[hsl(220,30%,65%)] text-sm">
            <Lock className="h-4 w-4" />
            <span>Conexão segura e criptografada</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logoEsquadromil} alt="Esquadromil" className="h-16 w-16 object-contain mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Dashboard Control</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Entrar no sistema</h2>
            <p className="text-muted-foreground mt-1">Acesse com suas credenciais corporativas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Corporativo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" className="pl-10 h-12" disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-10 pr-10 h-12" disabled={isSubmitting}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isSubmitting || !email || !password}>
              {isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Entrando...</> : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-primary/70">
            Acesso controlado por administrador.<br />
            Solicite suas credenciais ao setor de TI.
          </p>
        </div>
      </div>
    </div>
  );
}
