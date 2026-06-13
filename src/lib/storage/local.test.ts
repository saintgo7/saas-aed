// 로컬 스토리지 키의 경로 이탈(path traversal)을 차단하는지 검증하는 테스트
import { describe, it, expect } from "vitest"
import { resolveWithinRoot } from "./local"

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
