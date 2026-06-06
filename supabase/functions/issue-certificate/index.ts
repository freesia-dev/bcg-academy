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

    const { course_id } = await req.json();
    if (!course_id) return json({ error: "course_id required" }, 400);

    // Enrollment
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id, status, certificate_url")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .in("status", ["active", "completed"])
      .maybeSingle();
    if (!enrollment) return json({ error: "Tidak terdaftar di kursus ini." }, 403);

    // If already issued, return existing signed url
    if (enrollment.certificate_url) {
      const { data: signed } = await admin.storage
        .from("certificates")
        .createSignedUrl(enrollment.certificate_url, 60 * 60 * 24 * 7);
      return json({ url: signed?.signedUrl, path: enrollment.certificate_url, already_issued: true });
    }

    // Course
    const { data: course } = await admin
      .from("courses")
      .select("id, title")
      .eq("id", course_id)
      .maybeSingle();
    if (!course) return json({ error: "Kursus tidak ditemukan" }, 404);

    // Profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const participantName = profile?.full_name || user.email || "Peserta";

    // Verify completion: all lessons completed + all quizzes passed
    const { data: modules } = await admin.from("modules").select("id").eq("course_id", course_id);
    const modIds = (modules || []).map((m) => m.id);

    let lessonIds: string[] = [];
    let quizIds: string[] = [];
    if (modIds.length) {
      const [{ data: lessons }, { data: quizzes }] = await Promise.all([
        admin.from("lessons").select("id").in("module_id", modIds),
        admin.from("quizzes").select("id").in("module_id", modIds),
      ]);
      lessonIds = (lessons || []).map((l) => l.id);
      quizIds = (quizzes || []).map((q) => q.id);
    }

    if (lessonIds.length === 0 && quizIds.length === 0) {
      return json({ error: "Kursus belum memiliki materi." }, 400);
    }

    if (lessonIds.length) {
      const { data: prog } = await admin
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);
      const done = new Set((prog || []).map((p) => p.lesson_id));
      if (done.size < lessonIds.length) {
        return json({ error: "Selesaikan semua pelajaran terlebih dahulu." }, 400);
      }
    }

    if (quizIds.length) {
      const { data: atts } = await admin
        .from("quiz_attempts")
        .select("quiz_id, passed")
        .eq("user_id", user.id)
        .in("quiz_id", quizIds);
      const passedSet = new Set((atts || []).filter((a) => a.passed).map((a) => a.quiz_id));
      if (passedSet.size < quizIds.length) {
        return json({ error: "Lulus semua kuis terlebih dahulu." }, 400);
      }
    }

    // Generate certificate PDF
    const certNumber = `LPK-BCG/${new Date().getFullYear()}/${enrollment.id.slice(0, 8).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
    const pdfBytes = await buildPdf({
      name: participantName,
      course: course.title,
      certNumber,
      issueDate,
    });

    const path = `${user.id}/${enrollment.id}.pdf`;
    const { error: upErr } = await admin.storage
      .from("certificates")
      .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ error: upErr.message }, 500);

    await admin
      .from("enrollments")
      .update({
        certificate_url: path,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);

    const { data: signed } = await admin.storage
      .from("certificates")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return json({ url: signed?.signedUrl, path, cert_number: certNumber });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function buildPdf(opts: { name: string; course: string; certNumber: string; issueDate: string }) {
  const doc = await PDFDocument.create();
  // A4 landscape: 842 x 595
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvObl = await doc.embedFont(StandardFonts.HelveticaOblique);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const gold = rgb(0.78, 0.62, 0.18);
  const dark = rgb(0.06, 0.06, 0.1);
  const muted = rgb(0.3, 0.3, 0.35);

  // Background border
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.99, 0.98, 0.93) });
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: gold, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: width - 64, height: height - 64, borderColor: dark, borderWidth: 0.8 });

  const center = (text: string, y: number, size: number, font = helv, color = dark) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  center("LPK BORNEO CITRA GEMILANG", height - 90, 14, helvBold, gold);
  center("Bontang, Kalimantan Timur", height - 108, 10, helvObl, muted);

  center("SERTIFIKAT KELULUSAN", height - 165, 36, timesBold, dark);
  // gold underline
  const underlineW = 260;
  page.drawRectangle({ x: (width - underlineW) / 2, y: height - 178, width: underlineW, height: 2, color: gold });

  center("Diberikan kepada", height - 230, 13, helvObl, muted);
  center(opts.name.toUpperCase(), height - 275, 28, helvBold, dark);

  center("atas keberhasilan menyelesaikan kursus", height - 320, 13, helv, muted);
  center(`"${opts.course}"`, height - 355, 18, helvBold, gold);

  center(
    "dengan memenuhi seluruh modul, pelajaran, dan uji kompetensi yang dipersyaratkan.",
    height - 385,
    11,
    helv,
    muted,
  );

  // Footer line: cert number left, date right
  const footerY = 90;
  page.drawText(`No. Sertifikat: ${opts.certNumber}`, { x: 80, y: footerY, size: 10, font: helv, color: muted });
  const dateText = `Bontang, ${opts.issueDate}`;
  const dateW = helv.widthOfTextAtSize(dateText, 10);
  page.drawText(dateText, { x: width - 80 - dateW, y: footerY, size: 10, font: helv, color: muted });

  // Signature placeholder
  const sigX = width - 220;
  page.drawLine({ start: { x: sigX, y: footerY - 10 }, end: { x: sigX + 140, y: footerY - 10 }, color: dark, thickness: 0.6 });
  page.drawText("Direktur LPK BCG", { x: sigX + 22, y: footerY - 26, size: 10, font: helvBold, color: dark });

  return await doc.save();
}
