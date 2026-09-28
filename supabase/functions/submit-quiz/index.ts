// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side quiz scoring.
// The client sends only { quiz_id, answers }. The correct answer key never
// leaves this function, and the resulting quiz_attempts row is written with
// the service role, so a student can no longer fake a passing score by
// editing the request or inserting a row directly from the browser.
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
    const quiz_id = body?.quiz_id as string | undefined;
    const answers = body?.answers as Record<string, number> | undefined;
    if (!quiz_id || !answers || typeof answers !== "object") {
      return json({ error: "quiz_id dan answers wajib diisi" }, 400);
    }

    const { data: quiz, error: quizErr } = await admin
      .from("quizzes")
      .select("id, module_id, passing_score, questions")
      .eq("id", quiz_id)
      .maybeSingle();
    if (quizErr || !quiz) return json({ error: "Kuis tidak ditemukan" }, 404);

    const { data: mod } = await admin
      .from("modules")
      .select("course_id")
      .eq("id", quiz.module_id)
      .maybeSingle();
    if (!mod) return json({ error: "Modul tidak ditemukan" }, 404);

    // Must be actively enrolled in the course that owns this quiz.
    const { data: enrolled } = await admin.rpc("has_active_enrollment", {
      _user_id: user.id,
      _course_id: mod.course_id,
    });
    if (!enrolled) return json({ error: "Anda tidak terdaftar di kursus ini." }, 403);

    const questions: any[] = Array.isArray(quiz.questions) ? quiz.questions : [];
    if (questions.length === 0) return json({ error: "Kuis belum memiliki soal." }, 400);

    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[String(i)] === q.correct || answers[i as unknown as string] === q.correct) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (quiz.passing_score ?? 70);

    const { error: insErr } = await admin.from("quiz_attempts").insert({
      user_id: user.id,
      quiz_id: quiz.id,
      score,
      passed,
      answers,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ score, passed });
  } catch (e) {
    return json({ error: e.message || "Terjadi kesalahan" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
