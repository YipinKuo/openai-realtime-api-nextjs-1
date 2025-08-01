import { useCallback, useEffect } from 'react';

interface UseScrollToBottomOptions {
  delay?: number;
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
}

export function useScrollToBottom(
  ref: React.RefObject<HTMLElement | null>,
  dependencies: any[] = [],
  options: UseScrollToBottomOptions = {}
) {
  const { delay = 100, behavior = 'smooth', block = 'end' } = options;

  const scrollToBottom = useCallback(() => {
    console.log('🔍 scrollToBottom called, ref.current:', !!ref.current);
    if (ref.current) {
      const element = ref.current;
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      
      console.log('📏 Scroll metrics:', {
        scrollHeight,
        clientHeight,
        maxScrollTop,
        currentScrollTop: element.scrollTop
      });
      
      element.scrollTo({
        top: maxScrollTop,
        behavior
      });
      
      console.log('✅ ScrollToBottom executed with behavior:', behavior);
    } else {
      console.log('❌ scrollToBottom: ref.current is null');
    }
  }, [ref, behavior]);

  const scrollToElement = useCallback((targetRef: React.RefObject<HTMLElement | null>) => {
    console.log('🔍 scrollToElement called, targetRef.current:', !!targetRef.current);
    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior,
        block
      });
      console.log('✅ scrollToElement executed with behavior:', behavior, 'block:', block);
    } else {
      console.log('❌ scrollToElement: targetRef.current is null');
    }
  }, [behavior, block]);

  // Auto-scroll when dependencies change
  useEffect(() => {
    console.log('🔄 useScrollToBottom useEffect triggered with dependencies:', dependencies);
    if (dependencies.some(dep => dep)) {
      console.log('⏰ Setting timeout for scrollToBottom with delay:', delay);
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout fired, calling scrollToBottom');
        scrollToBottom();
      }, delay);
      
      return () => {
        console.log('🧹 Cleaning up timeout');
        clearTimeout(timeoutId);
      };
    } else {
      console.log('⚠️ No dependencies changed or all are falsy');
    }
  }, [...dependencies, scrollToBottom, delay]);

  return { scrollToBottom, scrollToElement };
} 