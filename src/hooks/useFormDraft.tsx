import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para auto-salvar drafts de formulários em localStorage
 * Preserva dados mesmo se a página recarregar ou o usuário trocar de aba
 * 
 * @param key - Chave única para identificar o draft
 * @param initialValue - Valor inicial se não houver draft salvo
 * @param debounceMs - Tempo de debounce para salvar (default: 500ms)
 */
export function useFormDraft<T>(
  key: string, 
  initialValue: T, 
  debounceMs: number = 500
): [T, (value: T | ((prev: T) => T)) => void, () => void, boolean] {
  const storageKey = `draft_${key}`;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Carregar valor inicial do localStorage ou usar initialValue
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHasDraft(true);
        return JSON.parse(saved);
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  });

  // Auto-save com debounce
  useEffect(() => {
    // Limpar timeout anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Não salvar se for o valor inicial (vazio)
    const isEmpty = 
      value === initialValue ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0);

    if (isEmpty) {
      // Remover draft se valor estiver vazio
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      return;
    }

    // Salvar após debounce
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        setHasDraft(true);
        console.log(`[FormDraft] Saved draft for "${key}"`);
      } catch (error) {
        console.error('[FormDraft] Error saving draft:', error);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [storageKey, value, initialValue, debounceMs, key]);

  // Limpar draft manualmente
  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setValue(initialValue);
    setHasDraft(false);
    console.log(`[FormDraft] Cleared draft for "${key}"`);
  }, [storageKey, initialValue, key]);

  return [value, setValue, clearDraft, hasDraft];
}

/**
 * Hook para salvar estado de formulário com múltiplos campos
 * Útil para formulários complexos com vários inputs
 */
export function useFormFieldsDraft<T extends Record<string, any>>(
  formKey: string,
  initialFields: T
): {
  fields: T;
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  setFields: (updates: Partial<T>) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const [fields, setFields, clearDraft, hasDraft] = useFormDraft<T>(formKey, initialFields);

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  }, [setFields]);

  const updateFields = useCallback((updates: Partial<T>) => {
    setFields((prev) => ({ ...prev, ...updates }));
  }, [setFields]);

  return {
    fields,
    setField,
    setFields: updateFields,
    clearDraft,
    hasDraft
  };
}
