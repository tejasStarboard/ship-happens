import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { env } from "@/env"

const ALGO = "aes-256-gcm"

function keyFromSecret(): Buffer {
  return createHash("sha256").update(env.BETTER_AUTH_SECRET).digest()
}

/** Encrypt a secret string for DB storage (base64: iv.tag.ciphertext). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, keyFromSecret(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret payload")
  }
  const decipher = createDecipheriv(
    ALGO,
    keyFromSecret(),
    Buffer.from(ivB64, "base64url")
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
