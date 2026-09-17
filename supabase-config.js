/* ===========================================================================
   또또 가족 갤러리 · Supabase 연결 설정
   ---------------------------------------------------------------------------
   Supabase 대시보드 → Project Settings → API 에서 복사해 아래 두 값만 채우세요.

     SUPABASE_URL       : Project URL        (예: https://abcdefgh.supabase.co)
     SUPABASE_ANON_KEY  : Project API keys → anon / public

   ⚠️ anon key 는 프론트엔드에 넣는 것이 정상입니다. 공개되도록 설계된 키이고
      실제 보안은 데이터베이스의 RLS 정책이 담당합니다.
   ⛔ service_role key 는 절대로 이 파일에 넣지 마세요. 그 키는 RLS를 통째로
      무시하기 때문에 유출되면 가족 사진 전체가 열립니다.
   =========================================================================== */
window.SUPABASE_URL = "https://cuxcxzqfcnofmuusxsvo.supabase.co";

// ↓↓↓ 여기에 anon public 키를 붙여넣으세요 (eyJ... 로 시작하는 긴 문자열)
//     Supabase 대시보드 → Project Settings → API Keys → anon / public
window.SUPABASE_ANON_KEY = "https://cuxcxzqfcnofmuusxsvo.supabase.co/rest/v1/";

/* 아기 정보 (액자 모드에서 "또또 · D+132" 표시에 사용) */
window.BABY_INFO = {
  name: "또또",
  birthDate: "", // 예: "2026-05-01" — 비워두면 D+ 표시를 생략합니다
};

/* 저장소 버킷 이름 (schema.sql 과 동일해야 합니다) */
window.MEDIA_BUCKET = "family-media";
