/** 배지 key → 표시 메타 (서버 BADGE_DEFINITIONS 와 동기화) */
export const BADGE_LABELS: Record<string, { name: string; icon: string }> = {
  FIRST_VISIT:          { name: '첫 발자국',                icon: '👣' },
  NATION_10:            { name: '슬슬 맛들리시네요?',       icon: '🗺️' },
  NATION_25:            { name: '이제 좀 돌아다니셨군요!',  icon: '🧭' },
  NATION_50:            { name: '반타작! 이제 반이에요!',   icon: '🥈' },
  NATION_100:           { name: '대한민국 완전정복!',       icon: '🏆' },
  PROVINCE_COMPLETE:    { name: '도(道) 정복자',            icon: '🎖️' },
  SEOUL_COMPLETE:       { name: '서울구석구이다!',           icon: '🏙️' },
  GYEONGGI_COMPLETE:    { name: '수도권 마스터 (찍먹완료)', icon: '🏘️' },
  GANGWON_COMPLETE:     { name: '강원도 자연인 🌲',         icon: '🏔️' },
  CHUNGCHEONG_MASTER:   { name: '충청도 마스터유~',          icon: '🌾' },
  GYEONGBUK_COMPLETE:   { name: '경상북도 완주',            icon: '⛩️' },
  GYEONGNAM_COMPLETE:   { name: '경남 탐험대!',             icon: '🌊' },
  HONAM_MASTER:         { name: '호남 맛집 투어 완료!',     icon: '🍚' },
  JEJU_COMPLETE:        { name: '제주왔수다!',               icon: '🌴' },
  METRO_MASTER:         { name: '도시 유목민',               icon: '🌆' },
};
