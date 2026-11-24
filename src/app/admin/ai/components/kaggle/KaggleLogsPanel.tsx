"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AutomationLogEntry } from "@/lib/services/ai.service";
import { formatWibTime, renderAutomationStatusBadge } from "./kaggle-helpers";
import { Activity, RefreshCw, Trash2 } from "lucide-react";

/** Panel 3: Tabel log aktivitas cronjob dan event scheduler AI */
export function KaggleLogsPanel({
  autoLogs,
  isLoadingAuto,
  onRefresh,
  onClearLogs,
}: {
  autoLogs: AutomationLogEntry[];
  isLoadingAuto: boolean;
  onRefresh: () => void;
  onClearLogs: () => void;
}) {
  return (
    <div className="p-5 rounded-lg border-2 border-fg bg-card shadow-pop-soft space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" />
          <h4 className="font-heading font-bold text-base">Log Aktivitas Otomatisasi &amp; Cronjob (WIB)</h4>
          <Badge variant="gray">{autoLogs.length} entri</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={isLoadingAuto} className="text-xs font-bold">
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingAuto ? "animate-spin" : ""}`} />Refresh
          </Button>
          {autoLogs.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={onClearLogs} className="text-xs font-bold text-rose-600">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Bersihkan Log
            </Button>
          )}
        </div>
      </div>

      {autoLogs.length === 0 ? (
        <p className="text-xs text-muted-fg py-4 text-center">Belum ada catatan aktivitas cronjob atau sinkronisasi otomatis.</p>
      ) : (
        <div className="max-h-60 overflow-y-auto border-2 border-fg rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted border-b-2 border-border font-bold uppercase text-[10px] text-muted-fg sticky top-0">
              <tr>
                <th className="py-2 px-3">Waktu (WIB)</th>
                <th className="py-2 px-3">Job</th>
                <th className="py-2 px-3">Pemicu</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {autoLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/25">
                  <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-muted-fg">{formatWibTime(log.timestamp)}</td>
                  <td className="py-2 px-3 font-semibold whitespace-nowrap">
                    {log.job === "dataset_sync" ? "Sync Dataset" : log.job === "training" ? "Training GPU" : log.job}
                  </td>
                  <td className="py-2 px-3 uppercase font-mono text-[10px]">{log.trigger}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{renderAutomationStatusBadge(log.status)}</td>
                  <td className="py-2 px-3 text-xs">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
