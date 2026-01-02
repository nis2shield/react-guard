import { useState, useEffect, useCallback } from 'react';
import { useNis2Context } from '../context/Nis2Context';
import { DeviceFingerprinter, DeviceFingerprint } from '@nis2shield/core';

/**
 * Device fingerprint data for session validation.
 * This passive data is collected to help detect session hijacking.
 */
export type { DeviceFingerprint }; // Re-export type if needed or just use it.


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
                const fp = await DeviceFingerprinter.collect();
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
