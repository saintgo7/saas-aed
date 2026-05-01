---
title: "10장. DOCX/PDF 동시 생성"
slug: "documents"
chapter: 10
words_target: 3500
screenshots:
  - ch10-step01-docx-template-fields
  - ch10-step02-docxtemplater-output
  - ch10-step03-pdf-generated-preview
  - ch10-step04-r2-report-folder
  - ch10-step05-side-by-side-docx-pdf
---

# 10장. DOCX/PDF 동시 생성

## 학습 목표

- docxtemplater 로 보건복지부 양식 DOCX 를 그대로 채워 넣는다
- PDF 는 puppeteer 가 아니라 React PDF (또는 LaTeX 으로) 메모리·시간을 절감한다
- 100대 시설 1개월치 보고서를 5초 안에 생성하는 배치 패턴을 적용한다
- 시설(PDF) + 보건소(DOCX) 두 요구를 한 번에 만족시킨다
- 보고서 생성 실패 시 재시도와 부분 출력 패턴을 마련한다

## 핵심 개념

보고서 생성은 본 SaaS 의 "월말 피크"이다. 매월 말 5일 동안 보고서 트래픽이
평소의 50배가 된다. 그래서 우리는 동기 생성을 포기하고 **큐 기반 배치**로 간다.
보건소에 제출할 DOCX 와 시설 보관용 PDF 를 한 번의 큐 잡으로 동시 생성한다.

<!-- SCREENSHOT: ch10-step01-docx-template-fields -->
![docxtemplater 템플릿 — {tenant.name} 같은 placeholder](../assets/screenshots/ch10-step01-docx-template-fields.png)
*그림 10-1. assets/templates/monthly-report.docx 를 LibreOffice 로 열어 본 화면. {tenant.name}, {#inspections}{/inspections} 같은 placeholder 가 보건복지부 양식 위에 그대로 박혀 있다.*
<!-- /SCREENSHOT -->

## 10.1 DOCX — docxtemplater

```ts
const zip = new PizZip(await readFile(templatePath))
const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
doc.render({ tenant, period, inspections })
const buf = doc.getZip().generate({ type: "nodebuffer" })
```

<!-- SCREENSHOT: ch10-step02-docxtemplater-output -->
![생성된 DOCX 미리보기 — 보건복지부 양식 그대로](../assets/screenshots/ch10-step02-docxtemplater-output.png)
*그림 10-2. 생성 결과를 LibreOffice 로 연 화면. 표 안의 12 항목, 시설명, 점검자명이 정확히 채워졌다.*
<!-- /SCREENSHOT -->

### 10.1.1 양식 깨짐 방지

`paragraphLoop: true` 와 `linebreaks: true` 가 핵심. 복잡한 표 안에서 placeholder
가 깨지면 보건복지부 검수가 통과되지 않는다.

## 10.2 PDF — React PDF

```tsx
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer"

export const MonthlyReport = ({ data }) => (
  <Document>
    <Page size="A4">
      <View>
        <Text>{data.tenant.name} 월간 점검 보고서</Text>
        {/* ... */}
      </View>
    </Page>
  </Document>
)
```

<!-- SCREENSHOT: ch10-step03-pdf-generated-preview -->
![생성된 PDF 미리보기 — 한글 폰트 임베드 + 워터마크](../assets/screenshots/ch10-step03-pdf-generated-preview.png)
*그림 10-3. PDF.js 로 본 결과. Pretendard 한글 폰트 임베드 + 우측 상단에 SHA-256 단축본 워터마크.*
<!-- /SCREENSHOT -->

### 10.2.1 puppeteer 를 안 쓴 이유

puppeteer 는 Chrome 1개 인스턴스가 200MB+ 를 먹는다. 100대 시설 동시 생성 시
컨테이너가 죽는다. React PDF 는 한 번에 ~10MB 면 끝난다.

## 10.3 큐 기반 배치

cron-worker 가 매월 1일 02:00 에 모든 활성 테넌트에 대해 보고서 생성 잡을 큐에
넣는다. 12장에서 자세히 다룬다.

### 10.3.1 부분 실패

100명 중 1명이 깨지면 전체가 실패하면 안 된다. `Promise.allSettled` + 실패 목록
별도 보고.

## 10.4 R2 보관

```
reports/{tenantId}/{yyyy-mm}/{tenantSlug}-{yyyymm}.docx
reports/{tenantId}/{yyyy-mm}/{tenantSlug}-{yyyymm}.pdf
```

<!-- SCREENSHOT: ch10-step04-r2-report-folder -->
![R2 콘솔 — 한 테넌트 1년치 보고서 12쌍](../assets/screenshots/ch10-step04-r2-report-folder.png)
*그림 10-4. Cloudflare R2 대시보드. tenantId 별 / 월별 폴더 구조로 정렬되어 검색이 직관적.*
<!-- /SCREENSHOT -->

## 10.5 Side-by-side 검증

<!-- SCREENSHOT: ch10-step05-side-by-side-docx-pdf -->
![DOCX vs PDF — 시각 비교 검증](../assets/screenshots/ch10-step05-side-by-side-docx-pdf.png)
*그림 10-5. 같은 데이터로 만든 DOCX(좌) 와 PDF(우). 표 정렬·여백·페이지 분리가 일치하는지 시각 검증.*
<!-- /SCREENSHOT -->

<!-- TODO: 자동 시각 회귀 테스트 (pixelmatch) 결과 캡처 추가 -->

## 요약

- 월말 피크 = 큐 기반 배치, 동기 생성 금지
- DOCX 는 docxtemplater, PDF 는 React PDF — puppeteer 회피로 메모리 1/20
- "시설은 PDF, 보건소는 DOCX" 두 요구를 한 잡으로
- 부분 실패 허용 + 별도 보고로 한 시설 사고가 전체를 망치지 않는다

## 다음 장 미리보기

다음 장에서는 생성된 보고서를 Resend + React Email 로 첨부 발송하는 방법, 그리고
운영의 진짜 문제 — 메일 도달성 — 을 어떻게 관리하는지 다룬다.

## 캡처 체크리스트

- [ ] `ch10-step01-docx-template-fields.png` — LibreOffice 템플릿
- [ ] `ch10-step02-docxtemplater-output.png` — 생성 결과
- [ ] `ch10-step03-pdf-generated-preview.png`
- [ ] `ch10-step04-r2-report-folder.png` — R2 콘솔
- [ ] `ch10-step05-side-by-side-docx-pdf.png` — 시각 비교
