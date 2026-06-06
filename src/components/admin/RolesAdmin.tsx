import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Shield, ShieldOff } from "lucide-react";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string;
  created_at: string;
  roles: string[];
}

const ROLES: Array<"admin" | "superadmin"> = ["admin", "superadmin"];

const RolesAdmin = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (q = "") => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
      body: { action: "list", search: q || undefined },
    });
    setLoading(false);
    if (error) return toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    setUsers((data as any).users || []);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (user: UserRow, role: "admin" | "superadmin") => {
    const has = user.roles.includes(role);
    setBusy(`${user.id}-${role}`);
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
      body: { action: has ? "revoke" : "grant", user_id: user.id, role },
    });
    setBusy(null);
    const err = error?.message || (data as any)?.error;
    if (err) return toast({ title: "Gagal", description: typeof err === "string" ? err : JSON.stringify(err), variant: "destructive" });
    toast({ title: has ? `Role ${role} dicabut` : `Role ${role} diberikan` });
    load(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari email atau nama..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)} />
        </div>
        <Button variant="outline" onClick={() => load(search)} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cari
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{u.full_name || "(tanpa nama)"}</span>
                  {u.roles.map((r) => (
                    <Badge key={r} variant={r === "superadmin" ? "default" : "secondary"}>{r}</Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex gap-2">
                {ROLES.map((role) => {
                  const has = u.roles.includes(role);
                  return (
                    <Button key={role} size="sm" variant={has ? "destructive" : "outline"}
                      disabled={busy === `${u.id}-${role}`}
                      onClick={() => toggle(u, role)}>
                      {busy === `${u.id}-${role}` ? <Loader2 className="h-4 w-4 animate-spin" /> :
                        has ? <ShieldOff className="h-4 w-4 mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                      {has ? `Cabut ${role}` : `Jadikan ${role}`}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && users.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Tidak ada pengguna ditemukan.</p>
        )}
      </div>
    </div>
  );
};

export default RolesAdmin;
