import { useId, type ReactNode } from "react";
import { Portal } from "./Portal";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** 화면 전체를 쓰는 모달 (사진 업로드처럼 내용이 긴 것) */
  full?: boolean;
  children?: ReactNode;
}

export function Modal({ open, onClose, title, full, children }: ModalProps) {
  const boxRef = useFocusTrap(open, onClose);
  // 한 화면에 모달이 둘 이상 열려도 제목 연결이 섞이지 않게 고유 id 를 쓴다
  const titleId = useId();

  if (!open) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center fade-in"
        onClick={onClose}
      >
        <div
          ref={boxRef}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          {...(title ? { "aria-labelledby": titleId } : { "aria-label": "대화상자" })}
          className={`slide-up bg-white dark:bg-slate-800 w-full outline-none ${
            full ? "h-full max-w-[430px]" : "max-w-[420px] rounded-t-3xl sm:rounded-3xl max-h-[92vh]"
          } overflow-y-auto`}
        >
          {title && (
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
              <h2 id={titleId} className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="text-2xl text-slate-400 hover:text-slate-600 w-9 h-9"
              >
                ×
              </button>
            </div>
          )}
          <div className="p-5">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
