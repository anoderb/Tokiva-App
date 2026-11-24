"use client";

import { useState, useMemo, useEffect } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  fetchAuthorizedMediaBlobUrl,
  isProtectedApiMediaUrl,
  resolveApiMediaUrl,
} from "@/lib/api";

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
  return resolveApiMediaUrl(url);
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
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const resolvedSrc = useMemo(() => normalizeMediaUrl(src ?? fotoUrl ?? null), [src, fotoUrl]);
  const needsAuthFetch = Boolean(resolvedSrc && isProtectedApiMediaUrl(resolvedSrc));

  useEffect(() => {
    setHasError(false);
    setBlobSrc(null);

    if (!resolvedSrc || !needsAuthFetch) return;

    const controller = new AbortController();
    let activeObjectUrl: string | null = null;
    let cancelled = false;

    fetchAuthorizedMediaBlobUrl(resolvedSrc, controller.signal)
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        activeObjectUrl = objectUrl;
        setBlobSrc(objectUrl);
      })
      .catch((err: any) => {
        if (err?.name === "AbortError" || cancelled) return;
        setHasError(true);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [resolvedSrc, needsAuthFetch]);

  const resolvedAlt = alt ?? nama ?? "Produk";
  const sizeClass = size ? SIZE_CLASSES[size] : "";
  const displaySrc = needsAuthFetch ? blobSrc : resolvedSrc;

  if (displaySrc && !hasError) {
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
          src={displaySrc}
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
