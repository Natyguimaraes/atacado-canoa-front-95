import { useEffect, useRef } from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearOnUnmount?: boolean;
}

export const AccessibilityAnnouncer = ({
  message,
  priority = 'polite',
  clearOnUnmount = true
}: AccessibilityAnnouncerProps) => {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcerRef.current && message) {
      announcerRef.current.textContent = message;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (clearOnUnmount && announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    };
  }, [clearOnUnmount]);

  return (
    <div
      ref={announcerRef}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
};

// Hook for announcing messages to screen readers
export const useAnnouncement = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  };

  return { announce };
};