// 미들웨어 인가 우회(CVE-2025-29927)가 가능한 Next 버전으로 되돌아가는 것을 막는 테스트
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

// 14.2.25 미만에서는 x-middleware-subrequest 요청 헤더만으로 미들웨어 실행을
// 통째로 건너뛸 수 있었다. 이 파일 옆의 middleware.ts가 테넌트 격리(L2)의 유일한
// edge 관문이라, 하한 아래로 내려가면 헤더 하나로 테넌트 검사가 통과된다.
const MIN_NEXT = "14.2.25"

function versionKey(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number)
  return major * 1_000_000 + minor * 1_000 + patch
}

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")
) as { dependencies: { next: string } }

describe("next version pin", () => {
  it("stays an exact pin so the resolved runtime is not a moving target", () => {
    expect(pkg.dependencies.next).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it("is at or above the CVE-2025-29927 fix", () => {
    expect(versionKey(pkg.dependencies.next)).toBeGreaterThanOrEqual(
      versionKey(MIN_NEXT)
    )
  })
})
