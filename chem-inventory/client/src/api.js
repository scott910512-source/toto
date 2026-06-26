// REST API 클라이언트. 동일 출처 세션 쿠키를 사용한다.
const BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || (data && data.message) || '요청을 처리하지 못했습니다.');
    err.status = res.status;
    err.data = data; // 409 선입선출 경고 등 상세 정보 전달
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};

// CSV 다운로드: 동일 출처 GET이라 세션 쿠키가 자동 전송된다.
export function downloadCsv(path) {
  const a = document.createElement('a');
  a.href = BASE + path;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
