# 🍼 아기수첩 (Baby Book)

가족이 여러 기기에서 함께 쓰는 육아 관리 · 사진/편지 공유 PWA. **단일 HTML 파일**(React + Firebase, CDN)로 동작하며 서버가 필요 없습니다.

## 📦 구성 파일
| 파일 | 설명 |
|---|---|
| `index.html` | 앱 본체 (React + Babel + Firebase + Recharts, 전부 인라인) |
| `manifest.webmanifest` | PWA 매니페스트 (홈 화면 설치/전체화면) |
| `sw.js` | 서비스워커 (오프라인 앱 셸 캐시) |
| `icon-192/512(.maskable).png`, `apple-touch-icon.png` | 앱 아이콘 |
| `.nojekyll` | GitHub Pages에서 Jekyll 처리 비활성화 |

## 🚀 새 저장소로 옮기는 법
1. 이 `babycare/` 폴더의 **내용물 전체**를 새 저장소 **루트**에 복사
2. 새 저장소를 **Public**으로 생성 (GitHub Pages 무료 조건)
3. **Settings → Pages → Deploy from a branch → main / (root)** 저장
4. 접속: `https://<사용자>.github.io/<저장소>/` (index.html이 루트라 파일명 불필요)

## ⚙️ Firebase 설정
`index.html` 상단 `firebaseConfig` 에 본인 Firebase 프로젝트 값 입력 후:
- **Authentication** → 이메일/비밀번호 사용 설정, 승인된 도메인에 Pages 도메인 추가
- **Firestore Database** 생성 → 규칙은 `index.html` 주석의 Firestore Rules 게시
- (사진은 Firestore에 압축 저장하므로 유료 Storage 불필요)

## 👑 관리자(총관리자) 계정
`index.html` 상단 `ADMIN_EMAILS` 목록의 이메일은 항상 관리자(엄마·아빠)입니다.
신규 가입자는 **관람전용 + 승인대기**로 시작하며, 관리자가 설정 탭에서 승인/차단합니다.

## ✨ 주요 기능
수유·수면·기저귀·성장(WHO 백분위)·건강·임신 초음파 기록 · 사진 갤러리(공개/나만보기, 검색, 슬라이드쇼) · 편지 · 주간 통계 · 다크모드 · PWA 설치.
