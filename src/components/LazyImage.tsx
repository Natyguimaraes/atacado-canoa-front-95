import { useState, useRef, useEffect } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { cn } from '../lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export const LazyImage = ({
  src,
  alt,
  className,
  placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f0f0f0"/></svg>',
  blurDataURL,
  width,
  height,
  priority = false
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState(priority ? src : placeholder);
  const [isLoaded, setIsLoaded] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (priority || isIntersecting) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setHasError(true);
        setIsLoaded(true);
      };
      
      img.src = src;
    }
  }, [src, isIntersecting, priority]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)'
          }}
        />
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          hasError && 'opacity-50'
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        width={width}
        height={height}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <span className="text-sm">Erro ao carregar imagem</span>
        </div>
      )}
    </div>
  );
};