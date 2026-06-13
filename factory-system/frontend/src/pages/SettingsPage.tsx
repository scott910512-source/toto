import { useRef, useState } from "react";
import { Download, Upload, Database, Moon, Sun } from "lucide-react";
import { api, downloadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";
import { Button, Card, Spinner } from "@/components/ui";

export default function SettingsPage() {
  const { hasRole, user } = useAuth();
  const { theme, toggle } = useTheme();
  const isAdmin = hasRole("admin");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);

  async function backup() {
    setBusy(true);
    try {
      await downloadFile("/backup/export", "factory_backup.json");
    } finally {
      setBusy(false);
    }
  }

  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const warn = replaceMode
      ? "전체 교체 모드입니다. 기존 데이터를 모두 삭제하고 백업으로 덮어씁니다. 계속할까요?"
      : "백업 파일을 복원합니다. 기존 데이터에 추가됩니다. 계속할까요?";
    if (!confirm(warn)) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post(`/backup/import?replace=${replaceMode}`, fd);
      setMsg(`복원 완료: ${JSON.stringify(res.data.imported)}`);
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || "복원 실패");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function seed() {
    if (!confirm("가상 데이터를 생성합니다(데이터가 비어있을 때만). 계속할까요?")) return;
    setBusy(true);
    try {
      const res = await api.post("/admin/seed");
      setMsg(`시드 결과: ${JSON.stringify(res.data)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h1 className="text-lg font-bold">설정</h1>
        <p className="mt-1 text-sm text-slate-500">계정: {user?.full_name} ({user?.role})</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-bold">화면 테마</h2>
        <Button variant="ghost" onClick={toggle}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        </Button>
      </Card>

      {isAdmin && (
        <Card>
          <h2 className="mb-3 text-base font-bold">데이터 백업 · 복원</h2>
          <div className="flex flex-wrap gap-2">
            <Button onClick={backup} disabled={busy}>
              <Download size={16} /> 백업 다운로드 (JSON)
            </Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={16} /> 백업 복원
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={restore} />
            <Button variant="soft" onClick={seed} disabled={busy}>
              <Database size={16} /> 가상 데이터 생성
            </Button>
            {busy && <Spinner />}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-red-500"
              checked={replaceMode}
              onChange={(e) => setReplaceMode(e.target.checked)}
            />
            <span>
              복원 시 <b className="text-red-500">전체 교체</b> (기존 데이터를 모두 삭제 후 덮어쓰기)
            </span>
          </label>
          <p className="mt-2 text-xs text-slate-400">
            체크 해제 시 기존 데이터에 <b>추가</b>로 적재됩니다. 백업 파일(JSON)은 다운로드 폴더에 저장되니 사내 스토리지에 보관하세요.
          </p>
          {msg && (
            <div className="mt-3 break-all rounded-xl bg-white/40 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {msg}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
