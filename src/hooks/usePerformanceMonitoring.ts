import { useEffect, useRef } from 'react';
import { logger } from '../lib/logger';

interface PerformanceMetrics {
  navigationTiming?: PerformanceNavigationTiming;
  paintTiming?: PerformancePaintTiming[];
  resourceTiming?: PerformanceResourceTiming[];
  memoryInfo?: any;
}

export const usePerformanceMonitoring = (componentName?: string) => {
  const renderStartTime = useRef(performance.now());
  const mountTime = useRef<number>();

  useEffect(() => {
    mountTime.current = performance.now();
    const mountDuration = mountTime.current - renderStartTime.current;

    if (componentName) {
      logger.debug(`Component ${componentName} mounted`, {
        mountDuration,
        timestamp: new Date().toISOString()
      });
    }

    return () => {
      if (mountTime.current && componentName) {
        const unmountTime = performance.now();
        const componentLifetime = unmountTime - mountTime.current;
        
        logger.debug(`Component ${componentName} unmounted`, {
          componentLifetime,
          timestamp: new Date().toISOString()
        });
      }
    };
  }, [componentName]);

  const measureRender = (operationName: string, fn: () => void) => {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.debug(`${operationName} completed`, {
      duration,
      componentName,
      timestamp: new Date().toISOString()
    });

    return duration;
  };

  const getPerformanceMetrics = (): PerformanceMetrics => {
    const metrics: PerformanceMetrics = {};

    // Navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.navigationTiming = navigation;
    }

    // Paint timing (First Paint, First Contentful Paint)
    const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
    if (paintEntries.length > 0) {
      metrics.paintTiming = paintEntries;
    }

    // Resource timing
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    if (resourceEntries.length > 0) {
      metrics.resourceTiming = resourceEntries.slice(-10); // Last 10 resources
    }

    // Memory info (if available)
    if ('memory' in performance) {
      metrics.memoryInfo = (performance as any).memory;
    }

    return metrics;
  };

  const reportWebVitals = () => {
    if ('web-vitals' in window) {
      // Report Core Web Vitals if library is available
      // This would require adding web-vitals library
      logger.debug('Web Vitals reporting would be implemented here');
    }
  };

  return {
    measureRender,
    getPerformanceMetrics,
    reportWebVitals
  };
};

// Hook for monitoring resource loading performance
export const useResourceMonitoring = () => {
  const monitorImageLoad = (src: string) => {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        logger.debug('Image loaded', {
          src,
          loadTime,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        resolve(loadTime);
      };
      
      img.onerror = (error) => {
        const loadTime = performance.now() - startTime;
        logger.error('Image failed to load', {
          src,
          loadTime,
          error
        });
        reject(error);
      };
      
      img.src = src;
    });
  };

  const monitorFetchRequest = async (url: string, options?: RequestInit) => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.debug('Fetch request completed', {
        url,
        duration,
        status: response.status,
        size: response.headers.get('content-length'),
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.error('Fetch request failed', {
        url,
        duration,
        error,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  };

  return {
    monitorImageLoad,
    monitorFetchRequest
  };
};