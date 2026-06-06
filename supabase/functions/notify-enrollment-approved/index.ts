import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({ enrollment_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ures } = await userClient.auth.getUser();
    if (!ures.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", ures.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin")) return json({ error: "Forbidden" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const { data: enr } = await admin.from("enrollments")
      .select("id, user_id, course_id, payment_amount, course:courses(title, slug)")
      .eq("id", parsed.data.enrollment_id).maybeSingle();
    if (!enr) return json({ error: "Enrollment not found" }, 404);

    const { data: udata } = await admin.auth.admin.getUserById(enr.user_id);
    const recipient = udata.user?.email;
    if (!recipient) return json({ ok: true, sent: false, reason: "no email" });

    const fullName = (udata.user?.user_metadata?.full_name as string) || recipient;
    const course = (enr as any).course;
    const origin = req.headers.get("origin") || "https://bcg-academy.site";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ ok: true, sent: false });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#ffffff;color:#0F0F1A">
        <h2 style="color:#C79E2E">Pembayaran Disetujui ✓</h2>
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Pembayaran Anda untuk kursus <strong>${course?.title}</strong> telah diverifikasi. Anda sekarang bisa mengakses seluruh materi.</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${origin}/learn/${course?.slug}" style="background:#C79E2E;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold">Mulai Belajar</a>
        </p>
        <p style="font-size:13px;color:#666">Selamat belajar dan semoga sukses!<br>Tim BCG Academy</p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "BCG Academy <onboarding@resend.dev>",
        to: [recipient],
        subject: `Pembayaran disetujui - ${course?.title}`,
        html,
      }),
    });
    if (!r.ok) return json({ ok: true, sent: false, error: await r.text() });
    return json({ ok: true, sent: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
