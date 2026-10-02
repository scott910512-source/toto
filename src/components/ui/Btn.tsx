import type { ButtonHTMLAttributes, ReactNode } from "react";

export type BtnVariant = "primary" | "lavender" | "ghost" | "danger";

const STYLES: Record<BtnVariant, string> = {
  primary: "bg-teal-500 hover:bg-teal-600 text-white",
  lavender: "bg-violet-400 hover:bg-violet-500 text-white",
  ghost: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600",
  danger: "bg-rose-500 hover:bg-rose-600 text-white",
};

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  children?: ReactNode;
}

/* 한 손으로 누르는 화면이라 기본 높이를 넉넉히 둔다 (py-3 = 48px 이상) */
export function Btn({ variant = "primary", className = "", type = "button", ...rest }: BtnProps) {
  return (
    <button
      type={type}
      className={`rounded-xl font-medium px-4 py-3 text-base transition active:scale-[.98] disabled:opacity-50 disabled:active:scale-100 ${STYLES[variant]} ${className}`}
      {...rest}
    />
  );
}
