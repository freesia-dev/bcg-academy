import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Program {
  id: string;
  title: string;
  slug: string;
  description: string;
  duration: string;
  capacity: string;
  level: string;
  highlights: string[];
  color: string;
  sort_order: number;
  is_active: boolean;
}

export const usePrograms = (onlyActive = true) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    let query = supabase.from("programs").select("*").order("sort_order");
    if (onlyActive) query = query.eq("is_active", true);
    const { data } = await query;
    setPrograms((data as Program[]) || []);
    setLoading(false);
  };

  useEffect(() => { refetch(); }, [onlyActive]);
  return { programs, loading, refetch };
};
