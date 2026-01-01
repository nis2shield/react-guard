import { useState, useCallback } from 'react';
import { encryptData, decryptData } from '../utils/crypto';

type StorageType = 'localStorage' | 'sessionStorage';

/**
 * A hook that works like a persistent useState, but encrypts data 
 * before saving to localStorage/sessionStorage.
 * 
 * **NIS2 Compliance**: Helps meet Article 21 requirements for "Cryptography and Encryption"
 * by ensuring sensitive client-side data is never stored in plain text.
 * 
 * @template T The type of the value to store.
 * @param {string} key The storage key.
 * @param {T} initialValue The initial value if storage is empty.
 * @param {StorageType} [storageType='sessionStorage'] 'localStorage' or 'sessionStorage'.
 * @returns {object} An object containing the current value, a setter, a remover, and loading state.
 * 
 * @example
 * ```tsx
 * import { useSecureStorage } from '@nis2shield/react-guard';
 * 
 * function UserProfile() {
 *   // Securely store PII (Personally Identifiable Information)
 *   const { 
 *     value: email, 
 *     setValue: setEmail, 
 *     isLoading 
 *   } = useSecureStorage<string>('user_email', '', 'sessionStorage');
 * 
 *   if (isLoading) return <p>Decrypting...</p>;
 * 
 *   return (
 *     <input 
 *       value={email} 
 *       onChange={(e) => setEmail(e.target.value)} 
 *       placeholder="Email is encrypted in storage"
 *     />
 *   );
 * }
 * ```
 */
export function useSecureStorage<T>(key: string, initialValue: T, storageType: StorageType = 'sessionStorage') {
    const [storedValue, setStoredValue] = useState<T>(() => {
        // Initial read is tricky because decryption is async.
        // For now, we return initialValue and try to hydrate in an effect 
        // OR we accept that initial render uses initialValue.
        // Given React 18 patterns, let's keep it simple: initial render = default.
        return initialValue;
    });

    const [isLoading, setIsLoading] = useState(true);

    // Hydrate on mount
    const loadFromStorage = useCallback(async () => {
        try {
            const storage = window[storageType];
            const item = storage.getItem(key);
            if (item) {
                const parsed = JSON.parse(item);
                if (parsed.data && parsed.iv) {
                    const decryptedJson = await decryptData(parsed.data, parsed.iv);
                    if (decryptedJson) {
                        setStoredValue(JSON.parse(decryptedJson));
                    }
                }
            }
        } catch (error) {
            console.warn('SecureStorage read error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [key, storageType]);

    // Set Value Wrapper
    const setValue = async (value: T) => {
        try {
            // Save state
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);

            // Encrypt and save to storage
            const jsonStr = JSON.stringify(valueToStore);
            const encrypted = await encryptData(jsonStr);

            const storage = window[storageType];
            storage.setItem(key, JSON.stringify(encrypted));
        } catch (error) {
            console.error('SecureStorage write error:', error);
        }
    };

    const removeValue = () => {
        try {
            const storage = window[storageType];
            storage.removeItem(key);
            setStoredValue(initialValue);
        } catch (error) {
            console.error('SecureStorage remove error:', error);
        }
    };

    // We should trigger loadFromStorage in a useEffect in the consuming component?
    // Or better, we expose a loading state.
    // Ideally, useSecureStorage should accept an option for hydration.

    // For this implementation, we will export a separate `useSecureStorageEffect` or just use useEffect here
    // but be careful of infinite loops.
    useState(() => {
        // Fire and forget hydration on mount
        loadFromStorage();
    });

    return { value: storedValue, setValue, removeValue, isLoading };
}
