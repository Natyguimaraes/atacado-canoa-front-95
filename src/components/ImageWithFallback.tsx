// src/components/ImageWithFallback.tsx
/**
 * Componente de imagem com fallback, lazy loading e acessibilidade aprimorada
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2';
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc,
  className,
  width,
  height,
  loading = 'lazy',
  objectFit = 'cover',
  onLoad,
  onError,
  aspectRatio
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
    
    onError?.();
  }, [fallbackSrc, currentSrc, onError]);

  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '3:2': 'aspect-[3/2]'
  };

  const objectFitClasses = {
    'cover': 'object-cover',
    'contain': 'object-contain',
    'fill': 'object-fill',
    'scale-down': 'object-scale-down'
  };

  if (hasError && !fallbackSrc) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted text-muted-foreground',
        aspectRatio && aspectRatioClasses[aspectRatio],
        className
      )}>
        <div className="flex flex-col items-center gap-2 p-4">
          <ImageIcon className="h-8 w-8" />
          <span className="text-sm text-center">
            Imagem não disponível
          </span>
          <span className="sr-only">{alt}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'relative overflow-hidden',
      aspectRatio && aspectRatioClasses[aspectRatio],
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="loading-shimmer absolute inset-0" />
          <span className="sr-only">Carregando imagem: {alt}</span>
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          objectFitClasses[objectFit],
          isLoading ? 'opacity-0' : 'opacity-100',
          aspectRatio ? 'w-full h-full' : 'w-auto h-auto'
        )}
        decoding="async"
      />
    </div>
  );
};

export default ImageWithFallback;