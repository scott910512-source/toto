import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 " +
  "text-slate-900 dark:text-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-400";

export function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
