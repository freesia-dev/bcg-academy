import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), search: z.string().optional() }),
  z.object({ action: z.literal("grant"), user_id: z.string().uuid(), role: z.enum(["admin", "superadmin", "user"]) }),
  z.object({ action: z.literal("revoke"), user_id: z.string().uuid(), role: z.enum(["admin", "superadmin", "user"]) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isSuper } = await admin.rpc("has_role", { _user_id: userRes.user.id, _role: "superadmin" });
    if (!isSuper) return json({ error: "Forbidden: superadmin only" }, 403);

    const parsed = ActionSchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    if (body.action === "list") {
      const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) return json({ error: error.message }, 500);
      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      const q = body.search?.toLowerCase().trim();
      const users = list.users
        .map((u) => ({
          id: u.id,
          email: u.email,
          full_name: (u.user_metadata as any)?.full_name || "",
          created_at: u.created_at,
          roles: roleMap.get(u.id) || [],
        }))
        .filter((u) => !q || u.email?.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q));
      return json({ users });
    }

    if (body.action === "grant") {
      const { error } = await admin.from("user_roles").upsert({ user_id: body.user_id, role: body.role }, { onConflict: "user_id,role" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (body.action === "revoke") {
      // Prevent removing the last superadmin
      if (body.role === "superadmin") {
        const { count } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "superadmin");
        if ((count || 0) <= 1) return json({ error: "Tidak bisa menghapus superadmin terakhir" }, 400);
      }
      const { error } = await admin.from("user_roles").delete().eq("user_id", body.user_id).eq("role", body.role);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
