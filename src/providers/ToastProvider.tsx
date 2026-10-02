import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Portal } from "@/components/ui/Portal";

/* 화면 위에 잠깐 뜨는 알림.

   한 번 눌러 바로 저장되는 기록은 잘못 누르기 쉬우므로, undo 를 주면
   8초 동안 "실행취소" 버튼이 함께 뜬다. 확인창을 앞에 세우면 빠른 기록의
   의미가 없으니 뒤에 둔 것이다. */

export type ToastType = "info" | "success" | "error";

export interface ToastOptions {
  /** 누르면 되돌리는 동작. 주면 머무는 시간이 길어진다. */
  undo?: () => void | Promise<void>;
  /** 머무는 시간(ms). 기본은 undo 가 있으면 8초, 없으면 3.2초 */
  ms?: number;
}

export type Push = (msg: string, type?: ToastType, opts?: ToastOptions) => void;

interface Item {
  id: number;
  msg: string;
  type: ToastType;
  undo?: () => void | Promise<void>;
}

const ToastCtx = createContext<Push>(() => {});
export const useToast = (): Push => useContext(ToastCtx);

const BG: Record<ToastType, string> = {
  error: "bg-rose-500",
  success: "bg-teal-500",
  info: "bg-slate-700",
};

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const drop = useCallback((id: number) => {
    setItems((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback<Push>((msg, type = "info", opts = {}) => {
    const id = ++seq.current;
    const ms = opts.ms ?? (opts.undo ? 8000 : 3200);
    setItems((t) => [...t, { id, msg, type, undo: opts.undo }]);
    timers.current.set(id, setTimeout(() => drop(id), ms));
  }, [drop]);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <Portal>
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[120] flex flex-col gap-2 w-[92%] max-w-[400px]"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
          aria-live="assertive"
        >
          {items.map((t) => (
            <div
              key={t.id}
              role="alert"
              className={`fade-in flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${BG[t.type]}`}
            >
              <span className="flex-1 min-w-0">{t.msg}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => {
                    drop(t.id);
                    // 되돌리기가 실패해도 알림은 이미 사라졌다. 조용히 삼키지 않고 남긴다.
                    void Promise.resolve()
                      .then(() => t.undo?.())
                      .catch((e) => console.error("실행취소 실패:", e));
                  }}
                  className="shrink-0 -my-1 px-3 py-2 rounded-lg bg-white/25 font-bold whitespace-nowrap"
                >
                  실행취소
                </button>
              )}
            </div>
          ))}
        </div>
      </Portal>
    </ToastCtx.Provider>
  );
}
