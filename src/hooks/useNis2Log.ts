import { useCallback } from 'react';
import { useNis2Context } from '../context/Nis2Context';

/**
 * Hook to manually report security events or warnings.
 * Useful for catching logic errors, validation failures, or suspicious user behavior.
 */
export const useNis2Log = () => {
    const { reportIncident } = useNis2Context();

    const logInfo = useCallback((event: string, meta: Record<string, any> = {}) => {
        reportIncident('INFO', { event, ...meta });
    }, [reportIncident]);

    const logWarning = useCallback((event: string, meta: Record<string, any> = {}) => {
        reportIncident('WARNING', { event, ...meta });
    }, [reportIncident]);

    const logCritical = useCallback((event: string, meta: Record<string, any> = {}) => {
        reportIncident('CRITICAL', { event, ...meta });
    }, [reportIncident]);

    return {
        logInfo,
        logWarning,
        logCritical
    };
};
