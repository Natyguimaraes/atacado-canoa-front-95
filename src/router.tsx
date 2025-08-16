import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Cadastro from '@/pages/Cadastro';
import Produtos from '@/pages/Produtos';
import Carrinho from '@/pages/Carrinho';
import Pagamento from '@/pages/Pagamento';
import Pedidos from '@/pages/Pedidos';
import Dashboard from '@/pages/Admin/Dashboard';
import CadastroProduto from '@/pages/Admin/CadastroProduto';
import NotFound from '@/pages/NotFound';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/carrinho" element={<Carrinho />} />
        <Route path="/pagamento" element={<Pagamento />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/cadastro-produto" element={<CadastroProduto />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;