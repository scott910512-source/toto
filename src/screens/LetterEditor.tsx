import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/ui/Btn";
import { Modal } from "@/components/ui/Modal";
import { Field, inputCls } from "@/components/ui/Field";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { errMsg } from "@/lib/errors";

export type Vis = "private" | "public";

export interface LetterDraft {
  title: string;
  body: string;
  image: string | null;
  vis: Vis;
}

export interface LetterEditorProps {
  open: boolean;
  onClose: () => void;
  /** 수정할 편지. 없으면 새 편지 */
  letter?: { title?: string; body?: string; image?: string | null; vis?: string } | null;
  onSave: (draft: LetterDraft) => Promise<void>;
  /** 사진을 dataURL 로. 없으면 첨부 버튼을 보여주지 않는다 */
  readImage?: (file: File) => Promise<string>;
}

const VIS_OPTIONS = [
  { value: "private", label: "🔒 나만보기" },
  { value: "public", label: "🌐 전체공개" },
] as const;

/* 편지 쓰기/수정. 편지는 기본이 나만보기다 — 아기에게 쓰는 글은 사적인
   것이 많고, 공개는 쓰는 사람이 고르게 둔다. */
export function LetterEditor({ open, onClose, letter, onSave, readImage }: LetterEditorProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [vis, setVis] = useState<Vis>("private");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(letter?.title || "");
    setBody(letter?.body || "");
    setImage(letter?.image || null);
    setVis(letter?.vis === "public" ? "public" : "private");
    setBusy(false);
    setErr(null);
  }, [open, letter]);

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !readImage) return;
    try { setBusy(true); setImage(await readImage(f)); setErr(null); }
    catch (ex) { setErr(errMsg(ex)); }
    finally { setBusy(false); e.target.value = ""; }
  };

  const save = async () => {
    if (!body.trim() && !title.trim()) { setErr("내용을 입력해주세요."); return; }
    setErr(null); setBusy(true);
    try { await onSave({ title, body, image, vis }); onClose(); }
    catch (ex) { setErr(errMsg(ex)); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={letter ? "✏️ 편지 수정" : "💌 편지 쓰기"}>
      <div className="space-y-4">
        <ChipGroup label="공개 범위" value={vis} onChange={setVis} options={VIS_OPTIONS} />
        <p className="text-[12px] text-slate-400 -mt-1">나만보기는 본인과 관리자(엄마·아빠)만 볼 수 있어요.</p>
        <Field label="제목"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="사랑하는 우리 아기에게" /></Field>
        <Field label="내용">
          <textarea className={inputCls} rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 너에게 하고 싶은 이야기를 적어보세요..." />
        </Field>

        {readImage && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" aria-label="사진 파일" />
            <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={pickImage} className="hidden" aria-label="카메라" />
            {image ? (
              <div className="relative">
                <img src={image} alt="첨부 미리보기" className="w-full rounded-xl" />
                <button onClick={() => setImage(null)} aria-label="이미지 제거"
                  className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-white text-lg">
                  <span className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center" aria-hidden="true">×</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-5 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition">
                  <div className="text-2xl mb-1" aria-hidden="true">🖼️</div><p className="text-sm">사진 첨부</p>
                </button>
                <button onClick={() => camRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl py-5 text-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition">
                  <div className="text-2xl mb-1" aria-hidden="true">📷</div><p className="text-sm">사진 촬영</p>
                </button>
              </div>
            )}
          </>
        )}

        {err && <p role="alert" className="text-xs text-rose-500">{err}</p>}
        <Btn onClick={save} disabled={busy} className="w-full">{busy ? "저장 중..." : (letter ? "수정 저장" : "편지 남기기")}</Btn>
      </div>
    </Modal>
  );
}
