// Lightweight CSV parser supporting quoted fields and embedded commas/newlines.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        cur.push(field); rows.push(cur); cur = []; field = "";
      } else field += ch;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function toRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

import { supabase } from "@/integrations/supabase/client";

export type ImportResult = { courses: number; modules: number; lessons: number; quizzes: number; questions: number; errors: string[] };

/**
 * Structure CSV columns:
 *  course_slug, course_title, module_title, module_sort, lesson_title, lesson_type, lesson_content, lesson_sort, lesson_duration
 *  - lesson_type: video|text|file|embed
 *  - lesson_content: URL for video/file, markdown for text, HTML for embed
 */
export async function importStructureCSV(text: string): Promise<ImportResult> {
  const records = toRecords(parseCSV(text));
  const res: ImportResult = { courses: 0, modules: 0, lessons: 0, quizzes: 0, questions: 0, errors: [] };

  const courseCache = new Map<string, string>();
  const moduleCache = new Map<string, string>();

  for (const [idx, row] of records.entries()) {
    try {
      const courseSlug = slugify(row.course_slug || row.course_title || "");
      if (!courseSlug) { res.errors.push(`Baris ${idx + 2}: course_slug/course_title kosong`); continue; }

      let courseId = courseCache.get(courseSlug);
      if (!courseId) {
        const { data: existing } = await supabase.from("courses").select("id").eq("slug", courseSlug).maybeSingle();
        if (existing) courseId = existing.id;
        else {
          const { data: inserted, error } = await supabase.from("courses").insert({
            slug: courseSlug, title: row.course_title || courseSlug, is_free: true, price: 0, type: "online", is_published: false,
          }).select("id").single();
          if (error) { res.errors.push(`Baris ${idx + 2}: ${error.message}`); continue; }
          courseId = inserted.id; res.courses++;
        }
        courseCache.set(courseSlug, courseId!);
      }

      if (!row.module_title) continue;
      const modKey = `${courseId}::${row.module_title}`;
      let moduleId = moduleCache.get(modKey);
      if (!moduleId) {
        const { data: exMod } = await supabase.from("modules").select("id").eq("course_id", courseId).eq("title", row.module_title).maybeSingle();
        if (exMod) moduleId = exMod.id;
        else {
          const { data: ins, error } = await supabase.from("modules").insert({
            course_id: courseId, title: row.module_title, sort_order: parseInt(row.module_sort || "0") || 0,
          }).select("id").single();
          if (error) { res.errors.push(`Baris ${idx + 2}: ${error.message}`); continue; }
          moduleId = ins.id; res.modules++;
        }
        moduleCache.set(modKey, moduleId!);
      }

      if (!row.lesson_title) continue;
      const type = (row.lesson_type || "text").toLowerCase();
      const payload: any = {
        module_id: moduleId, title: row.lesson_title, content_type: type,
        sort_order: parseInt(row.lesson_sort || "0") || 0,
        duration_min: row.lesson_duration ? parseInt(row.lesson_duration) || null : null,
      };
      if (type === "video") payload.video_url = row.lesson_content;
      else if (type === "file") payload.file_url = row.lesson_content;
      else if (type === "embed") payload.embed_html = row.lesson_content;
      else payload.content_md = row.lesson_content;

      const { error: lErr } = await supabase.from("lessons").insert(payload);
      if (lErr) { res.errors.push(`Baris ${idx + 2} (pelajaran): ${lErr.message}`); continue; }
      res.lessons++;
    } catch (e: any) {
      res.errors.push(`Baris ${idx + 2}: ${e?.message || e}`);
    }
  }
  return res;
}

/**
 * Quiz CSV columns:
 *  course_slug, module_title, quiz_title, passing_score, question, option1, option2, option3, option4, option5, option6, correct_index
 *  Rows with the same quiz_title under same module are grouped into one quiz.
 */
export async function importQuizzesCSV(text: string): Promise<ImportResult> {
  const records = toRecords(parseCSV(text));
  const res: ImportResult = { courses: 0, modules: 0, lessons: 0, quizzes: 0, questions: 0, errors: [] };

  // group
  const groups = new Map<string, { course_slug: string; module_title: string; quiz_title: string; passing_score: number; questions: any[] }>();
  for (const r of records) {
    const key = `${r.course_slug}::${r.module_title}::${r.quiz_title}`;
    if (!groups.has(key)) groups.set(key, {
      course_slug: slugify(r.course_slug), module_title: r.module_title, quiz_title: r.quiz_title,
      passing_score: parseInt(r.passing_score || "70") || 70, questions: [],
    });
    const opts = ["option1", "option2", "option3", "option4", "option5", "option6"]
      .map((k) => r[k]).filter((v) => v && v.trim());
    if (r.question && opts.length >= 2) {
      groups.get(key)!.questions.push({
        question: r.question, options: opts, correct: parseInt(r.correct_index || "0") || 0,
      });
    }
  }

  for (const g of groups.values()) {
    const { data: course } = await supabase.from("courses").select("id").eq("slug", g.course_slug).maybeSingle();
    if (!course) { res.errors.push(`Kursus ${g.course_slug} tidak ditemukan`); continue; }
    const { data: mod } = await supabase.from("modules").select("id").eq("course_id", course.id).eq("title", g.module_title).maybeSingle();
    if (!mod) { res.errors.push(`Modul "${g.module_title}" tidak ditemukan`); continue; }
    const { error } = await supabase.from("quizzes").insert({
      module_id: mod.id, title: g.quiz_title, passing_score: g.passing_score, questions: g.questions,
    });
    if (error) { res.errors.push(`Kuis ${g.quiz_title}: ${error.message}`); continue; }
    res.quizzes++; res.questions += g.questions.length;
  }
  return res;
}
