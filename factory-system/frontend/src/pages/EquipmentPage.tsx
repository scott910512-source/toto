import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { EQUIPMENTS, opts } from "@/lib/constants";
import { formatDateTime, toLocalInput } from "@/lib/utils";
import type { EquipmentCheck } from "@/types";

export default function EquipmentPage() {
  return (
    <CrudPage<EquipmentCheck>
      endpoint="equipment"
      exportCategory="equipment"
      title="설비 점검"
      filters={[
        { name: "equipment_name", label: "설비", type: "select", options: opts(EQUIPMENTS) },
        {
          name: "judgement",
          label: "판정",
          type: "select",
          options: [
            { value: "PASS", label: "PASS" },
            { value: "FAIL", label: "FAIL" },
          ],
        },
      ]}
      columns={[
        { key: "checked_at", label: "점검일시", render: (r) => formatDateTime(r.checked_at) },
        { key: "equipment_name", label: "설비" },
        { key: "inspector", label: "점검자" },
        { key: "check_item", label: "점검항목" },
        { key: "measured_value", label: "측정값" },
        { key: "standard_value", label: "기준값" },
        {
          key: "judgement",
          label: "판정",
          render: (r) => (
            <Badge tone={r.judgement === "PASS" ? "success" : "danger"}>{r.judgement}</Badge>
          ),
        },
        { key: "action", label: "조치내용" },
      ]}
      fields={[
        { name: "checked_at", label: "점검일시", type: "datetime" },
        { name: "equipment_name", label: "설비명", type: "select", options: opts(EQUIPMENTS) },
        { name: "inspector", label: "점검자", type: "text" },
        { name: "check_item", label: "점검항목", type: "text" },
        { name: "measured_value", label: "측정값", type: "number", step: "0.01" },
        { name: "standard_value", label: "기준값", type: "text" },
        {
          name: "judgement",
          label: "판정",
          type: "select",
          options: [
            { value: "PASS", label: "PASS" },
            { value: "FAIL", label: "FAIL" },
          ],
        },
        { name: "action", label: "조치내용", type: "textarea" },
      ]}
      emptyRow={{
        checked_at: toLocalInput(),
        equipment_name: EQUIPMENTS[0],
        inspector: "",
        check_item: "온도",
        measured_value: 100,
        standard_value: "90 ~ 110",
        judgement: "PASS",
        action: "",
      }}
    />
  );
}
