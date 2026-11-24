import { cn } from "@/lib/cn";
import { Button } from "./button";
import type { LucideIcon } from "lucide-react";

export function SectionCard({ title, desc, action, customAction, className, children }: {
  title?: string; desc?: string; className?: string; children: React.ReactNode;
  action?: { label: string; icon?: LucideIcon; onClick?: () => void; href?: string };
  customAction?: React.ReactNode;
}) {
  return (
    <div className={cn("bg-card border-2 border-fg rounded-lg p-3 sm:p-5 shadow-pop-soft min-w-0 max-w-full overflow-hidden", className)}>
      {(title || customAction || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          {title && <div><h3 className="font-heading text-lg font-bold">{title}</h3>{desc && <p className="text-[13px] text-muted-fg">{desc}</p>}</div>}
          {customAction}
          {action && <Button variant="outline" size="sm" icon={action.icon} {...(action.href ? { href: action.href } : { onClick: action.onClick })}>{action.label}</Button>}
        </div>
      )}
      {children}
    </div>
  );
}
