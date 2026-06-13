import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Factory, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Field, Input, Spinner } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-strong w-full max-w-md p-8 animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-white shadow-xl shadow-accent/40">
            <Factory size={30} />
          </div>
          <h1 className="text-xl font-bold">현장 데이터 통합 관리 시스템</h1>
          <p className="mt-1 text-sm text-slate-500">반도체 · 화학 공정 데이터 플랫폼</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="아이디">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </Field>
          <Field label="비밀번호">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && (
            <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner /> : (<><LogIn size={16} /> 로그인</>)}
          </Button>
        </form>

        <div className="mt-6 rounded-xl bg-white/40 p-3 text-xs text-slate-500 dark:bg-white/5">
          <div className="font-semibold">데모 계정</div>
          <div>관리자: admin / admin1234</div>
          <div>엔지니어: engineer / engineer1234</div>
          <div>조회: viewer / viewer1234</div>
        </div>
      </div>
    </div>
  );
}
