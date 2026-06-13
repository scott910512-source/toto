import { useEffect, useState } from "react";
import { History, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Button, Card, Input, Select, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog, Page } from "@/types";

const ACTION_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  CREATE: { label: "등록", tone: "success" },
  UPDATE: { label: "수정", tone: "warning" },
  DELETE: { label: "삭제", tone: "danger" },
};

const ENTITY_LABEL: Record<string, string> = {
  production: "생산",
  equipment: "설비점검",
  quality: "품질",
  safety: "안전",
  user: "사용자",
};

export default function AuditPage() {
  const [data, setData] = useState<Page<AuditLog> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size: 20 };
      if (q) params.q = q;
      if (action) params.action = action;
      if (entity) params.entity = entity;
      const res = await api.get<Page<AuditLog>>("/audit", { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2">
          <History className="text-accent" size={20} />
          <h1 className="text-lg font-bold">활동 이력 (감사 로그)</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          모든 사용자의 등록 · 수정 · 삭제 기록입니다. (관리자 전용)
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="사용자 · 내용 검색..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
            />
          </div>
          <Select value={action} onChange={(e) => setAction(e.target.value)} className="min-w-[120px]">
            <option value="">작업 전체</option>
            <option value="CREATE">등록</option>
            <option value="UPDATE">수정</option>
            <option value="DELETE">삭제</option>
          </Select>
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="min-w-[120px]">
            <option value="">구분 전체</option>
            <option value="production">생산</option>
            <option value="equipment">설비점검</option>
            <option value="quality">품질</option>
            <option value="safety">안전</option>
            <option value="user">사용자</option>
          </Select>
          <Button variant="soft" onClick={() => (setPage(1), load())}>
            <RefreshCw size={16} /> 검색
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                <th className="px-4 py-3">일시</th>
                <th className="px-4 py-3">사용자</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">작업</th>
                <th className="px-4 py-3">구분</th>
                <th className="px-4 py-3">대상ID</th>
                <th className="px-4 py-3">내용</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((r) => {
                const a = ACTION_LABEL[r.action] ?? { label: r.action, tone: "info" as const };
                return (
                  <tr key={r.id} className="border-b border-white/20 dark:border-white/5">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">{r.username}</td>
                    <td className="px-4 py-2.5 text-xs uppercase text-slate-400">{r.role}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={a.tone}>{a.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{ENTITY_LABEL[r.entity] ?? r.entity}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.entity_id ?? "-"}</td>
                    <td className="px-4 py-2.5">{r.summary}</td>
                  </tr>
                );
              })}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-sm text-slate-500">
            {data.page} / {data.pages} (총 {data.total}건)
          </span>
          <Button variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
