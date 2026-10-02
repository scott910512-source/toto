import { Card } from "@/components/ui/Card";
import { medalStats } from "@/lib/medals";
import { useAuth } from "@/providers/AuthProvider";
import { MedalGrid } from "./MedalGrid";

/* 내 메달. 할머니·이모가 매일 들여다보게 만드는 자리라,
   숫자가 틀리면 바로 눈에 띈다. */
export function MyMedals() {
  const { profile } = useAuth();
  const s = medalStats(profile);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 dark:text-white">🏅 내 메달</h3>
        <span className="text-xs text-slate-400">
          접속 {s.login}일 · 편지 {s.letter}회
        </span>
      </div>
      <MedalGrid owner={profile} />
    </Card>
  );
}
