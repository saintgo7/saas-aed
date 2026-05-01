# Changelog

이 프로젝트의 주요 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 를 따르고,
버전 번호는 [Semantic Versioning](https://semver.org/lang/ko/) 을 따릅니다.

## [Unreleased]

## [0.1.0] - 2026-05-01

### Added

- 8 테이블 데이터 스키마 (orgs, users, devices, inspections, items, signatures, files, audit_logs)
- Auth.js 기반 다기관(multi-tenant) 인증 및 세션 격리
- 12개 점검 항목 통합 입력 폼
- 서명 캔버스 (signature_pad) — 모바일 터치 보정 + base64 직렬화
- DOCX / PDF 점검 보고서 동시 생성 파이프라인 (`docx`, `@react-pdf/renderer`)
- Cloudflare R2 오브젝트 업로드 (`@aws-sdk/client-s3`, presigned URL)
- Resend 이메일 발송 + 4종 템플릿 (가입 환영, 점검 완료, 만료 임박, 미점검 알림)
- 4종 cron 핸들러 (만료 알림, 미점검 추적, 백업, 일일 요약)
- 인프라: Cloudflare Tunnel + nginx 리버스 프록시, abada-65 self-host
- GitHub Actions CI/CD (typecheck → lint → test → build → deploy)
- 17장 한국어/영어 단행본 + 캡처 워크플로우 (`docs/book/`, `SCREENSHOT_WORKFLOW.md`)

[Unreleased]: https://github.com/saintgo7/saas-aed/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/saintgo7/saas-aed/releases/tag/v0.1.0
