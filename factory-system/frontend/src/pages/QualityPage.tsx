import CrudPage from "@/components/CrudPage";
import { Badge } from "@/components/ui";
import { QUALITY_ITEMS, opts } from "@/lib/constants";
import { formatDateTime, toLocalInput } from "@/lib/utils";
import type { Quality } from "@/types";

export default function QualityPage() {
  return (
    <CrudPage<Quality>
      endpoint="quality"
      exportCategory="quality"
      title="품질 데이터"
      filters={[
        { name: "item_name", label: "항목", type: "select", options: opts(QUALITY_ITEMS) },
        { name: "lot_number", label: "LOT", type: "text" },
        {
          name: "result",
          label: "결과",
          type: "select",
          options: [
            { value: "OK", label: "OK" },
            { value: "NG", label: "NG" },
          ],
        },
      ]}
      columns={[
        { key: "sample_number", label: "샘플번호" },
        { key: "lot_number", label: "LOT" },
        { key: "analyzed_at", label: "분석일시", render: (r) => formatDateTime(r.analyzed_at) },
        { key: "analyst", label: "분석자" },
        { key: "item_name", label: "항목" },
        { key: "measured_value", label: "측정값" },
        { key: "spec", label: "규격", render: (r) => `${r.spec_lower} ~ ${r.spec_upper}` },
        {
          key: "result",
          label: "결과",
          render: (r) => <Badge tone={r.result === "OK" ? "success" : "danger"}>{r.result}</Badge>,
        },
      ]}
      fields={[
        { name: "sample_number", label: "샘플번호", type: "text" },
        { name: "lot_number", label: "LOT 번호", type: "text" },
        { name: "analyzed_at", label: "분석일시", type: "datetime" },
        { name: "analyst", label: "분석자", type: "text" },
        { name: "item_name", label: "항목명", type: "select", options: opts(QUALITY_ITEMS) },
        { name: "measured_value", label: "측정값", type: "number", step: "0.001" },
        { name: "spec_lower", label: "규격 하한", type: "number", step: "0.001" },
        { name: "spec_upper", label: "규격 상한", type: "number", step: "0.001" },
        {
          name: "result",
          label: "결과",
          type: "select",
          options: [
            { value: "OK", label: "OK" },
            { value: "NG", label: "NG" },
          ],
        },
      ]}
      emptyRow={{
        sample_number: "",
        lot_number: "",
        analyzed_at: toLocalInput(),
        analyst: "",
        item_name: QUALITY_ITEMS[0],
        measured_value: 0,
        spec_lower: 0,
        spec_upper: 50,
        result: "OK",
      }}
    />
  );
}
