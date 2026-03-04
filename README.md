# @location-proofs/plugin-ip-geolocation

IP geolocation location proof plugin for [Astral Protocol](https://astral.global).

Queries [ipinfo.io](https://ipinfo.io) for city-level coordinates based on the device's public IP address. Works everywhere — no hardware, platform requirements, or API keys needed.

This is the universal fallback plugin. It's always available but provides the weakest location evidence (city-level, ~5-50 km accuracy).

## Requirements

- Node.js 18+ or any browser with `fetch`
- Internet access

## Install

```bash
npm install @location-proofs/plugin-ip-geolocation @decentralized-geo/astral-sdk ethers
```

## Usage

```typescript
import { AstralSDK } from '@decentralized-geo/astral-sdk';
import { IpGeolocationPlugin } from '@location-proofs/plugin-ip-geolocation';

const sdk = new AstralSDK({ chainId: 11155111 });
sdk.plugins.register(new IpGeolocationPlugin({ privateKey: '0x...' }));

const signals = await sdk.stamps.collect({ plugins: ['ip-geolocation'] });
```

### Standalone (without SDK)

```typescript
import { collectIp, createStampFromSignals, signStamp, verifyIpGeolocationStamp } from '@location-proofs/plugin-ip-geolocation';
import { ethers } from 'ethers';

const signals = await collectIp(5000);
const unsigned = createStampFromSignals(signals, '0.1.0', 60);
const wallet = new ethers.Wallet('0x...');
const stamp = await signStamp(unsigned, wallet);
const result = await verifyIpGeolocationStamp(stamp);
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `privateKey` | random | Hex-encoded ECDSA private key for signing |
| `timeoutMs` | 5000 | Request timeout in milliseconds |
| `durationSeconds` | 60 | Temporal footprint duration |

## Signals collected

| Field | Description |
|-------|-------------|
| `source` | Always `'ip-geolocation'` |
| `accuracyMeters` | Conservative 25,000 m (25 km) |
| `ip` | Public IP address |
| `city` | City name if available |
| `region` | Region/state if available |
| `country` | Country code if available |

## Verification

The `verify` function checks:

1. **Structure** — lpVersion `0.2`, plugin name, required fields
2. **Signatures** — ECDSA recovery matches declared signer, using canonical (sorted-key) serialization
3. **Signals** — coordinate bounds, accuracy >= 1 km (sub-km from IP alone is implausible), valid IPv4/IPv6 format
