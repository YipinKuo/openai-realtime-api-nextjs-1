import { useState, useCallback } from 'react';

interface TranslationCache {
  [key: string]: string;
}

export function useTranslation() {
  const [cache, setCache] = useState<TranslationCache>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const translate = useCallback(async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) {
      return null;
    }

    // Check cache first
    if (cache[text]) {
      return cache[text];
    }

    // Check if already loading
    if (loading[text]) {
      return null;
    }

    try {
      setLoading(prev => ({ ...prev, [text]: true }));

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const translation = data.translation;

      if (translation) {
        // Cache the translation
        setCache(prev => ({ ...prev, [text]: translation }));
        return translation;
      }

      return null;
    } catch (error) {
      console.error('Translation error:', error);
      return null;
    } finally {
      setLoading(prev => ({ ...prev, [text]: false }));
    }
  }, [cache, loading]);

  const isTranslating = useCallback((text: string) => {
    return loading[text] || false;
  }, [loading]);

  return { translate, isTranslating };
} 