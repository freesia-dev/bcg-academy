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

let allCache: Course[] | null = null;
let allInflight: Promise<Course[]> | null = null;
const loadAll = () => {
  if (allCache) return Promise.resolve(allCache);
  if (!allInflight) {
    allInflight = (async () => {
      const { data } = await supabase.from("courses").select("*").eq("is_published", true).order("sort_order");
      allCache = (data as Course[]) || [];
      return allCache;
    })();
  }
  return allInflight;
};

/** Daftar program terbit. Filter dilakukan di sisi klien (datanya kecil) dan hasil dibagi antar komponen. */
export const useCourses = (filter?: { type?: "online" | "offline"; free?: boolean }) => {
  const [all, setAll] = useState<Course[]>(allCache ?? []);
  const [loading, setLoading] = useState(!allCache);

  useEffect(() => {
    let alive = true;
    loadAll().then((d) => { if (alive) { setAll(d); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const courses = all.filter((c) =>
    (!filter?.type || c.type === filter.type) &&
    (filter?.free === undefined || (c.is_free || c.price === 0) === filter.free));
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
          .select("id,title,description,sort_order")
          .eq("course_id", c.id)
          .order("sort_order");
        const ids = (mods || []).map((m: any) => m.id);
        const { data: outline } = ids.length
          ? await (supabase as any).from("lesson_outline").select("*").in("module_id", ids)
          : { data: [] };
        mods?.forEach((m: any) => { m.lessons = (outline || []).filter((l: any) => l.module_id === m.id); });
        setModules(mods || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return { course, modules, loading };
};
