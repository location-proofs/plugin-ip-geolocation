
import { ethers } from 'ethers';
import type {
  LocationStamp,
  StampVerificationResult,
} from '@decentralized-geo/astral-sdk/plugins';
import { canonicalize } from './canonicalize';

/**
 * Verify an ip-geolocation stamp's internal validity.
 *
 * Checks:
 * 1. Structure: lpVersion, plugin name, required fields
 * 2. Signatures: ECDSA recovery matches declared signer
 * 3. Signals: coordinate bounds, 25km accuracy ceiling, IP format
 */
export async function verifyIpGeolocationStamp(
  stamp: LocationStamp
): Promise<StampVerificationResult> {
  const details: Record<string, unknown> = {};
  let signaturesValid = true;
  let structureValid = true;
  let signalsConsistent = true;

  // --- Structure checks ---
  if (stamp.lpVersion !== '0.2') {
    structureValid = false;
    details.lpVersionError = `Expected '0.2', got '${stamp.lpVersion}'`;
  }
  if (!stamp.location || !stamp.temporalFootprint) {
    structureValid = false;
    details.missingFields = true;
  }
  if (stamp.plugin !== 'ip-geolocation') {
    structureValid = false;
    details.pluginMismatch = `Expected 'ip-geolocation', got '${stamp.plugin}'`;
  }

  // --- Signature verification ---
  if (!stamp.signatures || stamp.signatures.length === 0) {
    signaturesValid = false;
    details.noSignatures = true;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signatures: _, ...unsigned } = stamp;
    const message = canonicalize(unsigned);

    for (const sig of stamp.signatures) {
      try {
        const recovered = ethers.verifyMessage(message, sig.value);
        if (recovered.toLowerCase() !== sig.signer.value.toLowerCase()) {
          signaturesValid = false;
          details.signatureMismatch = {
            expected: sig.signer.value,
            recovered,
          };
        }
      } catch (e) {
        signaturesValid = false;
        details.signatureError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  // --- Signal checks (IP geolocation-specific) ---
  const loc = stamp.location as { coordinates?: number[] } | undefined;
  if (loc?.coordinates) {
    const [lon, lat] = loc.coordinates;
    if (lat < -90 || lat > 90) {
      signalsConsistent = false;
      details.invalidLatitude = lat;
    }
    if (lon < -180 || lon > 180) {
      signalsConsistent = false;
      details.invalidLongitude = lon;
    }
  }
  if (stamp.signals) {
    const accuracy = stamp.signals.accuracyMeters as number | undefined;
    const ip = stamp.signals.ip as string | undefined;
    // IP geolocation should report at least 25km accuracy — anything
    // claiming sub-km accuracy from IP alone is implausible
    if (accuracy !== undefined && accuracy < 1000) {
      signalsConsistent = false;
      details.suspiciousAccuracy = accuracy;
    }
    // Basic IP format check
    if (ip !== undefined && !/^\d{1,3}(\.\d{1,3}){3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) {
      signalsConsistent = false;
      details.invalidIpFormat = ip;
    }
  }

  return {
    valid: signaturesValid && structureValid && signalsConsistent,
    signaturesValid,
    structureValid,
    signalsConsistent,
    details,
  };
}
