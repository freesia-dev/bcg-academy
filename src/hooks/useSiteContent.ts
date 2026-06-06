import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, any>();
const listeners = new Map<string, Set<(v: any) => void>>();

export function useSiteContent<T = any>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(cache.get(key) ?? fallback);

  useEffect(() => {
    let active = true;
    if (!listeners.has(key)) listeners.set(key, new Set());
    const set = listeners.get(key)!;
    const notify = (v: any) => active && setValue(v);
    set.add(notify);

    if (!cache.has(key)) {
      supabase
        .from("site_content")
        .select("value")
        .eq("key", key)
        .maybeSingle()
        .then(({ data }) => {
          const v = (data?.value as T) ?? fallback;
          cache.set(key, v);
          listeners.get(key)?.forEach((fn) => fn(v));
        });
    }

    return () => {
      active = false;
      set.delete(notify);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return value;
}

export function invalidateSiteContent(key: string) {
  cache.delete(key);
}
