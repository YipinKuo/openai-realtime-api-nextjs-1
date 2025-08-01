import { useState, useEffect } from 'react';

interface UseScrollVisibilityOptions {
  threshold?: number; // Scroll threshold in pixels to show floating button
  debounceMs?: number; // Debounce time for scroll events
}

export function useScrollVisibility(options: UseScrollVisibilityOptions = {}) {
  const { threshold = 200, debounceMs = 100 } = options;
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        setShowFloatingButton(scrollTop > threshold);
      }, debounceMs);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [threshold, debounceMs]);

  return showFloatingButton;
} 