import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  course_id: z.string().uuid(),
  course_title: z.string().min(1).max(255),
  amount: z.number().nonnegative(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set, skipping email");
      return new Response(JSON.stringify({ ok: true, sent: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { course_title, amount } = parsed.data;
    const userEmail = userRes.user.email || "tanpa-email";
    const fullName = (userRes.user.user_metadata?.full_name as string) || "Peserta";
    const phone = (userRes.user.user_metadata?.phone as string) || "-";

    const html = `
      <h2>Pembayaran Kursus Baru</h2>
      <p>Ada pembayaran kursus yang perlu diverifikasi:</p>
      <ul>
        <li><strong>Kursus:</strong> ${course_title}</li>
        <li><strong>Nominal:</strong> Rp ${amount.toLocaleString("id-ID")}</li>
        <li><strong>Peserta:</strong> ${fullName} (${userEmail})</li>
        <li><strong>WhatsApp:</strong> ${phone}</li>
      </ul>
      <p>Silakan login ke dashboard admin untuk verifikasi.</p>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "BCG Academy <onboarding@resend.dev>",
        to: ["lpk.borneocg@gmail.com"],
        subject: `[Pembayaran] ${course_title} - ${fullName}`,
        html,
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Resend error:", err);
      return new Response(JSON.stringify({ ok: true, sent: false, error: err }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
