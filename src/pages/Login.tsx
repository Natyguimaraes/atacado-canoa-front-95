import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Sucesso!',
        description: 'Login realizado com sucesso.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: 'Email ou senha incorretos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 relative overflow-hidden">
      {/* Floating boats animation */}
      <div className="floating-boats">
        <div className="boat">⛵</div>
        <div className="boat">🚢</div>
        <div className="boat">⛵</div>
        <div className="boat">🛥️</div>
        <div className="boat">⛵</div>
        <div className="boat">🚤</div>
      </div>
      
      {/* Decorative wave elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-200/30 to-transparent"></div>
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-200/20 to-transparent rounded-full"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back button */}
          <Button 
            variant="ghost" 
            asChild 
            className="mb-6 text-white/80 hover:text-white hover:bg-white/10"
          >
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar à loja
            </Link>
          </Button>

          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm animate-fade-in">
            <CardHeader className="text-center pb-6">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img 
                  src="/logo.png" 
                  alt="Atacado Canoa" 
                  className="h-24 w-auto object-contain"
                />
              </div>
              
              <CardTitle className="font-display text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                Entre na sua conta para continuar comprando
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="pl-10 pr-12 h-12 bg-background/50 border-border/50 focus:border-primary transition-all duration-200"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Entrando...
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full h-12 border-border/50 hover:bg-muted/50 transition-all duration-200">
                  Esqueci minha senha
                </Button>
                
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    Ainda não tem uma conta?{' '}
                  </span>
                  <Button variant="link" asChild className="p-0 h-auto text-primary font-medium hover:text-accent">
                    <Link to="/cadastro">Criar conta grátis</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;