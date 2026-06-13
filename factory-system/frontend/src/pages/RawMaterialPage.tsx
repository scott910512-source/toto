import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { EQUIPMENTS, MATERIAL_CATEGORIES, MATERIAL_UNITS, PROCESSES, opts } from "@/lib/constants";
import { formatDateTime, formatNumber, toLocalInput } from "@/lib/utils";
import type { RawMaterial } from "@/types";

const CATEGORY_TONE: Record<string, "info" | "success" | "warning" | "danger" | "neutral"> = {
  입고: "info",
  사용: "success",
  반품: "warning",
  폐기: "danger",
  사용대기: "neutral",
};

export default function RawMaterialPage() {
  return (
    <CrudPage<RawMaterial>
      endpoint="materials"
      exportCategory="material"
      title="원부재료 관리"
      tabField="material_name"
      tabsEndpoint="/materials/material-names"
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
        { key: "material_code", label: "자재코드" },
        { key: "lot_number", label: "LOT/배치" },
        { key: "grade", label: "규격/등급" },
        {
          key: "quantity",
          label: "수량",
          render: (r) => `${formatNumber(r.quantity)} ${r.unit}`,
        },
        { key: "maker", label: "공급사" },
        { key: "expiry_date", label: "유효기한", render: (r) => r.expiry_date || "-" },
        { key: "location", label: "보관위치" },
        { key: "operator", label: "작업자" },
      ]}
      fields={[
        { name: "occurred_at", label: "일시", type: "datetime" },
        { name: "category", label: "구분", type: "select", options: opts(MATERIAL_CATEGORIES) },
        { name: "material_name", label: "자재명", type: "text" },
        { name: "material_code", label: "자재코드", type: "text" },
        { name: "lot_number", label: "LOT/배치번호", type: "text" },
        { name: "grade", label: "규격/등급", type: "text" },
        { name: "quantity", label: "수량", type: "number", step: "0.01" },
        { name: "unit", label: "단위", type: "select", options: opts(MATERIAL_UNITS) },
        { name: "maker", label: "공급사(Maker)", type: "text" },
        { name: "mfg_date", label: "제조일", type: "date" },
        { name: "expiry_date", label: "유효기한", type: "date" },
        {
          name: "process_equipment",
          label: "사용 공정·설비",
          type: "select",
          options: opts([
            ...PROCESSES,
            ...EQUIPMENTS.map((e) => e),
          ]),
        },
        { name: "location", label: "보관위치", type: "text" },
        { name: "operator", label: "작업자", type: "text" },
        { name: "remark", label: "비고", type: "textarea" },
      ]}
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
        process_equipment: "",
        location: "",
        operator: "",
        remark: "",
      }}
    />
  );
}
