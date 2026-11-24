"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Setiap kali pathname berubah, selesaikan progress bar dengan cepat
  useEffect(() => {
    if (!navigating) return;
    setProgress(100);
    const doneTimer = setTimeout(() => {
      setNavigating(false);
      setProgress(0);
    }, 180);
    return () => clearTimeout(doneTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Deteksi klik pada link internal (<a href="/...">) untuk memicu feedback visual 0ms
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
        setNavigating(true);
        setProgress(35);
      } catch {
        // abaikan URL tidak valid
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const trickle = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + 12 : prev));
    }, 150);
    const safetyReset = setTimeout(() => {
      setNavigating(false);
      setProgress(0);
    }, 6000);
    return () => {
      clearInterval(trickle);
      clearTimeout(safetyReset);
    };
  }, [navigating]);

  if (!navigating && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent pointer-events-none">
      <div
        className="h-full bg-accent shadow-[0_0_8px_#0CAF60] transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
