import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, User, Store, Bell, Shield, Database } from 'lucide-react';

const AdminConfiguracoes = () => {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        {/* Configurações Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Configurações da Loja */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Configurações da Loja</h3>
                  <p className="text-sm text-muted-foreground">Nome, logo, informações gerais</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Nome da Loja</p>
                  <p className="text-sm text-muted-foreground">Atacado Canoa</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-green-600">Online</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Editar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Usuário */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Perfil do Administrador</h3>
                  <p className="text-sm text-muted-foreground">Dados pessoais e acesso</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">atacadocanoa@gmail.com</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tipo</p>
                  <p className="text-sm text-muted-foreground">Administrador</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Editar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Notificações</h3>
                  <p className="text-sm text-muted-foreground">Alertas e comunicações</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Novos Pedidos</p>
                  <p className="text-sm text-green-600">Ativado</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Estoque Baixo</p>
                  <p className="text-sm text-green-600">Ativado</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Segurança</h3>
                  <p className="text-sm text-muted-foreground">Senhas e autenticação</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Autenticação 2FA</p>
                  <p className="text-sm text-muted-foreground">Desativado</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Última Alteração</p>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Configurar Segurança
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backup e Dados */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Backup e Dados</h3>
                  <p className="text-sm text-muted-foreground">Exportação e backup</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Último Backup</p>
                  <p className="text-sm text-muted-foreground">Automático</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Tamanho dos Dados</p>
                  <p className="text-sm text-muted-foreground">~2.5 MB</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Exportar Dados
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sistema */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Sistema</h3>
                  <p className="text-sm text-muted-foreground">Versão e manutenção</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Versão</p>
                  <p className="text-sm text-muted-foreground">v2.1.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-green-600">Operacional</p>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Ver Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-primary">{new Date().toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-muted-foreground">Data Atual</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">Brazil</p>
                <p className="text-sm text-muted-foreground">Região</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminConfiguracoes;