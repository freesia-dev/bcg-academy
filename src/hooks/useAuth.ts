import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSuperadmin: boolean;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applyRoles = (rows: any[]) => {
      const roles = (rows || []).map((r: any) => r.role);
      setIsAdmin(roles.includes("admin") || roles.includes("superadmin"));
      setIsSuperadmin(roles.includes("superadmin"));
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) {
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          applyRoles(data || []);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsSuperadmin(false);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.session.user.id);
        applyRoles(roles || []);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, isAdmin, isSuperadmin, loading };
};
