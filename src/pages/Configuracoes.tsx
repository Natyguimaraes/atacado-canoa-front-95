import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Save, Phone, Mail, MapPin, CreditCard, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CPFInput from '@/components/CPFInput';
import { validateCpf } from '@/utils/cpfUtils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Configuracoes = () => {

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    setZipCode(value);
    
    if (value.replace(/\D/g, '').length === 8) {
      try {
        const cep = value.replace(/\D/g, '');
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (data && !data.erro) {
          setAddress(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCpf(profile.cpf || '');
      setIsLoadingProfile(false);
    }
    
    // Carregar endereço salvo
    if (user) {
      loadSavedAddress();
    }
  }, [profile, user]);

  const loadSavedAddress = () => {
    if (!user) return;
    
    try {
      const savedAddress = localStorage.getItem(`address-${user.id}`);
      if (savedAddress) {
        const addressData = JSON.parse(savedAddress);
        setAddress(addressData.address || '');
        setZipCode(addressData.zipCode || '');
        setNeighborhood(addressData.neighborhood || '');
        setCity(addressData.city || '');
        setState(addressData.state || '');
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validar CPF se fornecido
    if (cpf && !validateCpf(cpf)) {
      toast({
        title: 'Erro',
        description: 'Por favor, informe um CPF válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          phone: phone,
          cpf: cpf,
          email: user.email,
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        throw new Error(profileError.message);
      }

      // Por enquanto, salvar endereço no localStorage
      const addressData = {
        address,
        zipCode,
        neighborhood,
        city,
        state
      };
      localStorage.setItem(`address-${user.id}`, JSON.stringify(addressData));

      toast({
        title: 'Sucesso!',
        description: 'Suas informações foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar suas informações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
          <div className="text-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="mb-6 sm:mb-8">
            <Button variant="ghost" asChild className="mb-4 hover-scale">
              <Link to="/" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar para Home</span>
                <span className="sm:hidden">Voltar</span>
              </Link>
            </Button>
            
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-gradient flex items-center justify-center gap-2">
                <Settings className="h-6 w-6 sm:h-8 sm:w-8" />
                Configurações
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Gerencie suas informações pessoais e preferências
              </p>
            </div>
          </div>

          {/* Tabs Container */}
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-6 sm:mb-8">
                <TabsTrigger value="profile" className="flex items-center gap-2 text-xs sm:text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Perfil</span>
                  <span className="sm:hidden">Dados</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex items-center gap-2 text-xs sm:text-sm">
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Endereço</span>
                  <span className="sm:hidden">Local</span>
                </TabsTrigger>
                <TabsTrigger value="account" className="flex items-center gap-2 text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Conta</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
              </TabsList>

              {/* Perfil Tab */}
              <TabsContent value="profile" className="animate-fade-in">
                <Card className="card-elegant">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="font-display text-xl sm:text-2xl text-gradient flex items-center justify-center gap-2">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                      Informações Pessoais
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Mantenha seus dados sempre atualizados
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm sm:text-base">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          O e-mail não pode ser alterado
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm sm:text-base">Nome Completo *</Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Seu nome completo"
                          required
                          className="h-10 sm:h-12 text-sm sm:text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm sm:text-base">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(75) 99999-9999"
                            className="pl-10 h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <CPFInput 
                        value={cpf}
                        onChange={setCpf}
                        label="CPF"
                        showValidation
                      />

                      <Button 
                        type="submit" 
                        className="w-full h-10 sm:h-12 text-sm sm:text-base btn-gradient hover-scale" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Perfil
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Endereço Tab */}
              <TabsContent value="address" className="animate-fade-in">
                <Card className="card-elegant">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="font-display text-xl sm:text-2xl text-gradient flex items-center justify-center gap-2">
                      <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                      Endereço de Entrega
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Configure seu endereço padrão para entregas
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zipCode" className="text-sm sm:text-base">CEP</Label>
                          <Input
                            id="zipCode"
                            value={zipCode}
                            onChange={handleZipCodeChange}
                            placeholder="44380-000"
                            maxLength={9}
                            className="h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-sm sm:text-base">Estado</Label>
                          <Input
                            id="state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="BA"
                            className="h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm sm:text-base">Endereço</Label>
                        <Input
                          id="address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Rua, número"
                          className="h-10 sm:h-12 text-sm sm:text-base"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="neighborhood" className="text-sm sm:text-base">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            placeholder="Nome do bairro"
                            className="h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-sm sm:text-base">Cidade</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Nome da cidade"
                            className="h-10 sm:h-12 text-sm sm:text-base"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-10 sm:h-12 text-sm sm:text-base btn-gradient hover-scale" 
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Endereço
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Conta Tab */}
              <TabsContent value="account" className="animate-fade-in">
                <Card className="card-elegant">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="font-display text-xl sm:text-2xl text-gradient flex items-center justify-center gap-2">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                      Informações da Conta
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Detalhes sobre sua conta no sistema
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4 sm:space-y-6">
                      <div className="grid gap-4 sm:gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <p className="font-medium text-sm sm:text-base">Tipo de Conta</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {user?.email === 'admin@atacadocanoa.com' ? 'Administrador' : 'Cliente'}
                            </p>
                          </div>
                          {user?.email === 'admin@atacadocanoa.com' && (
                            <div className="mt-2 sm:mt-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                Admin
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <p className="font-medium text-sm sm:text-base">E-mail da Conta</p>
                            <p className="text-xs sm:text-sm text-muted-foreground break-all">
                              {user?.email || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <p className="font-medium text-sm sm:text-base">Conta Criada em</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="space-y-1">
                            <p className="font-medium text-sm sm:text-base">Status da Conta</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Ativa
                            </p>
                          </div>
                          <div className="mt-2 sm:mt-0">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                              ✓ Verificada
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="text-center space-y-2">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Precisa de ajuda? Entre em contato conosco
                        </p>
                        <Button variant="outline" className="text-xs sm:text-sm">
                          Suporte ao Cliente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Configuracoes;