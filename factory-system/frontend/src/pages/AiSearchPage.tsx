import { useEffect, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Button, Card, Input, Spinner } from "@/components/ui";
import type { AiAnswer } from "@/types";

export default function AiSearchPage() {
  const [question, setQuestion] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/ai/examples").then((r) => setExamples(r.data.examples));
  }, []);

  async function ask(q?: string) {
    const text = q ?? question;
    if (!text.trim()) return;
    setQuestion(text);
    setLoading(true);
    try {
      const res = await api.post<AiAnswer>("/ai/ask", { question: text });
      setAnswer(res.data);
    } finally {
      setLoading(false);
    }
  }

  const columns = answer?.rows?.length ? Object.keys(answer.rows[0]) : [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2">
          <Sparkles className="text-accent" />
          <h1 className="text-lg font-bold">AI 자연어 검색</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          자연어로 질문하면 데이터베이스를 조회하여 답변합니다.
        </p>

        <div className="mt-4 flex gap-2">
          <Input
            placeholder="예: 지난달 수율이 가장 낮았던 LOT 보여줘"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={() => ask()} disabled={loading}>
            {loading ? <Spinner /> : <Send size={16} />}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => ask(ex)}
              className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent transition hover:bg-accent/20"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {answer && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-500">답변</div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">
                {answer.answer}
              </p>
            </div>
          </div>

          {columns.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                    {columns.map((c) => (
                      <th key={c} className="px-3 py-2 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {answer.rows.map((row, i) => (
                    <tr key={i} className="border-b border-white/15 dark:border-white/5">
                      {columns.map((c) => (
                        <td key={c} className="px-3 py-2">
                          {String(row[c] ?? "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
