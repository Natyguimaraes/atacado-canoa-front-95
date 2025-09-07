import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { AccessibilityProvider } from "@/components/AccessibilityProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ScrollToTop from "@/components/ScrollToTop";
import DevTools from '@/components/DevTools';
import { envManager } from '@/lib/environment';
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Produtos from "./pages/Produtos";
import ProductDetails from "./pages/ProductDetails";
import Carrinho from "./pages/Carrinho";
import Dashboard from "./pages/Admin/Dashboard";
import CadastroProduto from "./pages/Admin/CadastroProduto";
import EstoqueManagement from "./pages/Admin/EstoqueManagement";
import AdminProdutos from "./pages/Admin/AdminProdutos";
import AdminPedidos from "./pages/Admin/AdminPedidos";
import AdminClientes from "./pages/Admin/AdminClientes";
import AdminConfiguracoes from "./pages/Admin/AdminConfiguracoes";
import Pagamento from "./pages/Pagamento";
import Configuracoes from "./pages/Configuracoes";
import Pedidos from "./pages/Pedidos";
import StatusPagamento from "./pages/StatusPagamento";
import NotFound from "./pages/NotFound";
import Graficos from "./pages/Admin/Graficos";
import CreateAdmin from "./pages/CreateAdmin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: envManager.isProduction ? 3 : 1,
      staleTime: envManager.isProduction ? 300000 : 60000, // 5min prod, 1min dev
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <AccessibilityProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                {/* Skip to content link for accessibility */}
                <a 
                  href="#main-content" 
                  className="skip-link"
                  aria-label="Pular para o conteúdo principal"
                >
                  Pular para o conteúdo
                </a>
                <main id="main-content" tabIndex={-1} className="focus:outline-none">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/cadastro" element={<Cadastro />} />
                    <Route path="/produtos" element={<Produtos />} />
                    <Route path="/produto/:id" element={<ProductDetails />} />
                    <Route path="/carrinho" element={<Carrinho />} />
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/produtos" element={<AdminProdutos />} />
                    <Route path="/admin/cadastro-produto" element={<CadastroProduto />} />
                    <Route path="/admin/estoque" element={<EstoqueManagement />} />
                    <Route path="/admin/pedidos" element={<AdminPedidos />} />
                    <Route path="/admin/clientes" element={<AdminClientes />} />
                    <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
                    <Route path="/admin/graficos" element={<Graficos />} />
                    <Route path="/create-admin" element={<CreateAdmin />} />
                    <Route path="/pagamento" element={<Pagamento />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/status-pagamento/:id" element={<StatusPagamento />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                {envManager.isDevelopment && <DevTools />}
              </BrowserRouter>
            </TooltipProvider>
          </AccessibilityProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;