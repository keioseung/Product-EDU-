#!/usr/bin/env python3
"""
데이터베이스 초기화 스크립트 (Railway 배포용)
모든 테이블을 생성하고 기본 사용자를 추가합니다.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 현재 디렉토리를 추가하여 app 모듈을 찾을 수 있도록 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def init_database():
    """데이터베이스 초기화 및 기본 데이터 설정"""
    try:
        print("🗄️ 데이터베이스 초기화 시작...")
        
        # 환경 변수에서 데이터베이스 URL 가져오기
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
            return False
            
        print(f"📡 데이터베이스 연결 중: {database_url[:50]}...")
        
        # SQLAlchemy 엔진 생성
        engine = create_engine(database_url)
        
        # 연결 테스트
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ 데이터베이스 연결 성공")
        
        # 모델 import (테이블 정의를 위해)
        from app.models import Base, User, ActivityLog, BackupHistory
        from app.auth import get_password_hash
        
        # 모든 테이블 생성
        print("🏗️ 테이블 생성 중...")
        Base.metadata.create_all(bind=engine)
        print("✅ 모든 테이블 생성 완료")
        
        # 세션 생성
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 기본 관리자 계정 확인/생성
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                print("👤 기본 관리자 계정 생성 중...")
                admin_user = User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=get_password_hash("admin123"),
                    role="admin"
                )
                db.add(admin_user)
                print("✅ 관리자 계정 생성 완료 (admin/admin123)")
            else:
                print("ℹ️ 관리자 계정이 이미 존재합니다.")
            
            # 테스트 사용자 확인/생성
            test_user = db.query(User).filter(User.username == "user").first()
            if not test_user:
                print("👤 테스트 사용자 계정 생성 중...")
                test_user = User(
                    username="user",
                    email="user@example.com",
                    hashed_password=get_password_hash("user123"),
                    role="user"
                )
                db.add(test_user)
                print("✅ 테스트 사용자 계정 생성 완료 (user/user123)")
            else:
                print("ℹ️ 테스트 사용자 계정이 이미 존재합니다.")
            
            # 변경사항 커밋
            db.commit()
            print("✅ 데이터베이스 초기화 완료")
            
            # 테이블 현황 출력
            user_count = db.query(User).count()
            log_count = db.query(ActivityLog).count()
            backup_count = db.query(BackupHistory).count()
            
            print(f"📊 현재 데이터베이스 상태:")
            print(f"   - 사용자: {user_count}명")
            print(f"   - 활동 로그: {log_count}개")
            print(f"   - 백업 기록: {backup_count}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 기본 데이터 생성 실패: {e}")
            db.rollback()
            return False
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ 데이터베이스 초기화 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("🎉 데이터베이스 초기화가 성공적으로 완료되었습니다!")
        sys.exit(0)
    else:
        print("💥 데이터베이스 초기화가 실패했습니다!")
        sys.exit(1) 