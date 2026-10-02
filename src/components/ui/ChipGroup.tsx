export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipGroupProps<T extends string> {
  options: ReadonlyArray<ChipOption<T>>;
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
}

/* 큰 버튼으로 하나 고르기. 아기 안고 한 손으로 누르는 자리라
   글자보다 누를 수 있는 면적을 먼저 본다. */
export function ChipGroup<T extends string>({ options, value, onChange, label }: ChipGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label}>
      {label && (
        <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium border transition ${
                active
                  ? "bg-teal-500 border-teal-500 text-white"
                  : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
