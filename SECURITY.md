# Security Policy

## 보안 취약점 보고 / Reporting a Vulnerability

보안 취약점을 발견하셨다면 **공개 이슈로 등록하지 마시고** 아래 채널로 비공개 보고해 주세요.
If you discover a security vulnerability, **do not open a public issue**. Instead, report privately via the channels below.

- Email: `security@abada.co.kr`
- GPG Public Key Fingerprint: `TBD — 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000` (placeholder)
- GPG Public Key URL: `https://abada.co.kr/.well-known/security-pgp.asc` (placeholder)

### 보고 시 포함할 정보 / Please Include

1. 취약점 요약 / Summary of the vulnerability
2. 재현 단계 / Reproduction steps
3. 영향 범위(데이터, 권한, 기관) / Impact scope (data, privileges, tenants)
4. 가능하면 PoC 코드 또는 스크린샷 / PoC code or screenshots if available
5. 발견 환경 (버전, OS, 브라우저) / Environment (version, OS, browser)

### 응답 SLA / Response SLA

| 단계 / Stage | 목표 시간 / Target |
|--------------|--------------------|
| 접수 확인 / Acknowledgement | 영업일 기준 3일 이내 / Within 3 business days |
| 1차 분석 / Initial triage | 7일 이내 / Within 7 days |
| 패치 배포 / Patch release | 심각도에 따라 7~30일 / 7–30 days based on severity |
| 공개 공시 / Public disclosure | 패치 배포 후 협의 / Coordinated after patch |

---

## 지원 버전 / Supported Versions

보안 패치는 아래 버전에 대해 제공됩니다.
Security patches are provided for the versions below.

| Version | Supported |
|---------|-----------|
| 0.1.x   | YES       |
| < 0.1   | NO        |

운영 환경에서는 항상 최신 패치 버전을 유지해 주세요.
Always run the latest patch release in production.

---

## 보안 모델 요약 / Security Model Summary

### 1. 다기관 격리 / Multi-Tenant Isolation

- 모든 도메인 테이블은 `org_id` 외래 키를 가지며, 모든 쿼리는 세션의 `org_id` 로 필터링됩니다.
- 미들웨어 계층에서 cross-tenant 접근을 거부합니다 (`assertSameOrg`).
- 관리자(superadmin) 역할만 다기관 조회가 허용되며, 모든 행위는 `audit_logs` 에 기록됩니다.

All domain tables carry `org_id`; every query is scoped to the session `org_id`.
Cross-tenant access is rejected by the middleware (`assertSameOrg`).
Only superadmin may query across tenants, and every such action is recorded in `audit_logs`.

### 2. 서명 무결성 / Signature Integrity

- 점검 서명은 base64 PNG 로 저장되며, `inspection_id + signed_at + sha256(payload)` 의 해시 체인이 함께 기록됩니다.
- DOCX / PDF 보고서에는 서명과 해시가 함께 임베드되어 사후 검증이 가능합니다.
- 서명 후 점검 레코드는 immutable 로 전환되며, 정정은 새 레코드로만 허용됩니다.

Inspection signatures are stored as base64 PNG with a hash chain over `inspection_id + signed_at + sha256(payload)`.
Both DOCX and PDF reports embed the signature and hash for later verification.
Once signed, inspection records are immutable; corrections require a new record.

### 3. 백업 암호화 / Encrypted Backups

- DB 야간 백업은 `pg_dump` 출력에 대해 `age` 로 암호화된 후 R2 에 업로드됩니다.
- 복호화 키는 운영 비밀 저장소(KMS / Vault)에서만 관리되며, 코드/저장소에 포함되지 않습니다.
- 백업 보관 기간: 일일 30일, 월간 12개월.

Nightly DB backups are encrypted with `age` over `pg_dump` output before upload to R2.
Decryption keys are held in a secrets manager (KMS / Vault) only — never in code or repos.
Retention: 30 daily snapshots, 12 monthly archives.

---

## 책임 있는 공개 / Responsible Disclosure

신고자의 신원은 본인이 동의하지 않는 한 비공개로 유지됩니다.
선의의 보안 연구자에 대해 법적 조치를 취하지 않으며, 패치 공시 시 크레딧을 표기할 수 있습니다.

We keep reporter identity confidential unless you consent to disclosure.
We will not pursue legal action against good-faith security researchers and may credit you in the patch disclosure.
