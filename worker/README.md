# AI 추천 프록시 (Cloudflare Workers)

API 키를 브라우저에 노출하지 않고, **서버(Worker)에 숨겨두는** 프록시입니다.
배포하면 사이트를 공개해도 키가 안전합니다.

## 무엇이 필요한가
- 무료 [Cloudflare 계정](https://dash.cloudflare.com/sign-up)
- 본인의 Anthropic API 키 (`sk-ant-...`)
- PC(또는 노트북). 배포는 명령어 몇 줄이라 PC에서 한 번만 하면 됩니다.
  (아이패드만 있다면 Cloudflare 대시보드 웹에서 코드 붙여넣기로도 가능 — 아래 B안)

---

## A안 — 명령어로 배포 (PC, 권장)

```bash
# 1) 이 worker 폴더로 이동
cd worker

# 2) 로그인 (브라우저가 열립니다)
npx wrangler login

# 3) API 키를 Secret 으로 저장 (코드에 안 남습니다)
npx wrangler secret put ANTHROPIC_API_KEY
#   → 프롬프트에 sk-ant-... 붙여넣기

# 4) 배포
npx wrangler deploy
```

배포가 끝나면 이런 주소가 출력됩니다:
`https://weekend-ai-proxy.<계정명>.workers.dev`

이 주소를 복사해 두세요.

### (선택) 내 사이트에서만 호출되게 잠그기
`wrangler.toml` 의 `ALLOWED_ORIGIN` 을 GitHub Pages 주소로 바꾼 뒤 다시 `deploy`:
```toml
[vars]
ALLOWED_ORIGIN = "https://scott910512-source.github.io"
```

---

## B안 — 대시보드 웹에서 배포 (아이패드 가능)

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Create Worker**
2. 생성된 Worker의 **Edit code** 에서 `worker.js` 내용을 통째로 붙여넣고 **Deploy**
3. Worker → **Settings** → **Variables and Secrets**
   - **Secret** 추가: 이름 `ANTHROPIC_API_KEY`, 값 `sk-ant-...`
   - (선택) **Variable** 추가: 이름 `ALLOWED_ORIGIN`, 값 사이트 주소
4. 상단에 표시되는 `*.workers.dev` 주소를 복사

---

## 마지막 — 사이트에 프록시 주소 연결

프로젝트 루트의 `config.js` 를 열어 주소를 붙여넣습니다:

```js
window.AI_PROXY_URL = "https://weekend-ai-proxy.<계정명>.workers.dev";
```

커밋·푸시하면 끝. 이제 **🤖 AI 추천** 버튼은 키 입력 없이 프록시를 통해 동작하고,
사이트를 공개해도 키가 노출되지 않습니다.

> 비용 안내: 프록시를 쓰면 호출은 **당신의 Anthropic 계정**으로 청구됩니다.
> 공개 사이트에 그대로 두면 방문자들의 호출도 당신 요금이 되니, `ALLOWED_ORIGIN`
> 제한과 함께 필요하면 Cloudflare 쪽에서 요청 수 제한(Rate Limiting)도 걸어두세요.
