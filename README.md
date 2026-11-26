# CLASS FEEDBACK

수업 만족도를 익명으로 수집하고, Supabase Authentication으로 로그인한 관리자만 결과를 조회·초기화할 수 있는 초소형 웹앱입니다.

## 구성

- HTML, CSS, JavaScript 단일 페이지
- Supabase JavaScript SDK
- Supabase Auth 이메일/비밀번호 로그인
- PostgreSQL Row Level Security
- Vercel 정적 배포

## 로컬 빌드

Node.js 22 이상이 필요합니다.

```powershell
npm install
$env:SUPABASE_URL='https://your-project.supabase.co'
$env:SUPABASE_PUBLISHABLE_KEY='sb_publishable_...'
npm run build
```

빌드 결과는 `dist/`에 생성됩니다. Supabase URL과 Publishable Key는 브라우저용 공개 설정이며, Secret Key나 Service Role Key는 사용하지 않습니다.

## 관리자 계정

Supabase Dashboard에서 **Authentication → Users → Add user → Create new user** 경로로 관리자 계정을 만듭니다. 앱에는 회원가입 기능이 없으며 관리자 이메일과 비밀번호를 코드나 Vercel 환경변수에 저장하지 않습니다.

## 데이터베이스

실제 프로젝트에 적용된 스키마와 RLS 정책은 [`supabase/schema.sql`](supabase/schema.sql)에 기록되어 있습니다.

