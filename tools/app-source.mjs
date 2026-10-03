/* app.html 안의 '앱 소스' 를 꺼내는 한 가지 방법.

   예전에는 <script type="text/babel"> 이었는데, 미리 컴파일한 파일을 쓰게
   되면서 type 이 text/plain 으로 바뀌었다. 도구 세 개가 각자 정규식을 들고
   있으면 하나만 고치고 나머지를 잊는다. 그래서 여기 한 곳에 둔다. */
import { readFileSync } from "node:fs";

/** app.html(또는 그 내용)에서 JSX 소스를 꺼낸다. 없으면 null. */
export function readAppSource(fileOrHtml = "app.html") {
  const html = fileOrHtml.includes("\n") ? fileOrHtml : readFileSync(fileOrHtml, "utf8");
  const m =
    // 지금 형태: 미리 컴파일한 것을 쓰고, 원본은 실행되지 않게 둔다
    html.match(/<script[^>]*id="toto-source"[^>]*>([\s\S]*?)<\/script>/) ||
    // 예전 형태: 브라우저에서 Babel 이 직접 컴파일
    html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}
