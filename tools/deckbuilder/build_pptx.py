#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deck spec(JSON) -> PPTX 렌더러.
사람이 직접 디자인한 듯한 일관된 강의 슬라이드를 생성한다.
사용: python3 build_pptx.py deck.json out.pptx
"""
import json
import sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ---- 디자인 토큰 ----
KFONT = "맑은 고딕"
NAVY = RGBColor(0x14, 0x2A, 0x4F)
ACCENT = RGBColor(0x2E, 0x75, 0xB6)
ACCENT2 = RGBColor(0xC8, 0x5A, 0x1B)
LIGHT = RGBColor(0xEE, 0xF2, 0xF8)
GRAY = RGBColor(0x5A, 0x5A, 0x5A)
LGRAY = RGBColor(0x8A, 0x8A, 0x8A)
DARK = RGBColor(0x23, 0x29, 0x33)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

EMU_W, EMU_H = Inches(13.333), Inches(7.5)


def _set_font(run, size=None, bold=None, color=None, italic=None, font=KFONT):
    run.font.name = font
    # 동아시아 폰트도 동일 지정
    rPr = run._r.get_or_add_rPr()
    ea = rPr.find(qn('a:ea'))
    if ea is None:
        ea = rPr.makeelement(qn('a:ea'), {})
        rPr.append(ea)
    ea.set('typeface', font)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.font.bold = bold
    if italic is not None:
        run.font.italic = italic
    if color is not None:
        run.font.color.rgb = color


def _rect(slide, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(1)
    sp.shadow.inherit = False
    return sp


def _text(slide, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
          wrap=True, space_after=6, line_spacing=1.05):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    first = True
    # runs: list of paragraphs; each paragraph = list of (text, style-dict)
    for para in runs:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.space_after = Pt(space_after)
        p.space_before = Pt(0)
        try:
            p.line_spacing = line_spacing
        except Exception:
            pass
        if isinstance(para, tuple):
            para = [para]
        for seg in para:
            txt, st = seg
            r = p.add_run()
            r.text = txt
            _set_font(r, **st)
    return tb


def _footer(slide, idx, course):
    _rect(slide, 0, Inches(7.06), EMU_W, Pt(2), fill=LIGHT)
    _text(slide, Inches(0.55), Inches(7.08), Inches(9), Inches(0.32),
          [[(course, dict(size=9, color=LGRAY))]], anchor=MSO_ANCHOR.MIDDLE)
    _text(slide, Inches(11.6), Inches(7.08), Inches(1.2), Inches(0.32),
          [[(str(idx), dict(size=10, color=GRAY, bold=True))]],
          align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)


def _content_header(slide, title, kicker=None):
    _rect(slide, 0, 0, Inches(0.22), EMU_H, fill=NAVY)
    if kicker:
        _text(slide, Inches(0.55), Inches(0.34), Inches(11), Inches(0.3),
              [[(kicker, dict(size=11, color=ACCENT, bold=True))]])
    _text(slide, Inches(0.52), Inches(0.6), Inches(12.2), Inches(0.95),
          [[(title, dict(size=27, color=NAVY, bold=True))]], line_spacing=1.0)
    _rect(slide, Inches(0.57), Inches(1.5), Inches(1.1), Pt(3), fill=ACCENT2)


# ---- 레이아웃들 ----
def slide_title(prs, s, course):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _rect(sl, 0, 0, EMU_W, EMU_H, fill=NAVY)
    _rect(sl, 0, Inches(4.62), EMU_W, Pt(3), fill=ACCENT2)
    _rect(sl, Inches(0.9), Inches(1.05), Inches(1.6), Pt(4), fill=ACCENT)
    if s.get("kicker"):
        _text(sl, Inches(0.9), Inches(1.25), Inches(11), Inches(0.4),
              [[(s["kicker"], dict(size=15, color=RGBColor(0x9D, 0xBE, 0xE6), bold=True))]])
    _text(sl, Inches(0.9), Inches(1.9), Inches(11.5), Inches(2.3),
          [[(s.get("title", ""), dict(size=40, color=WHITE, bold=True))]], line_spacing=1.08)
    if s.get("subtitle"):
        _text(sl, Inches(0.92), Inches(4.85), Inches(11.5), Inches(1.0),
              [[(s["subtitle"], dict(size=18, color=RGBColor(0xCF, 0xDD, 0xEF)))]])
    meta = []
    if s.get("org"):
        meta.append([(s["org"], dict(size=14, color=RGBColor(0xB9, 0xCB, 0xE2)))])
    if s.get("date") or s.get("presenter"):
        line = "   ·   ".join([x for x in [s.get("date", ""), s.get("presenter", "")] if x])
        meta.append([(line, dict(size=13, color=RGBColor(0x8F, 0xA8, 0xC9)))])
    if meta:
        _text(sl, Inches(0.92), Inches(6.2), Inches(11.5), Inches(0.9), meta, space_after=3)


def slide_section(prs, s, course, num):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _rect(sl, 0, 0, EMU_W, EMU_H, fill=LIGHT)
    _rect(sl, 0, 0, Inches(4.4), EMU_H, fill=NAVY)
    _text(sl, Inches(0.7), Inches(2.5), Inches(3.2), Inches(2.0),
          [[(s.get("num", num), dict(size=80, color=RGBColor(0x3E, 0x5C, 0x8A), bold=True))]])
    _rect(sl, Inches(4.9), Inches(3.0), Inches(0.7), Pt(4), fill=ACCENT2)
    _text(sl, Inches(4.9), Inches(3.25), Inches(7.8), Inches(1.8),
          [[(s.get("title", ""), dict(size=32, color=NAVY, bold=True))]], line_spacing=1.05)
    if s.get("subtitle"):
        _text(sl, Inches(4.92), Inches(4.7), Inches(7.6), Inches(1.2),
              [[(s["subtitle"], dict(size=15, color=GRAY))]])


def _bullets_tf(slide, x, y, w, h, bullets, base=16):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_top = 0
    first = True
    for b in bullets:
        if isinstance(b, str):
            b = {"text": b, "level": 0}
        lvl = b.get("level", 0)
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.level = min(lvl, 2)
        p.space_after = Pt(7 if lvl == 0 else 4)
        p.line_spacing = 1.08
        mark = "▪  " if lvl == 0 else ("–  " if lvl == 1 else "·  ")
        r = p.add_run(); r.text = mark
        _set_font(r, size=base - lvl * 2,
                  color=(ACCENT2 if lvl == 0 else LGRAY), bold=(lvl == 0))
        r2 = p.add_run(); r2.text = b["text"]
        _set_font(r2, size=base - lvl * 2,
                  color=(DARK if lvl == 0 else GRAY),
                  bold=b.get("bold", False))
    return tb


def slide_bullets(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _content_header(sl, s.get("title", ""), s.get("kicker"))
    body_y = Inches(1.85)
    if s.get("lead"):
        _text(sl, Inches(0.6), body_y, Inches(12.1), Inches(0.7),
              [[(s["lead"], dict(size=15, color=ACCENT, italic=True))]])
        body_y = Inches(2.5)
    _bullets_tf(sl, Inches(0.62), body_y, Inches(12.1), Inches(4.4),
                s.get("bullets", []), base=s.get("font", 17))
    _footer(sl, idx, course)


def slide_two_col(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _content_header(sl, s.get("title", ""), s.get("kicker"))
    cols = [("left", Inches(0.62)), ("right", Inches(6.95))]
    for key, x in cols:
        col = s.get(key, {})
        head = col.get("title", "")
        _rect(sl, x, Inches(1.95), Inches(5.75), Inches(0.55), fill=NAVY)
        _text(sl, x + Inches(0.18), Inches(1.97), Inches(5.4), Inches(0.5),
              [[(head, dict(size=15, color=WHITE, bold=True))]], anchor=MSO_ANCHOR.MIDDLE)
        _rect(sl, x, Inches(2.5), Inches(5.75), Inches(4.2), fill=LIGHT)
        _bullets_tf(sl, x + Inches(0.2), Inches(2.7), Inches(5.4), Inches(3.9),
                    col.get("bullets", []), base=15)
    _footer(sl, idx, course)


def slide_table(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _content_header(sl, s.get("title", ""), s.get("kicker"))
    data = s.get("table", [])
    if not data:
        _footer(sl, idx, course); return
    rows, cols = len(data), len(data[0])
    top = Inches(2.0)
    h = min(Inches(4.6), Inches(0.55) * rows)
    gtbl = sl.shapes.add_table(rows, cols, Inches(0.62), top, Inches(12.1), h).table
    for ci in range(cols):
        gtbl.columns[ci].width = Emu(int(Inches(12.1) / cols))
    for ri, row in enumerate(data):
        gtbl.rows[ri].height = Emu(int(h / rows))
        for ci in range(cols):
            cell = gtbl.cell(ri, ci)
            cell.margin_left = Inches(0.12); cell.margin_right = Inches(0.08)
            cell.margin_top = Inches(0.04); cell.margin_bottom = Inches(0.04)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            cell.fill.fore_color.rgb = NAVY if ri == 0 else (WHITE if ri % 2 else LIGHT)
            txt = str(row[ci]) if ci < len(row) else ""
            tf = cell.text_frame; tf.word_wrap = True
            p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
            r = p.add_run(); r.text = txt
            _set_font(r, size=12 if ri else 13,
                      color=(WHITE if ri == 0 else DARK), bold=(ri == 0))
    _footer(sl, idx, course)


def slide_takeaway(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _rect(sl, 0, 0, EMU_W, EMU_H, fill=NAVY)
    _rect(sl, Inches(1.0), Inches(1.4), Inches(11.33), Inches(4.7), fill=RGBColor(0x1C, 0x37, 0x63))
    _rect(sl, Inches(1.0), Inches(1.4), Inches(0.16), Inches(4.7), fill=ACCENT2)
    _text(sl, Inches(1.5), Inches(1.85), Inches(10.4), Inches(0.6),
          [[(s.get("label", "핵심 정리"), dict(size=15, color=ACCENT, bold=True))]])
    _text(sl, Inches(1.5), Inches(2.55), Inches(10.4), Inches(3.2),
          [[(s.get("text", ""), dict(size=27, color=WHITE, bold=True))]], line_spacing=1.18)
    _footer(sl, idx, course)


def slide_quote(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _rect(sl, 0, 0, EMU_W, EMU_H, fill=LIGHT)
    _text(sl, Inches(1.1), Inches(1.5), Inches(2), Inches(1.2),
          [[("“", dict(size=90, color=ACCENT, bold=True))]])
    _text(sl, Inches(1.4), Inches(2.7), Inches(10.5), Inches(2.8),
          [[(s.get("text", ""), dict(size=26, color=NAVY, bold=True))]], line_spacing=1.2)
    if s.get("by"):
        _text(sl, Inches(1.45), Inches(5.6), Inches(10), Inches(0.5),
              [[("— " + s["by"], dict(size=15, color=GRAY))]])
    _footer(sl, idx, course)


def slide_closing(prs, s, course, idx):
    sl = prs.slides.add_slide(prs.slide_layouts[6])
    _rect(sl, 0, 0, EMU_W, EMU_H, fill=NAVY)
    _rect(sl, Inches(0.9), Inches(2.4), Inches(1.6), Pt(4), fill=ACCENT2)
    _text(sl, Inches(0.9), Inches(2.7), Inches(11.5), Inches(1.4),
          [[(s.get("title", "감사합니다"), dict(size=40, color=WHITE, bold=True))]])
    lines = [[(l, dict(size=16, color=RGBColor(0xC5, 0xD5, 0xEA)))] for l in s.get("lines", [])]
    if lines:
        _text(sl, Inches(0.92), Inches(4.3), Inches(11.5), Inches(2.2), lines, space_after=5)


LAYOUTS = {
    "title": slide_title, "section": slide_section, "bullets": slide_bullets,
    "two_col": slide_two_col, "table": slide_table, "takeaway": slide_takeaway,
    "quote": slide_quote, "closing": slide_closing,
}


def build(deck, out):
    prs = Presentation()
    prs.slide_width = EMU_W
    prs.slide_height = EMU_H
    course = deck.get("course", "")
    sec_num = 0
    for i, s in enumerate(deck["slides"], start=1):
        lay = s.get("layout", "bullets")
        fn = LAYOUTS.get(lay, slide_bullets)
        if lay == "section":
            sec_num += 1
            sl_before = len(prs.slides._sldIdLst)
            fn(prs, s, course, str(sec_num).zfill(2))
        elif lay in ("title",):
            fn(prs, s, course)
        else:
            fn(prs, s, course, i)
        # 발표자 노트
        notes = s.get("notes")
        if notes:
            slide = prs.slides[-1]
            slide.notes_slide.notes_text_frame.text = notes
    # 문서 속성(사람 작성처럼)
    cp = prs.core_properties
    cp.author = deck.get("author", "특장차인증센터 교육운영팀")
    cp.last_modified_by = deck.get("author", "특장차인증센터 교육운영팀")
    cp.title = deck.get("title", course)
    cp.subject = deck.get("subject", "AI 활용 실무 특강")
    cp.category = "교육자료"
    cp.comments = ""
    prs.save(out)
    print(f"OK {out} ({len(deck['slides'])} slides)")


if __name__ == "__main__":
    with open(sys.argv[1], encoding="utf-8") as f:
        deck = json.load(f)
    build(deck, sys.argv[2])
