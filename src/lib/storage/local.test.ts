// 로컬 스토리지 키의 경로 이탈(path traversal)을 차단하는지 검증하는 테스트
import { describe, it, expect, afterEach } from "vitest"
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { resolveWithinRoot, readLocalObject } from "./local"

const ROOT = "/tmp/aed-storage"

describe("resolveWithinRoot", () => {
  it("resolves normal keys inside ROOT", () => {
    expect(resolveWithinRoot("signatures/t1/i1.png")).toBe(
      `${ROOT}/signatures/t1/i1.png`
    )
  })

  it("rejects parent-directory traversal", () => {
    expect(resolveWithinRoot("../../etc/passwd")).toBeNull()
  })

  it("rejects traversal hidden mid-path", () => {
    expect(resolveWithinRoot("signatures/../../../etc/passwd")).toBeNull()
  })

  it("rejects a sibling directory that shares the ROOT prefix", () => {
    // /tmp/aed-storage-evil must not be treated as inside /tmp/aed-storage
    expect(resolveWithinRoot("../aed-storage-evil/x")).toBeNull()
  })

  it("allows the ROOT itself", () => {
    expect(resolveWithinRoot("")).toBe(ROOT)
  })
})

describe("readLocalObject symlink containment", () => {
  const created: string[] = []

  afterEach(() => {
    for (const p of created.splice(0)) {
      try {
        rmSync(p, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  })

  it("refuses to follow a symlink that escapes ROOT", async () => {
    // Secret file outside ROOT.
    const outsideDir = mkdtempSync(join(tmpdir(), "aed-outside-"))
    created.push(outsideDir)
    const secret = join(outsideDir, "secret.txt")
    writeFileSync(secret, "TOP SECRET")

    // Symlink planted inside ROOT pointing at the outside secret.
    mkdirSync(ROOT, { recursive: true })
    const linkName = `evil-link-${process.pid}-${Date.now()}.txt`
    const linkPath = join(ROOT, linkName)
    try {
      symlinkSync(secret, linkPath)
    } catch {
      // Environments that forbid symlink creation: nothing to assert.
      return
    }
    created.push(linkPath)

    const result = await readLocalObject(linkName)
    expect(result).toBeNull()
  })
})
