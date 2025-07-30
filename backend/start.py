#!/usr/bin/env python3
"""
Railway 배포를 위한 시작 스크립트
데이터베이스 초기화를 확실히 하고 서버를 시작합니다.
"""

import os
import sys
import subprocess
import time

def run_database_init():
    """데이터베이스 초기화 실행"""
    try:
        print("🗄️ 데이터베이스 초기화 시작...")
        result = subprocess.run(
            [sys.executable, "init_db.py"], 
            capture_output=True, 
            text=True, 
            timeout=120  # 2분 타임아웃
        )
        
        if result.returncode == 0:
            print("✅ 데이터베이스 초기화 성공")
            print(result.stdout)
            return True
        else:
            print("⚠️ 데이터베이스 초기화 실패 (서버는 계속 시작)")
            print(f"오류: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("⏰ 데이터베이스 초기화 타임아웃 (서버는 계속 시작)")
        return False
    except Exception as e:
        print(f"⚠️ 데이터베이스 초기화 오류: {e} (서버는 계속 시작)")
        return False

def create_tables_directly():
    """SQLAlchemy를 사용해 직접 테이블 생성 시도"""
    try:
        print("🔧 SQLAlchemy로 직접 테이블 생성 시도...")
        from app.models import Base
        from app.database import engine
        
        # 테이블 생성
        Base.metadata.create_all(bind=engine)
        print("✅ 테이블 생성 완료")
        return True
    except Exception as e:
        print(f"⚠️ 직접 테이블 생성 실패: {e}")
        return False

def main():
    print("🚀 AI Mastery Hub Backend 시작 중...")
    print(f"📁 현재 디렉토리: {os.getcwd()}")
    print(f"🐍 Python 경로: {sys.executable}")
    print(f"🌍 환경변수 DATABASE_URL: {'설정됨' if os.getenv('DATABASE_URL') else '설정되지 않음'}")
    
    # 데이터베이스 초기화 시도 1: init_db.py 스크립트 실행
    if not run_database_init():
        print("🔄 대체 방법으로 테이블 생성 시도...")
        # 데이터베이스 초기화 시도 2: 직접 테이블 생성
        create_tables_directly()
    
    # 환경변수에서 포트 가져오기 (Railway는 PORT 환경변수 사용)
    port = os.getenv("PORT", "8000")
    host = "0.0.0.0"
    
    print(f"🌐 서버 시작: {host}:{port}")
    
    # Railway 환경에서는 reload 비활성화
    reload_option = "--reload" if os.getenv("ENVIRONMENT") == "development" else "--no-reload"
    
    # uvicorn으로 서버 시작
    try:
        os.execvp("uvicorn", [
            "uvicorn",
            "app.main:app",
            "--host", host,
            "--port", port,
            "--access-log",
            "--log-level", "info",
            reload_option
        ])
    except Exception as e:
        print(f"❌ 서버 시작 실패: {e}")
        # 마지막 시도: python -m uvicorn
        try:
            os.execvp("python", [
                "python", "-m", "uvicorn",
                "app.main:app",
                "--host", host,
                "--port", port,
                "--access-log",
                "--log-level", "info"
            ])
        except Exception as e2:
            print(f"❌ 대체 서버 시작도 실패: {e2}")
            sys.exit(1)

if __name__ == "__main__":
    main() 