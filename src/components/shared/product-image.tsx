"use client";

import { useState, useMemo, useEffect } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/cn";

interface ProductImageProps {
  src?: string | null;
  fotoUrl?: string | null;
  alt?: string;
  nama?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProductImageProps["size"]>, string> = {
  xs: "w-6 h-6 rounded border border-fg",
  sm: "w-9 h-9 rounded-md border-2 border-fg",
  md: "w-12 h-12 rounded-md border-2 border-fg",
  lg: "w-16 h-16 rounded-md border-2 border-fg",
};

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("https://huggingface.co/datasets/")) {
    return `/api/media/hf-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function ProductImage({
  src,
  fotoUrl,
  alt,
  nama,
  size,
  className,
  iconClassName,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = useMemo(() => normalizeMediaUrl(src ?? fotoUrl ?? null), [src, fotoUrl]);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);
  const resolvedAlt = alt ?? nama ?? "Produk";
  const sizeClass = size ? SIZE_CLASSES[size] : "";

  if (resolvedSrc && !hasError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-muted flex items-center justify-center shrink-0",
          sizeClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted/80 text-muted-fg flex items-center justify-center shrink-0",
        sizeClass,
        className
      )}
      title={resolvedAlt}
    >
      <Package className={cn("w-5 h-5", iconClassName)} />
    </div>
  );
}
