import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { MAPPERS } from "@/repositories/legacyMappers";

/* 누가 로그인했고 무엇을 할 수 있나.

   ⚠️ 권한은 DB 가 정한 것만 믿는다.
      예전에는 이메일이 ADMIN_EMAILS 에 있으면 화면이 스스로 관리자 권한을
      줬다. DB 가 거부하니 눌러도 안 되는 버튼만 보이고, 권한 판단이 두 곳으로
      갈렸다. 여기서는 프로필의 role·approved 만 본다.

   프로필을 만들거나 role 을 쓰지 않는다. DB 트리거(handle_new_user)가 만든다.
   접속일은 touch_login() 이 남긴다. */

/* 화면이 보는 프로필. role 은 화면 이름(admin/member/viewer)이다 —
   DB 이름(admin/parent/family/gallery_only)과 다르며 변환은 mapper 가 한다. */
export interface UiProfile {
  uid: string;
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  roleDb: string;
  approved: boolean;
  disabled: boolean;
  loginDays: string[];
  letterCount: number;
  createdAt: string | null;
}

export interface AuthState {
  /** undefined = 아직 확인 중 · null = 로그인 안 함 */
  user: { id: string; email: string | null } | null | undefined;
  profile: UiProfile | null;
  isAdmin: boolean;
  approved: boolean;
  /** 관리자여야 하는데 DB 는 아니라고 할 때 — 조용히 권한을 주지 않고 알린다 */
  adminMismatch: boolean;
}

/* 쓰는 만큼만 적은 Supabase 모양. 전체 타입을 끌어오면 테스트에서
   가짜 클라이언트를 만들 수 없다. */
export interface AuthClient {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string; email?: string | null } } | null } }>;
    onAuthStateChange: (
      cb: (e: string, s: { user: { id: string; email?: string | null } } | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }> };
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ error: unknown }>;
}

const EMPTY: AuthState = {
  user: undefined, profile: null, isAdmin: false, approved: false, adminMismatch: false,
};

const AuthCtx = createContext<AuthState>(EMPTY);
export const useAuth = (): AuthState => useContext(AuthCtx);

export interface AuthProviderProps {
  client: AuthClient;
  /** 관리자여야 하는 이메일. 권한을 주는 게 아니라, 어긋났을 때 알리는 데만 쓴다. */
  adminEmails?: readonly string[];
  children?: ReactNode;
}

export function AuthProvider({ client, adminEmails = [], children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthState["user"]>(undefined);
  const [profile, setProfile] = useState<UiProfile | null>(null);

  // 로그인 상태
  useEffect(() => {
    let alive = true;
    const take = (u: { id: string; email?: string | null } | null | undefined) =>
      (u ? { id: u.id, email: u.email ?? null } : null);

    void client.auth.getSession().then(({ data }) => {
      if (alive) setUser(take(data.session?.user));
    });
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => {
      if (alive) setUser(take(s?.user));
    });
    return () => { alive = false; try { sub.subscription.unsubscribe(); } catch { /* 무시 */ } };
  }, [client]);

  // 내 프로필 (권한의 출처)
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let alive = true;
    void (async () => {
      const { data, error } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!alive) return;
      if (error || !data) { setProfile(null); return; }
      setProfile(MAPPERS.users!.fromDb(data) as unknown as UiProfile);
    })();
    // 오늘 들어왔다는 기록만 남긴다. role 등은 절대 쓰지 않는다.
    void client.rpc("touch_login").then(({ error }) => {
      if (error) console.warn("접속 기록 실패(계속 진행):", error);
    }).catch(() => {});
    return () => { alive = false; };
  }, [client, user]);

  const isAdmin = profile?.role === "admin" && profile.approved !== false;
  const approved = !!profile && profile.approved !== false;
  const lower = adminEmails.map((e) => e.toLowerCase());
  const adminMismatch =
    !!user?.email && !!profile && lower.includes(user.email.toLowerCase()) && !isAdmin;

  return (
    <AuthCtx.Provider value={{ user, profile, isAdmin, approved, adminMismatch }}>
      {children}
    </AuthCtx.Provider>
  );
}
