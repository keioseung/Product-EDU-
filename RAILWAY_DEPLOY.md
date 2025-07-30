# Railway 배포 가이드

## 🚀 Railway 배포 설정

### 1. 백엔드 환경 변수 설정 (중요!)

Railway 백엔드 서비스에서 다음 환경 변수를 **반드시** 설정하세요:

```bash
# 데이터베이스 연결 (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# JWT 시크릿 키 (보안상 중요!)
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# CORS 설정 (프론트엔드 URL)
FRONTEND_URL=https://your-frontend-domain.up.railway.app

# 환경 설정
ENVIRONMENT=production
```

### 2. 프론트엔드 환경 변수 설정

Railway 프론트엔드 서비스에서 다음 환경 변수를 설정하세요:

```bash
# 백엔드 API URL
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.up.railway.app

# 환경 설정
NODE_ENV=production
```

### 3. Supabase 데이터베이스 연결

**Supabase를 사용하는 경우**:
1. Supabase 대시보드에서 **Settings** → **Database** 클릭
2. **Connection string** 복사 
3. Railway 백엔드 환경 변수에서 `DATABASE_URL`에 해당 URL 설정

**Supabase Connection String 형식**:
```
postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
```

### 4. 백엔드 시작 명령어

Railway 백엔드 서비스 설정에서:
- **Start Command**: `cd backend && python start.py`
- **Build Command**: (비워두기)

### 5. 프론트엔드 빌드 명령어

Railway 프론트엔드 서비스 설정에서:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `cd frontend && npm start`

## 🔧 CORS 설정

백엔드의 CORS 설정이 임시로 모든 origin을 허용하도록 설정되어 있습니다. 
보안상 프로덕션에서는 다음과 같이 수정하는 것을 권장합니다:

```python
# backend/app/main.py
allowed_origins = [
    "https://your-frontend-domain.up.railway.app",
    "http://localhost:3000",  # 개발용
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

## 🗄️ 데이터베이스 초기화

배포 시 데이터베이스가 자동으로 초기화되며, 다음 기본 계정이 생성됩니다:

- **관리자**: `admin` / `admin123`
- **테스트 사용자**: `user` / `user123`

## 🔍 헬스체크 엔드포인트

배포 상태를 확인할 수 있는 엔드포인트:

- `GET /` - 기본 상태 확인
- `GET /health` - 데이터베이스 연결 상태 포함

## 🚨 문제 해결

### 1. 502 Bad Gateway 오류

**원인**: 백엔드 서버가 시작되지 않음
**해결**:
1. Railway 로그에서 백엔드 시작 오류 확인
2. `DATABASE_URL` 환경 변수가 올바르게 설정되었는지 확인
3. PostgreSQL 서비스가 실행 중인지 확인

### 2. CORS 오류

**원인**: 프론트엔드와 백엔드 간 CORS 정책 문제
**해결**:
1. 백엔드 `FRONTEND_URL` 환경 변수에 정확한 프론트엔드 URL 설정
2. 프론트엔드 `NEXT_PUBLIC_API_BASE_URL`에 정확한 백엔드 URL 설정

### 3. 데이터베이스 연결 실패

**원인**: DATABASE_URL이 잘못 설정됨
**해결**:
1. Supabase 데이터베이스가 실행 중인지 확인
2. Supabase **Settings** → **Database**에서 정확한 Connection string 복사
3. `DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres` 형식으로 정확히 설정
4. 백엔드 재배포

### 4. 환경 변수 확인 명령어

Railway CLI를 사용해 환경 변수 확인:

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 환경 변수 확인
railway variables
```

## 📱 Railway 앱 URL 예시

일반적인 Railway URL 패턴:
- 백엔드: `https://simple-production-{id}.up.railway.app`
- 프론트엔드: `https://simple-production-{id}.up.railway.app`

## 🔄 재배포

코드 변경 후 자동 재배포가 이루어지지만, 수동 재배포가 필요한 경우:

1. Railway 대시보드에서 해당 서비스 클릭
2. **"Deploy"** 버튼 클릭
3. 또는 `git push origin main`으로 자동 재배포 트리거

## 📊 로그 확인

배포 문제 해결을 위해 로그 확인:

1. Railway 대시보드에서 서비스 클릭
2. **"Logs"** 탭에서 실시간 로그 확인
3. 오류 메시지를 통해 문제 진단

---

**참고**: Railway는 무료 플랜에서 월 500시간 제한이 있습니다. 프로덕션 사용 시 유료 플랜 고려하세요. 