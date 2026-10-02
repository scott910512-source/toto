import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Workbench } from "./Workbench";
import "./index.css";

/* 새 구조(Vite + TypeScript)로 옮기는 중입니다.
   가족이 쓰는 화면은 아직 /app.html 이고, 이 진입점은 배포되지 않습니다.
   여기서는 옮겨 온 조각들이 실제로 동작하는지 눈으로 보기 위한
   작업대(Workbench)를 띄웁니다. 화면을 하나씩 옮겨 오면서 이 자리가
   진짜 앱으로 바뀝니다. */
const el = document.getElementById("root");
if (!el) throw new Error("#root 를 찾지 못했습니다.");

createRoot(el).render(
  <StrictMode>
    <Workbench />
  </StrictMode>,
);
