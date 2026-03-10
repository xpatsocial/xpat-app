import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { captureException } from '../lib/sentry';

interface TranslationResult {
  translatedText: string;
  detectedLanguage: string | null;
  cached: boolean;
}

// In-memory LRU cache — max 200 translations per session
const MAX_CACHE_SIZE = 200;
const memoryCache = new Map<string, TranslationResult>();

function cacheSet(key: string, value: TranslationResult) {
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entry (first key in Map iteration order)
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(key, value);
}

export function useTranslate() {
  const [translating, setTranslating] = useState<Set<string>>(new Set());

  const translate = useCallback(
    async (text: string, targetLang: string, messageId?: string): Promise<TranslationResult | null> => {
      const cacheKey = `${messageId || text}:${targetLang}`;

      // Check memory cache
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;

      setTranslating((prev) => new Set(prev).add(cacheKey));

      try {
        const { data, error } = await supabase.functions.invoke('translate', {
          body: { text, targetLang, messageId },
        });

        if (error || !data) {
          captureException(error, { context: 'Translate', targetLang });
          return null;
        }

        const result: TranslationResult = {
          translatedText: data.translatedText,
          detectedLanguage: data.detectedLanguage,
          cached: data.cached,
        };

        cacheSet(cacheKey, result);
        return result;
      } catch (e) {
        captureException(e, { context: 'Translate exception', targetLang });
        return null;
      } finally {
        setTranslating((prev) => {
          const next = new Set(prev);
          next.delete(cacheKey);
          return next;
        });
      }
    },
    [],
  );

  const isTranslating = useCallback(
    (messageId: string, targetLang: string) => translating.has(`${messageId}:${targetLang}`),
    [translating],
  );

  return { translate, isTranslating };
}

// Common language codes for the language picker
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
];
