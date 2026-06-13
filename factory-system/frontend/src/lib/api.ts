import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const api = axios.create({ baseURL });

// 요청 시 토큰 주입
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 이면 로그아웃 처리
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/** API 오류를 사람이 읽는 메시지로 변환 (FastAPI 422 의 detail 배열 포함) */
export function extractError(err: any, fallback = "요청을 처리하지 못했습니다."): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : "";
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join("\n");
  }
  return err?.message ? `${fallback} (${err.message})` : fallback;
}

/** 파일 다운로드 헬퍼 (export/backup) */
export async function downloadFile(url: string, fallbackName: string) {
  const res = await api.get(url, { responseType: "blob" });
  const disposition = res.headers["content-disposition"] || "";
  let filename = fallbackName;
  const match = /filename\*=UTF-8''([^;]+)/.exec(disposition);
  if (match) filename = decodeURIComponent(match[1]);
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
