import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { Badge, Card, Input, Spinner } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import type { InventoryRow, LotStock } from "@/types";

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lots, setLots] = useState<LotStock[]>([]);
  const [lotLoading, setLotLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (q) params.q = q;
      if (lowOnly) params.low_only = true;
      setRows((await api.get<InventoryRow[]>("/inventory", { params })).data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowOnly]);

  async function toggle(name: string) {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    setLotLoading(true);
    try {
      setLots((await api.get<LotStock[]>("/inventory/lots", { params: { material_name: name } })).data);
    } finally {
      setLotLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold">재고 현황</h1>
          <p className="text-sm text-slate-500">품목별 현재고 (입고 − 사용·폐기·반품). 행을 누르면 LOT별 재고가 펼쳐집니다.</p>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-500">
              <input type="checkbox" className="h-4 w-4 accent-red-500" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              안전재고 미달만
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="품목 검색..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner className="h-8 w-8" /></div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/30 text-left text-xs uppercase text-slate-500 dark:border-white/10">
                <th className="px-4 py-3">품목명</th>
                <th className="px-4 py-3">코드</th>
                <th className="px-4 py-3 text-right">현재고</th>
                <th className="px-4 py-3 text-right">안전재고</th>
                <th className="px-4 py-3 text-right">보유 LOT</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <>
                  <tr
                    key={r.material_name}
                    onClick={() => toggle(r.material_name)}
                    className="cursor-pointer border-b border-white/20 transition hover:bg-white/40 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {expanded === r.material_name ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        {r.material_name}
                        {!r.in_master && <Badge tone="neutral">미등록</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.material_code}</td>
                    <td className={"px-4 py-2.5 text-right font-bold " + (r.low ? "text-red-500" : "")}>
                      {formatNumber(r.total_stock)} {r.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{r.safety_stock || "-"}</td>
                    <td className="px-4 py-2.5 text-right">{r.lot_count}</td>
                    <td className="px-4 py-2.5">
                      {r.low ? (
                        <Badge tone="danger">
                          <AlertTriangle size={11} className="mr-1 inline" />안전재고 미달
                        </Badge>
                      ) : (
                        <Badge tone="success">정상</Badge>
                      )}
                    </td>
                  </tr>
                  {expanded === r.material_name && (
                    <tr className="bg-white/30 dark:bg-white/5">
                      <td colSpan={6} className="px-8 py-3">
                        {lotLoading ? (
                          <Spinner />
                        ) : lots.length === 0 ? (
                          <span className="text-sm text-slate-400">재고 보유 LOT 없음</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {lots.map((l) => (
                              <div key={l.lot_number} className="rounded-xl bg-white/60 px-3 py-2 text-xs dark:bg-white/10">
                                <span className="font-semibold">{l.lot_number}</span>
                                <span className="ml-2 text-accent">{formatNumber(l.balance)} {r.unit}</span>
                                {l.first_in && <span className="ml-2 text-slate-400">입고 {l.first_in.slice(0, 10)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-slate-400">재고 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
