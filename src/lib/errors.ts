/** Supabase/네트워크 오류를 가족이 읽을 수 있는 한국어로 바꾼다 */
const TABLE: Array<[RegExp, string]> = [
  [/Invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않아요."],
  [/Email not confirmed/i, "이메일 인증이 아직 완료되지 않았어요."],
  [/User already registered|already been registered/i, "이미 가입된 이메일이에요."],
  [/Password should be at least/i, "비밀번호는 6자 이상이어야 해요."],
  [/email_address_invalid|Email address .* is invalid/i, "사용할 수 없는 이메일 주소예요."],
  [/email rate limit exceeded|over_email_send_rate_limit/i, "메일 발송 한도를 넘었어요. 잠시 후 다시 시도해주세요."],
  [/초대코드를 찾을 수 없습니다/, "초대코드를 찾을 수 없습니다. 가족에게 코드를 다시 확인해주세요."],
  [/마지막 관리자는 권한을 낮출 수 없습니다/, "마지막 관리자는 권한을 낮출 수 없어요. 다른 관리자를 먼저 지정해주세요."],
  [/권한은 관리자만 변경할 수 있습니다/, "권한은 관리자만 바꿀 수 있어요."],
  [/row-level security|permission denied|violates/i, "권한이 없어요. 관리자에게 문의해주세요."],
  [/JWT expired|token is expired/i, "로그인이 만료됐어요. 다시 로그인해주세요."],
  [/Failed to fetch|NetworkError|network error/i, "네트워크 연결을 확인해주세요."],
  [/Bucket not found|NoSuchBucket/i, "사진 저장소를 찾을 수 없어요. 설정을 확인해주세요."],
  [/Payload too large|entity too large/i, "파일이 너무 커요. 더 작은 사진으로 올려주세요."],
];

export function errMsg(e: unknown): string {
  const raw =
    (e as { message?: string })?.message ??
    (e as { error_description?: string })?.error_description ??
    (e as { msg?: string })?.msg ??
    (typeof e === "string" ? e : "");
  for (const [re, msg] of TABLE) if (re.test(raw)) return msg;
  return raw || "알 수 없는 오류가 발생했어요.";
}

/** 개발 중 실수로 화면에 원문이 그대로 나가는 걸 막기 위한 표시 */
export class AppError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AppError";
  }
}
