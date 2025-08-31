import { useState, useRef, useEffect } from 'react';
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
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CadastroProduto = () => {
  const { isAdmin } = useAuth();
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) {
        throw new Error('Erro ao fazer upload da imagem.');
      }
      
      const publicURL = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path).data.publicUrl;

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, publicURL],
      }));
      
      toast.success('Imagem adicionada!', {
        description: 'A imagem foi carregada com sucesso.',
      });

    } catch (error: any) {
      toast.error('Erro no upload', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.sizes.length === 0) {
      toast.error("Erro de Validação", {
        description: "Por favor, selecione pelo menos um tamanho.",
      });
      return;
    }
    if (formData.images.length === 0) {
      toast.error("Erro de Validação", {
        description: "Por favor, adicione pelo menos uma imagem.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("products").insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        price: parseFloat(formData.price),
        original_price: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : null,
        sizes: formData.sizes,
        colors: formData.colors,
        images: formData.images,
        is_new: formData.isNew,
        is_featured: formData.isFeatured,
      });

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Produto cadastrado com sucesso!", {
        description: "Você pode ver o produto na lista.",
      });
      navigate("/admin/dashboard");
    } catch (error: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Erro ao cadastrar produto", {
        description: errorMessage,
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
                {/* CORRIGIDO: Envolvido o ícone e o texto num span */}
                <span>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Dashboard
                </span>
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
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center relative cursor-pointer">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Clique para selecionar uma imagem
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden">
                        <img src={image} alt={`Produto ${index + 1}`} className="w-full h-full object-cover" />
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            images: prev.images.filter((_, i) => i !== index)
                          }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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