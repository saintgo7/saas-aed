import { describe, it, expect } from "vitest"
import { Buffer } from "node:buffer"
import { sha256OfBuffer, sha256OfBase64Png } from "./sha256"

const KNOWN_EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
const KNOWN_HELLO_SHA = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

// 1×1 white PNG (decoded length 68 bytes).
const ONE_BY_ONE_WHITE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
const KNOWN_PNG_SHA =
  "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460"

describe("sha256OfBuffer", () => {
  it("returns the canonical SHA-256 of an empty buffer", () => {
    expect(sha256OfBuffer(Buffer.alloc(0))).toBe(KNOWN_EMPTY_SHA)
  })

  it("returns the canonical SHA-256 of 'hello world'", () => {
    expect(sha256OfBuffer(Buffer.from("hello world"))).toBe(KNOWN_HELLO_SHA)
  })
})

describe("sha256OfBase64Png", () => {
  it("decodes a 1x1 white PNG data URL into a non-empty buffer", () => {
    const dataUrl = `data:image/png;base64,${ONE_BY_ONE_WHITE_PNG_BASE64}`
    const { buffer, sha256 } = sha256OfBase64Png(dataUrl)
    expect(buffer.length).toBeGreaterThan(0)
    expect(sha256).toBe(KNOWN_PNG_SHA)
  })

  it("throws when the data URL prefix is missing", () => {
    expect(() => sha256OfBase64Png(ONE_BY_ONE_WHITE_PNG_BASE64)).toThrow(
      /Invalid signature data URL/
    )
  })

  it("throws on a non-PNG data URL prefix", () => {
    expect(() =>
      sha256OfBase64Png(`data:image/jpeg;base64,${ONE_BY_ONE_WHITE_PNG_BASE64}`)
    ).toThrow(/Invalid signature data URL/)
  })

  it("throws when the payload is empty", () => {
    expect(() => sha256OfBase64Png("data:image/png;base64,")).toThrow(
      /empty payload/
    )
  })
})
