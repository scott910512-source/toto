/* ============================================================================
   화면에 띄우는 참고 안내.

   ⚠️ 이 앱은 진단 도구가 아니다. 여기 나오는 범위는 일반적인 참고값이고,
      판단은 의료진이 한다. 그래서 "정상/비정상" 이라고 쓰지 않는다.

   그럼에도 테스트를 붙이는 이유: 숫자 경계가 틀리면 부모가 잘못 안심하거나
   불필요하게 불안해한다. 38.0℃ 를 "조금 높음" 으로 보여주는 식의 실수를
   막는 게 목적이다.
   ========================================================================== */

export interface Stage {
  label: string;
  color: string;
  bg: string;
  msg: string;
}

/** 체온 단계. 입력이 없으면 null (아무것도 보여주지 않는다) */
export function tempStage(t: number | null | undefined): Stage | null {
  if (t == null || !Number.isFinite(t)) return null;
  if (t < 36.0) {
    return {
      label: "낮은 편",
      color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/30",
      msg: "일반적인 참고 범위(36.5~37.5℃)보다 낮게 적혔어요. 보온 후에도 이어지면 소아과에 문의해보세요.",
    };
  }
  if (t <= 37.5) {
    return {
      label: "참고 범위",
      color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-900/30",
      msg: "흔히 말하는 참고 범위(36.5~37.5℃) 안이에요. 아기 모습이 평소와 다르면 수치와 무관하게 진료를 받아보세요.",
    };
  }
  if (t < 38.0) {
    return {
      label: "조금 높음",
      color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30",
      msg: "참고 범위보다 조금 높아요. 경과를 적어두시고, 처짐·수유 거부 같은 변화가 있으면 진료를 받아보세요.",
    };
  }
  return {
    label: "38℃ 이상",
    color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/30",
    msg: "⚠️ 38℃ 이상으로 적혔어요. 생후 3개월 미만이면 바로 소아과 진료를 권합니다.",
  };
}

/** 태아 심박수 참고 범위 120~160 bpm */
export function fhrCheck(bpm: number | string | null | undefined): { ok: boolean; msg: string } | null {
  if (bpm == null || bpm === "") return null;
  const v = Number(bpm);
  if (!Number.isFinite(v)) return null;
  if (v >= 120 && v <= 160) {
    return { ok: true, msg: "일반적인 참고 범위(120~160 bpm) 안이에요." };
  }
  return {
    ok: false,
    msg: "⚠️ 참고 범위(120~160 bpm) 밖으로 적혔어요. 진료 때 이 기록을 보여주세요. 판단은 산부인과에서 받아야 합니다.",
  };
}

/** CRL(머리-엉덩이 길이)은 6~13주에만 의미가 있다 */
export function crlGuide(week: number | string | null | undefined): { ok: boolean; msg: string } | null {
  if (week == null || week === "") return null;
  const w = Number(week);
  if (!Number.isFinite(w)) return null;
  if (w >= 6 && w <= 13) {
    return { ok: true, msg: "CRL(머리-엉덩이 길이)은 임신 6~13주 주수 측정에 가장 정확합니다." };
  }
  return {
    ok: false,
    msg: "CRL은 보통 6~13주에만 측정합니다. 13주 이후엔 BPD/HC/AC/FL로 주수·체중을 추정합니다.",
  };
}

/* 계정 등급 이름. DB 는 admin/parent/family/gallery_only 를 쓰지만
   화면은 Firebase 시절 이름(admin/member/viewer)을 쓴다. */
export const ROLE_LABEL: Record<string, string> = {
  admin: "관리자", member: "구성원", viewer: "관람전용",
};

/** 모르는 역할은 가장 흔한 '구성원' 으로 적는다 (빈 칸을 보여주지 않게) */
export const roleLabel = (r: string | null | undefined): string =>
  (r && ROLE_LABEL[r]) || "구성원";
