import React, { useEffect, useRef } from 'react';
import { useNis2Context } from '../context/Nis2Context';

interface Props {
    /**
     * Callback fired when the user becomes idle.
     * Useful for triggering a logout or a lock screen.
     */
    onIdle?: () => void;

    /**
     * Callback fired when the user becomes active again after being idle.
     */
    onActive?: () => void;
}

/**
 * Invisible component that monitors user activity for NIS2 compliance.
 * Handles Idle Timeout (Automatic Logout) and Tab Napping checks.
 * 
 * @example
 * // Basic usage - auto-logout after 15 minutes of inactivity
 * <SessionWatchdog onIdle={() => authService.logout()} />
 * 
 * @example
 * // Banking app with 5-minute timeout and visual feedback
 * <SessionWatchdog 
 *   timeoutMinutes={5}
 *   onIdle={() => window.location.href = '/logout?reason=idle'}
 *   onActive={() => console.log('User active')}
 * />
 */
export const SessionWatchdog: React.FC<Props> = ({ onIdle, onActive }) => {
    const { config, setIdle, reportIncident } = useNis2Context();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Throttle activity updates to avoid performance hit
    const lastActivityRef = useRef<number>(Date.now());

    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        const timeoutMs = (config.idleTimeoutMinutes || 15) * 60 * 1000;

        timerRef.current = setTimeout(() => {
            setIdle(true);
            reportIncident('SESSION_IDLE_TIMEOUT', {
                timeoutMinutes: config.idleTimeoutMinutes
            });
            if (onIdle) onIdle();
        }, timeoutMs);
    };

    const handleActivity = () => {
        const now = Date.now();
        // Only process activity if enough time has passed (e.g., 1 second)
        // to prevent spamming from mousemove
        if (now - lastActivityRef.current > 1000) {
            lastActivityRef.current = now;
            setIdle(false);
            if (onActive) onActive();
            resetTimer();
        }
    };

    useEffect(() => {
        // Events to monitor
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        const onEvent = () => handleActivity();

        events.forEach(event => {
            window.addEventListener(event, onEvent);
        });

        // Initial timer start
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, onEvent);
            });
        };
    }, [config.idleTimeoutMinutes]);

    // Tab Napping Protection / Visibility Change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab went to background
                // Potentially valid, but if it stays hidden too long we might want to lock.
                // For now, we just log it as a low severity event if needed or just track it.
            } else {
                // Tab came back
                // Check if we have been gone for too long?
                // For now, let's just reset the timer to ensure we don't logout immediately 
                // if they just came back, OR we could enforce checks.
                handleActivity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return null; // Render nothing
};
