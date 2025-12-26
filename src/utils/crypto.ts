/**
 * Cryptography utilities using the Web Crypto API.
 * Uses AES-GCM for symmetric encryption with an ephemeral key.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// We use a singleton lazy-loaded key in memory.
// This key is lost on page reload, which is arguably a feature for security 
// (data in sessionStorage/localStorage becomes inaccessible if the session is hard-reset).
// However, for persistent storage across reloads, we need to derive the key from something 
// persistent but secure (like a session token) OR explicitly regenerate and clear old storage.
// For this NIS2 compliance library, we prioritize clearing data on session loss.
// So we will generate a key once per page load.
let cachedKey: CryptoKey | null = null;

export const getEncryptionKey = async (): Promise<CryptoKey> => {
    if (cachedKey) return cachedKey;

    cachedKey = await window.crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            length: KEY_LENGTH,
        },
        true, // extractable (maybe false for higher security?)
        ['encrypt', 'decrypt']
    );

    return cachedKey;
};

// Returns { iv, data } as base64 strings
export const encryptData = async (text: string): Promise<{ iv: string, data: string }> => {
    const key = await getEncryptionKey();
    const encoded = new TextEncoder().encode(text);

    // IV must be unique for every encryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        encoded
    );

    return {
        iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
        data: arrayBufferToBase64(encrypted)
    };
};

export const decryptData = async (encryptedData: string, ivStr: string): Promise<string | null> => {
    try {
        const key = await getEncryptionKey();
        const iv = base64ToArrayBuffer(ivStr);
        const data = base64ToArrayBuffer(encryptedData);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: new Uint8Array(iv),
            },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.warn('Failed to decrypt data (session key mismatch?):', e);
        return null;
    }
};

// Helpers for Base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
