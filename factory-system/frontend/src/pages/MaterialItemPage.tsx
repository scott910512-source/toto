import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { extractError } from "@/lib/api";
import { MATERIAL_UNITS } from "@/lib/constants";
import type { MaterialItem } from "@/types";

export default function MaterialItemPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin", "engineer");
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialItem | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems((await api.get<MaterialItem[]>("/material-items")).data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ material_name: "", material_code: "", unit: "kg", maker: "", item_category: "화학", safety_stock: 0, note: "", active: true });
    setOpen(true);
  }
  function openEdit(it: MaterialItem) {
    setEditing(it);
    setForm({ ...it });
    setOpen(true);
  }
  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, safety_stock: Number(form.safety_stock) || 0 };
      if (editing) await api.patch(`/material-items/${editing.id}`, payload);
      else await api.post("/material-items", payload);
      setOpen(false);
      await load();
    } catch (e: any) {
      alert(extractError(e, "저장 실패"));
    } finally {
      setSaving(false);
    }
  }
  async function remove(it: MaterialItem) {
    if (!confirm(`품목 '${it.material_name}'을 삭제하시겠습니까?`)) return;
    await api.delete(`/material-items/${it.id}`);
    await load();
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center">
          <div>
            <h1 className="text-lg font-bold">품목 마스터</h1>
            <p className="mt-1 text-sm text-slate-500">관리할 원부재료 품목을 등록합니다. 입출고는 이 목록에서 선택합니다.</p>
          </div>
          {canEdit && (
            <Button className="ml-auto" onClick={openCreate}>
              <Plus size={16} /> 품목 추가
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                <th className="px-4 py-3">품목명</th>
                <th className="px-4 py-3">코드</th>
                <th className="px-4 py-3">분류</th>
                <th className="px-4 py-3">단위</th>
                <th className="px-4 py-3">공급사</th>
                <th className="px-4 py-3">안전재고</th>
                <th className="px-4 py-3">상태</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-white/20 dark:border-white/5">
                  <td className="px-4 py-2.5 font-medium">{it.material_name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{it.material_code}</td>
                  <td className="px-4 py-2.5">{it.item_category}</td>
                  <td className="px-4 py-2.5">{it.unit}</td>
                  <td className="px-4 py-2.5 text-slate-500">{it.maker}</td>
                  <td className="px-4 py-2.5">{it.safety_stock}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={it.active ? "success" : "neutral"}>{it.active ? "사용" : "미사용"}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(it)} className="rounded-lg p-1.5 text-slate-500 hover:bg-accent/10 hover:text-accent">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(it)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "품목 수정" : "품목 추가"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="품목명"><Input value={form.material_name} onChange={(e) => setForm({ ...form, material_name: e.target.value })} /></Field>
          <Field label="품목코드"><Input value={form.material_code} onChange={(e) => setForm({ ...form, material_code: e.target.value })} /></Field>
          <Field label="분류"><Input value={form.item_category} onChange={(e) => setForm({ ...form, item_category: e.target.value })} /></Field>
          <Field label="단위">
            <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {MATERIAL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="공급사(Maker)"><Input value={form.maker} onChange={(e) => setForm({ ...form, maker: e.target.value })} /></Field>
          <Field label="안전재고"><Input type="number" value={form.safety_stock} onChange={(e) => setForm({ ...form, safety_stock: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="비고"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-accent" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span className="text-sm">사용 품목</span>
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
