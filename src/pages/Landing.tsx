import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import logoEsquadromil from '@/assets/logo-esquadromil.png';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && role) {
      // Redirect based on role
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

  return (
    <div className="hero-institutional">
      <div className="animate-fade-in flex flex-col items-center px-4 text-center">
        {/* Logo */}
        <div className="mb-8">
          <img
            src={logoEsquadromil}
            alt="Esquadromil"
            className="h-32 w-32 object-contain drop-shadow-lg"
          />
        </div>

        {/* Title */}
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl">
          Portal Esquadromil
        </h1>

        {/* Tagline */}
        <p className="mb-10 max-w-md text-lg text-primary-foreground/80">
          Sistema integrado de gestão corporativa
        </p>

        {/* CTA Button */}
        <Button
          size="lg"
          variant="secondary"
          onClick={() => navigate('/login')}
          className="px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
        >
          Entrar
        </Button>

        {/* Footer */}
        <p className="mt-16 text-sm text-primary-foreground/60">
          © {new Date().getFullYear()} Esquadromil. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
