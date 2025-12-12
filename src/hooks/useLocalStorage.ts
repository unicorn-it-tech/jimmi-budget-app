
import { useState, useEffect, useCallback } from 'react';

// Evento custom per notificare i cambiamenti locali e forzare l'aggiornamento
const SYNC_EVENT_NAME = 'budget-app-sync-event';
const CHANGE_EVENT_NAME = 'budget-app-local-change';

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  // Funzione per leggere dal localStorage
  const readValue = useCallback((): T => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      return initialValue instanceof Function ? (initialValue as () => T)() : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue instanceof Function ? (initialValue as () => T)() : initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Funzione per impostare il valore
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? (value as (val: T) => T)(storedValue) : value;
      
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Dispatch evento per notificare che un dato è cambiato (per il CloudSync)
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT_NAME, { detail: { key } }));
      
      // Dispatch evento per aggiornare altri hook nella stessa pagina
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { key, newValue: valueToStore } }));
      
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      // Gestisce sia eventi storage (altre tab) che eventi custom (stessa tab o sync cloud)
      if ((event as StorageEvent).key === key || (event as CustomEvent).detail?.key === key) {
        setStoredValue(readValue());
      }
    };

    // Ascolta eventi standard storage e custom sync
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(SYNC_EVENT_NAME, handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(SYNC_EVENT_NAME, handleStorageChange as EventListener);
    };
  }, [key, readValue]);

  return [storedValue, setValue] as const;
}
