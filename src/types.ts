
/**
 * IP geolocation reading from ipinfo.io.
 */
export interface IpReading {
  source: 'ip-geolocation';
  lat: number;
  lon: number;
  /** IP geolocation is city-level; conservative 25 km accuracy */
  accuracyMeters: number;
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  timestamp: number;
}

export interface IpInfoResponse {
  ip: string;
  loc?: string; // "lat,lon"
  city?: string;
  region?: string;
  country?: string;
}

export interface IpGeolocationPluginOptions {
  /** Request timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Deterministic private key for signing. If omitted, generates a random wallet. */
  privateKey?: string;
  /** Duration of temporal footprint in seconds (default: 60) */
  durationSeconds?: number;
}
