import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}
