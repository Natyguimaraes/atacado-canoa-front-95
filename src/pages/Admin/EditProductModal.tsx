import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  wholesale_price?: number;
  retail_price?: number;
  original_price?: number;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  is_active: boolean;
  is_new: boolean;
  is_featured: boolean;
  stock: number;
}

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
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

const EditProductModal = ({ product, onClose }: EditProductModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'bebe',
    price: '',
    wholesalePrice: '',
    retailPrice: '',
    originalPrice: '',
    sizes: [] as string[],
    colors: [] as string[],
    images: [] as string[],
    isNew: false,
    isFeatured: false,
    isActive: true,
    stock: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        price: product.price.toString(),
        wholesalePrice: product.wholesale_price?.toString() || '',
        retailPrice: product.retail_price?.toString() || product.price.toString(),
        originalPrice: product.original_price?.toString() || '',
        sizes: product.sizes || [],
        colors: product.colors || [],
        images: product.images || [],
        isNew: product.is_new,
        isFeatured: product.is_featured,
        isActive: product.is_active,
        stock: product.stock?.toString() || '0',
      });
    }
  }, [product]);

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSizeToggle = (size: string) => {
    const newSizes = formData.sizes.includes(size) ? formData.sizes.filter(s => s !== size) : [...formData.sizes, size];
    handleInputChange('sizes', newSizes);
  };

  const handleColorToggle = (color: string) => {
    const newColors = formData.colors.includes(color) ? formData.colors.filter(c => c !== color) : [...formData.colors, color];
    handleInputChange('colors', newColors);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    try {
      const { data, error } = await supabase.storage.from('product-images').upload(fileName, file);
      if (error) throw new Error('Erro ao fazer upload da imagem.');
      const publicURL = supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl;
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
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          price: parseFloat(formData.retailPrice), // Keep price as retail for compatibility
          wholesale_price: parseFloat(formData.wholesalePrice),
          retail_price: parseFloat(formData.retailPrice),
          original_price: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          sizes: formData.sizes,
          colors: formData.colors,
          images: formData.images,
          is_new: formData.isNew,
          is_featured: formData.isFeatured,
          is_active: formData.isActive,
          stock: parseInt(formData.stock, 10) || 0,
        })
        .eq('id', product.id);
      if (error) throw new Error(error.message);
      toast.success("Produto atualizado com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error("Erro ao atualizar produto", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const currentSizes = formData.category ? availableSizes[formData.category as keyof typeof availableSizes] : [];

  return (
    <ScrollArea className="h-[70vh] p-4">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} rows={3}/>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wholesalePrice">Preço Atacado *</Label>
            <Input id="wholesalePrice" type="number" step="0.01" value={formData.wholesalePrice} onChange={(e) => handleInputChange('wholesalePrice', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailPrice">Preço Varejo *</Label>
            <Input id="retailPrice" type="number" step="0.01" value={formData.retailPrice} onChange={(e) => handleInputChange('retailPrice', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="originalPrice">Preço Original</Label>
            <Input id="originalPrice" type="number" step="0.01" value={formData.originalPrice} onChange={(e) => handleInputChange('originalPrice', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Quantidade em Estoque *</Label>
            <Input id="stock" type="number" value={formData.stock} onChange={(e) => handleInputChange('stock', e.target.value)} required />
          </div>
        </div>

        {formData.category && (
          <div className="space-y-2">
            <Label>Tamanhos Disponíveis *</Label>
            <div className="flex flex-wrap gap-2">
              {currentSizes.map((size) => (
                <Badge key={size} variant={formData.sizes.includes(size) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => handleSizeToggle(size)}>{size}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Cores Disponíveis</Label>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <Badge key={color} variant={formData.colors.includes(color) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => handleColorToggle(color)}>{color}</Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Imagens do Produto</Label>
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center relative cursor-pointer">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">Clique para selecionar uma imagem</p>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {formData.images.map((image, index) => (
              <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden">
                <img src={image} alt={`Produto ${index + 1}`} className="w-full h-full object-cover" />
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleInputChange('images', formData.images.filter((_, i) => i !== index))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="isNew" checked={formData.isNew} onCheckedChange={(checked) => handleInputChange('isNew', checked as boolean)}/>
            <Label htmlFor="isNew">Produto novo</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isFeatured" checked={formData.isFeatured} onCheckedChange={(checked) => handleInputChange('isFeatured', checked as boolean)}/>
            <Label htmlFor="isFeatured">Produto em destaque</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(checked) => handleInputChange('isActive', checked as boolean)}/>
            <Label htmlFor="isActive">Produto ativo (visível na loja)</Label>
          </div>
        </div>
        
        <div className="flex gap-4 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
};

export default EditProductModal;