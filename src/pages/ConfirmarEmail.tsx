import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ConfirmarEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || !type) {
        setStatus('error');
        setMessage('Link de confirmação inválido.');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (error) {
          setStatus('error');
          setMessage(error.message === 'Token has expired or is invalid' 
            ? 'Link de confirmação expirado. Solicite um novo link.' 
            : 'Erro ao confirmar email. Tente novamente.');
        } else {
          setStatus('success');
          setMessage('Email confirmado com sucesso! Você será redirecionado para o login.');
          
          toast({
            title: 'Email confirmado!',
            description: 'Sua conta foi ativada com sucesso.',
          });

          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erro interno. Tente novamente mais tarde.');
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  const handleRedirectToLogin = () => {
    navigate('/login');
  };

  const handleRedirectToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start via-gradient-middle to-gradient-end relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
      <div className="absolute top-10 right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-10 left-10 w-28 h-28 bg-accent/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm animate-fade-in">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {status === 'loading' && (
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              {status === 'success' && (
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              )}
              {status === 'error' && (
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
            
            <CardTitle className="font-display text-2xl">
              {status === 'loading' && 'Confirmando email...'}
              {status === 'success' && 'Email confirmado!'}
              {status === 'error' && 'Erro na confirmação'}
            </CardTitle>
            
            <CardDescription className="text-base text-muted-foreground mt-2">
              {message}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="space-y-3">
                <Button 
                  onClick={handleRedirectToLogin}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Fazer Login
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Redirecionando automaticamente em alguns segundos...
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-3">
                <Button 
                  onClick={handleRedirectToLogin}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Ir para Login
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleRedirectToHome}
                  className="w-full h-12"
                >
                  Voltar à Página Inicial
                </Button>
              </div>
            )}
            
            {status === 'loading' && (
              <div className="flex justify-center">
                <div className="text-sm text-muted-foreground">
                  Aguarde um momento...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmarEmail;