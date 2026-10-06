import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Enrollment {
  id: string;
  course_id: string;
  status: "pending_payment" | "active" | "completed" | "cancelled" | "rejected" | "waitlist";
  batch_id?: string | null;
  payment_method?: string | null;
  participant_note?: string | null;
  paid_at?: string | null;
  enrolled_at: string;
  payment_proof_url: string | null;
  payment_amount: number | null;
  completed_at: string | null;
  certificate_url: string | null;
  notes: string | null;
}

export const useMyEnrollments = (userId: string | undefined) => {
  const [enrollments, setEnrollments] = useState<(Enrollment & { course: any })[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setEnrollments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("enrollments")
      .select("*, course:courses(id,slug,title,cover_image,type,category,duration,instructor_name), batch:batches(id,name,start_date,end_date,schedule,location,status,notes)")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });
    setEnrollments((data as any) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { enrollments, loading, refetch };
};

export const useMyEnrollment = (userId: string | undefined, courseId: string | undefined) => {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId || !courseId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    setEnrollment(data as Enrollment | null);
    setLoading(false);
  }, [userId, courseId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { enrollment, loading, refetch };
};
