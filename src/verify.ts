const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      return null;
    }
    bytes[i] = byte;
  }
  return bytes;
}

export interface SignatureVerificationInput {
  publicKeyHex: string;
  signatureHex: string | null;
  timestamp: string | null;
  body: string;
  now?: number;
}

export async function verifyDiscordSignature(input: SignatureVerificationInput): Promise<boolean> {
  const { signatureHex, timestamp } = input;
  if (!signatureHex || !timestamp) {
    return false;
  }

  const timestampMs = Number(timestamp) * 1000;
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs((input.now ?? Date.now()) - timestampMs) > MAX_TIMESTAMP_SKEW_MS
  ) {
    return false;
  }

  const keyBytes = hexToBytes(input.publicKeyHex);
  const signatureBytes = hexToBytes(signatureHex);
  if (!keyBytes || !signatureBytes) {
    return false;
  }

  try {
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]),
      signatureBytes,
      new TextEncoder().encode(timestamp + input.body),
    );
  } catch {
    return false;
  }
}
