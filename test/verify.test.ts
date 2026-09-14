import { describe, expect, it } from "vitest"
import { verifyDiscordSignature } from "../src/verify"

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function createSignedRequest(body: string) {
  const keyPair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])) as CryptoKeyPair
  const timestamp = `${Math.floor(Date.now() / 1000)}`
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    keyPair.privateKey,
    new TextEncoder().encode(timestamp + body),
  )
  const publicKey = (await crypto.subtle.exportKey("raw", keyPair.publicKey)) as ArrayBuffer

  return {
    publicKeyHex: toHex(new Uint8Array(publicKey)),
    signatureHex: toHex(new Uint8Array(signature)),
    timestamp,
  }
}

describe("verifyDiscordSignature", () => {
  it("accepts a valid signature", async () => {
    const body = JSON.stringify({ type: 1 })
    const signed = await createSignedRequest(body)
    await expect(verifyDiscordSignature({ ...signed, body })).resolves.toBe(true)
  })

  it("rejects a tampered body", async () => {
    const signed = await createSignedRequest(JSON.stringify({ type: 1 }))
    await expect(verifyDiscordSignature({ ...signed, body: JSON.stringify({ type: 2 }) })).resolves.toBe(false)
  })

  it("rejects a missing signature", async () => {
    const signed = await createSignedRequest("{}")
    await expect(verifyDiscordSignature({ ...signed, signatureHex: null, body: "{}" })).resolves.toBe(false)
  })

  it("rejects a stale timestamp", async () => {
    const body = JSON.stringify({ type: 1 })
    const signed = await createSignedRequest(body)
    const staleNow = Number(signed.timestamp) * 1000 + 10 * 60 * 1000
    await expect(verifyDiscordSignature({ ...signed, body, now: staleNow })).resolves.toBe(false)
  })

  it("rejects malformed hex", async () => {
    const signed = await createSignedRequest("{}")
    await expect(verifyDiscordSignature({ ...signed, publicKeyHex: "zz", body: "{}" })).resolves.toBe(false)
  })
})
