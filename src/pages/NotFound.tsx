import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="text-center animate-fade-in">
        <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mb-8 max-w-md text-muted-foreground">
          A página que você está procurando não existe ou você não tem permissão para acessá-la.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Ir para o início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
