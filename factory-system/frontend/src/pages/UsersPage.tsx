import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { Role, User } from "@/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "관리자",
  engineer: "엔지니어",
  viewer: "조회",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<User[]>("/users");
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ username: "", full_name: "", role: "viewer", password: "", is_active: true });
    setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ full_name: u.full_name, role: u.role, password: "", is_active: u.is_active });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        const payload: any = { full_name: form.full_name, role: form.role, is_active: form.is_active };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${editing.id}`, payload);
      } else {
        await api.post("/users", form);
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      alert(extractError(e, "저장 실패"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    if (!confirm(`${u.username} 사용자를 삭제하시겠습니까?`)) return;
    await api.delete(`/users/${u.id}`);
    await load();
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center">
          <h1 className="text-lg font-bold">사용자 · 권한 관리</h1>
          <Button className="ml-auto" onClick={openCreate}>
            <Plus size={16} /> 사용자 추가
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                <th className="px-4 py-3">아이디</th>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">권한</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">생성일</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/20 dark:border-white/5">
                  <td className="px-4 py-2.5 font-medium">{u.username}</td>
                  <td className="px-4 py-2.5">{u.full_name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.role === "admin" ? "info" : u.role === "engineer" ? "success" : "neutral"}>
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={u.is_active ? "success" : "danger"}>
                      {u.is_active ? "활성" : "비활성"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{formatDateTime(u.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-slate-500 hover:bg-accent/10 hover:text-accent">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(u)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "사용자 수정" : "사용자 추가"}>
        <div className="space-y-3">
          {!editing && (
            <Field label="아이디">
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Field>
          )}
          <Field label="이름">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label={editing ? "비밀번호 (변경 시에만 입력)" : "비밀번호"}>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="권한">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">관리자</option>
              <option value="engineer">엔지니어</option>
              <option value="viewer">조회</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-accent" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span className="text-sm">활성 계정</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : "저장"}</Button>
        </div>
      </Modal>
    </div>
  );
}
