// src/components/LoadingSpinner.tsx
/**
 * Componente de loading acessível e animado
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'accent';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  text = 'Carregando...',
  className,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    accent: 'text-accent'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 
        className={cn(
          'animate-spin',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-hidden="true"
      />
      {text && (
        <p className={cn(
          'text-sm text-muted-foreground',
          size === 'xl' && 'text-base'
        )}>
          {text}
        </p>
      )}
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        role="status"
        aria-label={text}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-center p-4"
      role="status"
      aria-label={text}
    >
      {spinner}
    </div>
  );
};

export default LoadingSpinner;