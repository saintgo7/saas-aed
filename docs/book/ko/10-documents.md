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
  - ch10-step06-hwpx-form-side-by-side
  - ch10-step07-html-web-preview-toolbar
  - ch10-step08-html-web-preview-print-css
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

## 10.6 HWPX 양식 1:1 매칭 — 12개 항목, 6 그룹

배포 후 보건소에 첫 보고서를 제출했을 때 받은 피드백은 단순했다 — "표가
양식과 다릅니다." 보건복지부 고시의 HWPX(한글워드 XML) 양식은 단순한 12개
나열이 아니라 **6 그룹으로 묶인 12개 항목 + 그룹 안의 ① ② ③ sub-marker +
패드/배터리 교체일자 inline + 24시간 운영 분기 + 서명 우측 하단**이라는
시각 구조를 가진다. 본 SaaS는 원본 HWPX(`docs/forms/aed-inspection-form-mohw.hwpx`,
54 KB)를 텍스트로 추출해 표 구조를 1:1로 재현한다.

```ts
// src/lib/inspection/items.ts (요약)
export const INSPECTION_ITEMS = [
  // 1. 본체 작동 상태 확인 (3 items)
  { code: "OP_POWER",  group: 1, sub: "①", labelKo: "본체 작동 상태 확인 (전원 표시 상태등 점멸)", ... },
  { code: "OP_PAD",    group: 1, sub: "②", labelKo: "환자 부착용 패드 유무", ... },
  { code: "OP_BATTERY",group: 1, sub: "③", labelKo: "건전지 충전 상태", ... },
  // 2. 보관함 상태 (5 items: BX_ALARM, BX_GUIDE, BX_EMG, BX_CPR, BX_EXP)
  // 3. 위치안내 표시 (2 items: LOC_ENT, LOC_DIR)
  // 4. 관리서류 (1 item: DOC_FILE)
  // 6. 24시간 운영 (1 item: TIME_24)  ← group 5는 metadata
] as const
```

**14개 → 12개로 정정**한 사고가 있었다. 초기 스캐폴드는 `OP_CONNECTOR`,
`OP_EXTERIOR`를 추가로 가지고 있었으나 HWPX 원본에는 존재하지 않았다. 양식을
texttract로 다시 읽어 검증해 두 항목을 제거했다(`9dd4982`). **법령 양식의
타당성은 LLM이 아닌 원본 파일에서 출발해야 한다**는 교훈이 핵심이다.

### 10.6.1 그룹 5 = 메타데이터, 그래서 group 번호 건너뜀

그룹 5는 "관리자 변경사항"으로, OK/NG 판정이 아니라 디바이스 레코드의 변경
이력에 기록된다. 그래서 INSPECTION_ITEMS의 group 번호는 1, 2, 3, 4, 6으로
**5를 건너뛴다**. 양식의 시각 레이아웃과 코드 상수의 group 번호를 정렬하기
위함이다. 이 한 가지 결정이 DOCX/PDF 렌더러를 단순하게 만든다.

### 10.6.2 sub-item 들여쓰기 + inline 메타데이터

각 그룹 안에서 ① ② ③ sub-marker는 반각 들여쓰기로 시각 hierarchy를 표현한다.
패드(BX_EXP)와 배터리(OP_BATTERY)의 교체일자는 항목 라벨 옆에 inline으로
박는다 — 별도 행을 만들면 양식이 깨진다. 24시간 운영 여부(TIME_24)는 그룹 6에
별도 칸을 두어 OK/NG를 표시. 서명은 우측 하단 인라인 — 표 밖이 아니라 마지막
행의 마지막 셀.

```ts
// src/lib/documents/docx.ts (요약)
function renderItemRow(item: InspectionItem, result: "OK" | "NG"): TableRow {
  const indent = item.sub ? "    " : ""
  const labelText = `${indent}${item.sub} ${item.labelKo}`
  const inlineMeta = item.code === "BX_EXP"
    ? ` (교체일자: ${formatDate(device.padReplacedAt)})`
    : item.code === "OP_BATTERY"
    ? ` (교체일자: ${formatDate(device.batteryReplacedAt)})`
    : ""
  return new TableRow({ children: [
    cell(labelText + inlineMeta),
    cell(result === "OK" ? "양호" : "불량")
  ]})
}
```

<!-- SCREENSHOT: ch10-step06-hwpx-form-side-by-side -->
![HWPX 원본(좌) vs 본 SaaS DOCX 산출물(우) — 1:1 매칭](../assets/screenshots/ch10-step06-hwpx-form-side-by-side.png)
*그림 10-6. 한글 2024로 연 보건복지부 HWPX(좌)와 본 SaaS의 DOCX(우). 6 그룹·sub-marker·inline 교체일자가 모두 일치.*
<!-- /SCREENSHOT -->

## 10.7 HTML 웹 미리보기 — `/inspections/[id]`

DOCX/PDF는 다운로드해야 보이고, 모바일에서는 다운로드가 거추장스럽다. 그래서
브라우저에서 같은 양식을 즉시 미리볼 수 있는 페이지를 추가했다 —
`/inspections/[id]`. 인쇄 친화 CSS, `?lang=en` 토글, 다운로드/발송/서명
버튼을 한 툴바에 통합. 운영 1년차 가장 많이 쓰는 화면이 됐다.

```tsx
// src/app/(app)/inspections/[id]/page.tsx (요약)
export const dynamic = "force-dynamic"

export default async function InspectionPreviewPage({ params, searchParams }) {
  const session = await auth()
  const locale = searchParams.lang === "en" ? "en" : "ko"
  const t = getLabels(locale)
  const [inspection] = await withTenant(session.user.tenantId)
    .inspections().findById(params.id)
  // 6 그룹을 group 번호로 묶어 표 렌더링
  const groupedItems = (group: number) =>
    INSPECTION_ITEMS.filter((i) => i.group === group)
  return <PrintableForm ... />
}
```

핵심 디자인 결정 3가지.

1. **인쇄 CSS** — `@media print { .toolbar { display: none } body { margin: 18mm } }`.
   Cmd-P 한 번에 A4 출력 가능. 보건소가 종이 보관본을 요구할 때 즉시 대응.
2. **언어 토글** — `?lang=en` 쿼리만 바꾸면 영문판이 즉시. 외국인 점검자
   사고 대응 시 유용.
3. **툴바 통합** — DOCX/PDF/서명/발송 버튼을 한 줄에. `/send` 페이지의
   "웹 미리보기 (HWPX 양식)" 카드가 첫 진입점.

<!-- SCREENSHOT: ch10-step07-html-web-preview-toolbar -->
![브라우저 미리보기 + 통합 툴바](../assets/screenshots/ch10-step07-html-web-preview-toolbar.png)
*그림 10-7. `/inspections/[id]` 화면. 상단 툴바에 DOCX/PDF/언어/서명/발송 5개 액션.*
<!-- /SCREENSHOT -->

<!-- SCREENSHOT: ch10-step08-html-web-preview-print-css -->
![Cmd-P 인쇄 미리보기 — 툴바 숨김 + A4 18mm 마진](../assets/screenshots/ch10-step08-html-web-preview-print-css.png)
*그림 10-8. Chrome 인쇄 미리보기. @media print 규칙으로 툴바·배너가 사라지고 표만 깨끗이 남는다.*
<!-- /SCREENSHOT -->

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
- [ ] `ch10-step06-hwpx-form-side-by-side.png` — HWPX 1:1 매칭
- [ ] `ch10-step07-html-web-preview-toolbar.png` — 웹 미리보기 툴바
- [ ] `ch10-step08-html-web-preview-print-css.png` — 인쇄 CSS
