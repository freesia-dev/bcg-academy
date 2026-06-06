// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const course_id = body?.course_id as string | undefined;
    const preview = !!body?.preview;
    if (!course_id) return json({ error: "course_id required" }, 400);

    const { data: course } = await admin
      .from("courses").select("id, title").eq("id", course_id).maybeSingle();
    if (!course) return json({ error: "Kursus tidak ditemukan" }, 404);

    const { data: template } = await admin
      .from("certificate_templates").select("*").eq("course_id", course_id).maybeSingle();
    const tpl = template || defaultTemplate();

    // PREVIEW: any admin can request a preview PDF without enrollment
    if (preview) {
      const { data: roles } = await admin
        .from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const pdfBytes = await buildPdf({
        name: body?.preview_name || "Nama Peserta Contoh",
        course: course.title,
        certNumber: `${tpl.cert_prefix}/${new Date().getFullYear()}/PREVIEW`,
        issueDate: formatDate(new Date(), tpl.date_format),
        tpl,
      });
      return new Response(pdfBytes, {
        headers: { ...corsHeaders, "Content-Type": "application/pdf" },
      });
    }

    // ENROLLMENT
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id, status, certificate_url")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .in("status", ["active", "completed"])
      .maybeSingle();
    if (!enrollment) return json({ error: "Tidak terdaftar di kursus ini." }, 403);

    if (enrollment.certificate_url) {
      const { data: signed } = await admin.storage
        .from("certificates")
        .createSignedUrl(enrollment.certificate_url, 60 * 60 * 24 * 7);
      return json({ url: signed?.signedUrl, path: enrollment.certificate_url, already_issued: true });
    }

    const { data: profile } = await admin
      .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const participantName = profile?.full_name || user.email || "Peserta";

    // Verify completion
    const { data: modules } = await admin.from("modules").select("id").eq("course_id", course_id);
    const modIds = (modules || []).map((m) => m.id);
    let lessonIds: string[] = [], quizIds: string[] = [];
    if (modIds.length) {
      const [{ data: lessons }, { data: quizzes }] = await Promise.all([
        admin.from("lessons").select("id").in("module_id", modIds),
        admin.from("quizzes").select("id").in("module_id", modIds),
      ]);
      lessonIds = (lessons || []).map((l) => l.id);
      quizIds = (quizzes || []).map((q) => q.id);
    }
    if (lessonIds.length === 0 && quizIds.length === 0) return json({ error: "Kursus belum memiliki materi." }, 400);

    if (lessonIds.length) {
      const { data: prog } = await admin
        .from("lesson_progress").select("lesson_id")
        .eq("user_id", user.id).in("lesson_id", lessonIds);
      if (new Set((prog || []).map((p) => p.lesson_id)).size < lessonIds.length)
        return json({ error: "Selesaikan semua pelajaran terlebih dahulu." }, 400);
    }
    if (quizIds.length) {
      const { data: atts } = await admin
        .from("quiz_attempts").select("quiz_id, passed")
        .eq("user_id", user.id).in("quiz_id", quizIds);
      const passed = new Set((atts || []).filter((a) => a.passed).map((a) => a.quiz_id));
      if (passed.size < quizIds.length) return json({ error: "Lulus semua kuis terlebih dahulu." }, 400);
    }

    const certNumber = `${tpl.cert_prefix}/${new Date().getFullYear()}/${enrollment.id.slice(0, 8).toUpperCase()}`;
    const issueDate = formatDate(new Date(), tpl.date_format);
    const pdfBytes = await buildPdf({ name: participantName, course: course.title, certNumber, issueDate, tpl });

    const path = `${user.id}/${enrollment.id}.pdf`;
    const { error: upErr } = await admin.storage
      .from("certificates").upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ error: upErr.message }, 500);

    await admin.from("enrollments").update({
      certificate_url: path,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", enrollment.id);

    const { data: signed } = await admin.storage
      .from("certificates").createSignedUrl(path, 60 * 60 * 24 * 7);

    // Best-effort email notification
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY && user.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "BCG Academy <onboarding@resend.dev>",
            to: [user.email],
            subject: `🎓 Sertifikat Anda telah terbit - ${course.title}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#C79E2E">Selamat, ${participantName}! 🎉</h2>
              <p>Anda telah menyelesaikan kursus <strong>${course.title}</strong>.</p>
              <p>Nomor sertifikat: <strong>${certNumber}</strong></p>
              ${signed?.signedUrl ? `<p style="text-align:center;margin:24px 0"><a href="${signed.signedUrl}" style="background:#C79E2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Unduh Sertifikat</a></p>` : ""}
              <p style="font-size:13px;color:#666">Link unduhan berlaku 7 hari. Anda juga dapat mengunduh ulang kapan saja dari "Kursus Saya".</p>
            </div>`,
          }),
        });
      }
    } catch (e) { console.warn("cert email failed", e); }

    return json({ url: signed?.signedUrl, path, cert_number: certNumber });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function defaultTemplate() {
  return {
    heading: "SERTIFIKAT KELULUSAN",
    subheading: "Diberikan kepada",
    body_text: 'atas keberhasilan menyelesaikan kursus "{course}" dengan memenuhi seluruh modul, pelajaran, dan uji kompetensi yang dipersyaratkan.',
    organization_name: "LPK BORNEO CITRA GEMILANG",
    organization_location: "Bontang, Kalimantan Timur",
    signer_name: "Direktur LPK BCG",
    signer_title: "Direktur",
    cert_prefix: "LPK-BCG",
    date_format: "long",
    accent_color: "#C79E2E",
    bg_color: "#FCFBED",
    text_color: "#0F0F1A",
    footer_note: null,
  };
}

function formatDate(d: Date, fmt: string) {
  if (fmt === "short") return d.toLocaleDateString("id-ID");
  if (fmt === "iso") return d.toISOString().slice(0, 10);
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
}

function hexToRgb(hex: string) {
  const h = (hex || "").replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

async function buildPdf(opts: { name: string; course: string; certNumber: string; issueDate: string; tpl: any }) {
  const { name, course, certNumber, issueDate, tpl } = opts;
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvObl = await doc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const accent = hexToRgb(tpl.accent_color);
  const bg = hexToRgb(tpl.bg_color);
  const text = hexToRgb(tpl.text_color);
  const muted = rgb(0.4, 0.4, 0.45);

  page.drawRectangle({ x: 0, y: 0, width, height, color: bg });
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: accent, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: text, borderWidth: 0.8 });

  const center = (t: string, y: number, size: number, font = helv, color = text) => {
    if (!t) return;
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (width - w) / 2, y, size, font, color });
  };

  center(tpl.organization_name, height - 90, 14, helvBold, accent);
  center(tpl.organization_location, height - 108, 10, helvObl, muted);

  center(tpl.heading, height - 165, 36, timesBold, text);
  const underlineW = 260;
  page.drawRectangle({ x: (width - underlineW) / 2, y: height - 178, width: underlineW, height: 2, color: accent });

  center(tpl.subheading, height - 230, 13, helvObl, muted);
  center(name.toUpperCase(), height - 275, 28, helvBold, text);

  // Body text with placeholders
  const body = (tpl.body_text || "").replace(/\{course\}/g, course).replace(/\{name\}/g, name);
  const bodyLines = wrap(body, helv, 14, width - 180);
  let y = height - 320;
  bodyLines.forEach((line) => {
    center(line, y, 13, helv, muted);
    y -= 18;
  });

  const footerY = 90;
  page.drawText(`No. Sertifikat: ${certNumber}`, { x: 80, y: footerY, size: 10, font: helv, color: muted });
  const dateText = `${tpl.organization_location.split(",")[0]}, ${issueDate}`;
  const dateW = helv.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, { x: width - 80 - dateW, y: footerY, size: 10, font: helv, color: muted });

  const sigX = width - 240;
  page.drawLine({ start: { x: sigX, y: footerY - 14 }, end: { x: sigX + 160, y: footerY - 14 }, color: text, thickness: 0.6 });
  page.drawText(tpl.signer_name, { x: sigX + 8, y: footerY - 30, size: 11, font: helvBold, color: text });
  page.drawText(tpl.signer_title, { x: sigX + 8, y: footerY - 44, size: 9, font: helv, color: muted });

  if (tpl.footer_note) {
    center(tpl.footer_note, 50, 9, helvObl, muted);
  }

  return await doc.save();
}

function wrap(text: string, font: any, size: number, maxWidth: number) {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}
