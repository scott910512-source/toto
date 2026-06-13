import { useEffect, useState } from "react";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { MATERIAL_CATEGORIES, MATERIAL_UNITS, opts } from "@/lib/constants";
import { formatDateTime, formatNumber, toLocalInput } from "@/lib/utils";
import type { MaterialItem, RawMaterial } from "@/types";

const CATEGORY_TONE: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  입고: "info",
  사용: "success",
  반품: "warning",
  폐기: "danger",
  사용대기: "neutral",
};
const OUTBOUND = ["사용", "폐기", "반품"];

export default function RawMaterialPage() {
  const { user } = useAuth();
  const [itemNames, setItemNames] = useState<string[]>([]);

  useEffect(() => {
    api.get<MaterialItem[]>("/material-items").then((r) => setItemNames(r.data.map((i) => i.material_name)));
  }, []);

  // 출고성 입력 시 FIFO/재고 검사 → 위반이면 확인창, 승인 시 confirmed_by 기록
  async function beforeSave(form: Record<string, unknown>) {
    const category = String(form.category || "");
    if (!OUTBOUND.includes(category)) return {};
    const material_name = String(form.material_name || "");
    const lot_number = String(form.lot_number || "");
    const quantity = Number(form.quantity) || 0;
    if (!material_name || !lot_number) return {};

    const { data } = await api.get("/inventory/fifo-check", {
      params: { material_name, lot_number, quantity },
    });
    const msgs: string[] = [];
    if (data.shortage)
      msgs.push(`⚠ 재고 부족: '${lot_number}' 현재 재고 ${data.available} (요청 ${quantity})`);
    if (data.fifo_violation) {
      const older = (data.older_lots || []).map((o: any) => `${o.lot_number}(${o.balance})`).join(", ");
      msgs.push(`⚠ 선입선출(FIFO) 위반: 더 오래된 LOT에 재고가 있습니다 → ${older}`);
    }
    if (msgs.length === 0) return {};

    const ok = window.confirm(
      msgs.join("\n") + "\n\n그래도 이 LOT로 진행하시겠습니까?\n(승인 시 승인자가 활동 이력에 기록됩니다)"
    );
    if (!ok) return null; // 취소
    return { confirmed_by: user?.full_name || user?.username || "" };
  }

  const fields: FieldDef[] = [
    { name: "occurred_at", label: "일시 (선택·직접입력)", type: "datetime" },
    { name: "category", label: "구분", type: "select", options: opts(MATERIAL_CATEGORIES) },
    { name: "material_name", label: "자재명 (마스터 선택·신규입력)", type: "text", datalist: itemNames },
    { name: "material_code", label: "자재코드", type: "text" },
    { name: "lot_number", label: "LOT/배치번호", type: "text" },
    { name: "grade", label: "규격/등급", type: "text" },
    { name: "quantity", label: "수량", type: "number", step: "0.01" },
    { name: "unit", label: "단위", type: "select", options: opts(MATERIAL_UNITS) },
    { name: "maker", label: "공급사(Maker)", type: "text" },
    { name: "mfg_date", label: "제조일", type: "date" },
    { name: "expiry_date", label: "유효기한", type: "date" },
    { name: "location", label: "보관위치", type: "text" },
    { name: "operator", label: "작업자", type: "text" },
    { name: "remark", label: "비고", type: "textarea" },
  ];

  return (
    <CrudPage<RawMaterial>
      endpoint="materials"
      exportCategory="material"
      title="원부재료 입출고"
      tabField="material_name"
      tabsEndpoint="/materials/material-names"
      beforeSave={beforeSave}
      filters={[
        { name: "category", label: "구분", type: "select", options: opts(MATERIAL_CATEGORIES) },
        { name: "lot_number", label: "LOT/배치", type: "text" },
      ]}
      columns={[
        { key: "occurred_at", label: "일시", render: (r) => formatDateTime(r.occurred_at) },
        {
          key: "category",
          label: "구분",
          render: (r) => <Badge tone={CATEGORY_TONE[r.category] ?? "neutral"}>{r.category}</Badge>,
        },
        { key: "material_name", label: "자재명" },
        { key: "lot_number", label: "LOT/배치" },
        { key: "grade", label: "규격" },
        { key: "quantity", label: "수량", render: (r) => `${formatNumber(r.quantity)} ${r.unit}` },
        { key: "maker", label: "공급사" },
        { key: "expiry_date", label: "유효기한", render: (r) => r.expiry_date || "-" },
        { key: "operator", label: "작업자" },
        {
          key: "confirmed_by",
          label: "FIFO승인",
          render: (r) => (r.confirmed_by ? <Badge tone="warning">{r.confirmed_by}</Badge> : ""),
        },
      ]}
      fields={fields}
      emptyRow={{
        occurred_at: toLocalInput(),
        category: "입고",
        material_name: "",
        material_code: "",
        lot_number: "",
        grade: "",
        quantity: 0,
        unit: "kg",
        maker: "",
        mfg_date: "",
        expiry_date: "",
        location: "",
        operator: "",
        remark: "",
      }}
    />
  );
}
