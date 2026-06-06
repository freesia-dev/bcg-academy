import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Midtrans calls this without JWT, verify_jwt must be false.

async function sha512(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!SERVER_KEY) return new Response("Not configured", { status: 500 });

    const payload = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, custom_field1 } = payload || {};
    if (!order_id || !signature_key) return new Response("Bad payload", { status: 400 });

    const expected = await sha512(`${order_id}${status_code}${gross_amount}${SERVER_KEY}`);
    if (expected !== signature_key) {
      console.error("Invalid signature", { order_id });
      return new Response("Invalid signature", { status: 401 });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // enrollment id from custom_field1, fallback parse order_id "enr-{id}-{ts}"
    let enrollmentId: string | null = custom_field1 || null;
    if (!enrollmentId && typeof order_id === "string" && order_id.startsWith("enr-")) {
      enrollmentId = order_id.split("-").slice(1, 6).join("-"); // UUID has 5 hyphen-separated parts
    }
    if (!enrollmentId) return new Response("No enrollment", { status: 400 });

    let newStatus: string | null = null;
    if ((transaction_status === "capture" && fraud_status === "accept") || transaction_status === "settlement") {
      newStatus = "active";
    } else if (["deny", "cancel", "expire", "failure"].includes(transaction_status)) {
      newStatus = "rejected";
    }
    if (newStatus) {
      const update: any = { status: newStatus };
      if (newStatus === "active") update.paid_at = new Date().toISOString();
      await admin.from("enrollments").update(update).eq("id", enrollmentId);

      if (newStatus === "active") {
        // Best-effort send approval email
        try {
          const { data: enr } = await admin.from("enrollments")
            .select("user_id, course:courses(title, slug)").eq("id", enrollmentId).maybeSingle();
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (enr && RESEND_API_KEY) {
            const { data: udata } = await admin.auth.admin.getUserById(enr.user_id);
            const to = udata.user?.email;
            const name = (udata.user?.user_metadata?.full_name as string) || to || "Peserta";
            const c: any = (enr as any).course;
            if (to) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: "BCG Academy <onboarding@resend.dev>",
                  to: [to],
                  subject: `Pembayaran disetujui - ${c?.title}`,
                  html: `<p>Halo <strong>${name}</strong>,</p><p>Pembayaran Anda untuk kursus <strong>${c?.title}</strong> telah diterima. Silakan login dan mulai belajar.</p>`,
                }),
              });
            }
          }
        } catch (e) { console.warn("email send failed", e); }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
