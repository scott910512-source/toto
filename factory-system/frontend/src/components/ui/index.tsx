import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/* ---------- Button ---------- */
type Variant = "primary" | "ghost" | "danger" | "soft";
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-accent text-white hover:brightness-110 shadow-md shadow-accent/30",
    soft: "bg-accent/10 text-accent hover:bg-accent/20 dark:bg-accent/20",
    ghost:
      "bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 border border-white/40 dark:border-white/10",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/30",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("glass p-5 animate-fade-in", className)}>{children}</div>;
}

/* ---------- Input ---------- */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-glass", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input-glass min-h-[80px]", className)} {...props} />;
}

/* ---------- Select ---------- */
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-glass appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------- Label ---------- */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const tones = {
    neutral: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    danger: "bg-red-500/15 text-red-600 dark:text-red-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    info: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent",
        className
      )}
    />
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
