
import type { RawSignals } from '@decentralized-geo/astral-sdk/plugins';
import { createStampFromSignals } from '../create';
import type { IpReading } from '../types';

function makeSignals(overrides: Partial<IpReading> = {}): RawSignals {
  const reading: IpReading = {
    source: 'ip-geolocation',
    lat: 40.7484,
    lon: -73.9857,
    accuracyMeters: 25000,
    ip: '1.2.3.4',
    city: 'New York',
    region: 'New York',
    country: 'US',
    timestamp: 1700000000,
    ...overrides,
  };
  return {
    plugin: 'ip-geolocation',
    timestamp: 1700000000,
    data: reading as unknown as Record<string, unknown>,
  };
}

describe('createStampFromSignals', () => {
  it('produces GeoJSON [lon, lat] coordinate order', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    const coords = (stamp.location as { coordinates: number[] }).coordinates;
    expect(coords[0]).toBe(-73.9857); // longitude first
    expect(coords[1]).toBe(40.7484);  // latitude second
  });

  it('sets correct plugin metadata', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    expect(stamp.plugin).toBe('ip-geolocation');
    expect(stamp.pluginVersion).toBe('0.1.0');
    expect(stamp.lpVersion).toBe('0.2');
  });

  it('includes IP and city in signals', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    expect(stamp.signals.ip).toBe('1.2.3.4');
    expect(stamp.signals.city).toBe('New York');
    expect(stamp.signals.country).toBe('US');
  });

  it('calculates temporal footprint from duration', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 120);
    expect(stamp.temporalFootprint).toEqual({
      start: 1700000000,
      end: 1700000120,
    });
  });

  it('does not transpose coordinates for southern/eastern hemispheres', () => {
    const signals = makeSignals({ lat: -33.8688, lon: 151.2093 });
    const stamp = createStampFromSignals(signals, '0.1.0', 60);
    const coords = (stamp.location as { coordinates: number[] }).coordinates;
    expect(coords[0]).toBe(151.2093);
    expect(coords[1]).toBe(-33.8688);
  });
});
