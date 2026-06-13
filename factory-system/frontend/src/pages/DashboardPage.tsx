import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Factory,
  TrendingUp,
  Percent,
  AlertTriangle,
  XOctagon,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, Spinner } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import type { Kpi } from "@/types";

const COLORS = ["#0a84ff", "#64d2ff", "#5e5ce6", "#bf5af2", "#ff9f0a", "#30d158"];

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: any;
  label: string;
  value: string | number;
  suffix?: string;
  tone: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{ background: tone, boxShadow: `0 8px 20px ${tone}55` }}
      >
        <Icon size={22} />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold">
          {value}
          {suffix && <span className="ml-0.5 text-sm font-medium text-slate-400">{suffix}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [fails, setFails] = useState<any[]>([]);
  const [process, setProcess] = useState<any[]>([]);
  const [quality, setQuality] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/kpi"),
      api.get("/dashboard/production-trend?days=30"),
      api.get("/dashboard/equipment-fails"),
      api.get("/dashboard/process-output"),
      api.get("/dashboard/quality-summary"),
    ])
      .then(([k, t, f, p, q]) => {
        setKpi(k.data);
        setTrend(t.data);
        setFails(f.data);
        setProcess(p.data);
        setQuality(q.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center p-20">
        <Spinner className="h-10 w-10" />
      </div>
    );

  return (
    <div className="space-y-4">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Factory} label="일일 생산량" value={formatNumber(kpi?.daily_production ?? 0)} tone="#0a84ff" />
        <KpiCard icon={TrendingUp} label="월 생산량" value={formatNumber(kpi?.monthly_production ?? 0)} tone="#5e5ce6" />
        <KpiCard icon={Percent} label="평균 수율" value={kpi?.avg_yield ?? 0} suffix="%" tone="#30d158" />
        <KpiCard icon={AlertTriangle} label="설비 이상" value={kpi?.equipment_fail_count ?? 0} suffix="건" tone="#ff9f0a" />
        <KpiCard icon={XOctagon} label="품질 부적합" value={kpi?.quality_ng_count ?? 0} suffix="건" tone="#ff453a" />
        <KpiCard icon={ShieldAlert} label="안전 미완료" value={kpi?.safety_open_count ?? 0} suffix="건" tone="#bf5af2" />
      </div>

      {/* 생산량/수율 추이 */}
      <Card>
        <h2 className="mb-4 text-base font-bold">최근 30일 생산량 · 수율 추이</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#0a84ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[90, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="quantity"
              name="생산량"
              stroke="#0a84ff"
              fill="url(#g1)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yield_rate"
              name="수율(%)"
              stroke="#30d158"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 공정별 생산량 */}
        <Card>
          <h2 className="mb-4 text-base font-bold">공정별 누적 생산량</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={process}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
              <XAxis dataKey="process" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantity" name="생산량" radius={[8, 8, 0, 0]}>
                {process.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 설비별 이상 발생 */}
        <Card>
          <h2 className="mb-4 text-base font-bold">설비별 이상(FAIL) 발생 건수</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={fails} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="equipment" width={80} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="fails" name="FAIL" fill="#ff9f0a" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 품질 항목별 OK/NG */}
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-bold">품질 항목별 OK / NG</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={quality}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,140,0.15)" />
              <XAxis dataKey="item" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="OK" stackId="a" fill="#30d158" radius={[0, 0, 0, 0]} />
              <Bar dataKey="NG" stackId="a" fill="#ff453a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
