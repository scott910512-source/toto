import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Factory,
  Wrench,
  FlaskConical,
  ShieldAlert,
  Sparkles,
  Users,
  Settings,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "대시보드", icon: LayoutDashboard, end: true },
  { to: "/production", label: "생산 정보", icon: Factory },
  { to: "/equipment", label: "설비 점검", icon: Wrench },
  { to: "/quality", label: "품질 데이터", icon: FlaskConical },
  { to: "/safety", label: "안전 데이터", icon: ShieldAlert },
  { to: "/ai", label: "AI 검색", icon: Sparkles },
  { to: "/users", label: "사용자 관리", icon: Users, adminOnly: true },
  { to: "/settings", label: "설정 · 백업", icon: Settings },
];

export default function AppLayout() {
  const { user, logout, hasRole } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.adminOnly || hasRole("admin"));

  return (
    <div className="min-h-screen lg:flex">
      {/* 모바일 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "glass-strong fixed inset-y-0 left-0 z-40 m-0 w-64 rounded-none border-y-0 border-l-0 p-4 transition-transform lg:static lg:m-3 lg:rounded-2xl lg:border",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-2 pt-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/40">
            <Factory size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">현장 데이터</div>
            <div className="text-[11px] text-slate-500">통합 관리 시스템</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-accent text-white shadow-md shadow-accent/30"
                    : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 메인 */}
      <div className="flex-1 lg:py-3 lg:pr-3">
        {/* 상단바 */}
        <header className="glass sticky top-0 z-20 m-3 flex items-center gap-3 px-4 py-3 lg:mx-0 lg:mt-0">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="text-sm font-semibold lg:text-base">반도체 · 화학 공정 데이터</div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggle}
              className="rounded-xl bg-white/50 p-2 transition hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
              title="테마 전환"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{user?.full_name || user?.username}</div>
              <div className="text-[11px] uppercase text-accent">{user?.role}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-xl bg-white/50 p-2 transition hover:bg-red-500/10 dark:bg-white/10"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-3 lg:p-0 lg:pt-3 lg:px-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
