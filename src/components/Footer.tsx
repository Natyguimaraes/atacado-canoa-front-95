import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg">Atacado Canoa</h3>
            <p className="text-sm text-primary-foreground/80">
              Seu porto seguro da economia. Moda para todas as idades e estilos.
            </p>
            <div className="flex space-x-3">
              <Button variant="outline" size="icon" className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10">
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Button>
              <Button variant="outline" size="icon" className="bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10">
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-display font-medium">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p>Avenida Severino Vieira, 356</p>
                  <p>Centro - CEP 48000-211</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a 
                  href="tel:+5575997129454" 
                  className="text-sm hover:text-secondary transition-colors"
                >
                  (75) 99712-9454
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a 
                  href="mailto:atacadocanoa@gmail.com" 
                  className="text-sm hover:text-secondary transition-colors"
                >
                  atacadocanoa@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-4">
            <h4 className="font-display font-medium">Horário de Funcionamento</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <div className="text-sm">
                  <p>Segunda a Sexta</p>
                  <p className="text-primary-foreground/80">8h às 18h</p>
                </div>
              </div>
              <div className="text-sm pl-7">
                <p>Sábado: 8h às 16h</p>
                <p className="text-primary-foreground/80">Domingo: Fechado</p>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-display font-medium">Nossos Serviços</h4>
            <ul className="text-sm space-y-2">
              <li className="text-primary-foreground/80">• Vendas no atacado</li>
              <li className="text-primary-foreground/80">• Vendas no varejo</li>
              <li className="text-primary-foreground/80">• Estoque próprio</li>
              <li className="text-primary-foreground/80">• Tamanhos P bebê ao G adulto</li>
              <li className="text-primary-foreground/80">• Preços competitivos</li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-primary-foreground/20" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/80">
            © {new Date().getFullYear()} Atacado Canoa. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="#" className="hover:text-secondary transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-secondary transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-secondary transition-colors">
              Política de Troca
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;