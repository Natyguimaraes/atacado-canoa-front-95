// src/components/AccessibilityProvider.tsx
/**
 * Provedor de acessibilidade que gerencia preferências e funcionalidades A11y
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  fontSize: 'small' | 'normal' | 'large';
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  skipToContent: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');

  useEffect(() => {
    // Detectar preferências de movimento
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    motionQuery.addEventListener('change', handleMotionChange);

    // Detectar preferências de contraste
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(contrastQuery.matches);
    
    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };
    
    contrastQuery.addEventListener('change', handleContrastChange);

    // Carregar preferência de tamanho de fonte
    const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'normal' | 'large';
    if (savedFontSize) {
      setFontSize(savedFontSize);
      document.documentElement.setAttribute('data-font-size', savedFontSize);
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Anunciar mensagens para leitores de tela
  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remover o elemento após a leitura
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Pular para o conteúdo principal
  const skipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const value: AccessibilityContextType = {
    prefersReducedMotion,
    prefersHighContrast,
    fontSize,
    announceMessage,
    skipToContent
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Link para pular para o conteúdo */}
      <a 
        href="#main-content" 
        className="skip-link focus-ring"
        onClick={(e) => {
          e.preventDefault();
          skipToContent();
        }}
      >
        Pular para o conteúdo principal
      </a>
      {children}
    </AccessibilityContext.Provider>
  );
};