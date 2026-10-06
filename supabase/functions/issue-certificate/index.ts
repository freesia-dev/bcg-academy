// @ts-nocheck
// Terbitkan sertifikat PDF (A4 landscape) dengan QR verifikasi.
// Mode:
//   1. { preview: true, course_id }            → admin: PDF contoh (tidak disimpan)
//   2. { enrollment_ids: [...], reissue? }     → admin: terbitkan massal untuk peserta yang sudah ditandai lulus
//   3. { course_id }                           → peserta program online: klaim setelah semua materi & kuis selesai
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = (Deno.env.get("SITE_URL") || "https://bcg-academy.site").replace(/\/$/, "");
const MAX_BULK = 60;

if (!Deno.env.get("CERT_TEST")) Deno.serve(handler);

async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Silakan masuk terlebih dahulu" }, 401);
    const user = userData.user;

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "superadmin");

    const body = await req.json().catch(() => ({}));
    const templates = new Map<string, any>();
    const templateFor = async (courseId: string) => {
      if (!templates.has(courseId)) {
        const { data } = await admin.from("certificate_templates").select("*").eq("course_id", courseId).maybeSingle();
        templates.set(courseId, { ...defaultTemplate(), ...(data || {}) });
      }
      return templates.get(courseId);
    };
    const imageCache = new Map<string, Uint8Array | null>();

    // ---------------------------------------------------------------- 1) preview
    if (body?.preview) {
      if (!isAdmin) return json({ error: "Khusus admin" }, 403);
      if (!body.course_id) return json({ error: "course_id wajib diisi" }, 400);
      const { data: course } = await admin.from("courses").select("id,title").eq("id", body.course_id).maybeSingle();
      if (!course) return json({ error: "Program tidak ditemukan" }, 404);
      const tpl = await templateFor(course.id);
      const pdf = await buildCertificatePdf({
        name: body.preview_name || "Nama Peserta Contoh",
        course: course.title,
        batchLine: "Angkatan 1, 20 Oktober – 14 November 2026",
        certNumber: `${tpl.cert_prefix}/${new Date().getFullYear()}/CONTOH01`,
        issueDate: new Date(),
        verifyUrl: `${SITE_URL}/verifikasi/CONTOH01`,
        tpl,
        images: await loadImages(tpl, imageCache),
      });
      return new Response(pdf, { headers: { ...corsHeaders, "Content-Type": "application/pdf" } });
    }

    // ---------------------------------------------------------------- 2) admin massal
    if (Array.isArray(body?.enrollment_ids)) {
      if (!isAdmin) return json({ error: "Khusus admin" }, 403);
      const ids = body.enrollment_ids.filter((x: unknown) => typeof x === "string").slice(0, MAX_BULK);
      if (!ids.length) return json({ error: "Pilih peserta terlebih dahulu" }, 400);
      const results = [];
      for (const id of ids) {
        try {
          const enr = await loadEnrollment(admin, id);
          if (!enr) { results.push({ enrollment_id: id, ok: false, error: "Pendaftaran tidak ditemukan" }); continue; }
          if (enr.status !== "completed") { results.push({ enrollment_id: id, ok: false, error: "Belum ditandai lulus" }); continue; }
          if (enr.certificate_url && !body.reissue) {
            results.push({ enrollment_id: id, ok: true, skipped: true, number: enr.certificate_number });
            continue;
          }
          const issued = await issue(admin, enr, await templateFor(enr.course_id), imageCache);
          results.push({ enrollment_id: id, ok: true, number: issued.number, path: issued.path });
        } catch (e) {
          results.push({ enrollment_id: id, ok: false, error: (e as Error).message });
        }
      }
      return json({ results, issued: results.filter((r) => r.ok && !r.skipped).length });
    }

    // ---------------------------------------------------------------- 3) klaim peserta (online)
    const courseId = body?.course_id as string | undefined;
    if (!courseId) return json({ error: "course_id wajib diisi" }, 400);
    const { data: own } = await admin
      .from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId)
      .in("status", ["active", "completed"]).maybeSingle();
    if (!own) return json({ error: "Anda belum terdaftar aktif di program ini." }, 403);
    const enr = await loadEnrollment(admin, own.id);

    if (enr.certificate_url) {
      const { data: signed } = await admin.storage.from("certificates").createSignedUrl(enr.certificate_url, 60 * 60 * 24 * 7);
      return json({ url: signed?.signedUrl, path: enr.certificate_url, number: enr.certificate_number, already_issued: true });
    }
    if (enr.course?.type !== "online") {
      return json({ error: "Sertifikat program tatap muka diterbitkan admin setelah Anda dinyatakan lulus." }, 400);
    }

    const { data: modules } = await admin.from("modules").select("id").eq("course_id", courseId);
    const modIds = (modules || []).map((m: any) => m.id);
    let lessonIds: string[] = [], quizIds: string[] = [];
    if (modIds.length) {
      const [{ data: lessons }, { data: quizzes }] = await Promise.all([
        admin.from("lessons").select("id").in("module_id", modIds),
        admin.from("quizzes").select("id").in("module_id", modIds),
      ]);
      lessonIds = (lessons || []).map((l: any) => l.id);
      quizIds = (quizzes || []).map((q: any) => q.id);
    }
    if (!lessonIds.length && !quizIds.length) return json({ error: "Program ini belum memiliki materi." }, 400);
    if (lessonIds.length) {
      const { data: prog } = await admin.from("lesson_progress").select("lesson_id").eq("user_id", user.id).in("lesson_id", lessonIds);
      if (new Set((prog || []).map((p: any) => p.lesson_id)).size < lessonIds.length) {
        return json({ error: "Selesaikan semua pelajaran terlebih dahulu." }, 400);
      }
    }
    if (quizIds.length) {
      const { data: atts } = await admin.from("quiz_attempts").select("quiz_id, passed").eq("user_id", user.id).in("quiz_id", quizIds);
      if (new Set((atts || []).filter((a: any) => a.passed).map((a: any) => a.quiz_id)).size < quizIds.length) {
        return json({ error: "Lulus semua kuis terlebih dahulu." }, 400);
      }
    }

    await admin.from("enrollments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", enr.id);
    const issued = await issue(admin, { ...enr, status: "completed" }, await templateFor(courseId), imageCache);
    const { data: signed } = await admin.storage.from("certificates").createSignedUrl(issued.path, 60 * 60 * 24 * 7);
    return json({ url: signed?.signedUrl, path: issued.path, number: issued.number });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
}

// ==================================================================== helpers

async function loadEnrollment(admin: any, id: string) {
  const { data } = await admin
    .from("enrollments")
    .select("id,user_id,course_id,status,certificate_url,certificate_number,certificate_issued_at,completed_at," +
      "course:courses(id,title,type), batch:batches(name,start_date,end_date)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle();
  let name = profile?.full_name?.trim();
  if (!name) {
    const { data: u } = await admin.auth.admin.getUserById(data.user_id);
    name = u?.user?.user_metadata?.full_name || u?.user?.email?.split("@")[0] || "Peserta";
  }
  return { ...data, participant: name };
}

async function issue(admin: any, enr: any, tpl: any, imageCache: Map<string, Uint8Array | null>) {
  const code = enr.id.slice(0, 8).toUpperCase();
  const issueDate = enr.certificate_issued_at ? new Date(enr.certificate_issued_at) : new Date();
  const number = enr.certificate_number || `${tpl.cert_prefix}/${issueDate.getFullYear()}/${code}`;
  const batchLine = enr.batch?.name
    ? `${enr.batch.name}${enr.batch.start_date ? `, ${formatRange(enr.batch.start_date, enr.batch.end_date)}` : ""}`
    : "";
  const pdf = await buildCertificatePdf({
    name: enr.participant,
    course: enr.course?.title || "Pelatihan",
    batchLine,
    certNumber: number,
    issueDate,
    verifyUrl: `${SITE_URL}/verifikasi/${code}`,
    tpl,
    images: await loadImages(tpl, imageCache),
  });
  const path = `${enr.user_id}/${enr.id}.pdf`;
  const { error: upErr } = await admin.storage.from("certificates").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);
  const { error } = await admin.from("enrollments").update({
    certificate_url: path,
    certificate_number: number,
    certificate_issued_at: issueDate.toISOString(),
  }).eq("id", enr.id);
  if (error) throw new Error(error.message);
  return { path, number };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function defaultTemplate() {
  return {
    heading: "SERTIFIKAT",
    subheading: "Diberikan kepada",
    body_text: 'atas keberhasilan menyelesaikan pelatihan "{course}" yang diselenggarakan oleh LPK Borneo Citra Gemilang.',
    organization_name: "LPK BORNEO CITRA GEMILANG",
    organization_location: "Bontang, Kalimantan Timur",
    signer_name: "Direktur LPK BCG",
    signer_title: "Direktur",
    cert_prefix: "LPK-BCG",
    date_format: "long",
    accent_color: "#C79E2E",
    bg_color: "#FCFBF5",
    text_color: "#0B2447",
    footer_note: null,
    logo_url: null,
    signature_url: null,
    show_qr: true,
  };
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatDate(d: Date, fmt = "long") {
  const dd = d.getDate(), mm = d.getMonth(), yy = d.getFullYear();
  if (fmt === "short") return `${String(dd).padStart(2, "0")}/${String(mm + 1).padStart(2, "0")}/${yy}`;
  if (fmt === "iso") return d.toISOString().slice(0, 10);
  return `${dd} ${MONTHS[mm]} ${yy}`;
}

function formatRange(start: string, end?: string | null) {
  const p = (s: string) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
  const a = p(start);
  if (!end || end === start) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
  const b = p(end);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

function hexToRgb(hex: string) {
  const h = (hex || "").replace("#", "").trim();
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return rgb(...(n.map((x) => (isNaN(x) ? 0 : x)) as [number, number, number]));
}

async function loadImages(tpl: any, cache: Map<string, Uint8Array | null>) {
  const get = async (url?: string | null) => {
    if (!url) return null;
    if (cache.has(url)) return cache.get(url)!;
    let bytes: Uint8Array | null = null;
    try {
      const res = await fetch(url);
      if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
    } catch (_) { bytes = null; }
    cache.set(url, bytes);
    return bytes;
  };
  return { logo: await get(tpl.logo_url), signature: await get(tpl.signature_url) };
}

export async function buildCertificatePdf(opts: {
  name: string; course: string; batchLine?: string; certNumber: string; issueDate: Date; verifyUrl: string;
  tpl: any; images?: { logo: Uint8Array | null; signature: Uint8Array | null };
}) {
  const { tpl } = opts;
  const doc = await PDFDocument.create();
  doc.setTitle(`Sertifikat - ${opts.name}`);
  doc.setAuthor(tpl.organization_name || "LPK Borneo Citra Gemilang");
  const page = doc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvObl = await doc.embedFont(StandardFonts.HelveticaOblique);
  const times = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesIt = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const accent = hexToRgb(tpl.accent_color);
  const bg = hexToRgb(tpl.bg_color);
  const ink = hexToRgb(tpl.text_color);
  const muted = rgb(0.38, 0.4, 0.46);
  const white = rgb(1, 1, 1);

  // Font standar hanya WinAnsi: buang karakter yang tidak bisa dicetak agar tidak error.
  const clean = (font: any, t: string) => {
    let out = "";
    for (const ch of (t || "").normalize("NFC")) {
      try { font.encodeText(ch); out += ch; } catch (_) {
        const base = ch.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
        try { font.encodeText(base); out += base; } catch (_) { /* lewati */ }
      }
    }
    return out;
  };
  const textW = (font: any, t: string, size: number) => font.widthOfTextAtSize(t, size);
  const center = (t: string, baseline: number, size: number, font = helv, color = ink, cx = width / 2) => {
    const s = clean(font, t);
    if (!s) return;
    page.drawText(s, { x: cx - textW(font, s, size) / 2, y: baseline, size, font, color });
  };

  // Latar & bingkai
  page.drawRectangle({ x: 0, y: 0, width, height, color: bg });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: accent, borderWidth: 2.5 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: ink, borderWidth: 0.6 });
  // ornamen sudut
  const corner = (x: number, y: number, dx: number, dy: number) => {
    page.drawRectangle({ x: dx > 0 ? x : x - 46, y: dy > 0 ? y : y - 5, width: 46, height: 5, color: accent });
    page.drawRectangle({ x: dx > 0 ? x : x - 5, y: dy > 0 ? y : y - 46, width: 5, height: 46, color: accent });
  };
  corner(28, 28, 1, 1); corner(width - 28, 28, -1, 1); corner(28, height - 28, 1, -1); corner(width - 28, height - 28, -1, -1);

  // Kepala
  let y = height - 52;
  if (opts.images?.logo) {
    const img = await embedImage(doc, opts.images.logo);
    if (img) {
      const h = 50, w = Math.min((img.width / img.height) * h, 220);
      const hh = (img.height / img.width) * w;
      page.drawImage(img, { x: (width - w) / 2, y: y - hh, width: w, height: hh });
      y -= hh + 14;
    }
  }
  center(tpl.organization_name, y - 12, 12.5, helvBold, accent); y -= 12 + 6;
  center(tpl.organization_location, y - 10, 9.5, helvObl, muted); y -= 10 + 26;

  center(tpl.heading, y - 34, 40, times, ink); y -= 40 + 2;
  page.drawRectangle({ x: width / 2 - 70, y: y - 4, width: 140, height: 2, color: accent });
  y -= 4 + 26;

  center(tpl.subheading, y - 13, 13, helvObl, muted); y -= 13 + 16;

  // Nama (mengecil bila panjang)
  const nameText = clean(timesIt, opts.name);
  let nameSize = 32;
  while (nameSize > 18 && textW(timesIt, nameText, nameSize) > width - 220) nameSize -= 1;
  center(nameText, y - nameSize + 4, nameSize, timesIt, ink); y -= nameSize + 6;
  const lineW = Math.min(Math.max(textW(timesIt, nameText, nameSize) + 60, 260), width - 200);
  page.drawRectangle({ x: (width - lineW) / 2, y: y - 2, width: lineW, height: 0.8, color: muted });
  y -= 2 + 22;

  const body = (tpl.body_text || "").replace(/\{course\}/g, opts.course).replace(/\{name\}/g, opts.name)
    .replace(/\{batch\}/g, opts.batchLine || "");
  for (const line of wrap(clean(helv, body), helv, 12.5, width - 230).slice(0, 3)) {
    center(line, y - 12.5, 12.5, helv, muted); y -= 18;
  }
  if (opts.batchLine && !(tpl.body_text || "").includes("{batch}")) {
    center(opts.batchLine, y - 11, 11, helvBold, ink); y -= 18;
  }

  // Kaki kiri: QR + nomor
  const footBase = 60;
  if (tpl.show_qr !== false) {
    const size = 78;
    drawQr(page, opts.verifyUrl, 62, footBase - 10, size, ink, white);
    const tx = 62 + size + 14;
    page.drawText("No. Sertifikat", { x: tx, y: footBase + 48, size: 8, font: helv, color: muted });
    page.drawText(clean(helvBold, opts.certNumber), { x: tx, y: footBase + 35, size: 10.5, font: helvBold, color: ink });
    page.drawText("Pindai QR atau buka", { x: tx, y: footBase + 16, size: 8, font: helv, color: muted });
    page.drawText(clean(helv, opts.verifyUrl.replace(/^https?:\/\//, "")), { x: tx, y: footBase + 4, size: 8.5, font: helv, color: accent });
    page.drawText("untuk memeriksa keaslian", { x: tx, y: footBase - 8, size: 8, font: helv, color: muted });
  } else {
    page.drawText(clean(helv, `No. Sertifikat: ${opts.certNumber}`), { x: 70, y: footBase + 20, size: 10, font: helv, color: muted });
  }

  // Kaki kanan: tanggal, tanda tangan
  const sigCx = width - 175;
  const city = (tpl.organization_location || "").split(",")[0].trim();
  center(`${city ? city + ", " : ""}${formatDate(opts.issueDate, tpl.date_format)}`, footBase + 82, 10, helv, ink, sigCx);
  if (opts.images?.signature) {
    const img = await embedImage(doc, opts.images.signature);
    if (img) {
      const maxW = 140, maxH = 52;
      const s = Math.min(maxW / img.width, maxH / img.height);
      page.drawImage(img, { x: sigCx - (img.width * s) / 2, y: footBase + 22, width: img.width * s, height: img.height * s });
    }
  }
  page.drawLine({ start: { x: sigCx - 85, y: footBase + 18 }, end: { x: sigCx + 85, y: footBase + 18 }, color: ink, thickness: 0.7 });
  center(tpl.signer_name, footBase + 4, 11, helvBold, ink, sigCx);
  center(tpl.signer_title, footBase - 9, 9, helv, muted, sigCx);

  if (tpl.footer_note) center(tpl.footer_note, 36, 8.5, helvObl, muted);

  return await doc.save();
}

async function embedImage(doc: any, bytes: Uint8Array) {
  try {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes);
  } catch (_) { /* format tidak didukung */ }
  return null;
}

function drawQr(page: any, text: string, x: number, y: number, size: number, dark: any, light: any) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  page.drawRectangle({ x, y, width: size, height: size, color: light });
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({
          x: x + (c + quiet) * cell,
          y: y + size - (r + quiet + 1) * cell,
          width: cell + 0.05,
          height: cell + 0.05,
          color: dark,
        });
      }
    }
  }
}

function wrap(text: string, font: any, size: number, maxWidth: number) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
