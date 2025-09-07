import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';

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

const CadastroProduto = () => {
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
    isNew: true,
    isFeatured: false,
    isActive: true,
    stock: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = formData.sizes.includes(size)
      ? formData.sizes.filter(s => s !== size)
      : [...formData.sizes, size];
    handleInputChange('sizes', newSizes);
  };

  const handleColorToggle = (color: string) => {
    const newColors = formData.colors.includes(color)
      ? formData.colors.filter(c => c !== color)
      : [...formData.colors, color];
    handleInputChange('colors', newColors);
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

      if (error) throw new Error('Erro ao fazer upload da imagem.');
      
      const publicURL = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path).data.publicUrl;

      handleInputChange('images', [...formData.images, publicURL]);
      
      toast.success('Imagem adicionada!');
    } catch (error: any) {
      toast.error('Erro no upload', { description: error.message });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.sizes.length === 0) {
      toast.error("Erro de Validação", { description: "Selecione pelo menos um tamanho." });
      return;
    }
    if (formData.images.length === 0) {
      toast.error("Erro de Validação", { description: "Adicione pelo menos uma imagem." });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("products").insert({
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        price: parseFloat(formData.price),
        original_price: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        sizes: formData.sizes,
        colors: formData.colors,
        images: formData.images,
        is_new: formData.isNew,
        is_featured: formData.isFeatured,
        is_active: formData.isActive,
        stock: parseInt(formData.stock, 10) || 0,
      });

      if (error) throw new Error(error.message);

      toast.success("Produto cadastrado com sucesso!");
      navigate('/admin/estoque');
    } catch (error: any) {
      toast.error("Erro ao cadastrar produto", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const currentSizes = formData.category ? availableSizes[formData.category as keyof typeof availableSizes] : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Cadastrar Novo Produto</h1>
              <p className="text-muted-foreground">
                Adicione um novo item ao catálogo
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Produto</CardTitle>
            <CardDescription>
              Preencha as informações abaixo para adicionar um novo item ao catálogo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => handleInputChange('name', e.target.value)} 
                    required 
                    placeholder="Digite o nome do produto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
                  onChange={(e) => handleInputChange('description', e.target.value)} 
                  rows={3}
                  placeholder="Descreva as características do produto"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço de Venda *</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01" 
                    value={formData.price} 
                    onChange={(e) => handleInputChange('price', e.target.value)} 
                    required 
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Preço Original</Label>
                  <Input 
                    id="originalPrice" 
                    type="number" 
                    step="0.01" 
                    value={formData.originalPrice} 
                    onChange={(e) => handleInputChange('originalPrice', e.target.value)} 
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Quantidade em Estoque *</Label>
                  <Input 
                    id="stock" 
                    type="number" 
                    value={formData.stock} 
                    onChange={(e) => handleInputChange('stock', e.target.value)} 
                    placeholder="0" 
                    required 
                  />
                </div>
              </div>

              {formData.category && (
                <div className="space-y-3">
                  <Label>Tamanhos Disponíveis *</Label>
                  <div className="flex flex-wrap gap-2">
                    {currentSizes.map((size) => (
                      <Badge 
                        key={size} 
                        variant={formData.sizes.includes(size) ? 'default' : 'outline'} 
                        className="cursor-pointer hover:opacity-80 transition-opacity" 
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
              
              <div className="space-y-3">
                <Label>Cores Disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <Badge 
                      key={color} 
                      variant={formData.colors.includes(color) ? 'default' : 'outline'} 
                      className="cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={() => handleColorToggle(color)}
                    >
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Imagens do Produto *</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center relative cursor-pointer hover:border-primary transition-colors">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                  />
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">Clique ou arraste para fazer upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP até 5MB</p>
                </div>
                
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={image} 
                            alt={`Produto ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleInputChange('images', formData.images.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.images.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Adicione pelo menos uma imagem
                  </p>
                )}
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium">Configurações do Produto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isNew" 
                      checked={formData.isNew} 
                      onCheckedChange={(checked) => handleInputChange('isNew', checked as boolean)} 
                    />
                    <Label htmlFor="isNew" className="text-sm">Produto novo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isFeatured" 
                      checked={formData.isFeatured} 
                      onCheckedChange={(checked) => handleInputChange('isFeatured', checked as boolean)} 
                    />
                    <Label htmlFor="isFeatured" className="text-sm">Produto em destaque</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isActive" 
                      checked={formData.isActive} 
                      onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)} 
                    />
                    <Label htmlFor="isActive" className="text-sm">Produto ativo</Label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/admin/dashboard')}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isLoading || 
                    !formData.name || 
                    !formData.category || 
                    !formData.price || 
                    formData.sizes.length === 0 || 
                    formData.images.length === 0 || 
                    !formData.stock
                  }
                  className="min-w-[120px]"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Produto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CadastroProduto;