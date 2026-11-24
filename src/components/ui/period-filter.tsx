"use client";
import { cn } from "@/lib/cn";

export function PeriodFilter({ periods, active, onChange, className }: {
  periods: string[]; active: string; onChange: (p: string) => void; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap p-3 bg-card border-2 border-border rounded-md shadow-pop-soft", className)}>
      {periods.map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={cn("px-3.5 py-1.5 rounded-full border-2 text-[13px] font-medium cursor-pointer transition-all font-body",
            p === active ? "bg-accent text-white border-fg shadow-[2px_2px_0px_#1E293B]" : "border-border bg-card hover:bg-muted")}>{p}</button>
      ))}
    </div>
  );
}
