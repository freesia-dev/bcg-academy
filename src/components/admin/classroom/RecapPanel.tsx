import { useMemo } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/adminData";
import { regCode } from "@/lib/batches";
import {
  MARK_BY_ID, countedSessions, dayShort, recapFor, toDate, type AttendanceMap, type Member, type Session,
} from "@/lib/classroom";

interface Props { members: Member[]; sessions: Session[]; attendance: AttendanceMap; minAttendance: number; fileLabel: string }

const RecapPanel = ({ members, sessions, attendance, minAttendance, fileLabel }: Props) => {
  const counted = useMemo(() => countedSessions(sessions, attendance), [sessions, attendance]);
  const rows = useMemo(() => members.map((m) => ({ m, r: recapFor(m.id, counted, attendance) })), [members, counted, attendance]);

  const exportCsv = () => {
    downloadCsv(
      `absensi-${fileLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      ["No", "Kode", "Nama", ...sessions.map((s) => `${s.title} (${s.session_date})`), "Hadir", "Izin", "Sakit", "Alpa", "Kehadiran %"],
      rows.map(({ m, r }, i) => [
        i + 1, regCode(m.id), m.name,
        ...sessions.map((s) => { const k = attendance[s.id]?.[m.id]; return k ? MARK_BY_ID[k].label : ""; }),
        r.hadir, r.izin, r.sakit, r.alpa, r.pct,
      ]),
    );
  };

  if (!members.length) return <p className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada peserta aktif.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {counted.length} dari {sessions.length} pertemuan dihitung (yang sudah berlangsung). Batas lulus: <b className="text-foreground">{minAttendance}% hadir</b>.
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!sessions.length}><Download className="h-4 w-4 mr-2" />Unduh CSV</Button>
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/95 text-left font-semibold px-4 py-2.5 min-w-[180px]">Peserta</th>
              {sessions.map((s, i) => (
                <th key={s.id} className="px-1.5 py-2 font-medium text-[11px] text-muted-foreground whitespace-nowrap" title={`${s.title} · ${dayShort(s.session_date)}`}>
                  <div>P{i + 1}</div>
                  <div className="font-normal">{toDate(s.session_date).getDate()}/{toDate(s.session_date).getMonth() + 1}</div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">H / I / S / A</th>
              <th className="px-4 py-2.5 text-right font-semibold">Hadir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, r }) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium whitespace-nowrap max-w-[220px] truncate">{m.name}</td>
                {sessions.map((s) => {
                  const k = attendance[s.id]?.[m.id];
                  return (
                    <td key={s.id} className="px-1.5 py-2 text-center">
                      {k ? <span className={cn("text-xs font-bold", MARK_BY_ID[k].className)}>{MARK_BY_ID[k].short}</span> : <span className="text-muted-foreground/40">·</span>}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">{r.hadir} / {r.izin} / {r.sakit} / {r.alpa}</td>
                <td className="px-4 py-2 text-right">
                  <span className={cn("text-xs font-bold tabular-nums rounded-full px-2 py-0.5",
                    !r.counted ? "text-muted-foreground" : r.pct >= minAttendance ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                    {r.counted ? `${r.pct}%` : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecapPanel;
