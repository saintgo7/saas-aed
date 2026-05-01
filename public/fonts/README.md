# Fonts

이 디렉토리에는 책 PDF 생성 및 앱 한글 표시에 필요한 폰트 파일을 배치합니다.

## 필요한 파일

| 파일명 | 용도 | 다운로드 출처 |
|--------|------|---------------|
| `Pretendard-Regular.ttf` | 본문 한글/영문 (Regular) | https://github.com/orioncactus/pretendard |
| `Pretendard-Bold.ttf` | 본문 한글/영문 (Bold) | https://github.com/orioncactus/pretendard |
| `Inter-Regular.ttf` | 영문 본문 | https://fonts.google.com/specimen/Inter |
| `JetBrains-Mono-Regular.ttf` | 코드 / 일련번호 | https://www.jetbrains.com/lp/mono/ |

## 다운로드 방법

### Pretendard

```bash
# 공식 릴리스 zip 에서 ttf 파일을 추출하여 이 디렉토리에 복사
# https://github.com/orioncactus/pretendard/releases
```

### Inter

```bash
# Google Fonts 또는 https://rsms.me/inter/ 에서 다운로드
# Inter-Regular.ttf 만 추출
```

### JetBrains Mono

```bash
# https://www.jetbrains.com/lp/mono/ 에서 zip 다운로드 후
# JetBrainsMono-Regular.ttf -> JetBrains-Mono-Regular.ttf 로 리네임
```

## 라이선스

| 폰트 | 라이선스 |
|------|----------|
| Pretendard | SIL Open Font License 1.1 (OFL) |
| Inter | SIL Open Font License 1.1 (OFL) |
| JetBrains Mono | Apache License 2.0 |

모두 상용 사용 및 재배포가 허용됩니다. 단, 라이선스 원문(LICENSE 파일)은 각 폰트 배포 시 함께 포함해야 합니다.

## 주의

- 이 디렉토리의 폰트 파일은 `.gitignore` 정책에 따라 저장소에 커밋되지 않을 수 있습니다.
- 빌드 환경(CI, 운영 서버)에서는 별도 스크립트로 폰트를 내려받아야 합니다.
