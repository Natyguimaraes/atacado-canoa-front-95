import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Graficos = () => {
  const navigate = useNavigate();

  // Redireciona o usuário para o dashboard principal
  useEffect(() => {
    navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  // Exibe uma mensagem de carregamento enquanto redireciona
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecionando para o Dashboard...</p>
      </div>
    </div>
  );
};

export default Graficos;