import { cn } from "@/lib/cn";

type FieldType = "text" | "number" | "email" | "password" | "textarea" | "select";

interface FormFieldProps {
  label: string;
  name: string;
  type?: FieldType;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  options?: { label: string; value: string }[];
  rows?: number;
}

export function FormField({ label, name, type = "text", value, onChange, placeholder, required, error, disabled, className, options, rows = 3 }: FormFieldProps) {
  const baseInput = "w-full p-2.5 border-2 border-border rounded-sm text-[13px] font-body outline-none transition-all focus:border-accent focus:shadow-[2px_2px_0px_var(--color-accent)] disabled:bg-muted disabled:text-muted-fg";
  const errorBorder = error ? "border-red-400" : "";

  return (
    <div className={cn("mb-3", className)}>
      <label htmlFor={name} className="block text-[12px] font-semibold mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {type === "select" ? (
        <select id={name} name={name} value={value} onChange={onChange} disabled={disabled} className={cn(baseInput, errorBorder)}>
          <option value="">{placeholder || `Pilih ${label.toLowerCase()}...`}</option>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} rows={rows} className={cn(baseInput, "resize-y min-h-[60px]", errorBorder)} />
      ) : (
        <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={cn(baseInput, errorBorder)} />
      )}

      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}

export function FormRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 max-sm:grid-cols-1 gap-3", className)}>{children}</div>;
}