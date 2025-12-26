import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptData, decryptData } from '../../utils/crypto';

describe('crypto utilities', () => {
    describe('encryptData', () => {
        it('returns iv and data strings', async () => {
            const result = await encryptData('hello world');

            expect(result).toHaveProperty('iv');
            expect(result).toHaveProperty('data');
            expect(typeof result.iv).toBe('string');
            expect(typeof result.data).toBe('string');
        });

        it('returns base64 encoded strings', async () => {
            const result = await encryptData('test');

            // Base64 strings should not throw when decoded
            expect(() => atob(result.iv)).not.toThrow();
            expect(() => atob(result.data)).not.toThrow();
        });
    });

    describe('encryptData + decryptData round trip', () => {
        it('encrypts and decrypts text correctly', async () => {
            const original = 'sensitive data here';
            const encrypted = await encryptData(original);
            const decrypted = await decryptData(encrypted.data, encrypted.iv);

            expect(decrypted).toBe(original);
        });

        it('encrypts and decrypts JSON correctly', async () => {
            const original = JSON.stringify({ user: 'test', value: 123 });
            const encrypted = await encryptData(original);
            const decrypted = await decryptData(encrypted.data, encrypted.iv);

            expect(decrypted).toBe(original);
            expect(JSON.parse(decrypted!)).toEqual({ user: 'test', value: 123 });
        });
    });

    describe('decryptData error handling', () => {
        it('returns null for invalid data', async () => {
            const result = await decryptData('invalid-data', 'invalid-iv');
            expect(result).toBeNull();
        });
    });
});
