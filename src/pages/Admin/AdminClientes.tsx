import { useState, useEffect } from 'react';
import { Search, Users, Mail, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Customer {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
  address?: any;
  created_at: string;
  orders_count?: number;
  total_spent?: number;
}

const AdminClientes = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Buscar perfis de usuários excluindo administradores
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!inner(role)
        `)
        .neq('user_roles.role', 'admin')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Para cada cliente, buscar informações de pedidos
      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total')
            .eq('user_id', profile.user_id);

          const ordersCount = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

          return {
            ...profile,
            orders_count: ordersCount,
            total_spent: totalSpent,
          };
        })
      );

      setCustomers(customersWithStats);
      setFilteredCustomers(customersWithStats);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    let filtered = customers;

    // Filtrar por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.cpf?.includes(searchTerm)
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);

  const formatAddress = (address: any) => {
    if (!address || typeof address !== 'object') return 'N/A';
    
    const { street, city, state, zipCode } = address;
    if (!street && !city) return 'N/A';
    
    return `${street || ''}, ${city || ''} - ${state || ''}`.trim().replace(/^,\s*/, '');
  };

  const getCustomerType = (ordersCount: number) => {
    if (ordersCount === 0) return { label: 'Novo', variant: 'secondary' as const };
    if (ordersCount >= 10) return { label: 'VIP', variant: 'default' as const };
    if (ordersCount >= 5) return { label: 'Fiel', variant: 'default' as const };
    return { label: 'Regular', variant: 'outline' as const };
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Gerencie todos os clientes da loja
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Total Clientes
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">{customers.length}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Novos Clientes
                  </p>
                  <p className="text-2xl font-bold">
                    {customers.filter(c => (c.orders_count || 0) === 0).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Clientes Ativos
                  </p>
                  <p className="text-2xl font-bold">
                    {customers.filter(c => (c.orders_count || 0) > 0).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Clientes VIP
                  </p>
                  <p className="text-2xl font-bold">
                    {customers.filter(c => (c.orders_count || 0) >= 10).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Clientes ({filteredCustomers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Total Gasto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="h-3 bg-muted rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-12" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-20" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 bg-muted rounded animate-pulse w-16" />
                        </TableCell>
                        <TableCell>
                          <div className="h-3 bg-muted rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => {
                      const customerType = getCustomerType(customer.orders_count || 0);
                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {customer.full_name || 'Nome não informado'}
                              </p>
                              {customer.cpf && (
                                <p className="text-xs text-muted-foreground">
                                  CPF: {customer.cpf}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <Mail className="h-3 w-3" />
                                <span>{customer.email || 'N/A'}</span>
                              </div>
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>📱 {customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span>{formatAddress(customer.address)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {customer.orders_count || 0} pedidos
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">
                              R$ {(customer.total_spent || 0).toFixed(2).replace('.', ',')}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={customerType.variant}>
                              {customerType.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum cliente encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminClientes;