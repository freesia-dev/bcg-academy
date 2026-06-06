import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  type: "online" | "offline";
  category: string | null;
  level: string;
  duration: string | null;
  capacity: string | null;
  instructor_name: string | null;
  price: number;
  is_free: boolean;
  currency: string;
  is_published: boolean;
  sort_order: number;
  highlights: string[];
  color: string;
}

export const useCourses = (filter?: { type?: "online" | "offline"; free?: boolean }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("courses").select("*").eq("is_published", true).order("sort_order");
    if (filter?.type) q = q.eq("type", filter.type);
    if (filter?.free !== undefined) q = q.eq("is_free", filter.free);
    q.then(({ data }) => {
      setCourses((data as Course[]) || []);
      setLoading(false);
    });
  }, [filter?.type, filter?.free]);

  return { courses, loading };
};

export const useCourse = (slug: string | undefined) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
      setCourse(c as Course | null);
      if (c) {
        const { data: mods } = await supabase
          .from("modules")
          .select("id,title,description,sort_order,lessons(id,title,sort_order,is_preview,content_type,duration_min)")
          .eq("course_id", c.id)
          .order("sort_order");
        setModules(mods || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return { course, modules, loading };
};
