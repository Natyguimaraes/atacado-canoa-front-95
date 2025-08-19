import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Produtos from "./pages/Produtos";
import Carrinho from "./pages/Carrinho";
import Dashboard from "./pages/Admin/Dashboard";
import CadastroProduto from "./pages/Admin/CadastroProduto";
import EstoqueManagement from "./pages/Admin/EstoqueManagement";
import Pagamento from "./pages/Pagamento";
import Configuracoes from "./pages/Configuracoes";
import Pedidos from "./pages/Pedidos";
import StatusPagamento from "./pages/StatusPagamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/cadastro-produto" element={<CadastroProduto />} />
              <Route path="/admin/estoque" element={<EstoqueManagement />} />
              <Route path="/pagamento" element={<Pagamento />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/status-pagamento/:id" element={<StatusPagamento />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
