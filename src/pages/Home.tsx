import { ArrowRight, Star, Users, Truck, Shield, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import heroImage from '@/assets/hero-store.jpg';
import babyClothes from '@/assets/baby-clothes.jpg';
import kidsClothes from '@/assets/kids-clothes.jpg';
import adultClothes from '@/assets/adult-clothes.jpg';

const Home = () => {
  // Mock products data
  const featuredProducts = [
    {
      id: '1',
      name: 'Conjunto Bebê Menino Básico',
      price: 24.90,
      originalPrice: 39.90,
      image: babyClothes,
      category: 'Bebê',
      sizes: ['P', 'M', 'G'],
      isNew: true,
    },
    {
      id: '2',
      name: 'Vestido Infantil Floral',
      price: 32.50,
      image: kidsClothes,
      category: 'Infantil',
      sizes: ['2', '4', '6', '8', '10'],
    },
    {
      id: '3',
      name: 'Camiseta Adulto Premium',
      price: 19.90,
      originalPrice: 29.90,
      image: adultClothes,
      category: 'Adulto',
      sizes: ['P', 'M', 'G', 'GG'],
    },
    {
      id: '4',
      name: 'Macacão Bebê Unissex',
      price: 28.90,
      image: babyClothes,
      category: 'Bebê',
      sizes: ['RN', 'P', 'M'],
      isNew: true,
    },
  ];

  const categories = [
    {
      name: 'Bebê',
      description: 'Do RN ao 2 anos',
      image: babyClothes,
      link: '/produtos?categoria=bebe',
    },
    {
      name: 'Infantil',
      description: '2 a 12 anos',
      image: kidsClothes,
      link: '/produtos?categoria=infantil',
    },
    {
      name: 'Adulto',
      description: 'P ao GG',
      image: adultClothes,
      link: '/produtos?categoria=adulto',
    },
  ];

  const benefits = [
    {
      icon: Star,
      title: 'Qualidade Garantida',
      description: 'Produtos selecionados com qualidade superior',
    },
    {
      icon: Users,
      title: 'Para Toda Família',
      description: 'Do bebê ao adulto, tudo em um só lugar',
    },
    {
      icon: Truck,
      title: 'Entrega Rápida',
      description: 'Receba seus produtos com agilidade',
    },
    {
      icon: Shield,
      title: 'Compra Segura',
      description: 'Seus dados protegidos e pagamento seguro',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section id="home" className="relative min-h-[600px] flex items-center bg-gradient-hero">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="Loja Atacado Canoa"
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="relative container mx-auto px-4 py-20">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-secondary text-secondary-foreground">
                Seu porto seguro da economia
              </Badge>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-primary mb-6">
                Atacado Canoa
              </h1>
              <p className="text-xl md:text-2xl text-foreground/80 mb-8">
                Moda para todas as idades e estilos. Do bebê ao adulto, tudo em um só lugar com qualidade e preço justo.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-gradient-primary text-white shadow-glow" asChild>
                  <Link to="/produtos">
                    Ver Produtos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="tel:+5575997129454" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    (75) 99712-9454
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section id="categorias" className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
                Nossas Categorias
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Encontre roupas para toda a família com a qualidade e preços que você procura
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {categories.map((category) => (
                <Card key={category.name} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="font-display text-2xl font-semibold mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm opacity-90">{category.description}</p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={category.link}>
                        Ver Produtos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section id="produtos" className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
                Produtos em Destaque
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Confira nossa seleção especial com os melhores preços
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Button size="lg" variant="outline" asChild>
                <Link to="/produtos">
                  Ver Todos os Produtos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Por que escolher o Atacado Canoa?
              </h2>
              <p className="text-lg opacity-90 max-w-2xl mx-auto">
                Mais de 10 anos oferecendo qualidade e economia para toda a família
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-secondary-foreground mb-4">
                    <benefit.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="opacity-90">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contato" className="py-16 bg-gradient-card">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
                Visite Nossa Loja
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Estamos localizados no centro da cidade, venha conhecer nossa variedade de produtos
              </p>
              
              <Card className="p-8 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="text-left space-y-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold mb-2">
                        Endereço
                      </h3>
                      <p className="text-muted-foreground">
                        Avenida Severino Vieira, 356<br />
                        Centro - CEP 48000-211
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-display text-xl font-semibold mb-2">
                        Horário de Funcionamento
                      </h3>
                      <p className="text-muted-foreground">
                        Segunda a Sexta: 8h às 18h<br />
                        Sábado: 8h às 16h<br />
                        Domingo: Fechado
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Button size="lg" className="w-full" asChild>
                      <a href="tel:+5575997129454" className="flex items-center justify-center gap-2">
                        <Phone className="h-5 w-5" />
                        WhatsApp: (75) 99712-9454
                      </a>
                    </Button>
                    
                    <Button variant="outline" size="lg" className="w-full" asChild>
                      <a href="mailto:atacadocanoa@gmail.com">
                        E-mail: atacadocanoa@gmail.com
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;