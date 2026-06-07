# 교재 포맷 변환 도구

`training/kota-ai-2day/` 의 Markdown 교재를 DOCX / HWPX 로 변환한 산출물은 `build/` 에 있습니다.

## DOCX (pandoc)
```bash
pandoc 입력.md -o 출력.docx --from gfm
```

## HWPX (hwpxlib, Java)
한컴오피스 한글 HWPX 는 표준 변환기가 없어, 한글 HWPX 생성 라이브러리
[neolord0/hwpxlib](https://github.com/neolord0/hwpxlib) 로 직접 생성한다.

```bash
# 1) hwpxlib 받기 (Maven Central)
curl -sL -o hwpxlib.jar https://repo1.maven.org/maven2/kr/dogfoot/hwpxlib/1.0.9/hwpxlib-1.0.9.jar
# 2) 컴파일
javac -cp hwpxlib.jar Md2Hwpx.java
# 3) 변환 (UTF-8 로케일 필수 — 한글 파일명)
LANG=C.UTF-8 java -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 \
  -cp "hwpxlib.jar:." Md2Hwpx 입력.md 출력.hwpx
```

`Md2Hwpx.java` 는 마크다운을 한글 문서용 평문 단락으로 정리(제목 기호화·표 정렬·목록 정리)하여
HWPX 단락으로 기록한다. 생성물은 hwpxlib 리더로 재파싱 검증을 마쳤다.
