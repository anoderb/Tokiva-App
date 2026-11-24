import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, value, label, delta, className }: {
  icon: LucideIcon; value: string; label: string;
  delta?: { text: string; up: boolean }; className?: string;
}) {
  return (
    <div className={cn("bg-card border-2 border-fg rounded-md p-2.5 sm:p-3.5 shadow-pop-soft flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-full overflow-hidden transition-all duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#E2E8F0] cursor-pointer", className)}>
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm border-2 border-fg flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E293B] bg-muted"><Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-accent" /></div>
      <div className="min-w-0">
        <div className="font-heading text-lg sm:text-xl font-bold">{value}</div>
        <div className="text-[10px] sm:text-[11px] text-muted-fg truncate">{label}</div>
        {delta && <div className={cn("text-[11px] font-semibold mt-1", delta.up ? "text-lime-700" : "text-red-600")}>{delta.up ? "▲" : "▼"} {delta.text}</div>}
      </div>
    </div>
  );
}
