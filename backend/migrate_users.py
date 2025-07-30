#!/usr/bin/env python3

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# 현재 스크립트의 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Base, User
from app.auth import get_password_hash

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.jzfwqunitwpczhartwdh:rhdqngo123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres")

def migrate_users():
    """사용자 테이블 생성 및 기본 관리자 계정 생성"""
    engine = create_engine(DATABASE_URL)
    
    try:
        # 테이블 생성
        Base.metadata.create_all(bind=engine)
        print("✅ Users 테이블이 성공적으로 생성되었습니다.")
        
        # 기본 관리자 계정 생성
        from sqlalchemy.orm import sessionmaker
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        try:
            # 기존 관리자 계정 확인
            existing_admin = db.query(User).filter(User.username == "admin").first()
            if not existing_admin:
                # 기본 관리자 계정 생성
                admin_user = User(
                    username="admin",
                    password_hash=get_password_hash("admin1234"),
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print("✅ 기본 관리자 계정이 생성되었습니다.")
                print("   - 아이디: admin")
                print("   - 비밀번호: admin1234")
            else:
                print("ℹ️ 관리자 계정이 이미 존재합니다.")
            
            # 테스트 사용자 계정 생성
            existing_user = db.query(User).filter(User.username == "testuser").first()
            if not existing_user:
                test_user = User(
                    username="testuser",
                    password_hash=get_password_hash("test1234"),
                    role="user",
                    is_active=True
                )
                db.add(test_user)
                db.commit()
                print("✅ 테스트 사용자 계정이 생성되었습니다.")
                print("   - 아이디: testuser")
                print("   - 비밀번호: test1234")
            else:
                print("ℹ️ 테스트 사용자 계정이 이미 존재합니다.")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ 마이그레이션 중 오류 발생: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 사용자 데이터베이스 마이그레이션을 시작합니다...")
    success = migrate_users()
    
    if success:
        print("✅ 마이그레이션이 완료되었습니다!")
        print("\n📌 다음 단계:")
        print("1. 웹에서 /auth 페이지로 이동")
        print("2. 기존 localStorage 기반 계정을 새 시스템으로 마이그레이션")
        print("3. 모바일 앱도 동일한 백엔드 API 사용하도록 업데이트")
    else:
        print("❌ 마이그레이션에 실패했습니다.")
        sys.exit(1) 