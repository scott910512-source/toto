import CrudPage from "@/components/CrudPage";
import { EQUIPMENTS, PROCESSES, opts } from "@/lib/constants";
import { formatDateTime, formatNumber, toLocalInput } from "@/lib/utils";
import type { Production } from "@/types";

export default function ProductionPage() {
  return (
    <CrudPage<Production>
      endpoint="production"
      exportCategory="production"
      title="생산 정보"
      filters={[
        { name: "process_name", label: "공정", type: "select", options: opts(PROCESSES) },
        { name: "equipment_name", label: "설비", type: "select", options: opts(EQUIPMENTS) },
        { name: "lot_number", label: "LOT", type: "text" },
      ]}
      columns={[
        { key: "produced_at", label: "생산일시", render: (r) => formatDateTime(r.produced_at) },
        { key: "process_name", label: "공정" },
        { key: "equipment_name", label: "설비" },
        { key: "lot_number", label: "LOT" },
        { key: "operator", label: "작업자" },
        { key: "quantity", label: "생산량", render: (r) => formatNumber(r.quantity) },
        {
          key: "yield_rate",
          label: "수율(%)",
          render: (r) => (
            <span className={r.yield_rate < 95 ? "font-semibold text-amber-500" : ""}>
              {r.yield_rate}
            </span>
          ),
        },
        { key: "remark", label: "비고" },
      ]}
      fields={[
        { name: "produced_at", label: "생산일시", type: "datetime", required: true },
        { name: "process_name", label: "공정명", type: "select", options: opts(PROCESSES) },
        { name: "equipment_name", label: "설비명", type: "select", options: opts(EQUIPMENTS) },
        { name: "lot_number", label: "LOT 번호", type: "text", required: true },
        { name: "operator", label: "작업자", type: "text" },
        { name: "quantity", label: "생산량", type: "number" },
        { name: "yield_rate", label: "수율(%)", type: "number", step: "0.01" },
        { name: "remark", label: "비고", type: "textarea" },
      ]}
      emptyRow={{
        produced_at: toLocalInput(),
        process_name: PROCESSES[0],
        equipment_name: EQUIPMENTS[0],
        lot_number: "",
        operator: "",
        quantity: 0,
        yield_rate: 98,
        remark: "",
      }}
    />
  );
}
