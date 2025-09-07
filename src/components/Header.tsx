import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './ui/sheet';
import { 
  ShoppingCart, 
  User, 
  LogOut, 
  Menu, 
  Heart,
  Settings,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageWithFallback from './ImageWithFallback';
import AnimatedContainer from './AnimatedContainer';
import logoImg from '@/assets/logo.jpg';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

  // Navegação principal
  const mainNavItems = [
    { href: '/', label: 'Home', icon: null },
    { href: '/produtos', label: 'Produtos', icon: null },
  ];

  // Navegação do usuário
  const userNavItems = user ? [
    { href: '/pedidos', label: 'Meus Pedidos', icon: Package },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ...(isAdmin ? [{ href: '/admin/dashboard', label: 'Painel Admin', icon: Settings }] : []),
  ] : [];


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AnimatedContainer animation="fade-in" className="sticky top-0 z-50">
      <header className="bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-3 sm:gap-4 hover:opacity-80 transition-opacity focus-ring rounded-md"
              aria-label="Atacado Canoa - Página inicial"
            >
              <ImageWithFallback
                src={logoImg}
                alt="Logo Atacado Canoa"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full ring-2 ring-primary/20"
                aspectRatio="1:1"
              />
              <span className="hidden sm:block font-display font-bold text-xl sm:text-2xl text-gradient">
                Atacado Canoa
              </span>
            </Link>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-8 flex-1 justify-center" aria-label="Navegação principal">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-foreground hover:text-primary transition-colors story-link font-medium text-lg"
                >
                  {item.label}
                </Link>
              ))}
            </nav>


            {/* Ações do usuário */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Carrinho */}
              <Button
                variant="ghost"
                size="default"
                className="relative hover-scale focus-ring p-2 sm:p-3"
                onClick={() => navigate('/carrinho')}
                aria-label={`Carrinho de compras - ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
              >
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7" />
                {totalItems > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs animate-bounce-subtle"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {/* Wishlist (futura funcionalidade) */}
              <Button
                variant="ghost"
                size="default"
                className="hidden sm:flex hover-scale focus-ring p-2 sm:p-3"
                aria-label="Lista de desejos"
                disabled
              >
                <Heart className="h-6 w-6 sm:h-7 sm:w-7" />
              </Button>

              {/* Usuário */}
              {user ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="default"
                      className="hover-scale focus-ring p-2 sm:p-3"
                      aria-label="Menu do usuário"
                    >
                      <User className="h-6 w-6 sm:h-7 sm:w-7" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-3">
                        <User className="h-6 w-6" />
                        Minha Conta
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-1">
                      <div className="px-3 py-2 rounded-md bg-muted/50">
                        <p className="font-medium text-sm">{user.email}</p>
                        {isAdmin && (
                          <Badge variant="secondary" className="mt-1">
                            Administrador
                          </Badge>
                        )}
                      </div>
                      
                      <nav className="space-y-1" aria-label="Menu do usuário">
                        {userNavItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                            >
                              <Icon className="h-5 w-5" />
                              {item.label}
                            </Link>
                          );
                        })}
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-sm w-full text-left"
                        >
                          <LogOut className="h-5 w-5" />
                          Sair
                        </button>
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              ) : (
                <div className="hidden sm:flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="focus-ring"
                  >
                    Entrar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate('/cadastro')}
                    className="btn-gradient focus-ring"
                  >
                    Cadastrar
                  </Button>
                </div>
              )}

              {/* Menu Mobile */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="default"
                    className="md:hidden hover-scale focus-ring p-2 sm:p-3"
                    aria-label="Abrir menu de navegação"
                  >
                    <Menu className="h-6 w-6 sm:h-7 sm:w-7" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="text-left">
                    <SheetTitle className="flex items-center gap-3">
                      <ImageWithFallback
                        src={logoImg}
                        alt=""
                        className="h-8 w-8 rounded-full"
                        aspectRatio="1:1"
                      />
                      Atacado Canoa
                    </SheetTitle>
                  </SheetHeader>

                  {/* Navegação Mobile */}
                  <nav className="mt-6 space-y-1" aria-label="Navegação principal">
                    {mainNavItems.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>

                  {/* Ações Mobile para usuários não logados */}
                  {!user && (
                    <div className="mt-6 space-y-2 sm:hidden">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          navigate('/login');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Entrar
                      </Button>
                      <Button
                        className="w-full btn-gradient"
                        onClick={() => {
                          navigate('/cadastro');
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        Cadastrar
                      </Button>
                    </div>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </AnimatedContainer>
  );
};

export default Header;