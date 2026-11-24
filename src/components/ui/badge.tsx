import { cn } from "@/lib/cn";

const styles = {
  green:  "bg-lime-100 text-lime-800",
  yellow: "bg-amber-50 text-amber-800",
  red:    "bg-red-50 text-red-800",
  purple: "bg-violet-50 text-violet-800",
  blue:   "bg-sky-50 text-sky-800",
  gray:   "bg-muted text-muted-fg",
} as const;

export function Badge({ variant = "green", className, children }: { variant?: keyof typeof styles; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border-2 border-fg", styles[variant], className)}>{children}</span>;
}
