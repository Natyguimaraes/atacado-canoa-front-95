import { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { logger } from '../lib/logger';

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  deps?: any[];
  enableProfiling?: boolean;
}

export const PerformanceOptimizer = memo(({
  children,
  deps = [],
  enableProfiling = false
}: PerformanceOptimizerProps) => {
  const startTime = performance.now();

  const memoizedChildren = useMemo(() => {
    if (enableProfiling) {
      const renderTime = performance.now() - startTime;
      logger.debug('PerformanceOptimizer render time', { renderTime });
    }
    return children;
  }, deps);

  return <>{memoizedChildren}</>;
});

PerformanceOptimizer.displayName = 'PerformanceOptimizer';

// Higher-order component for performance optimization
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  dependencies?: (props: P) => any[]
) => {
  const OptimizedComponent = memo((props: P) => {
    const deps = dependencies ? dependencies(props) : [props];
    
    const memoizedComponent = useMemo(() => {
      return <Component {...props} />;
    }, deps);

    return memoizedComponent;
  });

  OptimizedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  
  return OptimizedComponent;
};

// Hook for debouncing values
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for throttling functions
export const useThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        func(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [func, delay]
  );
};