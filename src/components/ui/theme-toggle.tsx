"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("tokiva-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tokiva-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tokiva-theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-full border-2 border-border bg-card opacity-50 ${className}`}
      />
    );
  }

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Malam"}
        className={`w-8 h-8 rounded-sm border-2 border-fg bg-card flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-muted transition-transform active:translate-x-0.5 active:translate-y-0.5 ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Malam"}
      className={`px-2.5 py-1 rounded-full border-2 border-fg bg-card flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-[2px_2px_0px_var(--shadow-color)] hover:bg-muted transition-transform active:translate-x-0.5 active:translate-y-0.5 ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden sm:inline">Malam</span>
        </>
      )}
    </button>
  );
}

