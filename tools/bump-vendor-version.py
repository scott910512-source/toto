#!/usr/bin/env python3
"""vendor/*.js 를 버전이 붙은 주소로 불러오게 한다.

왜 필요한가
──────────────────────────────────────────────────────────────────────────
앱 코드를 app.html 밖(vendor/app-compiled.js)으로 옮기면서, 둘이 어긋나게
짝지어질 수 있는 창이 생겼다.

  · 화면 이동(navigate)은 네트워크 우선 → 새 app.html 이 온다
  · vendor/*.js 는 캐시 우선      → 옛 파일이 나온다
  → 새 HTML + 옛 코드. 앱이 깨지지는 않지만 '업데이트했는데 그대로' 가 된다.
    (예전에는 코드가 HTML 안에 있었으니 이런 틈이 없었다)

주소에 버전을 붙이면 새 app.html 이 옛 캐시에 없는 주소를 찾으므로 반드시
새로 받는다. 캐시 우선의 속도는 그대로 둔 채 어긋남만 없앤다.
"""
import re
import sys

APP = "app.html"
SW = "sw.js"

app = open(APP, encoding="utf-8").read()

m = re.search(r'const APP_VERSION = "v(\d+)"', app)
if not m:
    sys.exit("APP_VERSION 을 찾지 못했습니다")
ver = m.group(1)

# 1) app.html 의 vendor 스크립트 주소에 버전을 붙인다
changed = 0
for f in ("toto-core.js", "toto-sql.js", "app-compiled.js"):
    plain = f'<script src="vendor/{f}"></script>'
    versioned = f'<script src="vendor/{f}?v={ver}"></script>'
    if plain in app:
        app = app.replace(plain, versioned)
        changed += 1
    else:
        # 이미 버전이 붙어 있으면 숫자만 맞춘다
        app, n = re.subn(
            rf'<script src="vendor/{re.escape(f)}\?v=\d+"></script>',
            versioned, app)
        changed += n

# 스타일시트(<link href="vendor/*.css">)도 같은 번호를 붙인다
app, n = re.subn(r'href="vendor/([\w.-]+\.css)(?:\?v=\d+)?"', rf'href="vendor/\1?v={ver}"', app)
changed += n

open(APP, "w", encoding="utf-8").write(app)
print(f"  ✅ app.html — vendor 주소 {changed}곳에 ?v={ver}")

# 2) 서비스워커도 같은 주소를 미리 담아야 한다 (다른 주소면 오프라인에서 못 찾는다)
sw = open(SW, encoding="utf-8").read()
if "const V = " not in sw:
    sw = sw.replace(
        'const SHELL = [',
        '/* app.html 이 vendor/*.js?v=NN 으로 부르므로, 미리 담을 때도 같은 주소를\n'
        '   써야 한다. 주소가 다르면 오프라인에서 못 찾는다.\n'
        '   버전은 캐시 이름에서 떼어 쓴다 — verify 가 APP_VERSION 과 같은지 본다. */\n'
        'const V = CACHE.replace(/^.*-v/, "");\n'
        '\n'
        'const SHELL = [', 1)
for f in ("toto-core.js", "toto-sql.js", "app-compiled.js"):
    sw = sw.replace(f'"./vendor/{f}",', f'`./vendor/{f}?v=${{V}}`,')
    sw = sw.replace(f'"./vendor/{f}"]', f'`./vendor/{f}?v=${{V}}`]')
sw = sw.replace('const MUST = ["./app.html", `./vendor/toto-core.js?v=${V}`, `./vendor/app-compiled.js?v=${V}`];',
                'const MUST = ["./app.html", `./vendor/toto-core.js?v=${V}`, `./vendor/app-compiled.js?v=${V}`];')
open(SW, "w", encoding="utf-8").write(sw)
print(f"  ✅ sw.js — 같은 주소로 미리 담기")
