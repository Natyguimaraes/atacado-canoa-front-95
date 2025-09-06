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
  Search, 
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produtos?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

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
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-3 hover:opacity-80 transition-opacity focus-ring rounded-md"
              aria-label="Atacado Canoa - Página inicial"
            >
              <ImageWithFallback
                src={logoImg}
                alt="Logo Atacado Canoa"
                className="h-10 w-10 rounded-full"
                aspectRatio="1:1"
              />
              <span className="hidden sm:block font-display font-bold text-xl text-gradient">
                Atacado Canoa
              </span>
            </Link>

            {/* Navegação Desktop */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-foreground hover:text-primary transition-colors story-link font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Barra de Pesquisa */}
            <div className="hidden lg:flex max-w-sm w-full">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-full text-sm focus-ring transition-all hover:bg-muted/70"
                  aria-label="Buscar produtos"
                />
              </form>
            </div>

            {/* Ações do usuário */}
            <div className="flex items-center gap-2">
              
              {/* Carrinho */}
              <Button
                variant="ghost"
                size="sm"
                className="relative hover-scale focus-ring"
                onClick={() => navigate('/carrinho')}
                aria-label={`Carrinho de compras - ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce-subtle"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {/* Wishlist (futura funcionalidade) */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex hover-scale focus-ring"
                aria-label="Lista de desejos"
                disabled
              >
                <Heart className="h-5 w-5" />
              </Button>

              {/* Usuário */}
              {user ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover-scale focus-ring"
                      aria-label="Menu do usuário"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
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
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          );
                        })}
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-sm w-full text-left"
                        >
                          <LogOut className="h-4 w-4" />
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
                    size="sm"
                    className="md:hidden hover-scale focus-ring"
                    aria-label="Abrir menu de navegação"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <ImageWithFallback
                        src={logoImg}
                        alt=""
                        className="h-6 w-6 rounded-full"
                        aspectRatio="1:1"
                      />
                      Atacado Canoa
                    </SheetTitle>
                  </SheetHeader>
                  
                  {/* Pesquisa Mobile */}
                  <div className="mt-6 lg:hidden">
                    <form onSubmit={handleSearch} className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="search"
                        placeholder="Buscar produtos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-md text-sm focus-ring"
                        aria-label="Buscar produtos"
                      />
                    </form>
                  </div>

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