import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

type Variant = "primary" | "admin" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const v: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg border-fg shadow-pop hover:shadow-pop-hover",
  admin:   "bg-admin hover:bg-purple-700 text-white border-fg shadow-pop hover:shadow-pop-hover",
  outline: "bg-card text-fg border-fg hover:bg-tertiary hover:shadow-pop",
  ghost:   "bg-transparent text-muted-fg border-transparent hover:bg-muted hover:text-fg",
  danger:  "bg-red-600 text-white border-fg shadow-pop hover:shadow-pop-hover",
};
const s: Record<Size, string> = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-5 py-2.5 text-[13px] gap-2" };

type Props = {
  variant?: Variant; size?: Size; icon?: LucideIcon;
  children?: React.ReactNode; className?: string;
} & ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof { href: string }> | { href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>);

export function Button({ variant = "primary", size = "md", icon: Icon, className, children, ...rest }: Props) {
  const cls = cn("inline-flex items-center justify-center font-body font-bold rounded-full border-2 transition-all duration-200 cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1E293B]", v[variant], s[size], className);
  if ("href" in rest && rest.href) {
    const { href, ...a } = rest as any;
    return <Link href={href} className={cls} {...a}>{Icon && <Icon className="w-4 h-4" />}{children}</Link>;
  }
  return <button className={cls} {...(rest as any)}>{Icon && <Icon className="w-4 h-4" />}{children}</button>;
}
