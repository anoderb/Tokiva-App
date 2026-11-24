"use client";
import { cn } from "@/lib/cn";
import { bottomNavItems, morePanel } from "@/lib/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout("/auth/login");
  };

  return (
    <>
        <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-card border-2 border-fg rounded-full px-2 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.2),4px_4px_0px_var(--shadow-color)] flex justify-around gap-0.5 w-[calc(100%-32px)] max-w-[420px]">
          {bottomNavItems.map(item => {
            if (item.label === "Lainnya") {
              return (
                <button key={item.label} onClick={() => setMoreOpen(!moreOpen)}
                  className={cn("flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full cursor-pointer border-2 transition-all text-[10px] font-medium flex-1",
                    moreOpen ? "text-accent bg-lime-100 dark:bg-lime-950/60 dark:text-lime-300 border-accent shadow-[2px_2px_0px_var(--color-accent)]" : "text-muted-fg border-transparent")}>
                  <item.icon className="w-5 h-5" /><span className="text-[10px] leading-none">{item.label}</span>
                </button>
              );
            }
            const active = item.href && pathname === item.href;
            return (
              <Link key={item.label} href={item.href!}
                className={cn("flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full cursor-pointer border-2 transition-all text-[10px] font-medium flex-1",
                  active ? "text-accent bg-lime-100 dark:bg-lime-950/60 dark:text-lime-300 border-accent shadow-[2px_2px_0px_var(--color-accent)]" : "text-muted-fg border-transparent")}>
                <item.icon className="w-5 h-5" /><span className="text-[10px] leading-none">{item.label}</span>
              </Link>
            );
          })}
        </nav>
          { moreOpen && <div className="lg:hidden fixed inset-0 z-[35] bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />}
      <div className={cn("lg:hidden fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[36] bg-card border-2 border-fg rounded-lg p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.2),4px_4px_0px_var(--shadow-color)] w-[calc(100%-32px)] max-w-[400px] grid grid-cols-2 gap-1.5 transition-all duration-300",
            moreOpen ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-[120%] opacity-0 pointer-events-none")}>
          {morePanel.map(item => (
            <Link key={item.label} href={item.href || "#"} onClick={() => setMoreOpen(false)}
              className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-md border-2 border-border text-[13px] font-medium text-fg transition-all hover:border-accent hover:bg-lime-100 dark:hover:bg-lime-950/60 hover:shadow-[2px_2px_0px_var(--color-accent)]",
                item.href === pathname && "bg-lime-100 dark:bg-lime-950/60 border-accent")}>
              <item.icon className="w-[18px] h-[18px] shrink-0" />{item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md border-2 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-[12px] font-bold text-red-600 dark:text-red-400 transition-all col-span-2 justify-center mt-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun (Logout)</span>
          </button>
        </div>
      </>
      );
}
