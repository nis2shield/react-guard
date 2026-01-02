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
    const { securityState } = useNis2Context();
    const wasIdle = useRef(false);

    useEffect(() => {
        if (securityState.isIdle && !wasIdle.current) {
            wasIdle.current = true;
            if (onIdle) onIdle();
        } else if (!securityState.isIdle && wasIdle.current) {
            wasIdle.current = false;
            if (onActive) onActive();
        }
    }, [securityState.isIdle, onIdle, onActive]);

    return null; // Render nothing
};
