-- ============ SECURE QUIZ SCORING ============
-- Problem: quiz_attempts allowed any authenticated user to INSERT their own
-- score/passed values directly from the browser, and the quizzes table
-- (including the "correct" answer key) was fetched in full to the client.
-- Anyone could open devtools and either read the correct answers straight
-- out of the network response, or just insert a fake `passed: true, score: 100`
-- row without answering anything, then claim a certificate.
--
-- Fix: scoring now happens server-side in the "submit-quiz" edge function
-- (using the service role key, which bypasses RLS), and students can no
-- longer insert quiz_attempts rows directly. A sanitized view is used to
-- show quiz questions to students without exposing the correct answer index.

-- 1) Remove the ability for students to insert quiz_attempts directly.
--    (Admins/edge functions use the service role, which bypasses RLS entirely.)
DROP POLICY IF EXISTS "Users create own attempts" ON public.quiz_attempts;
REVOKE INSERT ON public.quiz_attempts FROM authenticated;

-- 2) Sanitized view of quizzes for students: same RLS as the base table
--    (security_invoker), but with the "correct" answer key stripped out
--    of every question before it ever reaches the browser.
CREATE OR REPLACE VIEW public.quiz_public
WITH (security_invoker = true) AS
SELECT
  id,
  module_id,
  title,
  description,
  passing_score,
  COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('question', q->>'question', 'options', q->'options'))
      FROM jsonb_array_elements(questions) q
    ),
    '[]'::jsonb
  ) AS questions,
  created_at
FROM public.quizzes;

GRANT SELECT ON public.quiz_public TO authenticated;

-- Make sure the submit-quiz edge function (running as service_role) can
-- call has_active_enrollment() to verify enrollment before scoring.
GRANT EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) TO service_role;
