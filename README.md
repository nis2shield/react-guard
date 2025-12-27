# React NIS2 Guard (@nis2shield/react-guard)

[![npm version](https://badge.fury.io/js/@nis2shield%2Freact-guard.svg)](https://badge.fury.io/js/@nis2shield%2Freact-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![CI](https://github.com/nis2shield/react-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/nis2shield/react-guard/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)


**Client-Side Security Telemetry & Session Protection for NIS2 Compliance.**

`@nis2shield/react-guard` is a React library designed to act as the "sentinel" for your frontend applications. It integrates with [`django-nis2-shield`](https://pypi.org/project/django-nis2-shield/) to provide end-to-end compliance coverage by monitoring client-side anomalies, protecting session data, and enforcing security policies directly in the browser.

> **Part of the NIS2 Shield Ecosystem**: Use with [infrastructure](https://github.com/nis2shield/infrastructure) for **Demonstrable Compliance** (audited via `tfsec`).

## ✨ Features

- **🛡️ Session Watchdog**: Detects user inactivity and "Tab Napping" (background tab hijacking risks)
- **📡 Telemetry Engine**: Automatically captures React component crashes (`AuditBoundary`) and sends sanitized reports to your SIEM
- **🔐 Secure Storage**: Drop-in replacement for `localStorage`/`sessionStorage` with AES-GCM encryption
- **⌨️ Secure Input**: Pre-configured props to harden input fields against caching and clipboard
- **🔍 Device Fingerprinting** *(v0.2.0+)*: Passive device fingerprint collection for session hijacking detection
- **⚠️ Security Banner** *(v0.2.0+)*: Warns users about insecure connections (HTTP) and outdated browsers

## 📦 Installation

```bash
npm install @nis2shield/react-guard
# or
yarn add @nis2shield/react-guard
```

## 🚀 Quick Start

### 1. Wrap your App

```tsx
import { Nis2Provider, SessionWatchdog, AuditBoundary } from '@nis2shield/react-guard';

function App() {
  return (
    <Nis2Provider 
      config={{
        auditEndpoint: '/api/nis2/telemetry/',
        idleTimeoutMinutes: 15,
        debug: process.env.NODE_ENV === 'development'
      }}
    >
      <AuditBoundary fallback={<h1>Security Alert</h1>}>
        <SessionWatchdog onIdle={() => window.location.href = '/logout'} />
        <YourMainApp />
      </AuditBoundary>
    </Nis2Provider>
  );
}
```

### 2. Protect Sensitive Data

```tsx
import { useSecureStorage } from '@nis2shield/react-guard';

const UserProfile = () => {
  const { value: iban, setValue: setIban } = useSecureStorage('user_iban', '');

  return (
    <input 
      value={iban} 
      onChange={(e) => setIban(e.target.value)} 
      placeholder="IBAN (Encrypted locally)"
    />
  );
};
```

### 3. Harden Input Fields

```tsx
import { useSecureInput } from '@nis2shield/react-guard';

const PasswordField = () => {
  const secureProps = useSecureInput({ type: 'password' });
  return <input {...secureProps} placeholder="Enter Password" />;
};
```

### 4. Report Custom Incidents

```tsx
import { useNis2Log } from '@nis2shield/react-guard';

const TransferMoney = () => {
  const { logWarning } = useNis2Log();

  const handleTransfer = (amount: number) => {
    if (amount > 10000) {
      logWarning('HIGH_VALUE_TRANSACTION_ATTEMPT', { amount });
    }
  };
};
```

### 5. Device Fingerprinting (v0.2.0+)

Collect passive device fingerprints to detect session hijacking:

```tsx
import { useDeviceFingerprint } from '@nis2shield/react-guard';

const LoginPage = () => {
  const { fingerprint, isLoading, sendToBackend } = useDeviceFingerprint();

  const handleLogin = async () => {
    // Send fingerprint with login for backend validation
    sendToBackend();
    // ... rest of login logic
  };

  return <button onClick={handleLogin} disabled={isLoading}>Login</button>;
};
```

**Collected data:**
- Screen resolution, color depth
- Timezone, language, platform
- Hardware concurrency, device memory
- Canvas fingerprint (SHA-256 hash)
- WebGL renderer/vendor

## 🔗 NIS2 Shield Ecosystem

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  @nis2shield/react-guard                                    │
│  ├── SessionWatchdog (idle detection)                       │
│  ├── AuditBoundary (crash reports)                         │
│  ├── useDeviceFingerprint (session validation)             │
│  └── → POST /api/nis2/telemetry/                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  django-nis2-shield                                         │
│  ├── ForensicLogger (HMAC signed logs)                     │
│  ├── RateLimiter, SessionGuard, TorBlocker                 │
│  └── → SIEM (Elasticsearch, Splunk, QRadar, etc.)          │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Development

```bash
npm install      # Install dependencies
npm test         # Run test suite (35 tests)
npm run build    # Build for production
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**[Documentation](https://nis2shield.com)** · **[npm](https://www.npmjs.com/package/@nis2shield/react-guard)** · **[Changelog](CHANGELOG.md)**
