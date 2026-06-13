import { useEffect, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, FileDown, RefreshCw } from "lucide-react";
import { api, downloadFile, extractError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { toLocalInput } from "@/lib/utils";
import type { Page } from "@/types";

export type FieldType =
  | "text"
  | "number"
  | "datetime"
  | "textarea"
  | "checkbox"
  | "select";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  step?: string;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface FilterDef {
  name: string;
  label: string;
  type: "text" | "select" | "date";
  options?: { value: string; label: string }[];
}

interface Props<T> {
  endpoint: string; // e.g. "production"
  title: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  filters?: FilterDef[];
  exportCategory: string;
  emptyRow: Record<string, unknown>;
}

export default function CrudPage<T extends { id: number }>({
  endpoint,
  title,
  columns,
  fields,
  filters = [],
  exportCategory,
  emptyRow,
}: Props<T>) {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin", "engineer");

  const [data, setData] = useState<Page<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyRow);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, size: 15 };
      if (q) params.q = q;
      for (const [k, v] of Object.entries(filterValues)) if (v) params[k] = v;
      const res = await api.get<Page<T>>(`/${endpoint}`, { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyRow });
    setModalOpen(true);
  }

  function openEdit(row: T) {
    const f: Record<string, unknown> = { ...row };
    // datetime 필드는 input 형식으로 변환
    for (const fd of fields) {
      if (fd.type === "datetime" && f[fd.name]) f[fd.name] = toLocalInput(f[fd.name] as string);
    }
    setEditing(row as unknown as Record<string, unknown>);
    setForm(f);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const fd of fields) {
        let v = form[fd.name];
        if (fd.type === "number") v = v === "" || v == null ? null : Number(v);
        if (fd.type === "datetime" && v) v = new Date(v as string).toISOString();
        payload[fd.name] = v;
      }
      if (editing) await api.patch(`/${endpoint}/${editing.id}`, payload);
      else await api.post(`/${endpoint}`, payload);
      setModalOpen(false);
      await load();
    } catch (e: any) {
      alert(extractError(e, "저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: T) {
    if (!confirm("이 데이터를 삭제하시겠습니까?")) return;
    await api.delete(`/${endpoint}/${row.id}`);
    await load();
  }

  async function exportAs(fmt: "xlsx" | "csv" | "pdf") {
    await downloadFile(`/export/${exportCategory}?fmt=${fmt}`, `${exportCategory}.${fmt}`);
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold">{title}</h1>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => exportAs("xlsx")}>
              <FileDown size={16} /> Excel
            </Button>
            <Button variant="ghost" onClick={() => exportAs("csv")}>
              <FileDown size={16} /> CSV
            </Button>
            <Button variant="ghost" onClick={() => exportAs("pdf")}>
              <FileDown size={16} /> PDF
            </Button>
            {canEdit && (
              <Button onClick={openCreate}>
                <Plus size={16} /> 추가
              </Button>
            )}
          </div>
        </div>

        {/* 필터 */}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="통합 검색..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
              />
            </div>
          </div>
          {filters.map((f) => (
            <div key={f.name} className="min-w-[140px]">
              {f.type === "select" ? (
                <Select
                  value={filterValues[f.name] || ""}
                  onChange={(e) =>
                    setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                >
                  <option value="">{f.label} 전체</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={f.type === "date" ? "date" : "text"}
                  placeholder={f.label}
                  value={filterValues[f.name] || ""}
                  onChange={(e) =>
                    setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
          <Button variant="soft" onClick={() => (setPage(1), load())}>
            <RefreshCw size={16} /> 검색
          </Button>
        </div>
      </Card>

      {/* 테이블 */}
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                {columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {c.label}
                  </th>
                ))}
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/20 transition hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="whitespace-nowrap px-4 py-2.5">
                      {c.render ? c.render(row) : String((row as any)[c.key] ?? "-")}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-accent/10 hover:text-accent"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(row)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="p-10 text-center text-slate-400">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {/* 페이지네이션 */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-sm text-slate-500">
            {data.page} / {data.pages} (총 {data.total}건)
          </span>
          <Button
            variant="ghost"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}

      {/* 입력/수정 모달 */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `${title} 수정` : `${title} 추가`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((fd) => (
            <div key={fd.name} className={fd.type === "textarea" ? "sm:col-span-2" : ""}>
              <Field label={fd.label}>
                {fd.type === "select" ? (
                  <Select
                    value={String(form[fd.name] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [fd.name]: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {fd.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : fd.type === "textarea" ? (
                  <textarea
                    className="input-glass min-h-[70px]"
                    value={String(form[fd.name] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [fd.name]: e.target.value }))}
                  />
                ) : fd.type === "checkbox" ? (
                  <label className="flex h-[42px] items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-accent"
                      checked={Boolean(form[fd.name])}
                      onChange={(e) => setForm((f) => ({ ...f, [fd.name]: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-500">완료</span>
                  </label>
                ) : (
                  <Input
                    type={
                      fd.type === "datetime" ? "datetime-local" : fd.type === "number" ? "number" : "text"
                    }
                    step={fd.step}
                    value={String(form[fd.name] ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, [fd.name]: e.target.value }))}
                  />
                )}
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            취소
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner /> : "저장"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
