import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { HAZARDS, WORK_AREAS, opts } from "@/lib/constants";
import { formatDateTime, toLocalInput } from "@/lib/utils";
import type { Safety } from "@/types";

export default function SafetyPage() {
  return (
    <CrudPage<Safety>
      endpoint="safety"
      exportCategory="safety"
      title="안전 데이터"
      filters={[
        { name: "work_area", label: "작업구역", type: "select", options: opts(WORK_AREAS) },
        {
          name: "completed",
          label: "완료여부",
          type: "select",
          options: [
            { value: "true", label: "완료" },
            { value: "false", label: "미완료" },
          ],
        },
      ]}
      columns={[
        { key: "worked_at", label: "작업일시", render: (r) => formatDateTime(r.worked_at) },
        { key: "work_area", label: "작업구역" },
        { key: "hazard", label: "위험요인" },
        { key: "improvement", label: "개선조치" },
        { key: "manager", label: "담당자" },
        {
          key: "completed",
          label: "완료여부",
          render: (r) => (
            <Badge tone={r.completed ? "success" : "warning"}>
              {r.completed ? "완료" : "미완료"}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: "worked_at", label: "작업일시", type: "datetime" },
        { name: "work_area", label: "작업구역", type: "select", options: opts(WORK_AREAS) },
        { name: "hazard", label: "위험요인", type: "select", options: opts(HAZARDS) },
        { name: "improvement", label: "개선조치", type: "textarea" },
        { name: "manager", label: "담당자", type: "text" },
        { name: "completed", label: "완료여부", type: "checkbox" },
      ]}
      emptyRow={{
        worked_at: toLocalInput(),
        work_area: WORK_AREAS[0],
        hazard: HAZARDS[0],
        improvement: "",
        manager: "",
        completed: false,
      }}
    />
  );
}
