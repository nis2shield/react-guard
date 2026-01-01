import { useState, useEffect, useCallback } from 'react';
import { useNis2Context } from '../context/Nis2Context';

/**
 * Device fingerprint data for session validation.
 * This passive data is collected to help detect session hijacking.
 */
export interface DeviceFingerprint {
    /** Screen resolution (e.g., "1920x1080") */
    screenResolution: string;
    /** Color depth in bits */
    colorDepth: number;
    /** Timezone offset from UTC in minutes */
    timezoneOffset: number;
    /** IANA timezone identifier (e.g., "Europe/Rome") */
    timezone: string;
    /** Browser language */
    language: string;
    /** Preferred languages array */
    languages: string[];
    /** Platform identifier */
    platform: string;
    /** Hardware concurrency (CPU cores) */
    hardwareConcurrency: number;
    /** Device memory in GB (if available) */
    deviceMemory: number | null;
    /** Touch support detection */
    touchSupport: boolean;
    /** Canvas fingerprint hash (SHA-256 of canvas rendering) */
    canvasHash: string | null;
    /** WebGL renderer identifier */
    webglRenderer: string | null;
    /** WebGL vendor identifier */
    webglVendor: string | null;
    /** Timestamp of fingerprint collection */
    collectedAt: string;
}

/**
 * Generates a simple hash from a string using the Web Crypto API.
 * Returns a hex string.
 */
async function sha256Hash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a canvas fingerprint by rendering specific shapes and text.
 */
async function getCanvasFingerprint(): Promise<string | null> {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Draw text with specific font
        ctx.textBaseline = 'top';
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('NIS2 Shield', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Canvas FP', 4, 17);

        // Get data URL and hash it
        const dataUrl = canvas.toDataURL();
        return await sha256Hash(dataUrl);
    } catch {
        return null;
    }
}

/**
 * Gets WebGL renderer information.
 */
function getWebGLInfo(): { renderer: string | null; vendor: string | null } {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { renderer: null, vendor: null };

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return { renderer: null, vendor: null };

        return {
            renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
            vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        };
    } catch {
        return { renderer: null, vendor: null };
    }
}

/**
 * Hook to collect device fingerprint data.
 * This data is useful for detecting session hijacking when combined with backend validation.
 * 
 * @example
 * ```tsx
 * import { useEffect } from 'react';
 * import { useDeviceFingerprint } from '@nis2shield/react-guard';
 * 
 * function SecurityCheck({ savedFingerprint }: { savedFingerprint: any }) {
 *   const { fingerprint, compareWith, isLoading } = useDeviceFingerprint();
 * 
 *   useEffect(() => {
 *     if (!isLoading && fingerprint && savedFingerprint) {
 *       // Compare current device with the one from login
 *       const { similarity, mismatches } = compareWith(savedFingerprint);
 * 
 *       if (similarity < 0.8) {
 *         // High risk of Session Hijacking
 *         console.warn('Security Alert: Device mismatch', mismatches);
 *         alert('New device detected. Please re-authenticate.');
 *       }
 *     }
 *   }, [fingerprint, isLoading, savedFingerprint]);
 * 
 *   return null; // Passive component
 * }
 * ```
 */
export function useDeviceFingerprint() {
    const { reportIncident, config } = useNis2Context();
    const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const collectFingerprint = async () => {
            try {
                const canvasHash = await getCanvasFingerprint();
                const webglInfo = getWebGLInfo();

                const fp: DeviceFingerprint = {
                    screenResolution: `${screen.width}x${screen.height}`,
                    colorDepth: screen.colorDepth,
                    timezoneOffset: new Date().getTimezoneOffset(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    languages: [...navigator.languages],
                    platform: navigator.platform,
                    hardwareConcurrency: navigator.hardwareConcurrency || 0,
                    deviceMemory: (navigator as any).deviceMemory || null,
                    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                    canvasHash,
                    webglRenderer: webglInfo.renderer,
                    webglVendor: webglInfo.vendor,
                    collectedAt: new Date().toISOString(),
                };

                setFingerprint(fp);
            } catch (error) {
                if (config.debug) {
                    console.error('Failed to collect device fingerprint:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        collectFingerprint();
    }, [config.debug]);

    /**
     * Sends the fingerprint to the backend as security telemetry.
     * Useful for login events or periodic validation.
     */
    const sendToBackend = useCallback(() => {
        if (fingerprint) {
            reportIncident('DEVICE_FINGERPRINT', {
                fingerprint,
                purpose: 'session_validation',
            });
        }
    }, [fingerprint, reportIncident]);

    /**
     * Compares current fingerprint with a previous one.
     * Returns a similarity score (0-1) and list of mismatched fields.
     */
    const compareWith = useCallback((previous: DeviceFingerprint): {
        similarity: number;
        mismatches: string[]
    } => {
        if (!fingerprint) {
            return { similarity: 0, mismatches: ['fingerprint_not_collected'] };
        }

        const fieldsToCompare = [
            'screenResolution',
            'colorDepth',
            'timezone',
            'language',
            'platform',
            'hardwareConcurrency',
            'canvasHash',
            'webglRenderer',
        ] as const;

        const mismatches: string[] = [];
        let matches = 0;

        for (const field of fieldsToCompare) {
            if (fingerprint[field] === previous[field]) {
                matches++;
            } else {
                mismatches.push(field);
            }
        }

        return {
            similarity: matches / fieldsToCompare.length,
            mismatches,
        };
    }, [fingerprint]);

    return {
        /** The collected device fingerprint */
        fingerprint,
        /** True while fingerprint is being collected */
        isLoading,
        /** Sends the fingerprint as telemetry to the backend */
        sendToBackend,
        /** Compares current fingerprint with a previous one */
        compareWith,
    };
}
