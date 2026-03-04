
import { ethers } from 'ethers';
import type { LocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import { verifyIpGeolocationStamp } from '../verify';
import { canonicalize } from '../canonicalize';

const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function makeSignedStamp(
  overrides: Partial<LocationStamp> = {}
): Promise<LocationStamp> {
  const wallet = new ethers.Wallet(TEST_KEY);

  const unsigned = {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: { type: 'Point' as const, coordinates: [-73.9857, 40.7484] },
    srs: 'EPSG:4326',
    temporalFootprint: { start: 1700000000, end: 1700000060 },
    plugin: 'ip-geolocation',
    pluginVersion: '0.1.0',
    signals: {
      source: 'ip-geolocation',
      accuracyMeters: 25000,
      ip: '1.2.3.4',
      city: 'New York',
    },
    ...overrides,
  };

  const { signatures: _, ...unsignedClean } = unsigned as LocationStamp;
  void _;
  const message = canonicalize(unsignedClean);
  const sigValue = await wallet.signMessage(message);

  return {
    ...unsignedClean,
    signatures: overrides.signatures ?? [
      {
        signer: { scheme: 'eth-address', value: wallet.address },
        algorithm: 'secp256k1',
        value: sigValue,
        timestamp: 1700000000,
      },
    ],
  };
}

describe('ip-geolocation verification', () => {
  it('validates a well-formed signed stamp', async () => {
    const stamp = await makeSignedStamp();
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.valid).toBe(true);
  });

  it('detects tampering after signing', async () => {
    const stamp = await makeSignedStamp();
    stamp.signals = { ...stamp.signals, ip: '9.9.9.9' };
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signaturesValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with wrong plugin name', async () => {
    const stamp = await makeSignedStamp({ plugin: 'not-ip' });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.structureValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with no signatures', async () => {
    const stamp = await makeSignedStamp({ signatures: [] });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signaturesValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('detects suspiciously precise accuracy from IP', async () => {
    const stamp = await makeSignedStamp({
      signals: {
        source: 'ip-geolocation',
        accuracyMeters: 500, // sub-km from IP is suspicious
        ip: '1.2.3.4',
      },
    });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.suspiciousAccuracy).toBe(500);
  });

  it('detects invalid IP format', async () => {
    const stamp = await makeSignedStamp({
      signals: {
        source: 'ip-geolocation',
        accuracyMeters: 25000,
        ip: 'not-an-ip',
      },
    });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.invalidIpFormat).toBe('not-an-ip');
  });

  it('rejects strings that merely contain colons', async () => {
    const stamp = await makeSignedStamp({
      signals: {
        source: 'ip-geolocation',
        accuracyMeters: 25000,
        ip: 'foo:bar',
      },
    });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.details.invalidIpFormat).toBe('foo:bar');
  });

  it('accepts IPv6 addresses', async () => {
    const stamp = await makeSignedStamp({
      signals: {
        source: 'ip-geolocation',
        accuracyMeters: 25000,
        ip: '2001:db8::1',
      },
    });
    const result = await verifyIpGeolocationStamp(stamp);
    expect(result.signalsConsistent).toBe(true);
  });

  it('verifies stamps survive JSON round-trip', async () => {
    const stamp = await makeSignedStamp();
    const roundTripped = JSON.parse(JSON.stringify(stamp)) as LocationStamp;
    const result = await verifyIpGeolocationStamp(roundTripped);
    expect(result.signaturesValid).toBe(true);
    expect(result.valid).toBe(true);
  });
});
