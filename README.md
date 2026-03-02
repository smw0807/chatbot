# Portfolio Chatbot

송민우(Song Minu)에 대한 질문에 답하는 포트폴리오 챗봇입니다. 공개 프로필 데이터를 기준으로 응답하며, 없는 정보는 추측하지 않습니다.

## 주요 기능

- **프로필 기반 답변**: 이력서·프로필에 기반한 경력, 스킬, 프로젝트, 연락처 등 안내
- **스트리밍 응답**: 답변이 실시간으로 스트리밍되어 표시
- **세션 유지**: 대화 세션을 유지해 맥락 있는 대화 가능
- **제안 질문**: Try asking 버튼으로 자주 묻는 질문을 한 번에 전송

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | NestJS 11, TypeScript |
| **AI** | Anthropic Claude API (스트리밍) |

## 프로젝트 구조

```
chatbot/
├── frontend/          # Next.js 웹 앱 (포트 3000)
├── backend/           # NestJS API 서버 (포트 3002)
│   └── src/chat/
│       └── data/      # 프로필 데이터 (songminu-profile.ts)
└── README.md
```

## 사전 요구 사항

- Node.js 18+
- [Anthropic API Key](https://console.anthropic.com/) (Claude API 사용)

## 환경 설정

### Backend (`backend/`)

`backend/.env` 파일을 만들고 다음 변수를 설정하세요.

```env
APP_PORT=3002
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_API_URL=https://api.anthropic.com/v1/messages
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/`)

`frontend/.env.local` (또는 `.env`)에 백엔드 API URL을 설정하세요.

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 실행 방법

### 로컬 개발

**1. Backend 실행**

```bash
cd backend
npm install
npm run start:dev
```

→ `http://localhost:3002` 에서 API 서버가 동작합니다.

**2. Frontend 실행**

```bash
cd frontend
npm install
npm run dev
```

→ `http://localhost:3000` 에서 채팅 화면에 접속할 수 있습니다.

### 프로덕션 빌드

```bash
# Backend
cd backend && npm run build && npm run start:prod

# Frontend
cd frontend && npm run build && npm run start
```

배포 시 `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` 등을 실제 도메인으로 맞춰 설정하세요.

## API 개요

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/chat/stream` | 채팅 메시지 전송, 스트리밍 응답 (SSE 스타일) |

**요청 본문 예시**

```json
{
  "message": "송민우는 어떤 개발자인가요?",
  "sessionId": "optional-session-id"
}
```

## 프로필 수정

챗봇이 참고하는 프로필은 `backend/src/chat/data/songminu-profile.ts` 에 있습니다.  
이 파일의 `SONGMINU_PROFILE` 내용을 수정하면 답변에 반영됩니다.

## 라이선스

Private / UNLICENSED
