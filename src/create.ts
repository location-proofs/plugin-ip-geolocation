
import type { RawSignals, UnsignedLocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import type { IpReading } from './types';

/**
 * Build an UnsignedLocationStamp from collected IP geolocation signals.
 */
export function createStampFromSignals(
  signals: RawSignals,
  pluginVersion: string,
  durationSeconds: number
): UnsignedLocationStamp {
  const reading = signals.data as unknown as IpReading;
  const now = signals.timestamp;

  return {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: {
      type: 'Point',
      coordinates: [reading.lon, reading.lat],
    },
    srs: 'EPSG:4326',
    temporalFootprint: {
      start: now,
      end: now + durationSeconds,
    },
    plugin: 'ip-geolocation',
    pluginVersion,
    signals: {
      source: reading.source,
      accuracyMeters: reading.accuracyMeters,
      ip: reading.ip,
      city: reading.city,
      region: reading.region,
      country: reading.country,
    },
  };
}
