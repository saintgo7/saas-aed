// Minimal store-only ZIP writer (no compression).
//
// Produces a valid ZIP archive by concatenating local file headers, file
// payloads, the central directory, and the end-of-central-directory (EOCD)
// record. Implemented from scratch so we add zero npm dependencies.
//
// Spec reference: APPNOTE.TXT 4.5 (PKWARE).
//
// Limits:
//  - Single archive < 4 GiB total (no ZIP64).
//  - Per-file size < 4 GiB.
//  - File names UTF-8 (general purpose bit 11 set).
//  - No compression (method 0 = stored).

import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"

export interface ZipEntryInput {
  readonly name: string
  readonly data: Buffer
}

interface CentralEntry {
  readonly name: Buffer
  readonly crc32: number
  readonly size: number
  readonly localHeaderOffset: number
}

const SIG_LOCAL = 0x04034b50
const SIG_CENTRAL = 0x02014b50
const SIG_EOCD = 0x06054b50

const VERSION_NEEDED = 20
const VERSION_MADE_BY = 20
// Bit 11 = filename uses UTF-8.
const GP_FLAGS = 0x0800
const METHOD_STORE = 0

// CRC-32 table cached at module load.
const CRC_TABLE: ReadonlyArray<number> = (() => {
  const table = new Array<number>(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i] ?? 0
    const idx = (c ^ byte) & 0xff
    const next = CRC_TABLE[idx] ?? 0
    c = next ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function dosDateTime(d: Date): { date: number; time: number } {
  const year = Math.max(1980, d.getFullYear())
  const date =
    ((year - 1980) << 9) |
    ((d.getMonth() + 1) << 5) |
    d.getDate()
  const time =
    (d.getHours() << 11) |
    (d.getMinutes() << 5) |
    Math.floor(d.getSeconds() / 2)
  return { date: date & 0xffff, time: time & 0xffff }
}

function localFileHeader(
  nameBuf: Buffer,
  crc: number,
  size: number,
  dt: { date: number; time: number }
): Buffer {
  const buf = Buffer.alloc(30 + nameBuf.length)
  buf.writeUInt32LE(SIG_LOCAL, 0)
  buf.writeUInt16LE(VERSION_NEEDED, 4)
  buf.writeUInt16LE(GP_FLAGS, 6)
  buf.writeUInt16LE(METHOD_STORE, 8)
  buf.writeUInt16LE(dt.time, 10)
  buf.writeUInt16LE(dt.date, 12)
  buf.writeUInt32LE(crc, 14)
  buf.writeUInt32LE(size, 18) // compressed size = uncompressed (store)
  buf.writeUInt32LE(size, 22)
  buf.writeUInt16LE(nameBuf.length, 26)
  buf.writeUInt16LE(0, 28) // extra field length
  nameBuf.copy(buf, 30)
  return buf
}

function centralDirectoryHeader(
  entry: CentralEntry,
  dt: { date: number; time: number }
): Buffer {
  const buf = Buffer.alloc(46 + entry.name.length)
  buf.writeUInt32LE(SIG_CENTRAL, 0)
  buf.writeUInt16LE(VERSION_MADE_BY, 4)
  buf.writeUInt16LE(VERSION_NEEDED, 6)
  buf.writeUInt16LE(GP_FLAGS, 8)
  buf.writeUInt16LE(METHOD_STORE, 10)
  buf.writeUInt16LE(dt.time, 12)
  buf.writeUInt16LE(dt.date, 14)
  buf.writeUInt32LE(entry.crc32, 16)
  buf.writeUInt32LE(entry.size, 20)
  buf.writeUInt32LE(entry.size, 24)
  buf.writeUInt16LE(entry.name.length, 28)
  buf.writeUInt16LE(0, 30) // extra field length
  buf.writeUInt16LE(0, 32) // file comment length
  buf.writeUInt16LE(0, 34) // disk number start
  buf.writeUInt16LE(0, 36) // internal file attributes
  buf.writeUInt32LE(0, 38) // external file attributes
  buf.writeUInt32LE(entry.localHeaderOffset, 42)
  entry.name.copy(buf, 46)
  return buf
}

function endOfCentralDirectory(
  entryCount: number,
  centralSize: number,
  centralOffset: number
): Buffer {
  const buf = Buffer.alloc(22)
  buf.writeUInt32LE(SIG_EOCD, 0)
  buf.writeUInt16LE(0, 4) // disk number
  buf.writeUInt16LE(0, 6) // disk where central dir starts
  buf.writeUInt16LE(entryCount, 8)
  buf.writeUInt16LE(entryCount, 10)
  buf.writeUInt32LE(centralSize, 12)
  buf.writeUInt32LE(centralOffset, 16)
  buf.writeUInt16LE(0, 20) // comment length
  return buf
}

/**
 * Build a ZIP archive from in-memory entries (store-only, no compression).
 * Returns a single Buffer ready to send as the response body.
 */
export function buildStoreZip(entries: ReadonlyArray<ZipEntryInput>): Buffer {
  const dt = dosDateTime(new Date())
  const parts: Buffer[] = []
  const central: CentralEntry[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf-8")
    const crc = crc32(entry.data)
    const lfh = localFileHeader(nameBuf, crc, entry.data.length, dt)
    parts.push(lfh, entry.data)
    central.push({
      name: nameBuf,
      crc32: crc,
      size: entry.data.length,
      localHeaderOffset: offset
    })
    offset += lfh.length + entry.data.length
  }

  const centralStart = offset
  for (const entry of central) {
    const cdh = centralDirectoryHeader(entry, dt)
    parts.push(cdh)
    offset += cdh.length
  }
  const centralSize = offset - centralStart

  parts.push(endOfCentralDirectory(central.length, centralSize, centralStart))
  return Buffer.concat(parts)
}

/** Convenience helper exposed mainly for test/debug. */
export function sha256OfZip(zip: Buffer): string {
  return createHash("sha256").update(zip).digest("hex")
}
