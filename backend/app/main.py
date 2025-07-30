from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from .api import ai_info, quiz, prompt, base_content, term, auth, logs, system

app = FastAPI()

# Railway 배포 환경을 위한 CORS 설정
origins = [
    "http://localhost:3000",
    "https://simple-production-b0b3.up.railway.app",
    "https://simple-production-142c.up.railway.app",
    "*"  # 모든 origin 허용 (개발 중)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 헬스체크 엔드포인트
@app.get("/")
async def root():
    return {"message": "AI Mastery Hub Backend is running", "status": "healthy", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    try:
        from .database import engine
        import os
        
        # 환경 변수 확인
        database_url = os.getenv("DATABASE_URL", "Not set")
        
        # 데이터베이스 연결 테스트
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            
        # 프롬프트 테이블 확인
        with engine.connect() as conn:
            result = conn.execute("SELECT COUNT(*) FROM prompt")
            prompt_count = result.scalar()
            
        return {
            "status": "healthy", 
            "database": "connected",
            "database_url": database_url[:50] + "..." if len(database_url) > 50 else database_url,
            "prompt_table_count": prompt_count,
            "timestamp": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "database": "disconnected", 
            "error": str(e), 
            "database_url": os.getenv("DATABASE_URL", "Not set"),
            "timestamp": "2024-01-01T00:00:00Z"
        }

@app.options("/{path:path}")
async def options_handler(path: str):
    """OPTIONS 요청을 명시적으로 처리"""
    return {"message": "OK"}

# 전역 예외 처리기
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc), "path": str(request.url)}
    )

# 404 처리기
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Not found", "path": str(request.url)}
    )

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(logs.router, prefix="/api/logs", tags=["Activity Logs"])
app.include_router(system.router, prefix="/api/system", tags=["System Management"])
app.include_router(ai_info.router, prefix="/api/ai-info")
app.include_router(quiz.router, prefix="/api/quiz")
app.include_router(prompt.router, prefix="/api/prompt")
app.include_router(base_content.router, prefix="/api/base-content")
app.include_router(term.router, prefix="/api/term") 