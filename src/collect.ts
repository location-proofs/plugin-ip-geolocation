
/**
 * IP geolocation collector
 *
 * Queries ipinfo.io for the server's public IP coordinates.
 * Always available — no hardware required.
 * Accuracy: city level (~5-50 km). Lowest confidence of all collectors.
 *
 * Uses built-in fetch (Node 18+ / browsers). No external dependencies.
 */

import type { RawSignals } from '@decentralized-geo/astral-sdk/plugins';
import type { IpReading, IpInfoResponse } from './types';

/**
 * Collect IP-based location from ipinfo.io.
 * Throws if the service is unreachable or returns invalid data.
 */
export async function collectIp(timeoutMs = 5000): Promise<RawSignals> {
  const reading = await readIp(timeoutMs);

  if (!reading) {
    throw new Error(
      'ip-geolocation: no IP location available. ' +
        'Ensure internet access and that ipinfo.io is reachable.'
    );
  }

  return {
    plugin: 'ip-geolocation',
    timestamp: reading.timestamp,
    data: reading as unknown as Record<string, unknown>,
  };
}

/**
 * Try to get location from ipinfo.io.
 * Resolves with a reading or null if unavailable.
 */
export async function readIp(timeoutMs = 5000): Promise<IpReading | null> {
  try {
    const res = await fetch('https://ipinfo.io/json', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as IpInfoResponse;
    if (!data.loc) return null;

    const [latStr, lonStr] = data.loc.split(',');
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || isNaN(lon)) return null;

    return {
      source: 'ip-geolocation',
      lat,
      lon,
      accuracyMeters: 25_000, // conservative city-level estimate
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country,
      timestamp: Math.floor(Date.now() / 1000),
    };
  } catch {
    return null;
  }
}
