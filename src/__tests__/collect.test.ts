
// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { readIp } from '../collect';

describe('ip-geolocation collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses a valid ipinfo.io response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ip: '1.2.3.4',
        loc: '40.7484,-73.9857',
        city: 'New York',
        region: 'New York',
        country: 'US',
      }),
    });

    const result = await readIp();
    expect(result).not.toBeNull();
    expect(result!.source).toBe('ip-geolocation');
    expect(result!.lat).toBe(40.7484);
    expect(result!.lon).toBe(-73.9857);
    expect(result!.accuracyMeters).toBe(25_000);
    expect(result!.ip).toBe('1.2.3.4');
    expect(result!.city).toBe('New York');
  });

  it('returns null when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await readIp();
    expect(result).toBeNull();
  });

  it('returns null when loc is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ip: '1.2.3.4' }),
    });
    const result = await readIp();
    expect(result).toBeNull();
  });

  it('returns null when loc is malformed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ip: '1.2.3.4', loc: 'not,valid,format' }),
    });
    const result = await readIp();
    // parseFloat('not') => NaN
    expect(result).toBeNull();
  });

  it('returns null on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));
    const result = await readIp();
    expect(result).toBeNull();
  });
});
