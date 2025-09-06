import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Button } from './ui/button';
import AnimatedContainer from './AnimatedContainer';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Rola para o topo sempre que a URL muda
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <AnimatedContainer
          animation="scale-in"
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full shadow-lg hover:shadow-xl bg-primary hover:bg-primary-hover"
            aria-label="Voltar ao topo da página"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </AnimatedContainer>
      )}
    </>
  );
};

export default ScrollToTop;