/* app.html 전용 Tailwind 설정 (tools/build-css.mjs 가 쓴다).

   루트의 tailwind.config.js 는 새 구조(web/ + src/) 용이라 따로 둔다.
   darkMode 는 app.html 이 <html class="dark"> 를 직접 켜고 끄므로 'class'. */
export default {
  content: ["./app.html"],
  darkMode: "class",
  theme: { extend: {} },
  plugins: [],
};
