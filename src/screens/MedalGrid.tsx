import { MEDALS, medalStats, medalProgress, type Medal } from "@/lib/medals";

export interface MedalOwner {
  loginDays?: unknown;
  letterCount?: unknown;
}

/* 메달 한 칸.
   아직 못 받은 메달은 흑백으로 흐리게 둔다 — 숨기면 "뭐가 더 있나" 를
   알 수 없고, 똑같이 보여주면 받은 걸 알 수 없다. */
function Cell({ medal, owner }: { medal: Medal; owner: MedalOwner | null }) {
  const { value, goal, ratio } = medalProgress(owner, medal);
  const got = value >= goal;
  return (
    <li
      className={`rounded-xl p-2 text-center border ${
        got
          ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          : "bg-slate-50 border-slate-100 dark:bg-slate-700/40 dark:border-slate-700"
      }`}
    >
      <div
        className="text-2xl"
        aria-hidden="true"
        style={got ? undefined : { filter: "grayscale(1)", opacity: 0.45 }}
      >
        {medal.icon}
      </div>
      <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200 mt-0.5 leading-tight">
        {medal.name}
      </p>
      <p className="text-[12px] text-slate-400">{medal.desc}</p>
      {/* 스크린리더는 막대 대신 숫자로 읽는다 */}
      <div
        className="h-1 bg-slate-200 dark:bg-slate-600 rounded mt-1 overflow-hidden"
        role="progressbar"
        aria-label={`${medal.name} 진행`}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={value}
      >
        <div className="h-full bg-amber-400" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
      <p className="text-[12px] text-slate-400 mt-0.5">
        {value}/{goal}
        {got && <span className="sr-only"> 받았어요</span>}
      </p>
    </li>
  );
}

export function MedalGrid({ owner }: { owner: MedalOwner | null }) {
  const s = medalStats(owner);
  return (
    <ul className="grid grid-cols-3 gap-2" aria-label={`메달 · 접속 ${s.login}일 · 편지 ${s.letter}회`}>
      {MEDALS.map((m) => (
        <Cell key={m.id} medal={m} owner={owner} />
      ))}
    </ul>
  );
}
