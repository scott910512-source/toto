import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Btn } from "@/components/ui/Btn";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Field, inputCls } from "@/components/ui/Field";
import { canSeeLetter } from "@/lib/visibility";
import { fmtDateTime } from "@/lib/dates";
import { LetterEditor, type LetterDraft } from "./LetterEditor";

/* 편지 — app.html 의 Letters 를 옮긴 것.

   DB 는 모른다. 편지 목록과 "저장·삭제·답장" 콜백을 받는다. 그래서 가짜
   목록으로 테스트하고, 작업대에서 눈으로 볼 수 있다. 누가 무엇을 볼 수
   있는지는 canSeeLetter 한 벌이 정한다 (진짜 차단은 DB 가 한다). */

export interface Letter {
  id: string;
  title?: string;
  body?: string;
  image?: string | null;
  vis?: string;
  createdBy?: string;
  creatorName?: string;
  at?: unknown;
  reply?: string | null;
  replyBy?: string | null;
  replyAt?: unknown;
}

export interface LettersProps {
  /** null 이면 아직 불러오는 중 */
  letters: Letter[] | null;
  uid: string;
  isAdmin: boolean;
  /** 새 편지 또는 수정. id 가 있으면 수정이다. */
  onSave: (draft: LetterDraft, id?: string) => Promise<void>;
  onDelete: (letter: Letter) => Promise<void>;
  /** 관리자만 쓴다 */
  onReply: (letter: Letter, text: string) => Promise<void>;
  /** 삭제 확인. 기본은 window.confirm 이지만 앱은 자기 확인창을 넣는다 */
  confirm?: (msg: string) => Promise<boolean>;
  /** 사진 첨부를 dataURL 로 바꾸는 일 (앱의 compressToDataURL). 없으면 첨부 버튼이 없다 */
  readImage?: (file: File) => Promise<string>;
}

const isPrivate = (l: Letter) => l.vis === "private";

export function Letters({ letters, uid, isAdmin, onSave, onDelete, onReply, confirm, readImage }: LettersProps) {
  const ask = confirm ?? (async (m: string) => window.confirm(m));
  const visible = useMemo(
    () => letters && letters.filter((l) => canSeeLetter(l, uid, isAdmin)),
    [letters, uid, isAdmin],
  );
  const [who, setWho] = useState("all");
  const items = visible && (who === "all" ? visible : visible.filter((l) => l.createdBy === who));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Letter | null>(null);
  const [viewing, setViewing] = useState<Letter | null>(null);

  // 등록자 목록 (보이는 편지 기준)
  const authors = useMemo(() => {
    const m = new Map<string, string>();
    (visible || []).forEach((l) => { if (l.createdBy) m.set(l.createdBy, l.creatorName || "이름없음"); });
    return [...m.entries()];
  }, [visible]);

  // 열어 둔 편지가 바깥에서 바뀌면(답장 등) 최신 것을 보여준다
  const current = viewing && ((letters || []).find((l) => l.id === viewing.id) ?? viewing);
  const mine = (l: Letter) => isAdmin || l.createdBy === uid;

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (l: Letter) => { setEditing(l); setEditorOpen(true); };

  return (
    <div className="p-4 space-y-4 pb-safe">
      <h1 className="sr-only">편지</h1>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-slate-800 dark:text-white">💌 편지</h2>
          <p className="text-xs text-slate-400">우리 아기에게 마음을 남겨보세요</p>
        </div>
        <Btn onClick={openNew} className="text-sm py-2 px-3">+ 편지 쓰기</Btn>
      </div>

      {authors.length > 1 && (
        <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="등록자별 보기" className={inputCls + " py-2 text-sm"}>
          <option value="all">✍️ 전체 등록자</option>
          {authors.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
        </select>
      )}

      {!items ? <Spinner /> : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">아직 편지가 없어요.<br />첫 편지를 남겨보세요 💛</Card>
      ) : (
        <ul className="space-y-3">
          {items.map((l) => (
            <li key={l.id}>
              <Card className="overflow-hidden active:scale-[.99] transition">
                <button onClick={() => setViewing(l)} className="block w-full text-left" aria-label={`편지 열기: ${l.title || "(제목 없음)"}`}>
                  {l.image && <img src={l.image} alt="" className="w-full max-h-48 object-cover" />}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3 className="font-bold text-slate-800 dark:text-white truncate">{isPrivate(l) && "🔒 "}{l.title || "(제목 없음)"}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {l.reply && mine(l) && <span className="text-[12px] bg-violet-100 text-violet-600 dark:bg-violet-900/40 rounded-full px-1.5 py-0.5">💜 답장</span>}
                        {l.image && <span className="text-xs text-slate-300" aria-hidden="true">🖼️</span>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-300" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{l.body}</p>
                    <p className="text-[12px] text-slate-400 mt-2">💛 {l.creatorName} · {fmtDateTime(l.at)}{isPrivate(l) && " · 나만보기"}</p>
                  </div>
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!current} onClose={() => setViewing(null)} title="💌 편지">
        {current && (
          <div className="space-y-3">
            {current.image && <img src={current.image} alt="첨부 이미지" className="w-full rounded-xl" />}
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{current.title || "(제목 없음)"}</h3>
            <p className="text-[12px] text-slate-400">💛 {current.creatorName} · {fmtDateTime(current.at)}</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{current.body}</p>

            {/* 답장: 편지 작성자와 관리자만 볼 수 있음 */}
            {current.reply && mine(current) && (
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
                <p className="text-[12px] text-violet-500 mb-1">💜 {current.replyBy || "관리자"}의 답장 · {fmtDateTime(current.replyAt)}</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{current.reply}</p>
              </div>
            )}
            {isAdmin && <ReplyBox key={current.id} letter={current} onReply={onReply} />}

            {mine(current) && (
              <div className="flex gap-2 pt-2">
                <Btn variant="lavender" className="flex-1 text-sm py-2.5" onClick={() => { const l = current; setViewing(null); openEdit(l); }}>✏️ 수정</Btn>
                <Btn variant="danger" className="flex-1 text-sm py-2.5" onClick={async () => {
                  if (await ask("이 편지를 삭제할까요?")) { await onDelete(current); setViewing(null); }
                }}>🗑️ 삭제</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      <LetterEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        letter={editing}
        readImage={readImage}
        onSave={(d) => onSave(d, editing?.id)}
      />
    </div>
  );
}

function ReplyBox({ letter, onReply }: { letter: Letter; onReply: LettersProps["onReply"] }) {
  const [text, setText] = useState(letter.reply || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    if (!text.trim()) { setErr("답장을 입력해주세요."); return; }
    setErr(null); setBusy(true);
    try { await onReply(letter, text.trim()); } finally { setBusy(false); }
  };
  return (
    <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
      <p className="text-xs font-medium text-violet-500 mb-1.5">💜 답장 쓰기 (작성자만 볼 수 있어요)</p>
      <Field label="답장">
        <textarea className={inputCls} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="따뜻한 답장을 남겨보세요..." />
      </Field>
      {err && <p role="alert" className="text-xs text-rose-500 mt-1">{err}</p>}
      <Btn variant="lavender" onClick={save} disabled={busy} className="w-full mt-2 text-sm py-2.5">
        {busy ? "저장 중..." : (letter.reply ? "답장 수정" : "답장 보내기")}
      </Btn>
    </div>
  );
}
