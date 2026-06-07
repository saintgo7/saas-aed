import kr.dogfoot.hwpxlib.object.HWPXFile;
import kr.dogfoot.hwpxlib.object.content.section_xml.SectionXMLFile;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Para;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.Run;
import kr.dogfoot.hwpxlib.object.content.section_xml.paragraph.T;
import kr.dogfoot.hwpxlib.tool.blankfilemaker.BlankFileMaker;
import kr.dogfoot.hwpxlib.writer.HWPXWriter;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

public class Md2Hwpx {
    public static void main(String[] args) throws Exception {
        String in = args[0];
        String out = args[1];
        List<String> raw = Files.readAllLines(Paths.get(in), StandardCharsets.UTF_8);
        List<String> lines = clean(raw);

        HWPXFile hwpx = BlankFileMaker.make();
        SectionXMLFile sec = hwpx.sectionXMLFileList().get(0);

        Para first = sec.getPara(0);
        String paraPr = first.paraPrIDRef() != null ? first.paraPrIDRef() : "0";
        String charPr = "0";
        if (first.countOfRun() > 0 && first.getRun(0).charPrIDRef() != null)
            charPr = first.getRun(0).charPrIDRef();

        boolean usedFirst = false;
        for (String line : lines) {
            if (!usedFirst) {
                Run r = first.addNewRun();
                r.charPrIDRef(charPr);
                T t = r.addNewT();
                if (!line.isEmpty()) t.addText(line);
                usedFirst = true;
            } else {
                Para p = sec.addNewPara();
                p.paraPrIDRef(paraPr);
                p.styleIDRef("0");
                Run r = p.addNewRun();
                r.charPrIDRef(charPr);
                T t = r.addNewT();
                if (!line.isEmpty()) t.addText(line);
            }
        }
        HWPXWriter.toFilepath(hwpx, out);
        System.out.println("OK " + out + " (" + lines.size() + " paras)");
    }

    // Light markdown -> readable plain text. One output line == one paragraph.
    static List<String> clean(List<String> raw) {
        List<String> outl = new ArrayList<>();
        boolean inFence = false;
        boolean prevBlank = false;
        Pattern link = Pattern.compile("\\[([^\\]]+)\\]\\(([^)]+)\\)");
        for (String s0 : raw) {
            String s = s0.replace("\t", "    ");
            String trimmed = s.trim();

            if (trimmed.startsWith("```")) { inFence = !inFence; continue; }
            if (inFence) {
                if (trimmed.isEmpty()) continue;
                outl.add("    " + s0.stripTrailing()); // keep code indented verbatim
                prevBlank = false;
                continue;
            }
            // table separator row |---|:--:|
            if (trimmed.matches("\\|?\\s*:?-{2,}.*") && trimmed.contains("-") && trimmed.replaceAll("[\\|\\-:\\s]", "").isEmpty()) {
                continue;
            }
            // horizontal rule
            if (trimmed.matches("(-{3,}|\\*{3,}|_{3,})")) { outl.add("──────────"); prevBlank=false; continue; }

            String t = s;
            // headings
            Matcher h = Pattern.compile("^\\s*(#{1,6})\\s+(.*)$").matcher(t);
            if (h.matches()) {
                int lvl = h.group(1).length();
                String txt = h.group(2).trim();
                txt = inline(txt, link);
                String prefix = lvl <= 1 ? "■ " : lvl == 2 ? "● " : "▷ ";
                if (!outl.isEmpty() && !prevBlank) outl.add("");
                outl.add(prefix + txt);
                prevBlank = false;
                continue;
            }
            // blockquote
            t = t.replaceAll("^\\s*>\\s?", "");
            // table row -> spaced columns
            if (trimmed.startsWith("|")) {
                String body = trimmed.replaceAll("^\\|", "").replaceAll("\\|$", "");
                String[] cells = body.split("\\|");
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < cells.length; i++) {
                    if (i > 0) sb.append("    ");
                    sb.append(inline(cells[i].trim(), link));
                }
                outl.add(sb.toString());
                prevBlank = false;
                continue;
            }
            // list bullets
            t = t.replaceAll("^(\\s*)[-*+]\\s+", "$1• ");
            t = t.replaceAll("^(\\s*)(\\d+)\\.\\s+", "$1$2) ");

            t = inline(t, link);
            String tt = t.stripTrailing();
            if (tt.trim().isEmpty()) {
                if (prevBlank) continue;       // collapse blanks
                outl.add("");
                prevBlank = true;
            } else {
                outl.add(tt);
                prevBlank = false;
            }
        }
        if (outl.isEmpty()) outl.add("");
        return outl;
    }

    static String inline(String t, Pattern link) {
        t = link.matcher(t).replaceAll("$1 ($2)");
        t = t.replace("**", "").replace("__", "");
        t = t.replaceAll("`([^`]*)`", "$1");
        t = t.replaceAll("(?<!\\*)\\*(?!\\*)([^*]+)\\*", "$1");
        return t;
    }
}
