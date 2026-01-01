import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Configuration options for the Nis2Provider.
 * Defines the security parameters and backend integration points.
 * 
 * @example
 * ```tsx
 * const config: Nis2Config = {
 *   auditEndpoint: 'https://api.example.com/nis2/logs',
 *   idleTimeoutMinutes: 5, // Strict timeout for banking apps
 *   debug: process.env.NODE_ENV === 'development'
 * };
 * ```
 */
export interface Nis2Config {
    /**
     * The full URL of the backend endpoint to receive audit logs and telemetry.
     * Must accept POST requests with JSON payload.
     * 
     * @example "https://api.myapp.com/api/nis2/report/"
     */
    auditEndpoint: string;

    /**
     * Time in minutes before the user is considered idle.
     * Defaults to 15 minutes if not specified.
     * 
     * **Compliance**: Shorter timeouts (e.g., 5-10m) recommended for critical sectors.
     */
    idleTimeoutMinutes?: number;

    /**
     * If true, logs granular security events to the browser console.
     * Disable in production.
     */
    debug?: boolean;
}

/**
 * Represents the current security state of the session.
 */
export interface Nis2SecurityState {
    isIdle: boolean;
    isCompromised: boolean;
    lastActive: number;
}

interface Nis2ContextType {
    config: Nis2Config;
    securityState: Nis2SecurityState;
    setIdle: (idle: boolean) => void;
    reportIncident: (type: string, payload: Record<string, any>) => void;
}

const Nis2Context = createContext<Nis2ContextType | undefined>(undefined);

interface Nis2ProviderProps {
    children: ReactNode;
    config: Nis2Config;
}

/**
 * The root provider that initializes the NIS2 Shield security context.
 * Must wrap your application to enable SessionWatchdog, Hooks, and Audit logging.
 * 
 * @example
 * ```tsx
 * import { Nis2Provider } from '@nis2shield/react-guard';
 * 
 * const config = {
 *   auditEndpoint: '/api/nis2/telemetry/',
 *   idleTimeoutMinutes: 15
 * };
 * 
 * function Root() {
 *   return (
 *     <Nis2Provider config={config}>
 *       <App />
 *     </Nis2Provider>
 *   );
 * }
 * ```
 */
export const Nis2Provider: React.FC<Nis2ProviderProps> = ({ children, config }) => {
    const [securityState, setSecurityState] = useState<Nis2SecurityState>({
        isIdle: false,
        isCompromised: false,
        lastActive: Date.now(),
    });

    const setIdle = (idle: boolean) => {
        setSecurityState(prev => ({ ...prev, isIdle: idle }));
    };

    const reportIncident = async (type: string, payload: Record<string, any>) => {
        if (config.debug) {
            console.group('🛡️ [NIS2 Guard] Incident Report');
            console.log('Type:', type);
            console.log('Payload:', payload);
            console.groupEnd();
        }

        try {
            await fetch(config.auditEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-NIS2-Client-Version': '0.1.0'
                },
                body: JSON.stringify({
                    type,
                    payload,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                })
            });
        } catch (error) {
            // Fail safely - do not crash the app if the audit server is down
            if (config.debug) {
                console.error('Failed to send NIS2 report:', error);
            }
        }
    };

    const value = {
        config: {
            ...config,
            idleTimeoutMinutes: config.idleTimeoutMinutes ?? 15
        },
        securityState,
        setIdle,
        reportIncident
    };

    return (
        <Nis2Context.Provider value={value}>
            {children}
        </Nis2Context.Provider>
    );
};

/**
 * Hook to access the NIS2 context.
 */
export const useNis2Context = () => {
    const context = useContext(Nis2Context);
    if (context === undefined) {
        throw new Error('useNis2Context must be used within a Nis2Provider');
    }
    return context;
};
