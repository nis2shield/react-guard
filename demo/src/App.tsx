import { useState, useEffect } from 'react';
import {
  Nis2Provider,
  SessionWatchdog,
  AuditBoundary,
  SecurityBanner,
  useSecureStorage,
  useSecureInput,
  useNis2Log,
  useDeviceFingerprint,
} from '@nis2shield/react-guard';
import './App.css';

// Demo component for Secure Storage
function SecureStorageDemo() {
  const { value, setValue, isLoading } = useSecureStorage<string>('demo_secret', '');

  if (isLoading) return <p className="loading">Loading encrypted data...</p>;

  return (
    <div className="demo-card">
      <h3>🔐 Secure Storage</h3>
      <p>Data is encrypted with AES-GCM before saving to sessionStorage.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type sensitive data here..."
        className="demo-input"
      />
      <small>Open DevTools → Application → Session Storage to see encrypted value</small>
    </div>
  );
}

// Demo component for Secure Input
function SecureInputDemo() {
  const secureProps = useSecureInput({ type: 'password' });
  const [value, setPassword] = useState('');

  return (
    <div className="demo-card">
      <h3>⌨️ Secure Input</h3>
      <p>Prevents autocomplete, paste, copy, and browser caching.</p>
      <input
        {...secureProps}
        value={value}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Try pasting here (blocked!)"
        className="demo-input"
      />
      <small>Copy/Paste disabled, autocomplete off</small>
    </div>
  );
}

// Demo component for NIS2 Logger
function LoggerDemo() {
  const { logInfo, logWarning, logCritical } = useNis2Log();
  const [lastAction, setLastAction] = useState<string>('');

  const handleLog = (level: 'info' | 'warning' | 'critical') => {
    const message = `DEMO_${level.toUpperCase()}_EVENT`;
    switch (level) {
      case 'info':
        logInfo(message, { source: 'demo' });
        break;
      case 'warning':
        logWarning(message, { source: 'demo' });
        break;
      case 'critical':
        logCritical(message, { source: 'demo' });
        break;
    }
    setLastAction(`Sent ${level.toUpperCase()} event`);
  };

  return (
    <div className="demo-card">
      <h3>📡 Telemetry Logger</h3>
      <p>Send custom security events to your backend.</p>
      <div className="button-group">
        <button onClick={() => handleLog('info')} className="btn btn-info">
          Log Info
        </button>
        <button onClick={() => handleLog('warning')} className="btn btn-warning">
          Log Warning
        </button>
        <button onClick={() => handleLog('critical')} className="btn btn-danger">
          Log Critical
        </button>
      </div>
      {lastAction && <small className="status">{lastAction} ✓</small>}
    </div>
  );
}

// Demo component for Device Fingerprint
function FingerprintDemo() {
  const { fingerprint, isLoading, sendToBackend } = useDeviceFingerprint();
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    sendToBackend();
    setSent(true);
  };

  if (isLoading) return <div className="demo-card"><p className="loading">Collecting fingerprint...</p></div>;

  return (
    <div className="demo-card">
      <h3>🔍 Device Fingerprint</h3>
      <p>Passive device identification for session hijacking detection.</p>
      {fingerprint && (
        <div className="fingerprint-data">
          <div><strong>Screen:</strong> {fingerprint.screenResolution}</div>
          <div><strong>Timezone:</strong> {fingerprint.timezone}</div>
          <div><strong>Language:</strong> {fingerprint.language}</div>
          <div><strong>Platform:</strong> {fingerprint.platform}</div>
          <div><strong>Canvas Hash:</strong> {fingerprint.canvasHash?.slice(0, 16)}...</div>
          <div><strong>WebGL:</strong> {fingerprint.webglRenderer?.slice(0, 30)}...</div>
        </div>
      )}
      <button onClick={handleSend} className="btn btn-primary" disabled={sent}>
        {sent ? 'Sent to Backend ✓' : 'Send to Backend'}
      </button>
    </div>
  );
}

// Error simulation for AuditBoundary demo
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Demo error to test AuditBoundary');
  return null;
}

function AuditBoundaryDemo() {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <div className="demo-card">
      <h3>🛡️ Audit Boundary</h3>
      <p>Catches React crashes and sends reports to backend.</p>
      <AuditBoundary fallback={<div className="error-fallback">🚨 Error caught and reported!</div>}>
        <BrokenComponent shouldThrow={shouldThrow} />
      </AuditBoundary>
      <button
        onClick={() => setShouldThrow(true)}
        className="btn btn-danger"
        disabled={shouldThrow}
      >
        {shouldThrow ? 'Crashed ✓' : 'Simulate Crash'}
      </button>
    </div>
  );
}

// Session Watchdog demo
function WatchdogDemo() {
  const [status, setStatus] = useState<'active' | 'warning'>('active');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 10) setStatus('warning');
        else setStatus('active');
        return c > 0 ? c - 1 : 60;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="demo-card">
      <h3>👁️ Session Watchdog</h3>
      <p>Monitors user activity and triggers logout on idle.</p>
      <div className={`status-indicator ${status}`}>
        Session Status: {status === 'active' ? '✅ Active' : '⚠️ Idle Warning'}
      </div>
      <p>Demo timer: {countdown}s (resets on activity)</p>
      <small>In real use, triggers onIdle callback after configured timeout</small>
    </div>
  );
}

function App() {
  return (
    <Nis2Provider
      config={{
        auditEndpoint: '/api/nis2/telemetry/', // Demo - won't actually send
        idleTimeoutMinutes: 1, // Short for demo
        debug: true,
      }}
    >
      <SecurityBanner
        config={{
          checkBrowserVersion: true,
          dismissible: true,
          position: 'top',
        }}
      />

      <SessionWatchdog
        onIdle={() => console.log('🔒 Session idle - would trigger logout')}
        onActive={() => console.log('✅ User active')}
      />

      <div className="app">
        <header className="header">
          <h1>🛡️ React NIS2 Guard</h1>
          <p className="tagline">Client-Side Security Telemetry &amp; Session Protection</p>
          <p className="version">v0.2.0 Demo</p>
        </header>

        <main className="demo-grid">
          <SecureStorageDemo />
          <SecureInputDemo />
          <LoggerDemo />
          <FingerprintDemo />
          <AuditBoundaryDemo />
          <WatchdogDemo />
        </main>

        <footer className="footer">
          <p>Part of the <a href="https://nis2shield.com">NIS2 Shield</a> ecosystem</p>
          <p>
            <a href="https://github.com/nis2shield/react-guard">GitHub</a> ·
            <a href="https://www.npmjs.com/package/@nis2shield/react-guard">npm</a>
          </p>
        </footer>
      </div>
    </Nis2Provider>
  );
}

export default App;
