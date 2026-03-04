
/**
 * IP Geolocation Location Proof Plugin
 *
 * Queries ipinfo.io for coordinates based on public IP address.
 * Works everywhere — no hardware or platform requirements. Just needs fetch.
 * City-level accuracy (~5-50 km). Lowest credibility of all plugins.
 *
 * This is the universal fallback — always available, but provides
 * the weakest location evidence.
 *
 * Usage:
 * ```typescript
 * import { IpGeolocationPlugin } from '@location-proofs/plugin-ip-geolocation';
 *
 * const plugin = new IpGeolocationPlugin();
 * const sdk = new AstralSDK({ chainId: 11155111 });
 * sdk.plugins.register(plugin);
 * ```
 */

import { ethers } from 'ethers';
import type {
  LocationProofPlugin,
  Runtime,
  RawSignals,
  UnsignedLocationStamp,
  LocationStamp,
  StampSigner,
  StampVerificationResult,
  CollectOptions,
} from '@decentralized-geo/astral-sdk/plugins';
import type { IpGeolocationPluginOptions } from './types';
import { collectIp } from './collect';
import { createStampFromSignals } from './create';
import { signStamp } from './sign';
import { verifyIpGeolocationStamp } from './verify';

export class IpGeolocationPlugin implements LocationProofPlugin {
  readonly name = 'ip-geolocation';
  readonly version = '0.1.0';
  readonly runtimes: Runtime[] = ['node', 'browser'];
  readonly requiredCapabilities: string[] = [];
  readonly description =
    'IP geolocation plugin — queries ipinfo.io for city-level coordinates. ' +
    'Universal fallback, works everywhere with internet access.';

  private readonly timeoutMs: number;
  private readonly durationSeconds: number;
  private readonly wallet: ethers.Wallet | ethers.HDNodeWallet;

  constructor(options: IpGeolocationPluginOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.durationSeconds = options.durationSeconds ?? 60;
    this.wallet = options.privateKey
      ? new ethers.Wallet(options.privateKey)
      : ethers.Wallet.createRandom();
  }

  async collect(_options?: CollectOptions): Promise<RawSignals> {
    return collectIp(this.timeoutMs);
  }

  async create(signals: RawSignals): Promise<UnsignedLocationStamp> {
    return createStampFromSignals(signals, this.version, this.durationSeconds);
  }

  async sign(stamp: UnsignedLocationStamp, signer?: StampSigner): Promise<LocationStamp> {
    return signStamp(stamp, this.wallet, signer);
  }

  async verify(stamp: LocationStamp): Promise<StampVerificationResult> {
    return verifyIpGeolocationStamp(stamp);
  }
}

export type { IpReading, IpInfoResponse, IpGeolocationPluginOptions } from './types';
export { collectIp, readIp } from './collect';
export { createStampFromSignals } from './create';
export { signStamp } from './sign';
export { verifyIpGeolocationStamp } from './verify';
export { canonicalize } from './canonicalize';
