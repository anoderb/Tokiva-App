"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showStrength?: boolean;
  value: string;
}

export function PasswordInput({
  showStrength = false,
  value,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Strength score: 0 to 3
  const strengthScore = useMemo(() => {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) score++;
    return score;
  }, [value]);

  const strengthLabel = useMemo(() => {
    if (!value) return "";
    if (strengthScore === 1) return "Lemah (Gunakan min. 8 karakter & kombinasi huruf/angka)";
    if (strengthScore === 2) return "Sedang (Tambahkan huruf kapital & simbol)";
    if (strengthScore === 3) return "Sangat Kuat (Kombinasi optimal)";
    return "";
  }, [value, strengthScore]);

  return (
    <div className="w-full">
      <div className="relative">
        <input
          {...props}
          type={showPassword ? "text" : "password"}
          value={value}
          className={cn(
            "w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-card border-2 border-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40 font-mono transition-all shadow-sm",
            className
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg cursor-pointer p-0.5"
          title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1">
          <div className="flex gap-1.5 h-1.5 w-full">
            <div
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                strengthScore >= 1
                  ? strengthScore === 1
                    ? "bg-red-500"
                    : strengthScore === 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                  : "bg-muted"
              )}
            />
            <div
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                strengthScore >= 2
                  ? strengthScore === 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                  : "bg-muted"
              )}
            />
            <div
              className={cn(
                "flex-1 rounded-full transition-all duration-300",
                strengthScore >= 3 ? "bg-emerald-500" : "bg-muted"
              )}
            />
          </div>
          <span
            className={cn(
              "text-[10px] font-semibold",
              strengthScore === 1
                ? "text-red-600"
                : strengthScore === 2
                ? "text-amber-700"
                : "text-emerald-700"
            )}
          >
            {strengthLabel}
          </span>
        </div>
      )}
    </div>
  );
}

