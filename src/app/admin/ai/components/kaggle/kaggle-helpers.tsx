import { Badge } from "@/components/ui/badge";
import type {
  AutomationDatasetSyncConfig,
  AutomationTrainingConfig,
} from "@/lib/services/ai.service";

export function formatMetric(val?: number | null, digits = 2): string {
  if (val == null || Number.isNaN(Number(val))) return "—";
  const num = Number(val);
  const pct = num <= 1 ? num * 100 : num;
  return `${pct.toFixed(digits)}%`;
}

export function formatWibTime(iso?: string | null): string {
  if (!iso) return "Belum pernah";
  try {
    return (
      new Date(iso).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return iso;
  }
}

export function shortCommit(oid?: string | null): string {
  return oid ? oid.slice(0, 8) : "—";
}

export function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const DEFAULT_SYNC_FORM: AutomationDatasetSyncConfig = {
  enabled: false,
  mode: "daily",
  hour: 1,
  minute: 0,
  interval_hours: 6,
  auto_sync_supabase_to_hf: true,
};

export const DEFAULT_TRAIN_FORM: AutomationTrainingConfig = {
  enabled: false,
  mode: "on_new_dataset",
  hour: 2,
  minute: 0,
  interval_hours: 24,
  min_new_samples: 5,
  auto_activate_if_better: false,
};

export function renderAutomationStatusBadge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "SYNCED" || s === "COMPLETE" || s === "AUTO_ACTIVATED") return <Badge variant="green">{s}</Badge>;
  if (s === "TRIGGERED" || s === "RUNNING" || s === "PROCESSING") return <Badge variant="blue">{s}</Badge>;
  if (s === "SKIPPED_NO_NEW_DATA" || s === "SKIPPED_BUSY") return <Badge variant="yellow">{s}</Badge>;
  if (s === "ERROR") return <Badge variant="red">{s}</Badge>;
  return <Badge variant="gray">{s}</Badge>;
}
