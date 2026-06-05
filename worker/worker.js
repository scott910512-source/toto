/**
 * 주말 뭐하지? — AI 추천 프록시 (Cloudflare Worker)
 *
 * 브라우저가 직접 Claude API를 호출하면 API 키가 노출됩니다.
 * 이 Worker는 API 키를 서버 측 환경변수(Secret)에 숨겨두고,
 * 클라이언트가 보낸 "선택 조건(tags)"만 받아 Claude를 호출합니다.
 *
 * 배포 방법은 같은 폴더의 README.md 참고.
 *
 * 필요한 환경변수:
 *   - ANTHROPIC_API_KEY  (Secret)  : 본인 Anthropic API 키
 *   - ALLOWED_ORIGIN     (Var, 선택): 허용할 사이트 주소
 *        예) https://scott910512-source.github.io
 *        없으면 "*" (모든 출처 허용)
 */

const SYSTEM =
  "당신은 한국의 주말 나들이를 추천하는 친절한 도우미입니다. " +
  "사용자가 고른 지역·기간·테마·제한사항에 실제로 맞는 활동만 제안하세요.";

const SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          desc: { type: "string" },
          themes: { type: "array", items: { type: "string" } },
        },
        required: ["title", "desc", "themes"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
};

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "POST만 허용됩니다." }, 405, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "잘못된 요청 형식입니다." }, 400, cors);
    }

    // 클라이언트는 선택한 조건(한글 라벨)만 보낼 수 있습니다 — 남용 방지를 위해 제한.
    const tags = Array.isArray(body.tags)
      ? body.tags.slice(0, 20).map((t) => String(t).slice(0, 40))
      : [];

    const userPrompt =
      "다음 조건에 맞는 한국 주말 활동을 추천해 주세요.\n\n" +
      "조건: " + (tags.length ? tags.join(", ") : "조건 없음") + "\n\n" +
      "실제로 가능한 구체적인 장소·활동 5개를 제안하고, 각 활동마다 한 줄 설명과 " +
      "어울리는 테마 키워드를 1~3개 붙여 주세요. 한국어로 답해 주세요.";

    let claudeRes;
    try {
      claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-8",
          max_tokens: 2000,
          system: SYSTEM,
          messages: [{ role: "user", content: userPrompt }],
          output_config: { format: { type: "json_schema", schema: SCHEMA } },
        }),
      });
    } catch (err) {
      return jsonResponse({ error: "Claude 호출 실패: " + String(err) }, 502, cors);
    }

    const data = await claudeRes.json();
    return jsonResponse(data, claudeRes.status, cors);
  },
};
