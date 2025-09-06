// src/components/AnimatedContainer.tsx
/**
 * Container com animações de entrada respeitando preferências de acessibilidade
 */

import React from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';
import { useAccessibility } from './AccessibilityProvider';

interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fade-in' | 'scale-in' | 'slide-in-right' | 'slide-in-left' | 'bounce-subtle';
  delay?: number;
  className?: string;
  triggerOnce?: boolean;
  threshold?: number;
}

const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fade-in',
  delay = 0,
  className,
  triggerOnce = true,
  threshold = 0.1
}) => {
  const { prefersReducedMotion } = useAccessibility();
  const { ref, inView } = useInView({
    threshold,
    triggerOnce
  });

  // Se o usuário prefere movimento reduzido, não animar
  const shouldAnimate = !prefersReducedMotion && inView;

  const animationClasses = {
    'fade-in': 'animate-fade-in',
    'scale-in': 'animate-scale-in',
    'slide-in-right': 'animate-slide-in-right',
    'slide-in-left': 'animate-slide-in-left',
    'bounce-subtle': 'animate-bounce-subtle'
  };

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-300',
        shouldAnimate ? animationClasses[animation] : 'opacity-100',
        !inView && !prefersReducedMotion && 'opacity-0',
        className
      )}
      style={{
        animationDelay: shouldAnimate ? `${delay}ms` : '0ms'
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedContainer;