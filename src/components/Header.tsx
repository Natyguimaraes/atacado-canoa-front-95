import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, Search, Phone, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/logo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();

  const navigation = [
    { name: 'Início', href: '#home' },
    { name: 'Produtos', href: '#produtos' },
    { name: 'Categorias', href: '#categorias' },
    { name: 'Contato', href: '#contato' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={logo} 
              alt="Atacado Canoa" 
              className="h-20 w-auto" 
            />
            <div className="ml-3 hidden sm:block">
              <h1 className="font-display font-bold text-lg text-primary">
                Atacado Canoa
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">
                Seu porto seguro da economia
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>

            {/* Contact Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden lg:flex items-center gap-2"
              asChild
            >
              <a href="tel:+5575997129454">
                <Phone className="h-3 w-3" />
                (75) 99712-9454
              </a>
            </Button>

            {/* Cart Button */}
            <Button variant="outline" size="icon" className="relative" asChild>
              <Link to="/carrinho">
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-xs font-medium text-accent-foreground flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
                <span className="sr-only">Carrinho ({totalItems})</span>
              </Link>
            </Button>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-4 w-4" />
                    <span className="sr-only">Conta do usuário</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <div className="font-medium">{user?.name}</div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/carrinho">Meu Carrinho</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pedidos">Meus Pedidos</Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin/dashboard">Painel Admin</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={logout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn(
          "md:hidden border-t transition-all duration-300 ease-in-out overflow-hidden",
          isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}>
          <nav className="py-4 space-y-2">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block px-4 py-2 text-sm font-medium transition-colors hover:text-primary hover:bg-muted rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <div className="px-4 pt-2 border-t">
              <a 
                href="tel:+5575997129454"
                className="flex items-center gap-2 py-2 text-sm font-medium text-primary"
              >
                <Phone className="h-4 w-4" />
                (75) 99712-9454
              </a>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;