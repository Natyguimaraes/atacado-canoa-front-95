import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const CadastroProduto = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    originalPrice: '',
    sizes: [] as string[],
    colors: [] as string[],
    images: [] as string[],
    isNew: false,
    isFeatured: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
            <p className="text-muted-foreground mb-6">
              Você não tem permissão para acessar esta página.
            </p>
            <Button asChild>
              <Link to="/">Voltar para Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = [
    { value: 'bebe', label: 'Bebê' },
    { value: 'infantil', label: 'Infantil' },
    { value: 'adulto', label: 'Adulto' },
  ];

  const availableSizes = {
    bebe: ['RN', 'P', 'M', 'G'],
    infantil: ['2', '4', '6', '8', '10', '12', '14'],
    adulto: ['P', 'M', 'G', 'GG', 'XGG'],
  };

  const availableColors = [
    'Branco', 'Preto', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 
    'Rosa', 'Roxo', 'Cinza', 'Marrom', 'Laranja', 'Bege'
  ];

  const handleSizeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const handleColorToggle = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Sucesso!',
        description: 'Produto cadastrado com sucesso.',
      });
      
      navigate('/admin/dashboard');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar produto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentSizes = formData.category ? availableSizes[formData.category as keyof typeof availableSizes] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/admin/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dashboard
              </Link>
            </Button>
            <h1 className="font-display text-2xl font-bold text-primary">
              Cadastrar Novo Produto
            </h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Conjunto Bebê Menino"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value, sizes: [] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada do produto..."
                    rows={3}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço de Venda *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">Preço Original (opcional)</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      value={formData.originalPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Sizes */}
                {formData.category && (
                  <div className="space-y-2">
                    <Label>Tamanhos Disponíveis *</Label>
                    <div className="flex flex-wrap gap-2">
                      {currentSizes.map((size) => (
                        <Badge
                          key={size}
                          variant={formData.sizes.includes(size) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleSizeToggle(size)}
                        >
                          {size}
                        </Badge>
                      ))}
                    </div>
                    {formData.sizes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Selecione pelo menos um tamanho
                      </p>
                    )}
                  </div>
                )}

                {/* Colors */}
                <div className="space-y-2">
                  <Label>Cores Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map((color) => (
                      <Badge
                        key={color}
                        variant={formData.colors.includes(color) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => handleColorToggle(color)}
                      >
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-2">
                  <Label>Imagens do Produto</Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Arraste imagens aqui ou clique para selecionar
                    </p>
                    <Button variant="outline" type="button">
                      Selecionar Imagens
                    </Button>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isNew"
                      checked={formData.isNew}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, isNew: checked as boolean }))
                      }
                    />
                    <Label htmlFor="isNew">Produto novo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, isFeatured: checked as boolean }))
                      }
                    />
                    <Label htmlFor="isFeatured">Produto em destaque</Label>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isLoading || !formData.name || !formData.category || !formData.price || formData.sizes.length === 0}
                  >
                    {isLoading ? 'Cadastrando...' : 'Cadastrar Produto'}
                  </Button>
                  
                  <Button type="button" variant="outline" asChild>
                    <Link to="/admin/dashboard">Cancelar</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CadastroProduto;