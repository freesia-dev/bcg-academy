import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  course_id: z.string().uuid(),
});

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
    const user = ures.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
    const CLIENT_KEY = Deno.env.get("MIDTRANS_CLIENT_KEY");
    const IS_PROD = (Deno.env.get("MIDTRANS_IS_PRODUCTION") || "false").toLowerCase() === "true";
    if (!SERVER_KEY || !CLIENT_KEY) return json({ error: "Midtrans belum dikonfigurasi" }, 500);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: course } = await admin.from("courses").select("id, title, price").eq("id", parsed.data.course_id).maybeSingle();
    if (!course) return json({ error: "Kursus tidak ditemukan" }, 404);
    const price = (course as any).price || 0;
    if (price <= 0) return json({ error: "Kursus gratis, tidak perlu pembayaran" }, 400);

    const { data: profile } = await admin.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

    // Ensure enrollment exists (pending_payment)
    let { data: existing } = await admin.from("enrollments")
      .select("id, status").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
    if (!existing) {
      const { data: ins, error: insErr } = await admin.from("enrollments").insert({
        user_id: user.id, course_id: course.id, status: "pending_payment",
        payment_method: "Midtrans", payment_amount: price,
      }).select("id, status").single();
      if (insErr) return json({ error: insErr.message }, 500);
      existing = ins;
    } else if (existing.status === "active" || existing.status === "completed") {
      return json({ error: "Anda sudah terdaftar di kursus ini" }, 400);
    } else {
      await admin.from("enrollments").update({ payment_method: "Midtrans", payment_amount: price }).eq("id", existing.id);
    }

    const orderId = `enr-${existing.id}-${Date.now()}`;
    const baseUrl = IS_PROD ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const snapPayload = {
      transaction_details: { order_id: orderId, gross_amount: price },
      item_details: [{ id: course.id, name: course.title.slice(0, 50), price, quantity: 1 }],
      customer_details: {
        first_name: (profile as any)?.full_name || "Peserta",
        email: user.email,
        phone: (profile as any)?.phone || "",
      },
      callbacks: { finish: `${req.headers.get("origin") || ""}/kursus-saya` },
      custom_field1: existing.id,
    };

    const r = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Basic ${btoa(SERVER_KEY + ":")}`,
      },
      body: JSON.stringify(snapPayload),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Midtrans error", data);
      return json({ error: data?.error_messages || "Gagal membuat transaksi" }, 500);
    }
    return json({
      token: data.token,
      redirect_url: data.redirect_url,
      client_key: CLIENT_KEY,
      is_production: IS_PROD,
      enrollment_id: existing.id,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
