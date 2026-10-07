import { useState } from "react";
import { ToastProvider, useToast } from "./providers/ToastProvider";
import { Card } from "./components/ui/Card";
import { Btn } from "./components/ui/Btn";
import { Spinner } from "./components/ui/Spinner";
import { Field, inputCls } from "./components/ui/Field";
import { ChipGroup } from "./components/ui/ChipGroup";
import { Modal } from "./components/ui/Modal";
import { useDarkMode } from "./hooks/useDarkMode";
import { useHashRoute } from "./hooks/useHashRoute";
import { babyAge, dday, ago, hm } from "./lib/dates";
import { tempStage } from "./lib/guides";
import { errMsg } from "./lib/errors";
import { MedalGrid } from "./screens/MedalGrid";
import { Letters, type Letter } from "./screens/Letters";

/* 작업대용 편지 — DB 없이 메모리에만 둔다 */
const SEED_LETTERS: Letter[] = [
  { id: "l1", title: "사랑하는 또또에게", body: "건강하게 나와줘", vis: "public", createdBy: "u-dad", creatorName: "아빠", at: "2026-10-01T10:00:00Z" },
  { id: "l2", title: "엄마의 비밀 편지", body: "너만 알아줘", vis: "private", createdBy: "u-me", creatorName: "엄마", at: "2026-10-02T10:00:00Z" },
];

/* 작업대 — 옮겨 온 조각들이 실제로 동작하는지 눈으로 보는 자리.
   가족이 쓰는 화면이 아니며 배포되지 않는다. 화면을 하나씩 옮겨 오면서
   이 자리가 진짜 앱으로 바뀐다. */

const KINDS = [
  { value: "breast", label: "모유" },
  { value: "formula", label: "분유" },
  { value: "mixed", label: "혼합" },
] as const;

function Inner() {
  const toast = useToast();
  const [dark, setDark] = useDarkMode();
  const { path, tab, sub, nav } = useHashRoute("/workbench");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("breast");
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState("37.2");
  const [letters, setLetters] = useState<Letter[]>(SEED_LETTERS);
  const [admin, setAdmin] = useState(true);

  const baby = { name: "또또", dueDate: "2026-12-14", birthDate: "" };
  const age = babyAge(baby);
  const stage = tempStage(Number(temp));

  return (
    <main className="min-h-dvh bg-slate-50 dark:bg-slate-900 p-4 space-y-4 max-w-[430px] mx-auto">
      <Card className="p-4">
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">작업대</h1>
        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">
          새 구조로 옮긴 조각들을 확인하는 자리입니다. 가족이 쓰는 화면은{" "}
          <a className="underline" href="/app.html">/app.html</a> 입니다.
        </p>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold text-slate-800 dark:text-white">계산</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{age.label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{dday(baby)}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {ago(new Date(Date.now() - 95 * 60_000))} · {hm(95)}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {errMsg({ message: "Invalid login credentials" })}
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold text-slate-800 dark:text-white">입력</h2>
        <ChipGroup label="수유 종류" options={KINDS} value={kind} onChange={setKind} />
        <Field label="체온">
          <input className={inputCls} value={temp} inputMode="decimal"
            onChange={(e) => setTemp(e.target.value)} />
        </Field>
        {stage && (
          <p className={`text-[12px] rounded-xl p-2.5 ${stage.bg} ${stage.color}`}>
            <b>{stage.label}</b> · {stage.msg}
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold text-slate-800 dark:text-white">주소</h2>
        <p className="text-[12px] text-slate-400">
          path {path} · tab {tab} · sub {sub ?? "-"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Btn variant="ghost" onClick={() => nav("/records/feeding")}>기록</Btn>
          <Btn variant="ghost" onClick={() => nav("/gallery")}>사진</Btn>
          <Btn variant="ghost" onClick={() => nav("/more", { replace: true })}>더보기</Btn>
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold text-slate-800 dark:text-white">알림 · 모달</h2>
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={() => toast("저장했어요", "success")}>알림</Btn>
          <Btn variant="lavender"
            onClick={() => toast("기저귀 기록 추가", "success", { undo: () => toast("되돌렸어요") })}>
            실행취소 알림
          </Btn>
          <Btn variant="ghost" onClick={() => setOpen(true)}>모달 열기</Btn>
          <Btn variant="danger" onClick={() => toast("권한이 없어요", "error")}>오류</Btn>
        </div>
        <Modal open={open} onClose={() => setOpen(false)} title="다른 기록">
          <div className="space-y-2">
            <Btn variant="ghost" className="w-full">유축</Btn>
            <Btn variant="ghost" className="w-full">이유식</Btn>
            <Field label="메모"><input className={inputCls} /></Field>
          </div>
        </Modal>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold text-slate-800 dark:text-white">메달 (옮겨 온 화면)</h2>
        <MedalGrid owner={{ loginDays: ["1", "2", "3", "4", "5"], letterCount: 1 }} />
      </Card>

      <Card className="p-0 space-y-0">
        <div className="p-4 pb-0 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-white">편지 (옮겨 온 화면)</h2>
          <Btn variant="ghost" className="text-sm py-2 px-3" onClick={() => setAdmin(!admin)}>
            {admin ? "관리자로 보는 중" : "가족으로 보는 중"}
          </Btn>
        </div>
        <Letters
          letters={letters}
          uid="u-me"
          isAdmin={admin}
          onSave={async (d, id) => {
            setLetters((ls) => id
              ? ls.map((l) => (l.id === id ? { ...l, ...d } : l))
              : [{ id: "l" + Date.now(), ...d, createdBy: "u-me", creatorName: "엄마", at: new Date().toISOString() }, ...ls]);
            toast(id ? "편지를 수정했어요." : "편지를 남겼어요 💛", "success");
          }}
          onDelete={async (l) => { setLetters((ls) => ls.filter((x) => x.id !== l.id)); toast("지웠어요."); }}
          onReply={async (l, text) => {
            setLetters((ls) => ls.map((x) => (x.id === l.id ? { ...x, reply: text, replyBy: "엄마", replyAt: new Date().toISOString() } : x)));
            toast("답장을 남겼어요 💜", "success");
          }}
          confirm={async (m) => window.confirm(m)}
        />
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold text-slate-800 dark:text-white">그 밖</h2>
        <Spinner label="불러오는 중..." />
        <Btn variant="ghost" className="w-full" onClick={() => setDark(!dark)}>
          {dark ? "밝게" : "어둡게"}
        </Btn>
      </Card>
    </main>
  );
}

export function Workbench() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
